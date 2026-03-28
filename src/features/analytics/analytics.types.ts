/**
 * Types for team overview heat map analytics.
 * Used by the analytics service, API route, and client-side hook.
 */

export interface HeatMapCell {
  month: string;        // YYYY-MM
  totalHours: number;
  targetHours: number;
}

export interface HeatMapPerson {
  personId: string;
  firstName: string;
  lastName: string;
  targetHours: number;
  months: Record<string, number>; // month (YYYY-MM) -> totalHours
}

export interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  people: HeatMapPerson[];
}

export interface HeatMapResponse {
  departments: DepartmentGroup[];
  months: string[];     // ordered YYYY-MM strings covering the range
  generatedAt: string;  // ISO timestamp
}

export interface HeatMapFilters {
  departmentId?: string;
  disciplineId?: string;
  monthFrom: string;    // YYYY-MM
  monthTo: string;      // YYYY-MM
}
