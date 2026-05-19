import path from "path";
import type {
  ICourseRepository,
  IPlanRepository,
  IPlanEntryRepository,
  IProgramRepository,
  IValidationCache,
} from "./repositories/interfaces";
import { CourseService } from "./services/course.service";
import { PlanService } from "./services/plan.service";
import { ValidationService } from "./services/validation.service";
import { ProgramService } from "./services/program.service";
import { ProgressService } from "./services/progress.service";
import { RecommendationsService } from "./services/recommendations.service";

// ── Storage factory ─────────────────────────────────────────────
// Reads STORAGE_BACKEND env var to decide which data-access
// implementation to use.  Currently only "json" is implemented;
// add a "drizzle" case here when the PostgreSQL repos are ready.

type StorageBackend = "json";
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND ?? "json") as StorageBackend;

function createStorageRepos(): {
  courseRepo: ICourseRepository;
  planRepo: IPlanRepository;
  entryRepo: IPlanEntryRepository;
  programRepo: IProgramRepository;
} {
  switch (STORAGE_BACKEND) {
    case "json": {
      const {
        JsonCourseRepository,
        JsonPlanRepository,
        JsonPlanEntryRepository,
        JsonProgramRepository,
      } = require("./repositories/storage/json");

      const DATA_DIR = path.resolve(__dirname, "..", "data");

      return {
        courseRepo: new JsonCourseRepository(path.join(DATA_DIR, "courses.json")),
        planRepo: new JsonPlanRepository(
          path.join(DATA_DIR, "plans.json"),
          path.join(DATA_DIR, "entries.json"),
        ),
        entryRepo: new JsonPlanEntryRepository(path.join(DATA_DIR, "entries.json")),
        programRepo: new JsonProgramRepository(path.join(DATA_DIR, "programs.json")),
      };
    }
    default:
      throw new Error(`Unknown STORAGE_BACKEND: "${STORAGE_BACKEND}"`);
  }
}

// ── Cache factory ───────────────────────────────────────────────
// Reads CACHE_BACKEND env var to decide which validation cache
// to use.  "memory" needs no external service; add a "redis" case
// here when the Redis cache implementation exists.

type CacheBackend = "memory";
const CACHE_BACKEND = (process.env.CACHE_BACKEND ?? "memory") as CacheBackend;

function createValidationCache(): IValidationCache {
  switch (CACHE_BACKEND) {
    case "memory": {
      const { InMemoryValidationCache } = require("./repositories/cache/memory");
      return new InMemoryValidationCache();
    }
    default:
      throw new Error(`Unknown CACHE_BACKEND: "${CACHE_BACKEND}"`);
  }
}

// ── Wire everything together ────────────────────────────────────

const { courseRepo, planRepo, entryRepo, programRepo } = createStorageRepos();
const validationCache = createValidationCache();

export const courseService = new CourseService(courseRepo);
export const planService = new PlanService(planRepo, entryRepo, validationCache);
export const validationService = new ValidationService(entryRepo, courseRepo, validationCache);
export const programService = new ProgramService(programRepo);
export const progressService = new ProgressService(entryRepo, courseRepo, programRepo);
export const recommendationsService = new RecommendationsService(entryRepo, courseRepo, progressService);
