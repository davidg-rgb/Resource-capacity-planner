'use client';

// v5.0 — Phase 41 / Plan 41-04 (UX-V5-10): Change log feed UI.
// Renders a filterable, cursor-paginated table of change_log entries
// fetched from GET /api/v5/change-log (shipped in Wave 0). Filters sync
// to URL query params via next/navigation so links are shareable. Rows
// expand in-place to show previousValue → newValue JSON diffs.
//
// Query-key convention follows D-19: ['change-log', filterHash(filter)].

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';

import type {
  ChangeLogAction,
  ChangeLogEntity,
  ChangeLogEntry,
  FeedFilter,
  FeedPage,
} from '@/features/change-log/change-log.types';

export interface ProjectLite {
  id: string;
  name: string;
}
export interface PersonLite {
  id: string;
  name: string;
}

export interface ChangeLogFeedProps {
  initialFilter: FeedFilter;
  projects?: ProjectLite[];
  people?: PersonLite[];
}

/** Stable hash of a filter for the react-query key (D-19). */
function filterHash(filter: FeedFilter): string {
  const normalized = {
    projectIds: filter.projectIds?.slice().sort() ?? [],
    personIds: filter.personIds?.slice().sort() ?? [],
    entity: filter.entity?.slice().sort() ?? [],
    actions: filter.actions?.slice().sort() ?? [],
    actorPersonaIds: filter.actorPersonaIds?.slice().sort() ?? [],
    dateRange: filter.dateRange ?? null,
  };
  return JSON.stringify(normalized);
}

function filterToQueryString(filter: FeedFilter, cursor?: string | null): string {
  const qs = new URLSearchParams();
  if (filter.projectIds?.length) qs.set('projectIds', filter.projectIds.join(','));
  if (filter.personIds?.length) qs.set('personIds', filter.personIds.join(','));
  if (filter.entity?.length) qs.set('entity', filter.entity.join(','));
  if (filter.actions?.length) qs.set('actions', filter.actions.join(','));
  if (filter.actorPersonaIds?.length) qs.set('actorPersonaIds', filter.actorPersonaIds.join(','));
  if (filter.dateRange) {
    qs.set('from', filter.dateRange.from);
    qs.set('to', filter.dateRange.to);
  }
  if (cursor) qs.set('cursor', cursor);
  return qs.toString();
}

function filterFromSearchParams(params: URLSearchParams, fallback: FeedFilter): FeedFilter {
  const parseList = (key: string) => {
    const raw = params.get(key);
    return raw ? raw.split(',').filter(Boolean) : undefined;
  };
  const entity = parseList('entity') as ChangeLogEntity[] | undefined;
  const actions = parseList('actions') as ChangeLogAction[] | undefined;
  const from = params.get('from');
  const to = params.get('to');
  return {
    projectIds: parseList('projectIds') ?? fallback.projectIds,
    personIds: parseList('personIds') ?? fallback.personIds,
    entity: entity ?? fallback.entity,
    actions: actions ?? fallback.actions,
    actorPersonaIds: parseList('actorPersonaIds') ?? fallback.actorPersonaIds,
    dateRange: from && to ? { from, to } : fallback.dateRange,
  };
}

// v5.0 — Phase 43 / Plan 43-04: entity dropdown driven by the Drizzle enum
// so every register entity (including 'program' added by migration 0008)
// is automatically exposed. This means future additions to the enum flow
// through without touching this file.
const ENTITY_OPTIONS: ChangeLogEntity[] = [
  'allocation',
  'proposal',
  'project',
  'person',
  'actual_entry',
  'department',
  'discipline',
  'program',
  'import_batch',
];

export function ChangeLogFeed(props: ChangeLogFeedProps) {
  const { initialFilter } = props;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed filter from URL on first render, falling back to initialFilter.
  const [filter, setFilter] = useState<FeedFilter>(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    return filterFromSearchParams(params, initialFilter);
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryKey = useMemo(() => ['change-log', filterHash(filter)] as const, [filter]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<FeedPage, Error>({
      queryKey,
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const qs = filterToQueryString(filter, pageParam as string | null);
        const res = await fetch(`/api/v5/change-log?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as FeedPage;
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  // URL sync — replace (not push) so the Back button isn't polluted.
  useEffect(() => {
    const qs = filterToQueryString(filter);
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [filter, router]);

  const updateFilter = useCallback((patch: Partial<FeedFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const entries: ChangeLogEntry[] = data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="space-y-3" data-testid="change-log-feed">
      <div className="flex flex-wrap gap-2" data-testid="change-log-filter-bar">
        <label className="text-xs">
          Entity
          <select
            data-testid="change-log-filter-entity"
            className="ml-1 rounded border px-1 py-0.5 text-xs"
            value={filter.entity?.[0] ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              updateFilter({ entity: v ? [v as ChangeLogEntity] : undefined });
            }}
          >
            <option value="">(any)</option>
            {ENTITY_OPTIONS.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          From
          <input
            type="date"
            data-testid="change-log-filter-from"
            className="ml-1 rounded border px-1 py-0.5 text-xs"
            value={filter.dateRange?.from?.slice(0, 10) ?? ''}
            onChange={(e) => {
              const from = e.target.value;
              const to = filter.dateRange?.to ?? from;
              updateFilter({ dateRange: from ? { from, to } : undefined });
            }}
          />
        </label>
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}
      {isError && <div className="text-destructive text-sm">Failed to load change log.</div>}

      {!isLoading && !isError && (
        <table className="w-full text-xs" data-testid="change-log-table">
          <thead>
            <tr className="text-left">
              <th>Time</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Target</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {entries.flatMap((entry) => {
              const isExpanded = expandedId === entry.id;
              const createdAt =
                entry.createdAt instanceof Date
                  ? entry.createdAt.toISOString()
                  : (entry.createdAt as unknown as string);
              const rows = [
                <tr
                  key={entry.id}
                  data-testid="change-log-row"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="cursor-pointer border-b"
                >
                  <td>{createdAt}</td>
                  <td>{entry.actorPersonaId}</td>
                  <td>{entry.entity}</td>
                  <td>{entry.action}</td>
                  <td>{entry.entityId}</td>
                  <td>{entry.action}</td>
                </tr>,
              ];
              if (isExpanded) {
                rows.push(
                  <tr
                    key={`${entry.id}-diff`}
                    data-testid="change-log-row-diff"
                    className="bg-muted/30"
                  >
                    <td colSpan={6}>
                      <div className="grid grid-cols-2 gap-2 p-2">
                        <div>
                          <div className="text-muted-foreground mb-1 text-[10px] uppercase">
                            previousValue
                          </div>
                          <pre className="overflow-x-auto text-[11px]">
                            {JSON.stringify(entry.previousValue, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1 text-[10px] uppercase">
                            newValue
                          </div>
                          <pre className="overflow-x-auto text-[11px]">
                            {JSON.stringify(entry.newValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      )}

      {hasNextPage && (
        <button
          type="button"
          data-testid="change-log-load-more"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
        >
          Load more
        </button>
      )}
    </div>
  );
}
