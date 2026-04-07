import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'past_due',
  'cancelled',
  'suspended',
]);

export const projectStatusEnum = pgEnum('project_status', ['active', 'planned', 'archived']);

export const importStatusEnum = pgEnum('import_status', [
  'parsing',
  'mapped',
  'validated',
  'importing',
  'completed',
  'failed',
  // v5.0 — Phase 38 / Plan 38-02: actuals import pipeline two-stage flow.
  'staged',
  'committed',
]);

export const announcementSeverityEnum = pgEnum('announcement_severity', [
  'info',
  'warning',
  'critical',
]);

export const scenarioStatusEnum = pgEnum('scenario_status', ['draft', 'active', 'archived']);

export const scenarioVisibilityEnum = pgEnum('scenario_visibility', [
  'private',
  'shared_readonly',
  'shared_collaborative',
  'published',
]);

export const tempEntityTypeEnum = pgEnum('temp_entity_type', ['person', 'project']);

// v5.0 — FOUND-V5-04: universal change_log audit spine (ARCHITECTURE 6.6, 7.4)
export const changeLogEntityEnum = pgEnum('change_log_entity', [
  'allocation',
  'proposal',
  'actual_entry',
  'person',
  'project',
  'department',
  'discipline',
  'import_batch',
]);

export const changeLogActionEnum = pgEnum('change_log_action', [
  'ALLOCATION_EDITED',
  'ALLOCATION_HISTORIC_EDITED',
  'ALLOCATION_BULK_COPIED',
  'PROPOSAL_SUBMITTED',
  'PROPOSAL_APPROVED',
  'PROPOSAL_REJECTED',
  'PROPOSAL_WITHDRAWN',
  'PROPOSAL_EDITED',
  'ACTUALS_BATCH_COMMITTED',
  'ACTUALS_BATCH_ROLLED_BACK',
  'REGISTER_ROW_CREATED',
  'REGISTER_ROW_UPDATED',
  'REGISTER_ROW_DELETED',
  'ACTUAL_UPSERTED',
]);

// v5.0 — Phase 36: proposal + actual entry enums (ARCHITECTURE §7.1, §7.2)
export const proposalStatusEnum = pgEnum('proposal_status', [
  'proposed',
  'approved',
  'rejected',
  'withdrawn',
  'superseded',
]);

export const actualSourceEnum = pgEnum('actual_source', ['import', 'manual']);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// a) Organizations — root table (no organization_id on itself)
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedReason: varchar('suspended_reason', { length: 500 }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  creditBalanceCents: integer('credit_balance_cents').default(0).notNull(),
  platformNotes: varchar('platform_notes', { length: 2000 }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// b) Departments — tenant-scoped
export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('departments_org_name_uniq').on(t.organizationId, t.name)],
);

// c) Disciplines — tenant-scoped
export const disciplines = pgTable(
  'disciplines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 50 }).notNull(),
    abbreviation: varchar('abbreviation', { length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('disciplines_org_abbr_uniq').on(t.organizationId, t.abbreviation)],
);

// d) Programs — tenant-scoped
export const programs = pgTable(
  'programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique('programs_org_name_uniq').on(t.organizationId, t.name)],
);

// e) People — tenant-scoped, refs departments + disciplines
export const people = pgTable(
  'people',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    disciplineId: uuid('discipline_id')
      .notNull()
      .references(() => disciplines.id),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id),
    targetHoursPerMonth: integer('target_hours_per_month').default(160).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('people_org_archived_idx').on(t.organizationId, t.archivedAt),
    index('people_org_department_idx').on(t.organizationId, t.departmentId),
    index('people_org_discipline_idx').on(t.organizationId, t.disciplineId),
    index('people_org_sort_idx').on(t.organizationId, t.sortOrder),
  ],
);

// f) Projects — tenant-scoped, refs programs
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 200 }).notNull(),
    programId: uuid('program_id').references(() => programs.id),
    status: projectStatusEnum('status').default('active').notNull(),
    // v5.0 — PROP-02 / ARCHITECTURE §7.0: PM who owns planning for this project.
    leadPmPersonId: uuid('lead_pm_person_id').references(() => people.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('projects_org_status_idx').on(t.organizationId, t.status),
    unique('projects_org_name_uniq').on(t.organizationId, t.name),
    index('projects_program_idx').on(t.programId),
    index('projects_lead_pm_idx')
      .on(t.organizationId, t.leadPmPersonId)
      .where(sql`${t.leadPmPersonId} IS NOT NULL`),
  ],
);

