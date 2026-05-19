import { Degree, DegreeProgress, ScheduledSemester, RequirementProgress, DegreeRequirement } from '@/types';

// Check which Science Breadth categories are satisfied
function checkScienceBreadthCategories(scheduledCourses: { code: string }[]) {
  const categories = {
    mathematics: false,
    chemistry: false,
    physics: false,
    lifeScience: false,
    statistics: false,
    computerScience: false,
    earthPlanetary: false
  };

  scheduledCourses.forEach(course => {
    const code = course.code.toUpperCase().trim();
    // Match course codes like "MATH 100", "MATH_V 100", "MATH100", etc.
    const match = code.match(/^([A-Z]+)(?:\s*_?V?\s*|\s+)(\d+)/);
    if (!match) return;
    
    const subject = match[1];
    const courseNum = parseInt(match[2]);

    // Mathematics: All MATH_V courses, except MATH_V 302
    if (subject === 'MATH' && courseNum !== 302) {
      categories.mathematics = true;
    }

    // Chemistry: All CHEM_V courses, except CHEM_V 100, CHEM_V 300
    if (subject === 'CHEM' && courseNum !== 100 && courseNum !== 300) {
      categories.chemistry = true;
    }

    // Physics: All PHYS_V courses, except PHYS_V 100
    if (subject === 'PHYS' && courseNum !== 100) {
      categories.physics = true;
    }

    // Life Science: All BIOL_V courses except BIOL_V 140, BIOL_V 300; all BIOC_V, PSYC_V (60-89), MICB_V courses and GEOS_V/GEOB_V 207
    if (subject === 'BIOL' && courseNum !== 140 && courseNum !== 300) {
      categories.lifeScience = true;
    }
    if (subject === 'BIOC') {
      categories.lifeScience = true;
    }
    if (subject === 'PSYC' && courseNum >= 60 && courseNum <= 89) {
      categories.lifeScience = true;
    }
    if (subject === 'MICB') {
      categories.lifeScience = true;
    }
    if ((subject === 'GEOS' || subject === 'GEOB') && courseNum === 207) {
      categories.lifeScience = true;
    }

    // Statistics: BIOL_V 300, DSCI_V 100, MATH_V 302, all STAT_V courses
    if (subject === 'BIOL' && courseNum === 300) {
      categories.statistics = true;
    }
    if (subject === 'DSCI' && courseNum === 100) {
      categories.statistics = true;
    }
    if (subject === 'MATH' && courseNum === 302) {
      categories.statistics = true;
    }
    if (subject === 'STAT') {
      categories.statistics = true;
    }

    // Computer Science: All CPSC_V courses
    if (subject === 'CPSC') {
      categories.computerScience = true;
    }

    // Earth & Planetary Science: All ASTR_V, ATSC_V, ENVR_V, EOSC_V, GEOS_V/GEOB_V courses except EOSC_V 111 and GEOS_V/GEOB_V 207
    if (subject === 'ASTR') {
      categories.earthPlanetary = true;
    }
    if (subject === 'ATSC') {
      categories.earthPlanetary = true;
    }
    if (subject === 'ENVR') {
      categories.earthPlanetary = true;
    }
    if (subject === 'EOSC' && courseNum !== 111) {
      categories.earthPlanetary = true;
    }
    if ((subject === 'GEOS' || subject === 'GEOB') && courseNum !== 207) {
      categories.earthPlanetary = true;
    }
  });

  return categories;
}

function isSingleCourseRequirement(requirement: DegreeRequirement): boolean {
  // If it has specific courses listed, it's a single course requirement (even if credits = 0)
  // This includes requirements like Laboratory Science, Foundational Requirements
  // Credit-based requirements typically have empty courses array
  if (requirement.courses.length > 0) {
    // Special case: if credits = 0 but has courses, it's still a single course requirement (e.g., Laboratory Science)
    if (requirement.credits === 0) {
      return true;
    }
    // If credits <= 6 and has courses, it's a single course requirement
    if (requirement.credits <= 6) {
      return true;
    }
  }
  return false;
}

