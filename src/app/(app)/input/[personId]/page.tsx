'use client';

import { use, useState } from 'react';

import { useAllocations, usePersonDetail } from '@/hooks/use-allocations';
import { useGridAutosave } from '@/hooks/use-grid-autosave';
import { useProjects } from '@/hooks/use-projects';
import { AllocationGrid } from '@/components/grid/allocation-grid';
import { PersonHeader } from '@/components/person/person-header';

/** Person Input Form -- the core product interface. */
export default function PersonInputPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  // Next.js 16: params is a Promise, unwrap with React 19 use()
  const { personId } = use(params);
  const { data: allocations, isLoading: allocLoading } = useAllocations(personId);
  const { data: person, isLoading: personLoading } = usePersonDetail(personId);
  const { data: projects } = useProjects();
  const { handleCellChange } = useGridAutosave(personId);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [addedProjects, setAddedProjects] = useState<
    { projectId: string; projectName: string }[]
  >([]);

  if (allocLoading || personLoading) {
    return (
      <div className="p-6 text-on-surface-variant">Loading allocations...</div>
    );
  }

  if (!person) {
    return <div className="p-6 text-error">Person not found</div>;
  }

  const handleAddProject = () => {
    setShowProjectSelector(true);
  };

  const handleProjectSelected = (projectId: string) => {
    if (!projectId) return;
    // Find project name from the projects list
    const project = projects?.find((p) => p.id === projectId);
    if (!project) return;

    // Check if already in grid (either from server allocations or already added)
    const alreadyExists =
      allocations?.some((a) => a.projectId === projectId) ||
      addedProjects.some((a) => a.projectId === projectId);
    if (alreadyExists) {
      setShowProjectSelector(false);
      return;
    }

    // Add to local state -- transformToGridRows will create a zero-hour row
    setAddedProjects((prev) => [
      ...prev,
      { projectId, projectName: project.name },
    ]);
    setShowProjectSelector(false);
  };

  return (
    <div className="space-y-4">
      <PersonHeader
        personId={personId}
        firstName={person.firstName}
        lastName={person.lastName}
        targetHours={person.targetHoursPerMonth}
      />

      <AllocationGrid
        allocations={allocations ?? []}
        targetHours={person.targetHoursPerMonth}
        personId={personId}
        addedProjects={addedProjects}
        onCellChange={handleCellChange}
        onAddProject={handleAddProject}
      />

      {showProjectSelector && projects && (
        <div className="rounded-lg border border-outline-variant bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-on-surface">
            Select a project to add:
          </p>
          <select
            className="w-full rounded border border-outline-variant bg-surface p-2 text-sm text-on-surface"
            onChange={(e) => handleProjectSelected(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Choose project...
            </option>
            {projects
              .filter(
                (p) =>
                  !allocations?.some((a) => a.projectId === p.id) &&
                  !addedProjects.some((a) => a.projectId === p.id),
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
}
