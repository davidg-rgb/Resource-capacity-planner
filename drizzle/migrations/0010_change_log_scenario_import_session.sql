-- v7.0 Phase 56 (CHLOG-01): extend the change_log audit spine to cover
-- scenario, scenario_allocation, and import_session lifecycle mutations.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block and cannot be
-- dropped once added; each statement is idempotent (IF NOT EXISTS) and split by
-- a statement-breakpoint so it commits independently. Mirrors migration 0008.
ALTER TYPE "public"."change_log_entity" ADD VALUE IF NOT EXISTS 'scenario';--> statement-breakpoint
ALTER TYPE "public"."change_log_entity" ADD VALUE IF NOT EXISTS 'scenario_allocation';--> statement-breakpoint
ALTER TYPE "public"."change_log_entity" ADD VALUE IF NOT EXISTS 'import_session';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'SCENARIO_CREATED';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'SCENARIO_UPDATED';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'SCENARIO_DELETED';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'SCENARIO_ALLOCATIONS_UPSERTED';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'IMPORT_SESSION_STAGED';--> statement-breakpoint
ALTER TYPE "public"."change_log_action" ADD VALUE IF NOT EXISTS 'IMPORT_SESSION_CANCELLED';