function checkSingleCourseRequirement(
  requirement: DegreeRequirement,
  scheduledCourseCodes: Set<string>
): boolean {
  if (requirement.courses.length === 0) return false;
  
  // For "one of" requirements, check if any course is scheduled
  // For "all" requirements, we'd need to check all, but for now we'll treat as "one of"
  return requirement.courses.some(courseCode => scheduledCourseCodes.has(courseCode));
}

function calculateCreditRequirementProgress(
  requirement: DegreeRequirement,
  scheduledCourses: { code: string; credits: number; faculty?: string }[]
): { completedCredits: number; isCompleted: boolean } {
  let completedCredits = 0;
  
  // Check if this is the Additional Communication Requirement
  const isAdditionalComm = requirement.id === 'additional-communication' || 
                           requirement.name.toLowerCase().includes('additional communication');
  
  if (requirement.courses.length > 0) {
    // Specific courses listed - count credits from those courses
    const requirementCourseCodes = new Set(requirement.courses);
    completedCredits = scheduledCourses
      .filter(course => requirementCourseCodes.has(course.code))
      .reduce((sum, course) => sum + course.credits, 0);
    
    // For Additional Communication Requirement, only count up to 3 credits (one course)
    if (isAdditionalComm) {
      completedCredits = Math.min(completedCredits, 3);
    }
  } else {
    // Credit-based requirement (e.g., "9 Credits of CPSC Courses Numbered 300 or Higher")
    // Parse the requirement name to determine what courses count
    const name = requirement.name.toLowerCase();
    
    if (name.includes('cpsc') && name.includes('300')) {
      // CPSC courses 300 or higher
      completedCredits = scheduledCourses
        .filter(course => {
          const match = course.code.match(/^CPSC\s+(\d{3,4})/);
          if (match) {
            const courseNum = parseInt(match[1]);
            return courseNum >= 300;
          }
          return false;
        })
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('cpsc') && name.includes('400')) {
      // CPSC courses 400 level
      completedCredits = scheduledCourses
        .filter(course => {
          const match = course.code.match(/^CPSC\s+(\d{3,4})/);
          if (match) {
            const courseNum = parseInt(match[1]);
            return courseNum >= 400 && courseNum < 500;
          }
          return false;
        })
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('upper level') && name.includes('science')) {
      // Upper level Science credits (300-400 level Science courses)
      completedCredits = scheduledCourses
        .filter(course => {
          const match = course.code.match(/\s+(\d{3,4})/);
          if (match) {
            const courseNum = parseInt(match[1]);
            return courseNum >= 300 && courseNum < 500 && course.faculty === 'Science';
          }
          return false;
        })
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('upper level') || (name.includes('300') && !name.includes('cpsc'))) {
      // General upper level courses (300-400) - any faculty
      completedCredits = scheduledCourses
        .filter(course => {
          const match = course.code.match(/\s+(\d{3,4})/);
          if (match) {
            const courseNum = parseInt(match[1]);
            return courseNum >= 300 && courseNum < 500;
          }
          return false;
        })
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('science credits') || (name.includes('science') && name.includes('credit'))) {
      // Science credits - check faculty field
      completedCredits = scheduledCourses
        .filter(course => course.faculty === 'Science')
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('arts') && (name.includes('credit') || name.includes('requirement'))) {
      // Arts credits - check faculty field
      completedCredits = scheduledCourses
        .filter(course => course.faculty === 'Arts')
        .reduce((sum, course) => sum + course.credits, 0);
    } else if (name.includes('science breadth') || requirement.id === 'science-breadth') {
      // Science breadth requirement - check categories
      const categories = checkScienceBreadthCategories(scheduledCourses);
      const satisfiedCount = Object.values(categories).filter(Boolean).length;
      // For display purposes, use satisfied count as "credits"
      completedCredits = satisfiedCount;
    } else {
      // Default: count all credits if we can't determine the requirement type
      completedCredits = scheduledCourses.reduce((sum, course) => sum + course.credits, 0);
    }
  }
  
  let isCompleted = false;
  
  // Special handling for Science Breadth Requirement
  if (requirement.id === 'science-breadth' || (name.includes('science breadth') && requirement.credits === 0)) {
    const categories = checkScienceBreadthCategories(scheduledCourses);
    // Note: transferCredits check for category-level credits is handled in calculateProgress
    const satisfiedCount = Object.values(categories).filter(Boolean).length;
    isCompleted = satisfiedCount >= 6;
  } else {
    isCompleted = requirement.credits > 0 
      ? completedCredits >= requirement.credits 
      : false;
  }
  
  return { completedCredits, isCompleted };
}

