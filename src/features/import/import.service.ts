/**
 * Import validation and execution service.
 *
 * - validateImportRows: Fuzzy-matches imported names against existing people/projects.
 * - executeImport: Transactional bulk upsert of allocations (up to 5,000 rows).
 */

import { findBestMatch } from 'string-similarity';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { listPeople } from '@/features/people/person.service';
import { listProjects } from '@/features/projects/project.service';

import type {
  FuzzyMatch,
  ImportResult,
  ImportRow,
  RowStatus,
  ValidationResult,
  ValidationRow,
} from './import.types';

// ---------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------

type NameEntry = { id: string; name: string };

type MatchResult = {
  status: 'exact' | 'fuzzy' | 'unknown';
  matchId?: string;
  matchName?: string;
  score?: number;
  suggestions?: FuzzyMatch[];
};

/**
 * Match an imported name against a list of existing entities.
 *
 * - Exact match (case-insensitive): status='exact'
 * - Score >= 0.95: status='exact' (auto-match, close enough)
 * - Score >= 0.8: status='fuzzy', includes top 3 suggestions
 * - Below 0.8: status='unknown'
 *
 * Suggestions include any match above 0.6 threshold (top 3, sorted by score).
 */
function matchName(importedName: string, existing: NameEntry[]): MatchResult {
  if (existing.length === 0) {
    return { status: 'unknown' };
  }

  const trimmed = importedName.trim();
  if (!trimmed) {
    return { status: 'unknown' };
  }

  // Try exact match first (case-insensitive)
  const exactMatch = existing.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) {
    return {
      status: 'exact',
      matchId: exactMatch.id,
      matchName: exactMatch.name,
      score: 1.0,
    };
  }

  // Use Dice coefficient for fuzzy matching
  const existingNames = existing.map((e) => e.name);
  const result = findBestMatch(trimmed, existingNames);
  const best = result.bestMatch;

  // Build suggestions: all matches above 0.6, sorted by score desc, top 3
  const suggestions: FuzzyMatch[] = result.ratings
    .filter((r: { target: string; rating: number }) => r.rating >= 0.6)
    .sort(
      (a: { target: string; rating: number }, b: { target: string; rating: number }) =>
        b.rating - a.rating,
    )
    .slice(0, 3)
    .map((r: { target: string; rating: number }) => {
      const entry = existing.find((e) => e.name === r.target)!;
      return {
        matchedId: entry.id,
        matchedName: entry.name,
        score: Math.round(r.rating * 100) / 100,
      };
    });

  // Auto-match if score >= 0.95
  if (best.rating >= 0.95) {
    const entry = existing.find((e) => e.name === best.target)!;
    return {
      status: 'exact',
      matchId: entry.id,
      matchName: entry.name,
      score: Math.round(best.rating * 100) / 100,
    };
  }

  // Fuzzy match if score >= 0.8
  if (best.rating >= 0.8) {
    return {
      status: 'fuzzy',
      score: Math.round(best.rating * 100) / 100,
      suggestions,
    };
  }

  // Unknown — no good match
  return {
    status: 'unknown',
    score: Math.round(best.rating * 100) / 100,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate import rows by matching person/project names against existing data.
 *
 * For each row:
 * - Matches personName against org's people (firstName + lastName)
 * - Matches projectName against org's projects
 * - Validates hours (positive integer 1-999)
 * - Validates month format (YYYY-MM)
 * - Determines row status: 'ready', 'warning', or 'error'
 */
export async function validateImportRows(
  orgId: string,
  rows: ImportRow[],
): Promise<ValidationResult> {
  // Fetch all active people and projects for the org
  const people = await listPeople(orgId, { includeArchived: false });
  const projects = await listProjects(orgId, { includeArchived: false });

  // Build name lookup lists
  const peopleList: NameEntry[] = people.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
  }));
  const projectList: NameEntry[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  // Validate each row
  const validatedRows: ValidationRow[] = rows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Person matching
    const personMatch = matchName(row.personName, peopleList);

    // Project matching
    const projectMatch = matchName(row.projectName, projectList);

    // Hours validation
    if (!Number.isInteger(row.hours) || row.hours < 1 || row.hours > 999) {
      errors.push(`Invalid hours: ${row.hours}`);
    }

    // Month validation
    if (!/^\d{4}-\d{2}$/.test(row.month)) {
      errors.push(`Invalid month format: ${row.month}`);
    }

    // Add errors/warnings based on match status
    if (personMatch.status === 'unknown') {
      errors.push(`Person not found: ${row.personName}`);
    } else if (personMatch.status === 'fuzzy') {
      warnings.push(`Fuzzy match for person "${row.personName}" — review suggestions`);
    }

    if (projectMatch.status === 'unknown') {
      errors.push(`Project not found: ${row.projectName}`);
    } else if (projectMatch.status === 'fuzzy') {
      warnings.push(`Fuzzy match for project "${row.projectName}" — review suggestions`);
    }

    // Determine overall row status
    let status: RowStatus;
    if (errors.length > 0) {
      status = 'error';
    } else if (personMatch.status === 'fuzzy' || projectMatch.status === 'fuzzy') {
      status = 'warning';
    } else {
      status = 'ready';
    }

    return {
      rowIndex: row.rowIndex,
      status,
      data: row,
      personMatch,
      projectMatch,
      errors,
      warnings,
    };
  });

  // Build summary
  const summary = {
    total: validatedRows.length,
    ready: validatedRows.filter((r) => r.status === 'ready').length,
    warnings: validatedRows.filter((r) => r.status === 'warning').length,
    errors: validatedRows.filter((r) => r.status === 'error').length,
  };

  return { rows: validatedRows, summary };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Execute a bulk import of allocations in a single database transaction.
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE on the 4-column unique constraint
 * (organizationId, personId, projectId, month) for upsert semantics.
 *
 * Supports up to 5,000 rows. The entire batch rolls back on any error.
 */
export async function executeImport(
  orgId: string,
  rows: Array<{
    personId: string;
    projectId: string;
    month: string;
    hours: number;
  }>,
): Promise<ImportResult> {
  try {
    await db.transaction(async (tx) => {
      for (const row of rows) {
        // Normalize month to YYYY-MM-01 for date column storage
        const monthDate = `${row.month}-01`;

        await tx
          .insert(schema.allocations)
          .values({
            organizationId: orgId,
            personId: row.personId,
            projectId: row.projectId,
            month: monthDate,
            hours: row.hours,
          })
          .onConflictDoUpdate({
            target: [
              schema.allocations.organizationId,
              schema.allocations.personId,
              schema.allocations.projectId,
              schema.allocations.month,
            ],
            set: {
              hours: row.hours,
              updatedAt: new Date(),
            },
          });
      }
    });

    return { imported: rows.length, skipped: 0, warnings: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { imported: 0, skipped: 0, warnings: [], error: message };
  }
}
