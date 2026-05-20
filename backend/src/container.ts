import { createStorageRepos, createValidationCache } from "./dataModel";
import { CourseService } from "./services/course.service";
import { PlanService } from "./services/plan.service";
import { ValidationService } from "./services/validation.service";
import { ProgramService } from "./services/program.service";
import { ProgressService } from "./services/progress.service";
import { RecommendationsService } from "./services/recommendations.service";

// ── Composition root ────────────────────────────────────────────
// Wire repositories (from dataModel) into services.  Storage and
// cache backends are chosen via STORAGE_BACKEND / CACHE_BACKEND
// env vars; see dataModel/index.ts for the factory logic.

const { courseRepo, planRepo, entryRepo, programRepo } = createStorageRepos();
const validationCache = createValidationCache();

export const courseService = new CourseService(courseRepo);
export const planService = new PlanService(planRepo, entryRepo, validationCache);
export const validationService = new ValidationService(entryRepo, courseRepo, validationCache);
export const programService = new ProgramService(programRepo);
export const progressService = new ProgressService(entryRepo, courseRepo, programRepo);
export const recommendationsService = new RecommendationsService(entryRepo, courseRepo, progressService);
