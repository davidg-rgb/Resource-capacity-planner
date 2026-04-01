CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"clerk_user_id" text DEFAULT '__tenant_default__' NOT NULL,
	"dashboard_id" text NOT NULL,
	"device_class" text DEFAULT 'desktop' NOT NULL,
	"layout" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_dashboard_layout_user" UNIQUE("organization_id","clerk_user_id","dashboard_id","device_class")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_layouts_org_user_idx" ON "dashboard_layouts" USING btree ("organization_id","clerk_user_id");