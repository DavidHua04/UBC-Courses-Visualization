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
}: Props) {
  const totalCompletedCredits = completedEntries.reduce((sum, e) => {
    const course = courseMap.get(e.courseId);
    return sum + (course ? parseFloat(course.credits) || 0 : 0);
  }, 0);

  return (
    <div className="w-[360px] shrink-0 bg-white border-r border-black/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-black/20 px-4 flex items-center h-[76px] shrink-0">
        <h1 className="text-2xl font-normal text-[#101828]">Transcript &amp; Goals</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-col gap-6 px-4 py-4 overflow-y-auto flex-1">
        {/* Completed Courses */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between h-8">
            <h2 className="text-xl font-normal text-[#101828]">Completed Courses</h2>
            <button className="flex items-center gap-1.5 border border-black/10 rounded-lg px-3 h-8 text-sm text-[#0a0a0a] bg-white hover:bg-gray-50">
              ↑ Upload
            </button>
          </div>

          {completedEntries.length > 0 ? (
            <div className="border border-black/10 rounded-[14px] px-3 py-3 flex flex-col gap-2">
              {completedEntries.slice(0, 8).map(entry => {
                const course = courseMap.get(entry.courseId);
                return (
                  <div key={entry.id} className="flex flex-col">
                    <span className="text-sm font-medium text-[#364153]">{entry.courseId}</span>
                    {course && (
                      <span className="text-sm text-[#6a7282]">{course.title}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-[#d1d5dc] rounded-[14px] h-24 flex items-center justify-center">
              <p className="text-sm text-[#99a1af]">No completed courses yet</p>
            </div>
          )}

          <p className="text-sm text-[#4a5565]">Total: {totalCompletedCredits} credits</p>
        </section>

        {/* Simulated Plans */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between h-8">
            <h2 className="text-xl font-normal text-[#101828]">Simulated Plans</h2>
            <button
              onClick={onCreatePlan}
              className="flex items-center gap-1.5 border border-black/10 rounded-lg px-3 h-8 text-sm text-[#0a0a0a] bg-white hover:bg-gray-50"
            >
              + Add
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {plans.length === 0 && (
              <p className="text-sm text-[#99a1af]">No plans yet. Create one to get started.</p>
            )}
            {plans.map(plan => (
              <div
                key={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                className={`group flex items-center justify-between rounded-[12px] px-6 h-[49px] cursor-pointer border transition-colors ${
                  plan.id === selectedPlanId
                    ? 'bg-black/10 border-black/20'
                    : 'bg-white border-black/20 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl text-black truncate">{plan.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); onDeletePlan(plan.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-lg leading-none ml-2 shrink-0"
                  title="Delete plan"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Academic Goals */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between h-8">
            <h2 className="text-xl font-normal text-[#101828]">Academic Goals</h2>
            <button
              onClick={onAddGoal}
              className="flex items-center gap-1.5 border border-black/10 rounded-lg px-3 h-8 text-sm text-[#0a0a0a] bg-white hover:bg-gray-50"
            >
              + Add
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {goals.length === 0 && (
              <p className="text-sm text-[#99a1af]">No goals yet. Add one to track progress.</p>
            )}
            {goals.map(goal => (
              <div
                key={goal.id}
                onClick={() => onToggleGoal(goal.id)}
                className="border border-black/10 rounded-[14px] px-3 py-3 flex items-start gap-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="w-4 h-4 rounded-full border-2 border-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base text-[#101828] truncate">{goal.name}</span>
                    <span className="text-gray-400 shrink-0">›</span>
                  </div>
                  <span
                    className={`text-xs text-white rounded-lg px-2 py-0.5 w-fit ${
                      goal.satisfied ? 'bg-[#00a63e]' : 'bg-[#f0b100]'
                    }`}
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
      <button className="border-t border-black/20 flex items-center gap-3 px-4 h-[60px] shrink-0 hover:bg-gray-50 text-left">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-base shrink-0">
          U
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base text-black truncate">User Name &amp; Personal Info</span>
          <span className="text-sm text-black/50">Year 3</span>
        </div>
      </button>
    </div>
  );
}
