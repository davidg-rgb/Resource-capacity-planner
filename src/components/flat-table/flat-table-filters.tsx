'use client';

import { useDepartments } from '@/hooks/use-reference-data';
import { useProjects } from '@/hooks/use-projects';

type FlatTableFiltersProps = {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
};

export function FlatTableFilters({ filters, onFilterChange }: FlatTableFiltersProps) {
  const { data: departments } = useDepartments();
  const { data: projects } = useProjects();

  const hasAnyFilter = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        {/* Person filter (searchable text input) */}
        <div className="flex flex-col">
          <label
            htmlFor="filter-person"
            className="text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase"
          >
            Person
          </label>
          <input
            id="filter-person"
            type="text"
            placeholder="Search by name..."
            value={filters.personName ?? ''}
            onChange={(e) => onFilterChange('personName', e.target.value || undefined)}
            className="bg-surface-container-low text-on-surface focus:ring-primary min-w-[160px] rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
          />
        </div>

        {/* Project filter */}
        <div className="flex flex-col">
          <label
            htmlFor="filter-project"
            className="text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase"
          >
            Project
          </label>
          <select
            id="filter-project"
            value={filters.projectId ?? ''}
            onChange={(e) => onFilterChange('projectId', e.target.value || undefined)}
            className="bg-surface-container-low text-on-surface focus:ring-primary min-w-[160px] rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
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
        <div className="flex flex-col">
          <label
            htmlFor="filter-department"
            className="text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase"
          >
            Department
          </label>
          <select
            id="filter-department"
            value={filters.departmentId ?? ''}
            onChange={(e) => onFilterChange('departmentId', e.target.value || undefined)}
            className="bg-surface-container-low text-on-surface focus:ring-primary min-w-[160px] rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
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
        <div className="flex flex-col">
          <label
            htmlFor="filter-month-from"
            className="text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase"
          >
            From month
          </label>
          <input
            id="filter-month-from"
            type="month"
            value={filters.monthFrom ?? ''}
            onChange={(e) => onFilterChange('monthFrom', e.target.value || undefined)}
            className="bg-surface-container-low text-on-surface focus:ring-primary rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
          />
        </div>

        {/* Month to */}
        <div className="flex flex-col">
          <label
            htmlFor="filter-month-to"
            className="text-outline mb-1.5 text-[10px] font-bold tracking-wider uppercase"
          >
            To month
          </label>
          <input
            id="filter-month-to"
            type="month"
            value={filters.monthTo ?? ''}
            onChange={(e) => onFilterChange('monthTo', e.target.value || undefined)}
            className="bg-surface-container-low text-on-surface focus:ring-primary rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
          />
        </div>

        {/* Clear filters */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('personName', undefined);
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
    </div>
  );
}