// g) Allocations — tenant-scoped, refs people + projects
export const allocations = pgTable(
  'allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    month: date('month', { mode: 'string' }).notNull(),
    hours: integer('hours').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('allocations_org_person_project_month_uniq').on(
      t.organizationId,
      t.personId,
      t.projectId,
      t.month,
    ),
    index('allocations_org_person_month_idx').on(t.organizationId, t.personId, t.month),
    index('allocations_org_project_month_idx').on(t.organizationId, t.projectId, t.month),
    index('allocations_org_month_idx').on(t.organizationId, t.month),
    index('allocations_person_month_idx').on(t.personId, t.month),
  ],
);

// h) Import Sessions — tenant-scoped
export const importSessions = pgTable(
  'import_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id').notNull(),
    fileName: text('file_name').notNull(),
    status: importStatusEnum('status').notNull(),
    rowCount: integer('row_count').notNull(),
    parsedData: jsonb('parsed_data'),
    mappings: jsonb('mappings'),
    validationResult: jsonb('validation_result'),
    importResult: jsonb('import_result'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('import_sessions_org_status_idx').on(t.organizationId, t.status),
    index('import_sessions_expires_idx').on(t.expiresAt),
  ],
);

// i) Platform Admins — NOT tenant-scoped
export const platformAdmins = pgTable('platform_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// j) Impersonation Sessions — cross-tenant
export const impersonationSessions = pgTable(
  'impersonation_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => platformAdmins.id),
    targetOrgId: uuid('target_org_id')
      .notNull()
      .references(() => organizations.id),
    targetUserId: text('target_user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    actionCount: integer('action_count').default(0).notNull(),
  },
  (t) => [
    index('impersonation_admin_ended_idx').on(t.adminId, t.endedAt),
    index('impersonation_org_started_idx').on(t.targetOrgId, t.startedAt),
    index('impersonation_expires_idx').on(t.expiresAt),
  ],
);

// k) Platform Audit Log — cross-tenant
export const platformAuditLog = pgTable(
  'platform_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => platformAdmins.id),
    action: varchar('action', { length: 100 }).notNull(),
    targetOrgId: uuid('target_org_id').references(() => organizations.id),
    targetUserId: text('target_user_id'),
    impersonationSessionId: uuid('impersonation_session_id').references(
      () => impersonationSessions.id,
    ),
    details: jsonb('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_admin_created_idx').on(t.adminId, t.createdAt),
    index('audit_org_created_idx').on(t.targetOrgId, t.createdAt),
    index('audit_action_created_idx').on(t.action, t.createdAt),
    index('audit_impersonation_idx').on(t.impersonationSessionId),
    index('audit_created_idx').on(t.createdAt),
  ],
);

// l) Feature Flags — tenant-scoped
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    flagName: varchar('flag_name', { length: 100 }).notNull(),
    enabled: boolean('enabled').default(false).notNull(),
    setByAdminId: uuid('set_by_admin_id')
      .notNull()
      .references(() => platformAdmins.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('feature_flags_org_flag_uniq').on(t.organizationId, t.flagName),
    index('feature_flags_flag_name_idx').on(t.flagName),
  ],
);

// m) System Announcements — cross-tenant
export const systemAnnouncements = pgTable(
  'system_announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    body: varchar('body', { length: 2000 }).notNull(),
    severity: announcementSeverityEnum('severity').default('info').notNull(),
    targetOrgIds: uuid('target_org_ids').array(),
    createdByAdminId: uuid('created_by_admin_id')
      .notNull()
      .references(() => platformAdmins.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('announcements_schedule_idx').on(t.startsAt, t.expiresAt),
    index('announcements_admin_idx').on(t.createdByAdminId),
  ],
);

// n) Dashboard Layouts — tenant-scoped, user-customizable widget layouts
// clerk_user_id uses sentinel '__tenant_default__' instead of NULL for tenant
// defaults, because PostgreSQL does not enforce uniqueness on NULL values in
// standard unique indexes. When querying for tenant defaults, filter by
// clerk_user_id = '__tenant_default__'.
export const dashboardLayouts = pgTable(
  'dashboard_layouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clerkUserId: text('clerk_user_id').notNull().default('__tenant_default__'),
    dashboardId: text('dashboard_id').notNull(), // 'manager' | 'project-leader'
    deviceClass: text('device_class').notNull().default('desktop'),
    layout: jsonb('layout').notNull(), // WidgetPlacement[]
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('uq_dashboard_layout_user').on(
      t.organizationId,
      t.clerkUserId,
      t.dashboardId,
      t.deviceClass,
    ),
    index('dashboard_layouts_org_user_idx').on(t.organizationId, t.clerkUserId),
  ],
);

