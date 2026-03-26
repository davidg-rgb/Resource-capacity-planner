import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
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
]);

export const announcementSeverityEnum = pgEnum('announcement_severity', [
  'info',
  'warning',
  'critical',
]);

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
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  people: many(people),
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
  allocations: many(allocations),
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
