import type { PlanSummary, EntryRow } from '../types';

interface Props {
  plans: PlanSummary[];
  selectedPlanId: string | null;
  completedEntries: EntryRow[];
  onSelectPlan: (id: string) => void;
  onCreatePlan: () => void;
  onDeletePlan: (id: string) => void;
}

export default function Sidebar({
  plans,
  selectedPlanId,
  completedEntries,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
}: Props) {
  return (
    <div className="w-64 shrink-0 bg-white border-r flex flex-col overflow-y-auto">
      <div className="p-4 border-b">
        <h1 className="text-base font-bold text-gray-900">UBC Degree Planner</h1>
      </div>

      {/* Completed Courses */}
      {completedEntries.length > 0 && (
        <div className="p-4 border-b">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Completed Courses
          </h2>
          <div className="space-y-1">
            {completedEntries.map(entry => (
              <div key={entry.id} className="text-sm text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                {entry.courseId}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{completedEntries.length} courses completed</p>
        </div>
      )}

      {/* Plans */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Plans
          </h2>
          <button
            onClick={onCreatePlan}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + New
          </button>
        </div>

        {plans.length === 0 && (
          <p className="text-sm text-gray-400">No plans yet. Create one to get started.</p>
        )}

        <div className="space-y-1">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                plan.id === selectedPlanId
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelectPlan(plan.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                <p className="text-xs text-gray-400">{plan.entryCount} courses</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDeletePlan(plan.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-lg leading-none ml-1"
                title="Delete plan"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
