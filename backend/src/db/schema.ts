import {
  pgTable,
  varchar,
  text,
  numeric,
  jsonb,
  timestamp,
  uuid,
  smallint,
  integer,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PrerequisiteRule } from "../models/types";

export const courses = pgTable("courses", {
  id: varchar("id", { length: 16 }).primaryKey(),
  dept: varchar("dept", { length: 8 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  title: text("title").notNull(),
  credits: numeric("credits", { precision: 3, scale: 1 }).notNull().default("3.0"),
  description: text("description"),
  prerequisites: jsonb("prerequisites").$type<PrerequisiteRule>(),
  corequisites: text("corequisites").array().notNull().default(sql`'{}'::text[]`),
  termsOffered: text("terms_offered").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planEntries = pgTable(
  "plan_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    courseId: varchar("course_id", { length: 16 })
      .notNull()
      .references(() => courses.id),
    year: smallint("year").notNull(),
    term: text("term").notNull(),
    status: text("status").notNull().default("planned"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("plan_course_unique").on(table.planId, table.courseId),
    check("year_range", sql`${table.year} BETWEEN 1 AND 5`),
    check("term_values", sql`${table.term} IN ('W1', 'W2', 'S')`),
    check(
      "status_values",
      sql`${table.status} IN ('planned', 'completed', 'failed', 'in_progress')`
    ),
  ]
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type PlanEntry = typeof planEntries.$inferSelect;
export type NewPlanEntry = typeof planEntries.$inferInsert;
