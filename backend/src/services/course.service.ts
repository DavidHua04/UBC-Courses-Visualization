import type { CourseRow } from "../models/types";
import type { ICourseRepository, CourseFilter, CourseListResult } from "../repositories/interfaces";

export class CourseService {
  constructor(private courses: ICourseRepository) {}

  async list(filter?: CourseFilter): Promise<CourseListResult> {
    return this.courses.findAll(filter);
  }

  async getById(id: string): Promise<CourseRow | null> {
    return this.courses.findById(id);
  }

  async seed(seedData: CourseRow[]): Promise<number> {
    return this.courses.seedAll(seedData);
  }
}
