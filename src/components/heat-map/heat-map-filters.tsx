'use client';

import { useDepartments, useDisciplines } from '@/hooks/use-reference-data';
import type { HeatMapFilters as HeatMapFiltersType } from '@/features/analytics/analytics.types';

interface HeatMapFiltersProps {
  filters: HeatMapFiltersType;
  onFilterChange: (key: string, value: string | null) => void;
}

const selectClasses =
  'rounded-sm border-none bg-surface-container-low focus:ring-primary px-3 py-2 text-xs focus:ring-1';

const inputClasses =
  'rounded-sm border-none bg-surface-container-low focus:ring-primary px-3 py-2 text-xs focus:ring-1';

export function HeatMapFilters({ filters, onFilterChange }: HeatMapFiltersProps) {
  const { data: departments } = useDepartments();
  const { data: disciplines } = useDisciplines();

  return (
    <div className="bg-surface-container-lowest border-outline-variant/10 mb-4 rounded-sm border p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Discipline filter */}
        <div className="flex items-center gap-2">
          <span className="text-outline text-[10px] font-bold tracking-widest uppercase">
            Discipline
          </span>
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
        </div>

        <div className="bg-outline-variant/20 mx-2 h-6 w-[1px]" />

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
    </div>
  );
}
