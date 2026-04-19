import type { PlanSummary, EntryRow, CourseRow, AcademicGoal } from '../types';

interface Props {
  plans: PlanSummary[];
  selectedPlanId: string | null;
  completedEntries: EntryRow[];
  courseMap: Map<string, CourseRow>;
  goals: AcademicGoal[];
  onSelectPlan: (id: string) => void;
  onCreatePlan: () => void;
  onDeletePlan: (id: string) => void;
  onAddGoal: () => void;
  onToggleGoal: (id: string) => void;
  onUpload: () => void;
  onDeleteCompleted: (entryId: string) => void;
}

export default function Sidebar({
  plans,
  selectedPlanId,
  completedEntries,
  courseMap,
  goals,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  onAddGoal,
  onToggleGoal,
  onUpload,
  onDeleteCompleted,
}: Props) {
  const totalCompletedCredits = completedEntries.reduce((sum, e) => {
    const course = courseMap.get(e.courseId);
    return sum + (course ? parseFloat(course.credits) || 0 : 0);
  }, 0);

  return (
    <div className="w-[300px] shrink-0 bg-white border-r border-black/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-black/20 px-4 flex items-center h-[58px] shrink-0">
        <h1 className="text-xl font-semibold text-[#101828] whitespace-nowrap">Transcript &amp; Goals</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-3.5">
        {/* Completed Courses */}
        <section className="mb-5">
          <div className="flex justify-between items-center h-8 mb-2.5">
            <h2 className="text-[15px] font-semibold text-[#101828] whitespace-nowrap">Completed Courses</h2>
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 bg-white border border-black/[0.14] rounded-lg px-2.5 h-7 text-xs text-[#101828] cursor-pointer hover:bg-[#f5f5f5] transition-colors"
            >
              <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M8 10V3M5 6l3-3 3 3M3 12.5v.5a1 1 0 001 1h8a1 1 0 001-1v-.5" />
              </svg>
              Upload
            </button>
          </div>

          {completedEntries.length > 0 ? (
            <div className="border border-black/10 rounded-xl overflow-hidden">
              {completedEntries.map((entry, i) => {
                const course = courseMap.get(entry.courseId);
                return (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-1.5 px-2.5 py-2"
                    style={{ borderBottom: i < completedEntries.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                  >
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#364153] block whitespace-nowrap">{entry.courseId}</span>
                      {course && (
                        <span className="text-[11px] text-[#6a7282] block mt-0.5 leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                          {course.title}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteCompleted(entry.id)}
                      className="border-none bg-none cursor-pointer text-gray-300 hover:text-red-500 leading-none shrink-0 p-0.5 rounded mt-0.5"
                      title="Remove course"
                    >
                      <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-[#d1d5dc] rounded-xl h-[70px] flex items-center justify-center">
              <span className="text-[13px] text-[#99a1af]">No completed courses yet</span>
            </div>
          )}

          <p className="text-[13px] text-[#4a5565] mt-[7px]">Total: {totalCompletedCredits} credits</p>
        </section>

        {/* Simulated Plans */}
        <section className="mb-5">
          <div className="flex justify-between items-center h-8 mb-2.5">
            <h2 className="text-[15px] font-semibold text-[#101828] whitespace-nowrap">Simulated Plans</h2>
            <button
              onClick={onCreatePlan}
              className="flex items-center gap-1.5 bg-white border border-black/[0.14] rounded-lg px-2.5 h-7 text-xs text-[#101828] cursor-pointer hover:bg-[#f5f5f5] transition-colors"
            >
              <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
              Add
            </button>
          </div>

          <div className="flex flex-col gap-[7px]">
            {plans.length === 0 && (
              <p className="text-[13px] text-[#99a1af]">No plans yet.</p>
            )}
            {plans.map(plan => (
              <div
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                className="group flex items-center justify-between rounded-xl px-4 h-11 cursor-pointer border border-black/20 transition-colors"
                style={{
                  background: plan.id === selectedPlanId ? 'rgba(0,0,0,0.08)' : '#fff',
                }}
                onMouseEnter={e => { if (plan.id !== selectedPlanId) e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = plan.id === selectedPlanId ? 'rgba(0,0,0,0.08)' : '#fff'; }}
              >
                <span className="text-[15px] text-black whitespace-nowrap" style={{ fontWeight: plan.id === selectedPlanId ? 600 : 400 }}>
                  {plan.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onDeletePlan(plan.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-lg leading-none ml-2 shrink-0 border-none bg-none cursor-pointer"
                  title="Delete plan"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Academic Goals */}
        <section className="mb-3.5">
          <div className="flex justify-between items-center h-8 mb-2.5">
            <h2 className="text-[15px] font-semibold text-[#101828] whitespace-nowrap">Academic Goals</h2>
            <button
              onClick={onAddGoal}
              className="flex items-center gap-1.5 bg-white border border-black/[0.14] rounded-lg px-2.5 h-7 text-xs text-[#101828] cursor-pointer hover:bg-[#f5f5f5] transition-colors"
            >
              <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
              Add
            </button>
          </div>

          <div className="flex flex-col gap-[7px]">
            {goals.length === 0 && (
              <p className="text-[13px] text-[#99a1af]">No goals yet.</p>
            )}
            {goals.map(goal => (
              <div
                key={goal.id}
                onClick={() => onToggleGoal(goal.id)}
                className="border border-black/10 rounded-xl px-3 py-[9px] flex items-start gap-2 cursor-pointer bg-white hover:bg-[#f9f9f9] transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#9ca3af] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-1 mb-[5px]">
                    <span className="text-[13px] text-[#101828] overflow-hidden text-ellipsis whitespace-nowrap">{goal.name}</span>
                    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="shrink-0 mt-0.5">
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </div>
                  <span
                    className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-lg text-white"
                    style={{ background: goal.satisfied ? '#00a63e' : '#f0b100' }}
                  >
                    {goal.satisfied ? 'Satisfied' : 'Unsatisfied'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* User Profile */}
      <div className="border-t border-black/20 h-14 px-3.5 flex items-center gap-2.5 shrink-0">
        <div className="w-[34px] h-[34px] rounded-full bg-[#3c7875] flex items-center justify-center text-white font-bold text-sm shrink-0">
          U
        </div>
        <div>
          <div className="text-sm text-black">User Name &amp; Personal Info</div>
          <div className="text-xs text-black/45">Year 3</div>
        </div>
      </div>
    </div>
  );
}
