'use client';

import { useDepartments, useDisciplines } from '@/hooks/use-reference-data';
import { useProjects } from '@/hooks/use-projects';

type FlatTableFiltersProps = {
  filters: Record<string, string | undefined>;
  onFilterChange: (key: string, value: string | undefined) => void;
};

export function FlatTableFilters({ filters, onFilterChange }: FlatTableFiltersProps) {
  const { data: departments } = useDepartments();
  const { data: disciplines } = useDisciplines();
  const { data: projects } = useProjects();

  const hasAnyFilter = Object.entries(filters).some(
    ([k, v]) => v !== undefined && v !== '' && k !== 'page' && k !== 'pageSize',
  );

  return (
    <div className="bg-surface-container-lowest border-outline-variant/10 flex flex-1 flex-wrap items-center gap-4 rounded-sm border p-5 shadow-sm">
      {/* Person filter */}
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="filter-person"
          className="text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase"
        >
          Person
        </label>
        <input
          id="filter-person"
          type="text"
          placeholder="All Personnel"
          value={filters.personName ?? ''}
          onChange={(e) => onFilterChange('personName', e.target.value || undefined)}
          className="bg-surface-container-low focus:ring-primary w-full cursor-pointer appearance-none rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
        />
      </div>

      {/* Discipline filter */}
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="filter-discipline"
          className="text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase"
        >
          Discipline
        </label>
        <select
          id="filter-discipline"
          value={filters.disciplineId ?? ''}
          onChange={(e) => onFilterChange('disciplineId', e.target.value || undefined)}
          className="bg-surface-container-low focus:ring-primary w-full cursor-pointer appearance-none rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
        >
          <option value="">All Disciplines</option>
          {disciplines?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.abbreviation} ({d.name})
            </option>
          ))}
        </select>
      </div>

      {/* Department filter */}
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="filter-department"
          className="text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase"
        >
          Dept
        </label>
        <select
          id="filter-department"
          value={filters.departmentId ?? ''}
          onChange={(e) => onFilterChange('departmentId', e.target.value || undefined)}
          className="bg-surface-container-low focus:ring-primary w-full cursor-pointer appearance-none rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
        >
          <option value="">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project filter */}
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="filter-project"
          className="text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase"
        >
          Project
        </label>
        <select
          id="filter-project"
          value={filters.projectId ?? ''}
          onChange={(e) => onFilterChange('projectId', e.target.value || undefined)}
          className="bg-surface-container-low focus:ring-primary w-full cursor-pointer appearance-none rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
        >
          <option value="">All Projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date range filter */}
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="filter-month-from"
          className="text-outline mb-1.5 block text-[10px] font-bold tracking-wider uppercase"
        >
          Date Range
        </label>
        <input
          id="filter-month-from"
          type="month"
          value={filters.monthFrom ?? ''}
          onChange={(e) => onFilterChange('monthFrom', e.target.value || undefined)}
          className="bg-surface-container-low focus:ring-primary w-full cursor-pointer appearance-none rounded-sm border-none px-3 py-2 text-xs focus:ring-1"
        />
      </div>

      {/* Reset filters */}
      {hasAnyFilter && (
        <div className="self-end pb-0.5">
          <button
            type="button"
            onClick={() => {
              onFilterChange('personName', undefined);
              onFilterChange('disciplineId', undefined);
              onFilterChange('projectId', undefined);
              onFilterChange('departmentId', undefined);
              onFilterChange('monthFrom', undefined);
              onFilterChange('monthTo', undefined);
            }}
            className="text-outline hover:text-primary p-2 transition-colors"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined">filter_list_off</span>
          </button>
        </div>
      )}
    </div>
  );
}
