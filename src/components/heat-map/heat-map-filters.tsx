'use client';

import { useDepartments, useDisciplines } from '@/hooks/use-reference-data';
import type { HeatMapFilters as HeatMapFiltersType } from '@/features/analytics/analytics.types';

interface HeatMapFiltersProps {
  filters: HeatMapFiltersType;
  onFilterChange: (key: string, value: string | null) => void;
}

const selectClasses =
  'rounded-md border border-outline bg-surface px-3 py-1.5 text-sm text-on-surface';

const inputClasses =
  'rounded-md border border-outline bg-surface px-3 py-1.5 text-sm text-on-surface';

export function HeatMapFilters({ filters, onFilterChange }: HeatMapFiltersProps) {
  const { data: departments } = useDepartments();
  const { data: disciplines } = useDisciplines();

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      {/* Department select */}
      <select
        value={filters.departmentId ?? ''}
        onChange={(e) => onFilterChange('dept', e.target.value || null)}
        className={selectClasses}
      >
        <option value="">All Departments</option>
        {departments?.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>

      {/* Discipline select */}
      <select
        value={filters.disciplineId ?? ''}
        onChange={(e) => onFilterChange('disc', e.target.value || null)}
        className={selectClasses}
      >
        <option value="">All Disciplines</option>
        {disciplines?.map((disc) => (
          <option key={disc.id} value={disc.id}>
            {disc.name}
          </option>
        ))}
      </select>

      {/* From month */}
      <input
        type="month"
        value={filters.monthFrom}
        onChange={(e) => onFilterChange('from', e.target.value)}
        className={inputClasses}
      />

      {/* To month */}
      <input
        type="month"
        value={filters.monthTo}
        onChange={(e) => onFilterChange('to', e.target.value)}
        className={inputClasses}
      />
    </div>
  );
}