// o) Scenarios — tenant-scoped, what-if scenario containers
export const scenarios = pgTable(
  'scenarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }),
    status: scenarioStatusEnum('status').default('draft').notNull(),
    visibility: scenarioVisibilityEnum('visibility').default('private').notNull(),
    createdBy: text('created_by').notNull(), // Clerk user ID
    baselineSnapshotAt: timestamp('baseline_snapshot_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('scenarios_org_status_idx').on(t.organizationId, t.status),
    index('scenarios_org_created_by_idx').on(t.organizationId, t.createdBy),
    index('scenarios_org_updated_idx').on(t.organizationId, t.updatedAt),
  ],
);

// p) Scenario Allocations — scenario-scoped allocation data
export const scenarioAllocations = pgTable(
  'scenario_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    personId: uuid('person_id').references(() => people.id),
    tempEntityId: uuid('temp_entity_id'),
    projectId: uuid('project_id').references(() => projects.id),
    tempProjectName: varchar('temp_project_name', { length: 200 }),
    month: date('month', { mode: 'string' }).notNull(),
    hours: integer('hours').notNull(),
    isModified: boolean('is_modified').default(false).notNull(),
    isNew: boolean('is_new').default(false).notNull(),
    isRemoved: boolean('is_removed').default(false).notNull(),
    promotedAt: timestamp('promoted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('scenario_alloc_scenario_idx').on(t.scenarioId),
    index('scenario_alloc_person_month_idx').on(t.scenarioId, t.personId, t.month),
    index('scenario_alloc_project_month_idx').on(t.scenarioId, t.projectId, t.month),
    index('scenario_alloc_org_idx').on(t.organizationId),
  ],
);

// q) Scenario Temp Entities — hypothetical people/projects within a scenario
export const scenarioTempEntities = pgTable(
  'scenario_temp_entities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    entityType: tempEntityTypeEnum('entity_type').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    departmentId: uuid('department_id').references(() => departments.id),
    disciplineId: uuid('discipline_id').references(() => disciplines.id),
    targetHoursPerMonth: integer('target_hours_per_month').default(160),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('scenario_temp_entities_scenario_idx').on(t.scenarioId),
    index('scenario_temp_entities_type_idx').on(t.scenarioId, t.entityType),
  ],
);

// v5.0 — FOUND-V5-04: change_log (ARCHITECTURE 7.4)
export const changeLog = pgTable(
  'change_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorPersonaId: text('actor_persona_id').notNull(),
    entity: changeLogEntityEnum('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: changeLogActionEnum('action').notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    context: jsonb('context'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('change_log_org_created_idx').on(t.organizationId, t.createdAt.desc()),
    index('change_log_org_entity_idx').on(t.organizationId, t.entity, t.entityId),
    index('change_log_org_action_created_idx').on(t.organizationId, t.action, t.createdAt.desc()),
    index('change_log_actor_idx').on(t.actorPersonaId),
  ],
);

// v5.0 — Phase 36: import_batches (ARCHITECTURE §7.3 / IMP-01)
export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    importSessionId: uuid('import_session_id')
      .notNull()
      .references(() => importSessions.id),
    fileName: text('file_name').notNull(),
    committedBy: text('committed_by').notNull(),
    committedAt: timestamp('committed_at', { withTimezone: true }).defaultNow().notNull(),
    overrideManualEdits: boolean('override_manual_edits').notNull(),
    rowsInserted: integer('rows_inserted').notNull(),
    rowsUpdated: integer('rows_updated').notNull(),
    rowsSkippedManual: integer('rows_skipped_manual').notNull(),
    rowsSkippedPriorBatch: integer('rows_skipped_prior_batch').default(0).notNull(),
    reversalPayload: jsonb('reversal_payload'),
    rolledBackAt: timestamp('rolled_back_at', { withTimezone: true }),
    rolledBackBy: text('rolled_back_by'),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
    supersededByBatchId: uuid('superseded_by_batch_id').references(
      (): AnyPgColumn => importBatches.id,
    ),
  },
  (t) => [
    index('batches_org_committed_idx').on(t.organizationId, t.committedAt.desc()),
    index('batches_org_rollback_idx')
      .on(t.organizationId, t.rolledBackAt)
      .where(sql`${t.rolledBackAt} IS NULL`),
  ],
);

