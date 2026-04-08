'use client';

// v5.0 — Phase 41 / Plan 41-04 (UX-V5-10): /admin/change-log route.
// Renders the universal change log feed with a persona-scoped default
// filter per D-02. Page is read-only history and accessible to all
// personas; the filter bar lets the user clear or override defaults.

import { useMemo } from 'react';

import { ChangeLogFeed } from '@/components/change-log/change-log-feed';
import { usePersona } from '@/features/personas/persona.context';
import type { Persona } from '@/features/personas/persona.types';
import type { FeedFilter } from '@/features/change-log/change-log.types';

/**
 * Compute the default feed filter for a given persona.
 *
 * - pm: actor-scoped to this PM's persona id
 * - line-manager: personIds left empty (dept→members join is deferred —
 *   Wave 0 getFeed supports personIds only; the filter bar lets the LM
 *   narrow further). We still pass the departmentId via actorPersonaIds
 *   as a best-effort scoping signal.
 * - staff: limit to this person
 * - rd / admin: no default filter (full feed)
 */
function buildPersonaDefault(persona: Persona): FeedFilter {
  switch (persona.kind) {
    case 'pm':
      return { actorPersonaIds: [`pm:${persona.personId}`] };
    case 'line-manager':
      // Best-effort: scope by actor persona id. Department→members join
      // lands in a later wave; the user can narrow via the filter bar.
      return { actorPersonaIds: [`line-manager:${persona.departmentId}`] };
    case 'staff':
      return { personIds: [persona.personId] };
    case 'rd':
    case 'admin':
    default:
      return {};
  }
}

export default function AdminChangeLogPage() {
  const { persona } = usePersona();
  const initialFilter = useMemo(() => buildPersonaDefault(persona), [persona]);

  return (
    <div className="space-y-4 p-4" data-testid="admin-change-log-page">
      <h1 className="text-xl font-semibold">Change log</h1>
      <ChangeLogFeed initialFilter={initialFilter} projects={[]} people={[]} />
    </div>
  );
}
