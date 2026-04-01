/**
 * Types for team overview heat map analytics.
 * Used by the analytics service, API route, and client-side hook.
 */

export interface HeatMapCell {
  month: string; // YYYY-MM
  totalHours: number;
  targetHours: number;
}

export interface HeatMapPerson {
  personId: string;
  firstName: string;
  lastName: string;
  targetHours: number;
  disciplineAbbreviation?: string;
  months: Record<string, number>; // month (YYYY-MM) -> totalHours
}

export interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  people: HeatMapPerson[];
}

export interface HeatMapResponse {
  departments: DepartmentGroup[];
  months: string[]; // ordered YYYY-MM strings covering the range
  generatedAt: string; // ISO timestamp
}

export interface HeatMapFilters {
  departmentId?: string;
  disciplineId?: string;
  monthFrom: string; // YYYY-MM
  monthTo: string; // YYYY-MM
}

// --- Dashboard types (Phase 13) ---

export interface DashboardKPIs {
  totalPeople: number;
  utilizationPercent: number; // 0-100+ (can exceed 100 if overloaded)
  overloadedCount: number; // >100% utilization
  underutilizedCount: number; // <50% utilization
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
  utilizationRatio: number; // e.g. 1.25 = 125%, 0.3 = 30%
  severity: AlertSeverity;
}

// --- Project staffing types (Phase 14) ---

export interface ProjectStaffingPerson {
  personId: string;
  firstName: string;
  lastName: string;
  discipline: string; // abbreviation, e.g. "SW", "Mek", "Elnik"
  targetHoursPerMonth: number;
  months: Record<string, number>; // YYYY-MM -> hours allocated to this project
}

export interface ProjectStaffingResponse {
  projectId: string;
  projectName: string;
  programName: string | null; // parent program name, if any
  people: ProjectStaffingPerson[];
  months: string[]; // ordered YYYY-MM array
  generatedAt: string;
}

// --- Person Summary types (Phase 23 - Person 360 Card) ---

export type CapacityStatusLabel = 'available' | 'fully-allocated' | 'overloaded';

export interface PersonAllocation {
  projectId: string;
  projectName: string;
  role: string | null;
  percentage: number;
  startDate: string;
  endDate: string;
}

export interface PersonSummaryResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  department: { id: string; name: string } | null;
  disciplines: { id: string; name: string }[];
  utilizationPercent: number;
  capacityStatus: CapacityStatusLabel;
  activeAllocations: PersonAllocation[];
  totalFteEquivalent: number;
}

// --- v4.0 Dashboard Visualization types (Phase 24) ---

/** V1: Capacity Forecast Line Chart -- supply vs demand per month */
export interface CapacityForecastResponse {
  months: string[]; // Ordered YYYY-MM array
  supply: Record<string, number>; // YYYY-MM -> total target hours
  demand: Record<string, number>; // YYYY-MM -> total allocated hours
  gap: Record<string, number>; // YYYY-MM -> supply - demand (negative = deficit)
  summary: {
    surplusMonths: number;
    balancedMonths: number; // Within +/-5%
    deficitMonths: number;
  };
  generatedAt: string;
}

/** V2: Availability Timeline -- per-person, per-month allocation by project */
export interface AvailabilityTimelineResponse {
  departments: {
    departmentId: string;
    departmentName: string;
    people: {
      personId: string;
      firstName: string;
      lastName: string;
      disciplineAbbreviation: string;
      targetHoursPerMonth: number;
      months: Record<
        string,
        {
          totalAllocated: number;
          available: number; // target - allocated (min 0)
          utilizationPercent: number;
          projects: {
            projectId: string;
            projectName: string;
            hours: number;
            color: string; // Assigned from palette
          }[];
        }
      >;
    }[];
  }[];
  months: string[];
  summary: {
    totalAvailableHours: number;
    peopleWithAvailability: number;
  };
  generatedAt: string;
}

/** V3: Availability Search/Finder -- ranked list of available people */
export interface AvailabilitySearchResponse {
  results: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    disciplineName: string;
    departmentName: string;
    targetHoursPerMonth: number;
    months: Record<
      string,
      {
        allocated: number;
        available: number;
        utilizationPercent: number;
      }
    >;
    totalAvailable: number; // Sum across requested months
    avgUtilization: number;
  }[];
  total: number; // Total matching count
  generatedAt: string;
}

/** V4: Utilization Trends -- 6-month entity utilization history */
export interface UtilizationTrendsResponse {
  entities: {
    id: string;
    name: string;
    type: 'department' | 'person';
    headcount?: number; // Only for departments
    months: Record<string, number>; // YYYY-MM -> utilization %
    currentUtilization: number;
    changePercent: number; // vs 6 months ago
    direction: 'up' | 'down' | 'stable'; // +/-2% threshold for stable
    isOverloaded: boolean; // current > 100%
  }[];
  generatedAt: string;
}