// v5.0 — Phase 36: actual_entries (ARCHITECTURE §7.2 / ACT-01)
export const actualEntries = pgTable(
  'actual_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    date: date('date', { mode: 'string' }).notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    source: actualSourceEnum('source').notNull(),
    importBatchId: uuid('import_batch_id').references(() => importBatches.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('actuals_org_person_project_date_uniq').on(
      t.organizationId,
      t.personId,
      t.projectId,
      t.date,
    ),
    index('actuals_org_date_idx').on(t.organizationId, t.date),
    index('actuals_org_person_date_idx').on(t.organizationId, t.personId, t.date),
    index('actuals_org_project_date_idx').on(t.organizationId, t.projectId, t.date),
    index('actuals_batch_idx').on(t.importBatchId),
  ],
);

// v5.0 — Phase 36: allocation_proposals (ARCHITECTURE §7.1 / PROP-01)
export const allocationProposals = pgTable(
  'allocation_proposals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    month: date('month', { mode: 'string' }).notNull(),
    proposedHours: numeric('proposed_hours', { precision: 5, scale: 2 }).notNull(),
    note: varchar('note', { length: 1000 }),
    status: proposalStatusEnum('status').default('proposed').notNull(),
    rejectionReason: varchar('rejection_reason', { length: 1000 }),
    requestedBy: text('requested_by').notNull(),
    decidedBy: text('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    parentProposalId: uuid('parent_proposal_id').references(
      (): AnyPgColumn => allocationProposals.id,
      { onDelete: 'restrict' },
    ),
    targetDepartmentId: uuid('target_department_id')
      .notNull()
      .references(() => departments.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('proposals_org_status_idx').on(t.organizationId, t.status),
    index('proposals_org_dept_status_idx').on(t.organizationId, t.targetDepartmentId, t.status),
    index('proposals_org_person_status_idx').on(t.organizationId, t.personId, t.status),
    index('proposals_org_person_project_month_idx').on(
      t.organizationId,
      t.personId,
      t.projectId,
      t.month,
    ),
    index('proposals_requester_idx').on(t.requestedBy),
    index('proposals_parent_idx').on(t.parentProposalId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  people: many(people),
  projects: many(projects),
  programs: many(programs),
  departments: many(departments),
  disciplines: many(disciplines),
  allocations: many(allocations),
  featureFlags: many(featureFlags),
  importSessions: many(importSessions),
  impersonationSessions: many(impersonationSessions),
  dashboardLayouts: many(dashboardLayouts),
  scenarios: many(scenarios),
  importBatches: many(importBatches),
  actualEntries: many(actualEntries),
  allocationProposals: many(allocationProposals),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  people: many(people),
  allocationProposals: many(allocationProposals),
}));

export const disciplinesRelations = relations(disciplines, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [disciplines.organizationId],
    references: [organizations.id],
  }),
  people: many(people),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [programs.organizationId],
    references: [organizations.id],
  }),
  projects: many(projects),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [people.organizationId],
    references: [organizations.id],
  }),
  discipline: one(disciplines, {
    fields: [people.disciplineId],
    references: [disciplines.id],
  }),
  department: one(departments, {
    fields: [people.departmentId],
    references: [departments.id],
  }),
  allocations: many(allocations),
  actualEntries: many(actualEntries),
  allocationProposals: many(allocationProposals),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  program: one(programs, {
    fields: [projects.programId],
    references: [programs.id],
  }),
  leadPm: one(people, {
    fields: [projects.leadPmPersonId],
    references: [people.id],
  }),
  allocations: many(allocations),
  actualEntries: many(actualEntries),
  allocationProposals: many(allocationProposals),
}));

export const allocationsRelations = relations(allocations, ({ one }) => ({
  organization: one(organizations, {
    fields: [allocations.organizationId],
    references: [organizations.id],
  }),
  person: one(people, {
    fields: [allocations.personId],
    references: [people.id],
  }),
  project: one(projects, {
    fields: [allocations.projectId],
    references: [projects.id],
  }),
}));

export const importSessionsRelations = relations(importSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [importSessions.organizationId],
    references: [organizations.id],
  }),
}));

export const platformAdminsRelations = relations(platformAdmins, ({ many }) => ({
  auditLogs: many(platformAuditLog),
  impersonationSessions: many(impersonationSessions),
  featureFlags: many(featureFlags),
  systemAnnouncements: many(systemAnnouncements),
}));

