// v5.0 — Phase 41 / Plan 41-01: capacity read-model types (UX-V5-04, D-04..D-08).
//
// Status enum is intentionally 4 values; the UI may apply additional shading
// inside the 'ok' band. Thresholds: under <60, ok 60..100, over >100, absent
// when targetHours === 0 (per ARCHITECTURE §945 / 41-CONTEXT D-05).

export type CapacityStatus = 'under' | 'ok' | 'over' | 'absent';

export interface UtilizationCell {
  personId: string;
  monthKey: string; // 'YYYY-MM'
  plannedHours: number;
  targetHours: number;
  /** True when targetHours fell back to the 160 default (people.target_hours_per_month was null). */
  targetIsDefault: boolean;
  utilizationPct: number;
  status: CapacityStatus;
}

export interface PersonLite {
  id: string;
  name: string;
  departmentId: string | null;
}

export interface UtilizationMap {
  cells: UtilizationCell[];
  people: PersonLite[];
}

export interface BreakdownRow {
  projectId: string;
  projectName: string;
  hours: number;
}

export const DEFAULT_TARGET_HOURS_PER_MONTH = 160;
