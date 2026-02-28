CREATE TABLE "courses" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"dept" varchar(8) NOT NULL,
	"code" varchar(8) NOT NULL,
	"title" text NOT NULL,
	"credits" numeric(3, 1) DEFAULT '3.0' NOT NULL,
	"description" text,
	"prerequisites" jsonb,
	"corequisites" text[] DEFAULT '{}'::text[] NOT NULL,
	"terms_offered" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"course_id" varchar(16) NOT NULL,
	"year" smallint NOT NULL,
	"term" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_course_unique" UNIQUE("plan_id","course_id"),
	CONSTRAINT "year_range" CHECK ("plan_entries"."year" BETWEEN 1 AND 5),
	CONSTRAINT "term_values" CHECK ("plan_entries"."term" IN ('W1', 'W2', 'S')),
	CONSTRAINT "status_values" CHECK ("plan_entries"."status" IN ('planned', 'completed', 'failed', 'in_progress'))
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;