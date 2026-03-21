import type { ValidationResult, EntryRow, CourseRow, AcademicGoal } from '../types';

interface Props {
  validation: ValidationResult | null;
  validating: boolean;
  entries: EntryRow[];
  courseMap: Map<string, CourseRow>;
  goals: AcademicGoal[];
  onValidate: () => void;
}

const TOTAL_CREDITS_REQUIRED = 120;

export default function SummaryPanel({ validation, validating, entries, courseMap, goals, onValidate }: Props) {
  const getCredits = (entry: EntryRow) => {
    const course = courseMap.get(entry.courseId);
    return course ? parseFloat(course.credits) || 0 : 0;
  };

  const completedCredits = entries
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + getCredits(e), 0);

  const plannedCredits = entries
    .filter(e => e.status === 'planned' || e.status === 'in_progress')
    .reduce((sum, e) => sum + getCredits(e), 0);

  const totalCredits = completedCredits + plannedCredits;
  const progressPct = Math.min(100, (totalCredits / TOTAL_CREDITS_REQUIRED) * 100);

  const metGoals = goals.filter(g => g.satisfied).length;
  const notMetGoals = goals.filter(g => !g.satisfied).length;

  const invalidCourses = validation ? validation.errors.length : 0;
  const validCourses = validation ? entries.length - invalidCourses : entries.length;

  // Rough graduation estimate: assume 15 credits/term, 3 terms/year
  const creditsRemaining = Math.max(0, TOTAL_CREDITS_REQUIRED - totalCredits);
  const termsRemaining = Math.ceil(creditsRemaining / 15);
  const yearsRemaining = Math.floor(termsRemaining / 3);
  const extraTerms = termsRemaining % 3;

  const graduationText = creditsRemaining === 0
    ? 'Complete!'
    : yearsRemaining > 0
      ? `${yearsRemaining} year${yearsRemaining !== 1 ? 's' : ''}${extraTerms > 0 ? `, ${extraTerms} term${extraTerms !== 1 ? 's' : ''}` : ''}`
      : `${extraTerms} term${extraTerms !== 1 ? 's' : ''}`;

  return (
    <div className="w-[420px] shrink-0 bg-white border-l border-[#e5e7eb] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e5e7eb] px-4 flex items-end pb-4 h-[63px] shrink-0">
        <h2 className="text-xl font-normal text-[#101828]">Plan Analysis</h2>
      </div>

      <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
        {/* Credit Progress */}
        <div className="border border-black/10 rounded-[14px] px-[18px] py-[18px] flex flex-col gap-3">
          <h3 className="text-base text-[#101828]">Credit Progress</h3>
          <div className="flex justify-between text-base">
            <span className="text-[#4a5565]">Total Credits</span>
            <span className="text-[#4a5565]">{totalCredits} / {TOTAL_CREDITS_REQUIRED}</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#030213] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-10">
            <div>
              <p className="text-sm text-[#6a7282]">Completed</p>
              <p className="text-base text-[#101828]">{completedCredits}</p>
            </div>
            <div>
              <p className="text-sm text-[#6a7282]">Planned</p>
              <p className="text-base text-[#101828]">{plannedCredits}</p>
            </div>
          </div>
        </div>

        {/* Goals Status */}
        <div className="border border-black/10 rounded-[14px] px-[18px] py-[18px] flex flex-col gap-3">
          <h3 className="text-base text-[#101828]">Goals Status</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-[10px] leading-none">✓</span>
                <span className="text-base text-[#4a5565]">Met</span>
              </div>
              <span className="bg-[#00a63e] text-white text-xs rounded-lg px-2 py-0.5 min-w-[26px] text-center">
                {metGoals}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-red-600 text-red-600 flex items-center justify-center text-[10px] leading-none">✗</span>
                <span className="text-base text-[#4a5565]">Not Met</span>
              </div>
              <span className="bg-[#d4183d] text-white text-xs rounded-lg px-2 py-0.5 min-w-[26px] text-center">
                {notMetGoals}
              </span>
            </div>
          </div>
        </div>

        {/* Course Validation */}
        <div className="border border-black/10 rounded-[14px] px-[18px] py-[18px] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base text-[#101828]">Course Validation</h3>
            <button
              onClick={onValidate}
              disabled={validating}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {validating ? 'Checking...' : 'Re-check'}
            </button>
          </div>

          {!validation && !validating && (
            <p className="text-sm text-[#99a1af]">Click Re-check to validate prerequisites.</p>
          )}
          {validating && (
            <p className="text-sm text-[#99a1af]">Validating plan...</p>
          )}

          {validation && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center text-[10px] leading-none">✓</span>
                    <span className="text-base text-[#4a5565]">Valid Courses</span>
                  </div>
                  <span className="text-base text-[#101828]">{validCourses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-red-600 text-red-600 flex items-center justify-center text-[10px] leading-none">✗</span>
                    <span className="text-base text-[#4a5565]">Invalid Courses</span>
                  </div>
                  <span className="text-base text-[#101828]">{invalidCourses}</span>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="border-t border-[#e5e7eb] pt-3 flex flex-col gap-2">
                  <p className="text-base text-[#364153]">Issues:</p>
                  <div className="flex flex-col gap-1">
                    {validation.errors.map((err, i) => (
                      <div key={i} className="bg-[#fef2f2] rounded px-2 py-1.5">
                        <p className="text-sm text-[#4a5565]">{err.courseId} — {err.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="border-t border-[#e5e7eb] pt-3 flex flex-col gap-2">
                  <p className="text-base text-[#364153]">Warnings:</p>
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="bg-amber-50 rounded px-2 py-1.5">
                      <p className="text-sm text-amber-700">{w.courseId} — {w.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Checked {new Date(validation.computedAt).toLocaleTimeString()}
                {validation.cached && ' (cached)'}
              </p>
            </>
          )}
        </div>

        {/* Estimated Graduation */}
        <div className="border border-black/10 rounded-[14px] px-[18px] py-[18px] flex flex-col gap-3">
          <h3 className="text-base text-[#101828]">Estimated Graduation</h3>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 text-sm shrink-0">
              ⏱
            </div>
            <div>
              <p className="text-base text-[#101828]">{graduationText}</p>
              <p className="text-sm text-[#4a5565]">Based on current plan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
