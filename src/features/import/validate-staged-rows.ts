// v5.0 — Phase 38 / Plan 38-02 (IMP-03, IMP-07): validateStagedRows
//
// Pure-ish helper: takes a tx (or db) handle, the parsed rows, and resolves
// person/project names against the tenant's people/projects, then diffs
// against existing actual_entries on (org, person, project, date) to compute
// new/updated/skipped counts.
//
// Returns the data needed by both previewStagedBatch (read-only summary) and
// commitActualsBatch (which uses the resolved id maps + the diff plan).

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { actualEntries, importBatches, people, projects } from '@/db/schema';

import { matchPersonName, matchProjectName, type MatchResult } from './matching/name-matcher';
import { ROLLBACK_WINDOW_MS, type NameOverrides, type UnmatchedName } from './actuals-import.types';
import type { ParsedRow } from './parsers/parser.types';

export type ValidatedRow = {
  source: ParsedRow;
  personId: string;
  projectId: string;
  /** What the commit step will do with this row. */
  action: 'insert' | 'update' | 'noop' | 'skip-manual' | 'skip-prior-batch';
  /** The currently-stored row, if any (for reversal payload). */
  existing: {
    hours: string;
    source: 'manual' | 'import';
    importBatchId: string | null;
  } | null;
};

export type ValidationOutcome = {
  rows: ValidatedRow[];
  unmatchedNames: UnmatchedName[];
  counts: {
    new: number;
    updated: number;
    noop: number;
    rowsSkippedManual: number;
    rowsSkippedPriorBatch: number;
  };
  /** Active prior batch ids that this commit would touch (for supersession). */
  priorBatchIds: string[];
};

