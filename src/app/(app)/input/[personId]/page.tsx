'use client';

import { use, useEffect, useState } from 'react';

import { useAllocations, usePersonDetail } from '@/hooks/use-allocations';
import { useGridAutosave } from '@/hooks/use-grid-autosave';
import { useProjects } from '@/hooks/use-projects';
import { AllocationGrid } from '@/components/grid/allocation-grid';
import { GridFooter } from '@/components/grid/grid-footer';
import { PersonHeader } from '@/components/person/person-header';
import { PersonAnalytics } from '@/components/person/person-analytics';

/** Person Input Form -- the core product interface. */
export default function PersonInputPage({ params }: { params: Promise<{ personId: string }> }) {
  // Next.js 16: params is a Promise, unwrap with React 19 use()
  const { personId } = use(params);
  const { data: allocations, isLoading: allocLoading } = useAllocations(personId);
  const { data: person, isLoading: personLoading } = usePersonDetail(personId);
  const { data: projects } = useProjects();
  const { handleCellChange, initUpdatedAtFromAllocations } = useGridAutosave(personId);

  // Seed conflict-detection updatedAt map when allocations load (GAP-CONF-001)
  useEffect(() => {
    if (allocations) initUpdatedAtFromAllocations(allocations);
  }, [allocations, initUpdatedAtFromAllocations]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [addedProjects, setAddedProjects] = useState<{ projectId: string; projectName: string }[]>(
    [],
  );

  if (allocLoading || personLoading) {
    return <div className="text-on-surface-variant p-6">Laddar allokeringar...</div>;
  }

  if (!person) {
    return <div className="text-error p-6">Person hittades inte</div>;
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
    setAddedProjects((prev) => [...prev, { projectId, projectName: project.name }]);
    setShowProjectSelector(false);
  };

  return (
    <div className="space-y-6">
      <PersonHeader
        personId={personId}
        firstName={person.firstName}
        lastName={person.lastName}
        targetHours={person.targetHoursPerMonth}
        discipline={person.disciplineName}
        department={person.departmentName}
      />

      <AllocationGrid
        allocations={allocations ?? []}
        targetHours={person.targetHoursPerMonth}
        personId={personId}
        addedProjects={addedProjects}
        onCellChange={handleCellChange}
        onAddProject={handleAddProject}
      />

      <GridFooter />

      <PersonAnalytics />

      {showProjectSelector && projects && (
        <div className="border-outline-variant bg-surface rounded-sm border p-4">
          <p className="text-on-surface mb-2 text-sm font-medium">Valj projekt att lagga till:</p>
          <select
            className="border-outline-variant bg-surface text-on-surface w-full rounded border p-2 text-sm"
            onChange={(e) => handleProjectSelected(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Valj projekt...
            </option>
            {projects
              .filter(
                (p) =>
                  p.status === 'active' &&
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
