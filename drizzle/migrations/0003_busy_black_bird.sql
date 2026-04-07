CREATE TYPE "public"."change_log_action" AS ENUM('ALLOCATION_EDITED', 'ALLOCATION_HISTORIC_EDITED', 'ALLOCATION_BULK_COPIED', 'PROPOSAL_SUBMITTED', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED', 'PROPOSAL_WITHDRAWN', 'PROPOSAL_EDITED', 'ACTUALS_BATCH_COMMITTED', 'ACTUALS_BATCH_ROLLED_BACK', 'REGISTER_ROW_CREATED', 'REGISTER_ROW_UPDATED', 'REGISTER_ROW_DELETED');--> statement-breakpoint
CREATE TYPE "public"."change_log_entity" AS ENUM('allocation', 'proposal', 'actual_entry', 'person', 'project', 'department', 'discipline', 'import_batch');--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_persona_id" text NOT NULL,
	"entity" "change_log_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "change_log_action" NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "change_log_org_created_idx" ON "change_log" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "change_log_org_entity_idx" ON "change_log" USING btree ("organization_id","entity","entity_id");--> statement-breakpoint
CREATE INDEX "change_log_org_action_created_idx" ON "change_log" USING btree ("organization_id","action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "change_log_actor_idx" ON "change_log" USING btree ("actor_persona_id");