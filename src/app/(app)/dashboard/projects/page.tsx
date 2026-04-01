'use client';

import { Suspense, useState } from 'react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { useProjects } from '@/hooks/use-projects';
import { ProjectDashboardContent } from './project-dashboard-content';

// ---------------------------------------------------------------------------
// Project selector
// ---------------------------------------------------------------------------

function ProjectSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { data: projects, isLoading } = useProjects({ status: 'active' });

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="project-select" className="text-on-surface-variant text-sm font-medium">
        Projekt:
      </label>
      <select
        id="project-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
        className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-md border px-3 py-1.5 text-sm"
      >
        <option value="">Alla projekt</option>
        {projects?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectDashboardPage() {
  const [projectId, setProjectId] = useState('');

  return (
    <>
      <Breadcrumbs />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-on-surface text-2xl font-semibold">
            Project Dashboard
          </h1>
          <p className="text-on-surface-variant font-body mt-1 text-sm">
            Project staffing, availability, and capacity at a glance.
          </p>
        </div>
        <ProjectSelector selectedId={projectId} onSelect={setProjectId} />
      </div>

      <Suspense
        fallback={
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border-outline-variant/30 bg-surface-container-low h-28 animate-pulse rounded-lg border"
                />
              ))}
            </div>
          </div>
        }
      >
        <ProjectDashboardContent projectId={projectId || undefined} />
      </Suspense>
    </>
  );
}
