// ---------------------------------------------------------------------------
// What-If Scenario Types
// ---------------------------------------------------------------------------

export type ScenarioStatus = 'draft' | 'active' | 'archived';
export type ScenarioVisibility =
  | 'private'
  | 'shared_readonly'
  | 'shared_collaborative'
  | 'published';

export interface Scenario {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ScenarioStatus;
  visibility: ScenarioVisibility;
  createdBy: string; // Clerk user ID
  baselineSnapshotAt: string; // ISO timestamp of when baseline was captured
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioAllocation {
  id: string;
  scenarioId: string;
  organizationId: string;
  personId: string | null; // null if temp entity
  tempEntityId: string | null; // null if real person
  projectId: string | null; // null if temp project
  tempProjectName: string | null;
  month: string; // YYYY-MM-DD (first of month)
  hours: number;
  isModified: boolean; // true if changed from baseline
  isNew: boolean; // true if added in scenario (not from baseline)
  isRemoved: boolean; // true if removed in scenario
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioTempEntity {
  id: string;
  scenarioId: string;
  organizationId: string;
  entityType: 'person' | 'project';
  name: string;
  departmentId: string | null;
  disciplineId: string | null;
  targetHoursPerMonth: number | null;
  createdAt: string;
}

// --- API Request/Response Types ---

export interface CreateScenarioRequest {
  name: string;
  description?: string;
  baseScenarioId?: string; // Clone from existing scenario instead of actual data
}

export interface UpdateScenarioRequest {
  name?: string;
  description?: string;
  status?: ScenarioStatus;
  visibility?: ScenarioVisibility;
}

export interface ScenarioAllocationUpsert {
  personId?: string;
  tempEntityId?: string;
  projectId?: string;
  tempProjectName?: string;
  month: string;
  hours: number;
}

export interface PromoteRequest {
  allocationIds: string[];
  confirmation: boolean; // Must be true
}

export interface PromoteResult {
  promoted: number;
  skipped: number;
  errors: string[];
}

export interface ScenarioImpact {
  actualUtilization: number;
  scenarioUtilization: number;
  actualOverloaded: number;
  scenarioOverloaded: number;
  actualBenchHours: number;
  scenarioBenchHours: number;
  newConflicts: number;
}

export interface ScenarioListItem {
  id: string;
  name: string;
  description: string | null;
  status: ScenarioStatus;
  visibility: ScenarioVisibility;
  createdBy: string;
  baselineSnapshotAt: string;
  allocationCount: number;
  modifiedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioComparisonRow {
  personId: string | null;
  tempEntityId: string | null;
  personName: string;
  departmentName: string;
  actualHours: number;
  actualUtilization: number;
  scenarioHours: number;
  scenarioUtilization: number;
  deltaHours: number;
  isNew: boolean;
  isRemoved: boolean;
  isOverloaded: boolean;
  targetHours: number;
}

export interface ScenarioComparisonResponse {
  rows: ScenarioComparisonRow[];
  summary: {
    actualTotalHours: number;
    scenarioTotalHours: number;
    actualUtilization: number;
    scenarioUtilization: number;
    deltaHours: number;
    newConflicts: string[]; // person names
  };
}

export interface CreateTempEntityRequest {
  entityType: 'person' | 'project';
  name: string;
  departmentId?: string;
  disciplineId?: string;
  targetHoursPerMonth?: number;
}