function toHoursString(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Resolve person/project names + diff parsed rows against actual_entries.
 *
 * @param db   drizzle handle (db OR tx — both expose .select / .from / .where)
 * @param orgId tenant id
 * @param parsed parsed rows from parseActualsWorkbook
 * @param now   reference time for the "active prior batch" window (test seam)
 * @param nameOverrides optional input-name → id overrides from the API caller
 */
export async function validateStagedRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orgId: string,
  parsed: ParsedRow[],
  now: Date,
  nameOverrides?: NameOverrides,
): Promise<ValidationOutcome> {
  // Load tenant candidates.
  const tenantPeople = (await db
    .select({ id: people.id, firstName: people.firstName, lastName: people.lastName })
    .from(people)
    .where(eq(people.organizationId, orgId))) as Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  const tenantProjects = (await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.organizationId, orgId))) as Array<{ id: string; name: string }>;

  const peopleCandidates = tenantPeople.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
  }));
  const projectCandidates = tenantProjects.map((p) => ({ id: p.id, name: p.name }));

  // Memoised match lookups (input → MatchResult / id).
  const personMatchByInput = new Map<string, MatchResult>();
  const projectMatchByInput = new Map<string, MatchResult>();
  function resolvePerson(input: string): { id: string | null; match: MatchResult } {
    const override = nameOverrides?.persons?.[input];
    if (override) return { id: override, match: { kind: 'exact', id: override, name: input } };
    let m = personMatchByInput.get(input);
    if (!m) {
      m = matchPersonName(input, peopleCandidates);
      personMatchByInput.set(input, m);
    }
    if (m.kind === 'exact' || m.kind === 'fuzzy') return { id: m.id, match: m };
    return { id: null, match: m };
  }
  function resolveProject(input: string): { id: string | null; match: MatchResult } {
    const override = nameOverrides?.projects?.[input];
    if (override) return { id: override, match: { kind: 'exact', id: override, name: input } };
    let m = projectMatchByInput.get(input);
    if (!m) {
      m = matchProjectName(input, projectCandidates);
      projectMatchByInput.set(input, m);
    }
    if (m.kind === 'exact' || m.kind === 'fuzzy') return { id: m.id, match: m };
    return { id: null, match: m };
  }

  // Bucket parsed rows into resolved (with ids) and unmatched.
  type Resolved = { source: ParsedRow; personId: string; projectId: string };
  const resolved: Resolved[] = [];
  const unmatchedSet = new Map<string, UnmatchedName>(); // dedupe by kind+input

  for (const row of parsed) {
    const p = resolvePerson(row.personName);
    const pr = resolveProject(row.projectName);
    if (!p.id) {
      const key = `person:${row.personName}`;
      if (!unmatchedSet.has(key)) {
        unmatchedSet.set(key, { kind: 'person', input: row.personName, match: p.match });
      }
    }
    if (!pr.id) {
      const key = `project:${row.projectName}`;
      if (!unmatchedSet.has(key)) {
        unmatchedSet.set(key, { kind: 'project', input: row.projectName, match: pr.match });
      }
    }
    if (p.id && pr.id) {
      resolved.push({ source: row, personId: p.id, projectId: pr.id });
    }
  }

  // Sum hours for duplicate (person,project,date) keys within the import.
  const dedupedMap = new Map<string, Resolved & { totalHours: number }>();
  for (const r of resolved) {
    const key = `${r.personId}|${r.projectId}|${r.source.date}`;
    const existing = dedupedMap.get(key);
    if (existing) {
      existing.totalHours += r.source.hours;
    } else {
      dedupedMap.set(key, { ...r, totalHours: r.source.hours });
    }
  }
  const deduped = Array.from(dedupedMap.values());

  // Bulk-load existing actual_entries for the touched (person,project,date) tuples.
  const personIds = Array.from(new Set(deduped.map((r) => r.personId)));
  const projectIds = Array.from(new Set(deduped.map((r) => r.projectId)));
  const dates = Array.from(new Set(deduped.map((r) => r.source.date)));

  const existing =
    personIds.length === 0
      ? []
      : ((await db
          .select({
            id: actualEntries.id,
            personId: actualEntries.personId,
            projectId: actualEntries.projectId,
            date: actualEntries.date,
            hours: actualEntries.hours,
            source: actualEntries.source,
            importBatchId: actualEntries.importBatchId,
          })
          .from(actualEntries)
          .where(
            and(
              eq(actualEntries.organizationId, orgId),
              inArray(actualEntries.personId, personIds),
              inArray(actualEntries.projectId, projectIds),
              inArray(actualEntries.date, dates),
            ),
          )) as Array<{
          id: string;
          personId: string;
          projectId: string;
          date: string;
          hours: string;
          source: 'manual' | 'import';
          importBatchId: string | null;
        }>);

  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const e of existing) {
    existingByKey.set(`${e.personId}|${e.projectId}|${e.date}`, e);
  }

  // Identify active prior import_batches (rolled_back_at IS NULL AND
  // superseded_at IS NULL AND committed_at > now - 24h) that own any of the
  // existing rows we'd be writing over.
  const priorBatchIdsTouched = new Set<string>();
  const activeBatchIds = new Set<string>();
  const referencedBatchIds = Array.from(
    new Set(existing.map((e) => e.importBatchId).filter((x): x is string => !!x)),
  );
  if (referencedBatchIds.length > 0) {
    const cutoff = new Date(now.getTime() - ROLLBACK_WINDOW_MS);
    const activeBatches = (await db
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.organizationId, orgId),
          inArray(importBatches.id, referencedBatchIds),
          isNull(importBatches.rolledBackAt),
          isNull(importBatches.supersededAt),
          // committed_at > cutoff
          sql`${importBatches.committedAt} > ${cutoff}`,
        ),
      )) as Array<{ id: string }>;
    for (const b of activeBatches) activeBatchIds.add(b.id);
  }

  const validated: ValidatedRow[] = [];
  const counts = {
    new: 0,
    updated: 0,
    noop: 0,
    rowsSkippedManual: 0,
    rowsSkippedPriorBatch: 0,
  };

  for (const r of deduped) {
    const key = `${r.personId}|${r.projectId}|${r.source.date}`;
    const ex = existingByKey.get(key) ?? null;
    const exForOut = ex
      ? { hours: ex.hours, source: ex.source, importBatchId: ex.importBatchId }
      : null;

    if (!ex) {
      counts.new += 1;
      validated.push({
        source: { ...r.source, hours: r.totalHours },
        personId: r.personId,
        projectId: r.projectId,
        action: 'insert',
        existing: null,
      });
      continue;
    }

    // Manual edit guard.
    if (ex.source === 'manual') {
      counts.rowsSkippedManual += 1;
      validated.push({
        source: { ...r.source, hours: r.totalHours },
        personId: r.personId,
        projectId: r.projectId,
        action: 'skip-manual',
        existing: exForOut,
      });
      continue;
    }

    // Active prior batch guard.
    if (ex.importBatchId && activeBatchIds.has(ex.importBatchId)) {
      counts.rowsSkippedPriorBatch += 1;
      priorBatchIdsTouched.add(ex.importBatchId);
      validated.push({
        source: { ...r.source, hours: r.totalHours },
        personId: r.personId,
        projectId: r.projectId,
        action: 'skip-prior-batch',
        existing: exForOut,
      });
      continue;
    }

    // Diff hours.
    if (ex.hours === toHoursString(r.totalHours)) {
      counts.noop += 1;
      validated.push({
        source: { ...r.source, hours: r.totalHours },
        personId: r.personId,
        projectId: r.projectId,
        action: 'noop',
        existing: exForOut,
      });
    } else {
      counts.updated += 1;
      validated.push({
        source: { ...r.source, hours: r.totalHours },
        personId: r.personId,
        projectId: r.projectId,
        action: 'update',
        existing: exForOut,
      });
    }
  }

  return {
    rows: validated,
    unmatchedNames: Array.from(unmatchedSet.values()),
    counts,
    priorBatchIds: Array.from(priorBatchIdsTouched),
  };
}

export const _internal = { toHoursString };
