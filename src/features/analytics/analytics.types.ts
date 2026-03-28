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

// --- Dashboard types (Phase 13) ---

export interface DashboardKPIs {
  totalPeople: number;
  utilizationPercent: number;   // 0-100+ (can exceed 100 if overloaded)
  overloadedCount: number;      // >100% utilization
  underutilizedCount: number;   // <50% utilization
}

export interface DepartmentUtilization {
  departmentId: string;
  departmentName: string;
  utilizationPercent: number;
}

export interface DisciplineBreakdown {
  disciplineId: string;
  disciplineName: string;
  totalHours: number;
}

// --- Alert types (Phase 14) ---

export type AlertSeverity = 'overloaded' | 'underutilized';

export interface CapacityAlert {
  personId: string;
  firstName: string;
  lastName: string;
  departmentName: string;
  totalTarget: number;
  totalAllocated: number;
  utilizationRatio: number;   // e.g. 1.25 = 125%, 0.3 = 30%
  severity: AlertSeverity;
}

// --- Project staffing types (Phase 14) ---

export interface ProjectStaffingPerson {
  personId: string;
  firstName: string;
  lastName: string;
  targetHoursPerMonth: number;
  months: Record<string, number>; // YYYY-MM -> hours allocated to this project
}

export interface ProjectStaffingResponse {
  projectId: string;
  projectName: string;
  people: ProjectStaffingPerson[];
  months: string[];       // ordered YYYY-MM array
  generatedAt: string;
}
