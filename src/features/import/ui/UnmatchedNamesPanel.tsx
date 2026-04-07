'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01, IMP-07): unmatched names resolver.
 *
 * Renders one row per unmatched name with type-aware actions:
 *   - kind:'fuzzy'      → single suggestion + Accept button
 *   - kind:'ambiguous'  → dropdown of top candidates
 *   - kind:'none'       → free-form picker (placeholder dropdown)
 *
 * "Mark as new" is intentionally disabled in v5.0 (no on-the-fly creation).
 */

import { useTranslations } from 'next-intl';

import type { UnmatchedName } from '../actuals-import.types';

import type { NameResolution } from './import-wizard.types';

export interface UnmatchedNamesPanelProps {
  unmatchedNames: UnmatchedName[];
  resolutions: NameResolution[];
  onResolve: (resolution: NameResolution) => void;
  /**
   * Optional candidate lists for kind:'none' rows. When omitted, the
   * picker is rendered as a disabled placeholder.
   */
  personCandidates?: ReadonlyArray<{ id: string; name: string }>;
  projectCandidates?: ReadonlyArray<{ id: string; name: string }>;
}

function findResolution(
  resolutions: NameResolution[],
  input: string,
  kind: 'person' | 'project',
): NameResolution | undefined {
  return resolutions.find((r) => r.input === input && r.kind === kind);
}

export function UnmatchedNamesPanel({
  unmatchedNames,
  resolutions,
  onResolve,
  personCandidates = [],
  projectCandidates = [],
}: UnmatchedNamesPanelProps) {
  const t = useTranslations('v5.import.unmatched');

  const persons = unmatchedNames.filter((u) => u.kind === 'person');
  const projects = unmatchedNames.filter((u) => u.kind === 'project');

  function renderRow(u: UnmatchedName) {
    const candidates = u.kind === 'person' ? personCandidates : projectCandidates;
    const current = findResolution(resolutions, u.input, u.kind);

    return (
      <li key={`${u.kind}-${u.input}`} data-testid={`unmatched-row-${u.kind}-${u.input}`}>
        <strong>{u.input}</strong>

        {u.match.kind === 'fuzzy' && (
          <span>
            <span> → {u.match.name} </span>
            <span data-testid="confidence-pill">
              {t('confidence', { pct: Math.round(u.match.confidence * 100) })}
            </span>
            <button
              type="button"
              data-testid={`accept-${u.input}`}
              aria-pressed={current?.action === 'fuzzy-accept'}
              onClick={() => {
                if (u.match.kind !== 'fuzzy') return;
                onResolve({
                  input: u.input,
                  kind: u.kind,
                  resolvedId: u.match.id,
                  action: 'fuzzy-accept',
                });
              }}
            >
              {t('accept')}
            </button>
          </span>
        )}

        {u.match.kind === 'ambiguous' && (
          <select
            data-testid={`ambiguous-select-${u.input}`}
            value={current?.resolvedId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              onResolve({
                input: u.input,
                kind: u.kind,
                resolvedId: id,
                action: 'manual-pick',
              });
            }}
          >
            <option value="">{t('chooseOption')}</option>
            {u.match.kind === 'ambiguous' &&
              u.match.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}

        {u.match.kind === 'none' && (
          <select
            data-testid={`none-select-${u.input}`}
            value={current?.resolvedId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              onResolve({
                input: u.input,
                kind: u.kind,
                resolvedId: id,
                action: 'manual-pick',
              });
            }}
          >
            <option value="">{t('chooseOption')}</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          disabled
          title={t('markAsNewDisabled')}
          data-testid={`mark-new-${u.input}`}
        >
          {t('markAsNew')}
        </button>
      </li>
    );
  }

  return (
    <div data-testid="unmatched-names-panel">
      {persons.length > 0 && (
        <section>
          <h3>{t('personHeader')}</h3>
          <ul>{persons.map(renderRow)}</ul>
        </section>
      )}
      {projects.length > 0 && (
        <section>
          <h3>{t('projectHeader')}</h3>
          <ul>{projects.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}
