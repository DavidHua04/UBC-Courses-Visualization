'use client';

import { DegreeProgress, ScheduledSemester } from '@/types';
import { X, Check, XCircle } from 'lucide-react';

interface ProgressPopupProps {
  progress: DegreeProgress;
  isOpen: boolean;
  onClose: () => void;
  onTransferCreditToggle?: (requirementId: string, hasTransferCredit: boolean) => void;
  transferCredits?: Set<string>;
  semesters?: ScheduledSemester[];
}

export default function ProgressPopup({ 
  progress, 
  isOpen, 
  onClose, 
  onTransferCreditToggle,
  transferCredits = new Set(),
  semesters = []
}: ProgressPopupProps) {
  if (!isOpen) return null;

  const isTransferCreditEligible = (requirementId: string) => {
    return requirementId === 'laboratory-science' || 
           requirementId === 'foundational-biology' || 
           requirementId === 'foundational-chemistry' || 
           requirementId === 'foundational-physics';
  };

  // Check which Science Breadth categories are satisfied
  const checkScienceBreadthCategories = (scheduledCourses: { code: string }[]) => {
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
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Degree Progress</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Overall Progress</span>
                  <span className="font-semibold">{progress.overallProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-ubc-blue h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress.overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{progress.completedCredits}</span> / {progress.totalCredits} credits completed
            </div>
          </div>

          {/* Requirements List */}
          {progress.requirements && progress.requirements.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
              <div className="space-y-4">
                {progress.requirements.map((req) => {
                  const hasTransferCredit = transferCredits.has(req.requirementId);
                  const isCompleted = req.isCompleted || hasTransferCredit;
                  const showTransferCheckbox = isTransferCreditEligible(req.requirementId);
                  
                  return (
                    <div key={req.requirementId} className="border border-gray-200 rounded-lg p-4">
                      {req.isSingleCourse ? (
                        // Single course requirement - show checkbox
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className={`font-medium ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                              {req.requirementName}
                            </div>
                            {req.requiredCredits > 0 && (
                              <div className="text-sm text-gray-600">
                                {req.requiredCredits} credit{req.requiredCredits !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          {showTransferCheckbox && onTransferCreditToggle && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">Transfer Credit:</label>
                              <input
                                type="checkbox"
                                checked={hasTransferCredit}
                                onChange={(e) => onTransferCreditToggle(req.requirementId, e.target.checked)}
                                className="w-4 h-4 text-ubc-blue border-gray-300 rounded focus:ring-ubc-blue"
                              />
                            </div>
                          )}
                        </div>
                      ) : req.requirementId === 'science-breadth' ? (
                      // Science Breadth Requirement - show categories with checkmarks
                      <div>
                        <div className="mb-3">
                          <div className="font-medium text-gray-900">{req.requirementName}</div>
                        </div>
                        {(() => {
                          const allCourses = semesters.flatMap(sem => sem.courses);
                          const scheduledCourses = allCourses.map(c => ({ code: c.code }));
                          const categories = checkScienceBreadthCategories(scheduledCourses);
                          
                          // Check transfer credits for each category
                          const categoryKeys = ['mathematics', 'chemistry', 'physics', 'lifeScience', 'statistics', 'computerScience', 'earthPlanetary'];
                          
                          // Count satisfied categories (from courses or transfer credit)
                          const satisfiedCategories = categoryKeys.filter(key => {
                            const categoryKey = key as keyof typeof categories;
                            return categories[categoryKey] || transferCredits.has(`science-breadth-${key}`);
                          });
                          const satisfiedCount = satisfiedCategories.length;
                          const isCompleted = satisfiedCount >= 6;
                          
                          const categoryLabels = {
                            mathematics: 'Mathematics: All MATH except MATH 302',
                            chemistry: 'Chemistry: All CHEM, except CHEM 100, CHEM 300',
                            physics: 'Physics: All PHYS, except PHYS 100',
                            lifeScience: 'Life Science: All BIOL, except BIOL 140, BIOL 300; all BIOC, PSYC (courses numbered from 60 to 89 in the last 2 digits), and MICB courses and GEOS (or GEOB) 207',
                            statistics: 'Statistics: BIOL 300, DSCI 100, MATH 302, all STAT courses',
                            computerScience: 'Computer Science: All CPSC courses',
                            earthPlanetary: 'Earth & Planetary Science: All ASTR, ATSC, ENVR, EOSC, GEOS or GEOB courses except EOSC 111 and GEOS (or GEOB) 207'
                          };
                          
                          return (
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600 mb-3">
                                Must satisfy at least 6 of 7 categories ({satisfiedCount}/7 satisfied)
                              </div>
                              <div className="space-y-1.5 text-sm">
                                {categoryKeys.map((key) => {
                                  const categoryKey = key as keyof typeof categories;
                                  const isSatisfied = categories[categoryKey] || transferCredits.has(`science-breadth-${key}`);
                                  
                                  return (
                                    <div key={key} className="flex items-start gap-2">
                                      {isSatisfied ? (
                                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 flex items-start justify-between gap-3 min-w-0">
                                        <span className={`italic text-sm leading-relaxed ${isSatisfied ? 'text-green-700' : 'text-gray-700'} break-words`}>
                                          {categoryLabels[key as keyof typeof categoryLabels]}
                                        </span>
                                        {onTransferCreditToggle && (
                                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                            <label className="text-xs text-gray-600 whitespace-nowrap">Transfer:</label>
                                            <input
                                              type="checkbox"
                                              checked={transferCredits.has(`science-breadth-${key}`)}
                                              onChange={(e) => onTransferCreditToggle(`science-breadth-${key}`, e.target.checked)}
                                              className="w-4 h-4 text-ubc-blue border-gray-300 rounded focus:ring-ubc-blue"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className={`text-sm mt-3 ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                {isCompleted ? '✓ Requirement satisfied' : 'Requirement not yet satisfied'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      ) : (
                      // Credit-based requirement - show progress bar
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">{req.requirementName}</div>
                          {req.requiredCredits > 0 && (
                            <div className="text-sm text-gray-600">
                              {req.completedCredits} / {req.requiredCredits} credits
                            </div>
                          )}
                        </div>
                        {req.requiredCredits > 0 ? (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                req.isCompleted ? 'bg-green-600' : 'bg-ubc-blue'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (req.completedCredits / req.requiredCredits) * 100)}%` 
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            {req.isCompleted ? '✓ Completed' : 'Not completed'}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
