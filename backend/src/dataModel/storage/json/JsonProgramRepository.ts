import { readFileSync, existsSync } from "fs";
import type { Faculty, Program } from "../../types";
import type { IProgramRepository } from "../../interfaces";

interface ProgramsFile {
  faculties: Faculty[];
  programs: Program[];
}

/**
 * Reads faculty + program definitions from a single JSON file.  Programs
 * are read-only at runtime (they're seeded by hand or by a scraper);
 * mutations would happen offline by editing the file.
 */
export class JsonProgramRepository implements IProgramRepository {
  constructor(private filePath: string) {}

  private load(): ProgramsFile {
    if (!existsSync(this.filePath)) return { faculties: [], programs: [] };
    const raw = readFileSync(this.filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      faculties: parsed.faculties ?? [],
      programs: parsed.programs ?? [],
    };
  }

  async findAllFaculties(): Promise<Faculty[]> {
    return this.load().faculties;
  }

  async findFacultyById(id: string): Promise<Faculty | null> {
    return this.load().faculties.find((f) => f.id === id) ?? null;
  }

  async findAllPrograms(facultyId?: string): Promise<Program[]> {
    const all = this.load().programs;
    return facultyId ? all.filter((p) => p.facultyId === facultyId) : all;
  }

  async findProgramById(id: string): Promise<Program | null> {
    return this.load().programs.find((p) => p.id === id) ?? null;
  }
}
