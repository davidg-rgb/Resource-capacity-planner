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
  /** Present when scope='person' — breakdown by project */
  projectId?: string;
  projectName?: string;
  /** Present when scope='project' or scope='department' — breakdown by person */
  personId?: string;
  personName?: string;
  hours: number;
}

// v6.0 — Phase 52 / Plan 52-04 (RD-02 / D-09 / Q3): additive response fields
// for the OvercommitDialog's two sections. Populated only when scope='department'
// (the only RD-02 caller). Rows[] is preserved for back-compat.
export interface OvercommitProject {
  id: string;
  name: string;
  plannedHours: number;
  /**
   * Fraction 0..1 of this dept/month's total planned hours that lands on this
   * project. NOTE: name was `pctOfOvercommit` but the math computed share of
   * total planned hours, not share of overcommit. Renamed in Round 1 audit
   * (CONS-P0-06) so the field name matches the value being computed.
   */
  pctOfTotalPlanned: number;
}

export interface OvercommitPerson {
  id: string;
  name: string;
  plannedHours: number;
  capacityHours: number;
  /** plannedHours - capacityHours. Positive when overbooked. */
  deltaHours: number;
}

export const DEFAULT_TARGET_HOURS_PER_MONTH = 160;