export function calculateProgress(
  degree: Degree,
  semesters: ScheduledSemester[],
  transferCredits?: Set<string>
): DegreeProgress {
  const allCourses = semesters.flatMap(sem => sem.courses);
  let completedCredits = allCourses.reduce((sum, course) => sum + course.credits, 0);
  
  const scheduledCourseCodes = new Set(allCourses.map(c => c.code));
  const scheduledCourses = allCourses.map(c => ({ 
    code: c.code, 
    credits: c.credits,
    faculty: c.faculty 
  }));
  
  // Calculate requirement progress
  const requirements: RequirementProgress[] = degree.requirements.map(requirement => {
    const isSingleCourse = isSingleCourseRequirement(requirement);
    
    if (isSingleCourse) {
      const hasTransferCredit = transferCredits?.has(requirement.id) || false;
      const isCompleted = checkSingleCourseRequirement(requirement, scheduledCourseCodes) || hasTransferCredit;
      // For requirements with credits = 0 (like Laboratory Science), set completed credits to 0 when not completed
      // When completed, show the actual credits from the course taken (or 3 as default)
      let reqCompletedCredits = 0;
      if (isCompleted) {
        if (hasTransferCredit) {
          // If transfer credit, use the requirement's credits or default to 3
          reqCompletedCredits = requirement.credits || 3;
          // Add transfer credit to overall completed credits if not already counted from a scheduled course
          if (!checkSingleCourseRequirement(requirement, scheduledCourseCodes)) {
            completedCredits += reqCompletedCredits;
          }
        } else if (requirement.credits === 0) {
          // For 0-credit requirements, find the actual course and use its credits
          const completedCourse = allCourses.find(c => requirement.courses.includes(c.code));
          reqCompletedCredits = completedCourse ? completedCourse.credits : 3; // Default to 3 if not found
        } else {
          reqCompletedCredits = requirement.credits;
        }
      }
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementType: requirement.type,
        isCompleted,
        completedCredits: reqCompletedCredits,
        requiredCredits: requirement.credits || 3, // Default to 3 for 0-credit requirements for display
        isSingleCourse: true
      };
    } else {
      const hasTransferCredit = transferCredits?.has(requirement.id) || false;
      const { completedCredits: reqCredits, isCompleted } = calculateCreditRequirementProgress(
        requirement,
        scheduledCourses
      );
      
      // For Science Breadth, check category-level transfer credits
      let finalIsCompleted = isCompleted;
      if (requirement.id === 'science-breadth') {
        const categoryKeys = ['mathematics', 'chemistry', 'physics', 'lifeScience', 'statistics', 'computerScience', 'earthPlanetary'];
        const categories = checkScienceBreadthCategories(scheduledCourses);
        // Count categories satisfied by courses or transfer credit
        const satisfiedCategories = categoryKeys.filter(key => {
          const categoryKey = key as keyof typeof categories;
          return categories[categoryKey] || transferCredits?.has(`science-breadth-${key}`);
        });
        finalIsCompleted = satisfiedCategories.length >= 6;
      } else if (hasTransferCredit) {
        finalIsCompleted = true;
      }
      
      return {
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementType: requirement.type,
        isCompleted: finalIsCompleted,
        completedCredits: reqCredits,
        requiredCredits: requirement.credits,
        isSingleCourse: false
      };
    }
  });
  
  const overallProgress = degree.totalCredits > 0
    ? Math.min(100, (completedCredits / degree.totalCredits) * 100)
    : 0;
  
  return {
    totalCredits: degree.totalCredits,
    completedCredits,
    overallProgress: Math.round(overallProgress),
    requirements
  };
}
