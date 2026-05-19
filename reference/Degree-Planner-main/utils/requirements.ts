import { Degree, Faculty, DegreeRequirement } from '@/types';

/**
 * Merges faculty-level requirements with program-specific requirements
 * Faculty requirements come first, then program requirements
 */
export function getCombinedRequirements(
  faculty: Faculty | null,
  program: Degree | null
): DegreeRequirement[] {
  const requirements: DegreeRequirement[] = [];
  
  // Add faculty-level requirements first
  if (faculty?.requirements) {
    requirements.push(...faculty.requirements);
  }
  
  // Add program-specific requirements
  if (program?.requirements) {
    requirements.push(...program.requirements);
  }
  
  return requirements;
}

/**
 * Creates a combined degree object with merged requirements from faculty and program
 */
export function getCombinedDegree(faculty: Faculty | null, program: Degree | null): Degree | null {
  if (!program) return null;
  
  return {
    ...program,
    requirements: getCombinedRequirements(faculty, program)
  };
}