export const impersonationSessionsRelations = relations(impersonationSessions, ({ one, many }) => ({
  admin: one(platformAdmins, {
    fields: [impersonationSessions.adminId],
    references: [platformAdmins.id],
  }),
  targetOrganization: one(organizations, {
    fields: [impersonationSessions.targetOrgId],
    references: [organizations.id],
  }),
  auditLogs: many(platformAuditLog),
}));

export const platformAuditLogRelations = relations(platformAuditLog, ({ one }) => ({
  admin: one(platformAdmins, {
    fields: [platformAuditLog.adminId],
    references: [platformAdmins.id],
  }),
  targetOrganization: one(organizations, {
    fields: [platformAuditLog.targetOrgId],
    references: [organizations.id],
  }),
  impersonationSession: one(impersonationSessions, {
    fields: [platformAuditLog.impersonationSessionId],
    references: [impersonationSessions.id],
  }),
}));

export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  organization: one(organizations, {
    fields: [featureFlags.organizationId],
    references: [organizations.id],
  }),
  setByAdmin: one(platformAdmins, {
    fields: [featureFlags.setByAdminId],
    references: [platformAdmins.id],
  }),
}));

export const systemAnnouncementsRelations = relations(systemAnnouncements, ({ one }) => ({
  createdByAdmin: one(platformAdmins, {
    fields: [systemAnnouncements.createdByAdminId],
    references: [platformAdmins.id],
  }),
}));

export const dashboardLayoutsRelations = relations(dashboardLayouts, ({ one }) => ({
  organization: one(organizations, {
    fields: [dashboardLayouts.organizationId],
    references: [organizations.id],
  }),
}));

export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [scenarios.organizationId],
    references: [organizations.id],
  }),
  allocations: many(scenarioAllocations),
  tempEntities: many(scenarioTempEntities),
}));

export const scenarioAllocationsRelations = relations(scenarioAllocations, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [scenarioAllocations.scenarioId],
    references: [scenarios.id],
  }),
  organization: one(organizations, {
    fields: [scenarioAllocations.organizationId],
    references: [organizations.id],
  }),
  person: one(people, {
    fields: [scenarioAllocations.personId],
    references: [people.id],
  }),
  project: one(projects, {
    fields: [scenarioAllocations.projectId],
    references: [projects.id],
  }),
}));

export const scenarioTempEntitiesRelations = relations(scenarioTempEntities, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [scenarioTempEntities.scenarioId],
    references: [scenarios.id],
  }),
  organization: one(organizations, {
    fields: [scenarioTempEntities.organizationId],
    references: [organizations.id],
  }),
  department: one(departments, {
    fields: [scenarioTempEntities.departmentId],
    references: [departments.id],
  }),
  discipline: one(disciplines, {
    fields: [scenarioTempEntities.disciplineId],
    references: [disciplines.id],
  }),
}));

// v5.0 — Phase 36 relations
export const importBatchesRelations = relations(importBatches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [importBatches.organizationId],
    references: [organizations.id],
  }),
  importSession: one(importSessions, {
    fields: [importBatches.importSessionId],
    references: [importSessions.id],
  }),
  supersededByBatch: one(importBatches, {
    fields: [importBatches.supersededByBatchId],
    references: [importBatches.id],
    relationName: 'batch_supersession',
  }),
  actualEntries: many(actualEntries),
}));

export const actualEntriesRelations = relations(actualEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [actualEntries.organizationId],
    references: [organizations.id],
  }),
  person: one(people, {
    fields: [actualEntries.personId],
    references: [people.id],
  }),
  project: one(projects, {
    fields: [actualEntries.projectId],
    references: [projects.id],
  }),
  importBatch: one(importBatches, {
    fields: [actualEntries.importBatchId],
    references: [importBatches.id],
  }),
}));

export const allocationProposalsRelations = relations(allocationProposals, ({ one }) => ({
  organization: one(organizations, {
    fields: [allocationProposals.organizationId],
    references: [organizations.id],
  }),
  person: one(people, {
    fields: [allocationProposals.personId],
    references: [people.id],
  }),
  project: one(projects, {
    fields: [allocationProposals.projectId],
    references: [projects.id],
  }),
  targetDepartment: one(departments, {
    fields: [allocationProposals.targetDepartmentId],
    references: [departments.id],
  }),
  parentProposal: one(allocationProposals, {
    fields: [allocationProposals.parentProposalId],
    references: [allocationProposals.id],
    relationName: 'proposal_chain',
  }),
}));
