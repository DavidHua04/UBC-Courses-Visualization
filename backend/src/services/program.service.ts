import type { Faculty, Program } from "../models/types";
import type { IProgramRepository } from "../repositories/interfaces";

export class ProgramService {
  constructor(private programs: IProgramRepository) {}

  async listFaculties(): Promise<Faculty[]> {
    return this.programs.findAllFaculties();
  }

  async listPrograms(facultyId?: string): Promise<Program[]> {
    return this.programs.findAllPrograms(facultyId);
  }

  async getProgram(id: string): Promise<Program | null> {
    return this.programs.findProgramById(id);
  }

  /**
   * Returns a program with faculty-level requirements prepended to its own.
   * Mirrors the "combined degree" idea — Science Breadth, communication, etc.
   * live on the faculty and apply to every program under it.
   */
  async getProgramWithFacultyRequirements(id: string): Promise<Program | null> {
    const program = await this.programs.findProgramById(id);
    if (!program) return null;
    const faculty = await this.programs.findFacultyById(program.facultyId);
    const facReqs = faculty?.requirements ?? [];
    return {
      ...program,
      requirements: [...facReqs, ...program.requirements],
    };
  }
}
