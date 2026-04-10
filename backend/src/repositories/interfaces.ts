import type {
    CourseRow,
    PlanRow,
    EntryRow,
    ValidationResult,
  } from "../models/types";
  
  // ── Filter types ─────────────────────────────────────────────────
  
  export interface CourseFilter {
    dept?: string;
    level?: string;
    search?: string;
    offset?: number;
    limit?: number;
  }
  
  export interface CourseListResult {
    data: CourseRow[];
    total: number;
  }
  
  export interface NewEntry {
    planId: string;
    courseId: string;
    year: number;
    term: string;
    status?: string;
    position?: number;
  }
  
  export interface EntryUpdates {
    year?: number;
    term?: string;
    status?: string;
    position?: number;
  }
  
  // ── Repository interfaces ────────────────────────────────────────
  
  export interface ICourseRepository {
    findAll(filter?: CourseFilter): Promise<CourseListResult>;
    findById(id: string): Promise<CourseRow | null>;
    findByIds(ids: string[]): Promise<CourseRow[]>;
    seedAll(courses: CourseRow[]): Promise<number>;
  }
  
  export interface IPlanRepository {
    findAll(): Promise<(PlanRow & { entryCount: number })[]>;
    findById(id: string): Promise<PlanRow | null>;
    create(name: string, description?: string): Promise<PlanRow>;
    update(
      id: string,
      updates: Partial<Pick<PlanRow, "name" | "description">>
    ): Promise<PlanRow | null>;
    delete(id: string): Promise<PlanRow | null>;
  }
  
  export interface IPlanEntryRepository {
    findByPlanId(planId: string): Promise<EntryRow[]>;
    create(entry: NewEntry): Promise<EntryRow>;
    update(entryId: string, updates: EntryUpdates): Promise<EntryRow | null>;
    delete(entryId: string): Promise<EntryRow | null>;
    reorder(positions: Array<{ entryId: string; position: number }>): Promise<void>;
    getMaxPosition(planId: string): Promise<number>;
  }
  
  export interface IValidationCache {
    get(planId: string): Promise<ValidationResult | null>;
    set(planId: string, result: ValidationResult, ttlSeconds?: number): Promise<void>;
    invalidate(planId: string): Promise<void>;
  }
