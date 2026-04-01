CREATE TYPE "public"."scenario_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."scenario_visibility" AS ENUM('private', 'shared_readonly', 'shared_collaborative', 'published');--> statement-breakpoint
CREATE TYPE "public"."temp_entity_type" AS ENUM('person', 'project');--> statement-breakpoint
CREATE TABLE "scenario_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"person_id" uuid,
	"temp_entity_id" uuid,
	"project_id" uuid,
	"temp_project_name" varchar(200),
	"month" date NOT NULL,
	"hours" integer NOT NULL,
	"is_modified" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_removed" boolean DEFAULT false NOT NULL,
	"promoted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_temp_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "temp_entity_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"department_id" uuid,
	"discipline_id" uuid,
	"target_hours_per_month" integer DEFAULT 160,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(1000),
	"status" "scenario_status" DEFAULT 'draft' NOT NULL,
	"visibility" "scenario_visibility" DEFAULT 'private' NOT NULL,
	"created_by" text NOT NULL,
	"baseline_snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenario_allocations" ADD CONSTRAINT "scenario_allocations_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_allocations" ADD CONSTRAINT "scenario_allocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_allocations" ADD CONSTRAINT "scenario_allocations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_allocations" ADD CONSTRAINT "scenario_allocations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_temp_entities" ADD CONSTRAINT "scenario_temp_entities_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_temp_entities" ADD CONSTRAINT "scenario_temp_entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_temp_entities" ADD CONSTRAINT "scenario_temp_entities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_temp_entities" ADD CONSTRAINT "scenario_temp_entities_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenario_alloc_scenario_idx" ON "scenario_allocations" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "scenario_alloc_person_month_idx" ON "scenario_allocations" USING btree ("scenario_id","person_id","month");--> statement-breakpoint
CREATE INDEX "scenario_alloc_project_month_idx" ON "scenario_allocations" USING btree ("scenario_id","project_id","month");--> statement-breakpoint
CREATE INDEX "scenario_alloc_org_idx" ON "scenario_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scenario_temp_entities_scenario_idx" ON "scenario_temp_entities" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "scenario_temp_entities_type_idx" ON "scenario_temp_entities" USING btree ("scenario_id","entity_type");--> statement-breakpoint
CREATE INDEX "scenarios_org_status_idx" ON "scenarios" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "scenarios_org_created_by_idx" ON "scenarios" USING btree ("organization_id","created_by");--> statement-breakpoint
CREATE INDEX "scenarios_org_updated_idx" ON "scenarios" USING btree ("organization_id","updated_at");