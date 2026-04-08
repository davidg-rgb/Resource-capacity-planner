ALTER TABLE "departments" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disciplines" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "departments_org_archived_idx" ON "departments" ("organization_id","archived_at");--> statement-breakpoint
CREATE INDEX "disciplines_org_archived_idx" ON "disciplines" ("organization_id","archived_at");--> statement-breakpoint
CREATE INDEX "programs_org_archived_idx" ON "programs" ("organization_id","archived_at");--> statement-breakpoint
CREATE INDEX "projects_org_archived_idx" ON "projects" ("organization_id","archived_at");
