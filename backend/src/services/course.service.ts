import type {
  CourseRow,
  ICourseRepository,
  CourseFilter,
  CourseListResult,
} from "../dataModel";

export class CourseService {
  constructor(private courses: ICourseRepository) {}

  async list(filter?: CourseFilter): Promise<CourseListResult> {
    return this.courses.findAll(filter);
  }

  async getById(id: string): Promise<CourseRow | null> {
    return this.courses.findById(id);
  }
}
