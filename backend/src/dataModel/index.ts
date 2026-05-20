import path from "path";
import type {
  ICourseRepository,
  IPlanRepository,
  IPlanEntryRepository,
  IProgramRepository,
  IValidationCache,
} from "./interfaces";
import {
  JsonCourseRepository,
  JsonPlanRepository,
  JsonPlanEntryRepository,
  JsonProgramRepository,
} from "./storage/json";
import { InMemoryValidationCache } from "./cache/memory";

// ── Re-exports ──────────────────────────────────────────────────
// Re-export every domain type and interface so the rest of the app
// only ever imports from "../dataModel" — never reaches into a
// specific backend folder.

export * from "./types";
export * from "./interfaces";

// ── Backend selection ───────────────────────────────────────────
// STORAGE_BACKEND picks which set of repository implementations to
// wire up.  CACHE_BACKEND picks the validation-cache implementation.
// Both are read from the environment at startup; defaults keep the
// app running without any .env file.
//
// To add a new backend:
//   1. Create dataModel/storage/<name>/ (or dataModel/cache/<name>/)
//      whose classes implement the interfaces in ./interfaces.ts.
//   2. Add a switch case below.
//   3. Set STORAGE_BACKEND=<name> (or CACHE_BACKEND=<name>) in .env.

const STORAGE_BACKEND = process.env.STORAGE_BACKEND ?? "json";
const CACHE_BACKEND = process.env.CACHE_BACKEND ?? "memory";

export interface StorageRepos {
  courseRepo: ICourseRepository;
  planRepo: IPlanRepository;
  entryRepo: IPlanEntryRepository;
  programRepo: IProgramRepository;
}

export function createStorageRepos(): StorageRepos {
  switch (STORAGE_BACKEND) {
    case "json": {
      // Resolves to <repo-root>/backend/data both when running from
      // src/ (tsx watch) and from dist/ (built output).
      const DATA_DIR = path.resolve(__dirname, "..", "..", "data");

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
      throw new Error(
        `Unknown STORAGE_BACKEND: "${STORAGE_BACKEND}". ` +
        `Supported values: "json".`
      );
  }
}

export function createValidationCache(): IValidationCache {
  switch (CACHE_BACKEND) {
    case "memory":
      return new InMemoryValidationCache();
    default:
      throw new Error(
        `Unknown CACHE_BACKEND: "${CACHE_BACKEND}". ` +
        `Supported values: "memory".`
      );
  }
}
