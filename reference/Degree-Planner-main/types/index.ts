export interface PrerequisiteRequirement {
  type: 'all' | 'one';
  courses: string[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  description?: string;
  prerequisites?: PrerequisiteRequirement;
  corequisites?: PrerequisiteRequirement;
  term?: 'fall' | 'winter' | 'summer' | 'any';
  faculty?: string;
}

export interface DegreeRequirement {
  id: string;
  name: string;
  type: 'required' | 'elective' | 'breadth';
  credits: number;
  courses: string[];
  description?: string;
}

export interface Degree {
  id: string;
  name: string;
  faculty: string;
  totalCredits: number;
  requirements: DegreeRequirement[];
  description?: string;
}

export interface ScheduledSemester {
  id: string;
  term: string;
  year: number;
  termType: 'fall' | 'winter' | 'summer';
  courses: Course[];
}

export interface RequirementProgress {
  requirementId: string;
  requirementName: string;
  requirementType: 'required' | 'elective' | 'breadth';
  isCompleted: boolean;
  completedCredits: number;
  requiredCredits: number;
  isSingleCourse: boolean; // true if it's a single course requirement, false if it's a credit-based requirement
}

export interface DegreeProgress {
  totalCredits: number;
  completedCredits: number;
  overallProgress: number;
  requirements: RequirementProgress[];
}