/** V5: Capacity Distribution -- stacked breakdown by grouping dimension */
export interface CapacityDistributionResponse {
  groups: {
    id: string;
    name: string;
    color: string; // From palette
    months: Record<string, number>; // YYYY-MM -> hours
    totalHours: number;
    percentOfTotal: number;
  }[];
  other?: {
    // Aggregated remainder if > limit
    months: Record<string, number>;
    totalHours: number;
    percentOfTotal: number;
  };
  supply: Record<string, number>; // YYYY-MM -> total supply
  months: string[];
  insight?: string; // Auto-generated trend insight
  generatedAt: string;
}

/** V7: Person 360 Detail Card -- full pre-computed summary for a single person */
export interface PersonDetailResponse {
  personId: string;
  firstName: string;
  lastName: string;
  disciplineAbbreviation: string;
  disciplineName: string;
  departmentName: string;
  targetHoursPerMonth: number;
  currentMonth: {
    month: string;
    totalAllocated: number;
    utilizationPercent: number;
    status: 'healthy' | 'warning' | 'overloaded' | 'empty';
    projects: {
      projectId: string;
      projectName: string;
      hours: number;
      percentOfTarget: number;
      color: string;
    }[];
    available: number;
  };
  trend: {
    months: Record<string, number>; // Last 6 months utilization %
    changePercent: number;
    direction: 'up' | 'down' | 'stable';
  };
  upcomingAvailability: {
    month: string;
    available: number;
  }[]; // Next 3 months
  generatedAt: string;
}

/** V8: Bench/Idle Report -- people below utilization threshold */
export interface BenchReportResponse {
  summary: {
    totalBenchHours: number;
    fteEquivalent: number;
    peopleCount: number;
    trendVsPrevious: {
      previousBenchHours: number;
      changePercent: number;
      direction: 'up' | 'down' | 'stable';
    };
  };
  byDepartment: {
    departmentId: string;
    departmentName: string;
    benchHours: number;
    fteEquivalent: number;
    peopleCount: number;
  }[];
  byDiscipline: {
    disciplineId: string;
    disciplineName: string;
    benchHours: number;
    fteEquivalent: number;
    peopleCount: number;
  }[];
  topAvailable: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    departmentName: string;
    utilizationPercent: number;
    freeHoursPerMonth: number;
  }[];
  insight?: string; // Auto-generated suggestion
  generatedAt: string;
}

/** V9: Resource Conflicts -- people allocated >100% */
export interface ConflictsResponse {
  conflicts: {
    personId: string;
    firstName: string;
    lastName: string;
    disciplineAbbreviation: string;
    departmentName: string;
    targetHoursPerMonth: number;
    months: Record<
      string,
      {
        totalAllocated: number;
        overBy: number;
        projects: {
          projectId: string;
          projectName: string;
          hours: number;
        }[];
        suggestedResolution?: {
          projectId: string;
          projectName: string;
          reduceBy: number;
          newHours: number;
        };
      }
    >;
  }[];
  summary: {
    totalConflicts: number;
    resolvedThisMonth: number;
  };
  generatedAt: string;
}

/** V10: Program Rollup -- program-level aggregated capacity */
export interface ProgramRollupResponse {
  program: {
    programId: string;
    programName: string;
    projectCount: number;
    totalPeople: number;
    peakMonthlyHours: number;
  } | null; // null when "All Programs"
  staffingCompleteness: number; // Percentage
  disciplineCoverage: {
    disciplineId: string;
    disciplineName: string;
    abbreviation: string;
    coveragePercent: number;
    peopleCount: number;
    gapFte: number; // 0 if coverage >= 80%
  }[];
  monthlyLoad: Record<string, number>; // YYYY-MM -> total hours
  projects: {
    projectId: string;
    projectName: string;
    peopleCount: number;
    monthlyHours: number; // Average
    status: 'active' | 'planned' | 'archived';
  }[];
  gapAlert?: string; // Auto-generated
  generatedAt: string;
}

/** V11: Period Comparison -- two-period delta analysis */
export interface PeriodComparisonResponse {
  periodA: { from: string; to: string; label: string };
  periodB: { from: string; to: string; label: string };
  metrics: {
    name: string;
    valueA: number;
    valueB: number;
    delta: number;
    deltaPercent: number;
    signal: 'improving' | 'worsening' | 'neutral';
  }[];
  departments: {
    departmentId: string;
    departmentName: string;
    utilizationA: number;
    utilizationB: number;
    delta: number;
    note?: string; // e.g., "crossed 100%"
  }[];
  notableChanges: string[]; // Auto-generated bullet points
  generatedAt: string;
}

/** V12: Discipline Demand Heatmap -- per-discipline supply vs demand */
export interface DisciplineDemandResponse {
  disciplines: {
    disciplineId: string;
    disciplineName: string;
    abbreviation: string;
    months: Record<
      string,
      {
        demand: number; // Sum of allocations for people with this discipline
        supply: number; // Sum of target hours for people with this discipline
        gap: number; // supply - demand
        status: 'surplus' | 'balanced' | 'tight' | 'deficit';
      }
    >;
    peakDeficit: number; // Worst month gap
    peakDeficitMonth: string;
    sustainedDeficit: boolean; // 3+ consecutive deficit months
  }[];
  summary: {
    combinedPeakDeficit: number; // All disciplines combined
    fteHiringNeed: number; // deficit / avg target
  };
  generatedAt: string;
}
