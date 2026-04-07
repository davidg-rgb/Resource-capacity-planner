CREATE TYPE "public"."actual_source" AS ENUM('import', 'manual');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('proposed', 'approved', 'rejected', 'withdrawn', 'superseded');--> statement-breakpoint
CREATE TABLE "actual_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"source" "actual_source" NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actuals_org_person_project_date_uniq" UNIQUE("organization_id","person_id","project_id","date")
);
--> statement-breakpoint
CREATE TABLE "allocation_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"month" date NOT NULL,
	"proposed_hours" numeric(5, 2) NOT NULL,
	"note" varchar(1000),
	"status" "proposal_status" DEFAULT 'proposed' NOT NULL,
	"rejection_reason" varchar(1000),
	"requested_by" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"parent_proposal_id" uuid,
	"target_department_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"import_session_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"committed_by" text NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"override_manual_edits" boolean NOT NULL,
	"rows_inserted" integer NOT NULL,
	"rows_updated" integer NOT NULL,
	"rows_skipped_manual" integer NOT NULL,
	"rows_skipped_prior_batch" integer DEFAULT 0 NOT NULL,
	"reversal_payload" jsonb,
	"rolled_back_at" timestamp with time zone,
	"rolled_back_by" text,
	"superseded_at" timestamp with time zone,
	"superseded_by_batch_id" uuid
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lead_pm_person_id" uuid;--> statement-breakpoint
ALTER TABLE "actual_entries" ADD CONSTRAINT "actual_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entries" ADD CONSTRAINT "actual_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entries" ADD CONSTRAINT "actual_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actual_entries" ADD CONSTRAINT "actual_entries_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_proposals" ADD CONSTRAINT "allocation_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_proposals" ADD CONSTRAINT "allocation_proposals_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_proposals" ADD CONSTRAINT "allocation_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_proposals" ADD CONSTRAINT "allocation_proposals_parent_proposal_id_allocation_proposals_id_fk" FOREIGN KEY ("parent_proposal_id") REFERENCES "public"."allocation_proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_proposals" ADD CONSTRAINT "allocation_proposals_target_department_id_departments_id_fk" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_import_session_id_import_sessions_id_fk" FOREIGN KEY ("import_session_id") REFERENCES "public"."import_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_superseded_by_batch_id_import_batches_id_fk" FOREIGN KEY ("superseded_by_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actuals_org_date_idx" ON "actual_entries" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "actuals_org_person_date_idx" ON "actual_entries" USING btree ("organization_id","person_id","date");--> statement-breakpoint
CREATE INDEX "actuals_org_project_date_idx" ON "actual_entries" USING btree ("organization_id","project_id","date");--> statement-breakpoint
CREATE INDEX "actuals_batch_idx" ON "actual_entries" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "proposals_org_status_idx" ON "allocation_proposals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "proposals_org_dept_status_idx" ON "allocation_proposals" USING btree ("organization_id","target_department_id","status");--> statement-breakpoint
CREATE INDEX "proposals_org_person_status_idx" ON "allocation_proposals" USING btree ("organization_id","person_id","status");--> statement-breakpoint
CREATE INDEX "proposals_org_person_project_month_idx" ON "allocation_proposals" USING btree ("organization_id","person_id","project_id","month");--> statement-breakpoint
CREATE INDEX "proposals_requester_idx" ON "allocation_proposals" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "proposals_parent_idx" ON "allocation_proposals" USING btree ("parent_proposal_id");--> statement-breakpoint
CREATE INDEX "batches_org_committed_idx" ON "import_batches" USING btree ("organization_id","committed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "batches_org_rollback_idx" ON "import_batches" USING btree ("organization_id","rolled_back_at") WHERE "import_batches"."rolled_back_at" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_pm_person_id_people_id_fk" FOREIGN KEY ("lead_pm_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_lead_pm_idx" ON "projects" USING btree ("organization_id","lead_pm_person_id") WHERE "projects"."lead_pm_person_id" IS NOT NULL;