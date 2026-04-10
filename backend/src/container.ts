import path from "path";
import {
  JsonCourseRepository,
  JsonPlanRepository,
  JsonPlanEntryRepository,
  InMemoryValidationCache,
} from "./repositories/json";
import { CourseService } from "./services/course.service";
import { PlanService } from "./services/plan.service";
import { ValidationService } from "./services/validation.service";

// ── Storage paths ────────────────────────────────────────────────
// All JSON files live in backend/data/. Change this section to swap
// to Drizzle repositories without touching anything else.

const DATA_DIR = path.resolve(__dirname, "..", "data");

const courseRepo = new JsonCourseRepository(path.join(DATA_DIR, "courses.json"));
const planRepo = new JsonPlanRepository(
  path.join(DATA_DIR, "plans.json"),
  path.join(DATA_DIR, "entries.json"),
);
const entryRepo = new JsonPlanEntryRepository(path.join(DATA_DIR, "entries.json"));
const validationCache = new InMemoryValidationCache();

// ── Services (depend only on interfaces) ─────────────────────────

export const courseService = new CourseService(courseRepo);
export const planService = new PlanService(planRepo, entryRepo, validationCache);
export const validationService = new ValidationService(entryRepo, courseRepo, validationCache);
