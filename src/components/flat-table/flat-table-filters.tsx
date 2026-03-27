'use client';

import { usePeople } from '@/hooks/use-people';
import { useDepartments } from '@/hooks/use-reference-data';
import { useProjects } from '@/hooks/use-projects';

type FlatTableFiltersProps = {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
};

export function FlatTableFilters({ filters, onFilterChange }: FlatTableFiltersProps) {
  const { data: people } = usePeople();
  const { data: departments } = useDepartments();
  const { data: projects } = useProjects();

  const hasAnyFilter = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Person filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-person" className="text-on-surface-variant text-xs font-medium">
          Person
        </label>
        <select
          id="filter-person"
          value={filters.personId ?? ''}
          onChange={(e) => onFilterChange('personId', e.target.value || undefined)}
          className="border-outline-variant bg-surface text-on-surface min-w-[160px] rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="">All people</option>
          {people?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Project filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-project" className="text-on-surface-variant text-xs font-medium">
          Project
        </label>
        <select
          id="filter-project"
          value={filters.projectId ?? ''}
          onChange={(e) => onFilterChange('projectId', e.target.value || undefined)}
          className="border-outline-variant bg-surface text-on-surface min-w-[160px] rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Department filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-department" className="text-on-surface-variant text-xs font-medium">
          Department
        </label>
        <select
          id="filter-department"
          value={filters.departmentId ?? ''}
          onChange={(e) => onFilterChange('departmentId', e.target.value || undefined)}
          className="border-outline-variant bg-surface text-on-surface min-w-[160px] rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Month from */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-month-from" className="text-on-surface-variant text-xs font-medium">
          From month
        </label>
        <input
          id="filter-month-from"
          type="month"
          value={filters.monthFrom ?? ''}
          onChange={(e) => onFilterChange('monthFrom', e.target.value || undefined)}
          className="border-outline-variant bg-surface text-on-surface rounded-md border px-2 py-1.5 text-sm"
        />
      </div>

      {/* Month to */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-month-to" className="text-on-surface-variant text-xs font-medium">
          To month
        </label>
        <input
          id="filter-month-to"
          type="month"
          value={filters.monthTo ?? ''}
          onChange={(e) => onFilterChange('monthTo', e.target.value || undefined)}
          className="border-outline-variant bg-surface text-on-surface rounded-md border px-2 py-1.5 text-sm"
        />
      </div>

      {/* Clear filters */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => {
            onFilterChange('personId', undefined);
            onFilterChange('projectId', undefined);
            onFilterChange('departmentId', undefined);
            onFilterChange('monthFrom', undefined);
            onFilterChange('monthTo', undefined);
          }}
          className="text-on-surface-variant hover:text-on-surface py-1.5 text-xs font-medium underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
