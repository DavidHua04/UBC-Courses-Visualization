import React, { useState, useEffect, useRef } from 'react';
import type { ValidationResult, EntryRow, CourseRow, AcademicGoal } from '../types';

interface Props {
  validation: ValidationResult | null;
  validating: boolean;
  entries: EntryRow[];
  courseMap: Map<string, CourseRow>;
  goals: AcademicGoal[];
  onValidate: () => void;
  selectedCourseId: string | null;
  onClearSelection: () => void;
}

const TOTAL_CREDITS_REQUIRED = 120;

function ubcGradesUrl(courseId: string): string {
  const parts = courseId.trim().split(/[\s-]+/);
  if (parts.length < 2) return 'https://ubcgrades.com/statistics-by-course';
  return `https://ubcgrades.com/statistics-by-course#UBCV-${parts[0]}-${parts[1]}`;
}

export default function SummaryPanel({
  validation,
  validating,
  entries,
  courseMap,
  goals,
  onValidate,
  selectedCourseId,
  onClearSelection,
}: Props) {
  const [tab, setTab] = useState<'summary' | 'course'>('summary');

  // Auto-switch tabs when a course is selected/deselected
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    if (selectedCourseId && selectedCourseId !== prevSelected.current) {
      setTab('course');
    }
    if (!selectedCourseId && prevSelected.current) {
      setTab('summary');
    }
    prevSelected.current = selectedCourseId;
  }, [selectedCourseId]);

  const selectedCourse = selectedCourseId ? courseMap.get(selectedCourseId) : null;

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

  const creditsRemaining = Math.max(0, TOTAL_CREDITS_REQUIRED - totalCredits);
  const termsRemaining = Math.ceil(creditsRemaining / 15);
  const yearsRemaining = Math.floor(termsRemaining / 2);
  const extraTerms = termsRemaining % 2;

  const graduationText = creditsRemaining === 0
    ? 'Complete!'
    : `${yearsRemaining > 0 ? `${yearsRemaining} year${yearsRemaining !== 1 ? 's' : ''}, ` : ''}${extraTerms} term${extraTerms !== 1 ? 's' : ''}`;

  const errors = validation?.errors ?? [];

  const TABS: Array<['summary' | 'course', string]> = [['summary', 'Summary'], ['course', 'Course Info']];

  return (
    <div className="w-[340px] shrink-0 border-l border-[#e5e7eb] flex flex-col overflow-hidden bg-white">
      {/* Tab header */}
      <div className="border-b border-[#e5e7eb] px-3 flex items-center h-[58px] shrink-0">
        <div className="bg-[#ececf0] rounded-[14px] p-[3px] flex w-full">
          {TABS.map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 h-7 rounded-[11px] border-none cursor-pointer text-[13px] text-[#0a0a0a] transition-all duration-150"
              style={{
                background: tab === t ? '#fff' : 'transparent',
                fontWeight: tab === t ? 600 : 400,
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5">
        {/* Summary tab */}
        {tab === 'summary' && (
          <>
            {/* Credit Progress */}
            <div className="border border-black/10 rounded-xl p-3.5">
              <div className="text-sm font-semibold text-[#101828] mb-2.5">Credit Progress</div>
              <div className="flex justify-between text-[13px] text-[#4a5565] mb-1.5">
                <span>Total Credits</span>
                <span className="font-semibold text-[#101828] whitespace-nowrap">{totalCredits} / {TOTAL_CREDITS_REQUIRED}</span>
              </div>
              <div className="h-2 bg-black/15 rounded overflow-hidden relative mb-2.5">
                <div
                  className="absolute left-0 top-0 h-full bg-[#030213] rounded transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex gap-5">
                {[['Completed', completedCredits], ['Planned', plannedCredits]].map(([l, v]) => (
                  <div key={l as string}>
                    <p className="text-[11px] text-[#6a7282]">{l}</p>
                    <p className="text-lg font-bold text-[#101828]">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals Status */}
            <div className="border border-black/10 rounded-xl p-3.5">
              <div className="text-sm font-semibold text-[#101828] mb-2.5">Goals Status</div>
              {[
                ['Met', metGoals, '#16a34a', '✓'] as const,
                ['Not Met', notMetGoals, '#d4183d', '✗'] as const,
              ].map(([l, n, c, ic]) => (
                <div key={l} className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-[7px] text-[13px] text-[#4a5565] whitespace-nowrap">
                    <span
                      className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] shrink-0"
                      style={{ border: `2px solid ${c}`, color: c }}
                    >
                      {ic}
                    </span>
                    {l}
                  </div>
                  <span
                    className="text-white text-[11px] font-bold rounded-lg px-2 py-[1px] shrink-0"
                    style={{ background: c }}
                  >
                    {n}
                  </span>
                </div>
              ))}
            </div>

            {/* Course Validation */}
            <div className="border border-black/10 rounded-xl p-3.5">
              <div className="flex justify-between items-center gap-1.5 mb-2.5">
                <div className="text-sm font-semibold text-[#101828] whitespace-nowrap">Course Validation</div>
                <button
                  onClick={onValidate}
                  disabled={validating}
                  className="text-[11px] border-none bg-none cursor-pointer shrink-0 whitespace-nowrap p-0"
                  style={{ color: validating ? '#9ca3af' : '#6366f1' }}
                >
                  {validating ? 'Checking…' : 'Re-check'}
                </button>
              </div>
              {!validation && !validating && (
                <p className="text-xs text-[#99a1af]">Click Re-check to validate prerequisites.</p>
              )}
              {validating && <p className="text-xs text-[#99a1af]">Validating…</p>}
              {validation && (
                <>
                  {[
                    ['Valid', validCourses, '#16a34a', '✓'] as const,
                    ['Invalid', invalidCourses, '#d4183d', '✗'] as const,
                  ].map(([l, n, c, ic]) => (
                    <div key={l} className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-[7px] text-[13px] text-[#4a5565] whitespace-nowrap">
                        <span
                          className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] shrink-0"
                          style={{ border: `2px solid ${c}`, color: c }}
                        >
                          {ic}
                        </span>
                        {l} Courses
                      </div>
                      <span className="text-sm font-semibold text-[#101828]">{n}</span>
                    </div>
                  ))}
                  {errors.length > 0 && (
                    <div className="border-t border-[#e5e7eb] pt-2 mt-1">
                      <p className="text-xs text-[#364153] mb-1.5 font-semibold">Issues:</p>
                      {errors.map((e, i) => (
                        <div key={i} className="bg-[#fef2f2] border border-[#fca5a5] rounded-[7px] px-[9px] py-1.5 mb-1">
                          <span className="text-xs font-semibold text-[#b91c1c]">{e.courseId}</span>
                          <span className="text-[11px] text-[#6b7280] block mt-0.5">{e.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Estimated Graduation */}
            <div className="border border-black/10 rounded-xl p-3.5">
              <div className="text-sm font-semibold text-[#101828] mb-2.5">Estimated Graduation</div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 shrink-0">
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 4v4l3 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#101828] whitespace-nowrap">{graduationText}</p>
                  <p className="text-xs text-[#4a5565]">Based on current plan</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Course Info tab */}
        {tab === 'course' && (
          <>
            {!selectedCourse ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2.5 text-center">
                <svg width={36} height={36} viewBox="0 0 16 16" fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinecap="round">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 7v5M8 5v.5" />
                </svg>
                <p className="font-semibold text-[#101828] text-sm mt-2">No course selected</p>
                <p className="text-[13px] text-[#9ca3af] leading-relaxed">Click any course in your plan to view its details here.</p>
              </div>
            ) : (
              <>
                {/* Course header */}
                <div className="bg-[#f8f8ff] border border-indigo-500/20 rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-lg font-bold text-[#101828]">{selectedCourse.id}</div>
                      <div className="text-[13px] text-[#4a5565] mt-[3px] leading-snug">{selectedCourse.title}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold text-indigo-500">{selectedCourse.credits}</div>
                      <div className="text-[11px] text-[#9ca3af]">credits</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{selectedCourse.dept}</span>
                    <span className="text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold">{parseInt(selectedCourse.code) >= 100 ? `${Math.floor(parseInt(selectedCourse.code) / 100) * 100}-level` : selectedCourse.code}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="border border-black/[0.09] rounded-xl p-3.5">
                  <div className="text-[13px] font-semibold text-[#101828] mb-[7px]">Description</div>
                  <p className="text-[13px] text-[#4a5565] leading-relaxed">{selectedCourse.description ?? 'No description available.'}</p>
                </div>

                {/* Prerequisites */}
                <div className="border border-black/[0.09] rounded-xl p-3.5">
                  <div className="text-[13px] font-semibold text-[#101828] mb-[7px]">Prerequisites</div>
                  {renderPrerequisites(selectedCourse.prerequisites)}
                </div>

                {/* Resources */}
                <div className="border border-black/[0.09] rounded-xl p-3.5">
                  <div className="text-[13px] font-semibold text-[#101828] mb-2.5">Resources</div>
                  <div className="flex flex-col gap-2">
                    <a
                      href={ubcGradesUrl(selectedCourse.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-[9px] bg-[#eff6ff] border border-blue-200 rounded-[9px] no-underline text-blue-700 text-[13px] font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M7 9a3 3 0 004 0l2-2a3 3 0 00-4-4l-1 1M9 7a3 3 0 00-4 0l-2 2a3 3 0 004 4l1-1" />
                      </svg>
                      Grade statistics on UBCGrades
                      <span className="ml-auto text-[11px] opacity-70">↗</span>
                    </a>
                    <a
                      href={`https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-course&dept=${selectedCourse.dept}&course=${selectedCourse.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-[9px] bg-green-50 border border-green-200 rounded-[9px] no-underline text-green-700 text-[13px] font-semibold hover:bg-green-100 transition-colors"
                    >
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M2 3h6a2 2 0 012 2v10l-4-2-4 2V3zM12 3h2v12l-4 2V5a2 2 0 012-2z" />
                      </svg>
                      UBC Course Schedule
                      <span className="ml-auto text-[11px] opacity-70">↗</span>
                    </a>
                    <a
                      href={`https://ubcexplorer.io/course/${selectedCourse.dept}/${selectedCourse.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-[9px] bg-fuchsia-50 border border-purple-200 rounded-[9px] no-underline text-purple-700 text-[13px] font-semibold hover:bg-fuchsia-100 transition-colors"
                    >
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 7v5M8 5v.5" />
                      </svg>
                      UBC Explorer
                      <span className="ml-auto text-[11px] opacity-70">↗</span>
                    </a>
                  </div>
                </div>

                <button
                  onClick={onClearSelection}
                  className="text-xs text-[#9ca3af] border-none bg-none cursor-pointer text-left px-0.5"
                >
                  ← Back to Summary
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function renderPrerequisites(prereqs: unknown): React.ReactElement {
  if (!prereqs || (typeof prereqs === 'object' && prereqs !== null && Object.keys(prereqs).length === 0)) {
    return <p className="text-[13px] text-[#9ca3af]">None required</p>;
  }

  // Handle the recursive PrerequisiteRule tree
  if (typeof prereqs === 'object' && prereqs !== null && 'type' in prereqs) {
    const rule = prereqs as { type: string; courseId?: string; requirements?: unknown[]; minCredits?: number };
    if (rule.type === 'course' && rule.courseId) {
      return (
        <span className="inline-block text-xs bg-amber-100 text-amber-800 px-2.5 py-[3px] rounded-full font-semibold">
          {rule.courseId}
        </span>
      );
    }
    if ((rule.type === 'all_of' || rule.type === 'one_of') && Array.isArray(rule.requirements)) {
      const label = rule.type === 'all_of' ? 'All of:' : 'One of:';
      return (
        <div className="text-[13px] text-[#4a5565]">
          <span className="text-xs font-semibold text-[#6b7280] block mb-1">{label}</span>
          <div className="flex flex-wrap gap-1.5">
            {rule.requirements.map((req, i) => (
              <span key={i}>{renderPrerequisites(req)}</span>
            ))}
          </div>
        </div>
      );
    }
    if (rule.type === 'min_credits' && rule.minCredits !== undefined) {
      return (
        <span className="text-xs text-[#6b7280]">
          Minimum {rule.minCredits} credits
        </span>
      );
    }
  }

  // Fallback: try to display as JSON or string
  if (Array.isArray(prereqs)) {
    if (prereqs.length === 0) return <p className="text-[13px] text-[#9ca3af]">None required</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {prereqs.map((p, i) => (
          <span key={i} className="inline-block text-xs bg-amber-100 text-amber-800 px-2.5 py-[3px] rounded-full font-semibold">
            {typeof p === 'string' ? p : JSON.stringify(p)}
          </span>
        ))}
      </div>
    );
  }

  return <p className="text-[13px] text-[#9ca3af]">None required</p>;
}
