import type { EntryRow, CourseRow } from '../types';

interface Props {
  onClose: () => void;
  completedEntries: EntryRow[];
  planEntries: EntryRow[];
  courseMap: Map<string, CourseRow>;
}

const TOTAL_CREDITS = 120;

const CORE_REQS = [
  'CPSC 110', 'CPSC 121', 'SCIE 113', 'MATH 100', 'MATH 101',
  'ENGL 112', 'CPSC 210', 'CPSC 221', 'CPSC 213', 'CPSC 310',
];

export default function ProgressModal({ onClose, completedEntries, planEntries, courseMap }: Props) {
  const compIds = new Set(completedEntries.map(c => c.courseId));
  const planIds = new Set(planEntries.map(e => e.courseId));

  const getCredits = (entries: EntryRow[]) =>
    entries.reduce((s, e) => {
      const c = courseMap.get(e.courseId);
      return s + (c ? parseFloat(c.credits) || 0 : 0);
    }, 0);

  const compCr = getCredits(completedEntries);
  const planCr = getCredits(planEntries);
  const remaining = Math.max(0, TOTAL_CREDITS - compCr - planCr);
  const satisfied = CORE_REQS.filter(r => compIds.has(r)).length;

  const coreReqCredits = (id: string) => {
    const c = courseMap.get(id);
    return c ? parseFloat(c.credits) || 0 : 3;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] w-[680px] max-h-[84vh] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.2)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[22px] py-[18px] border-b border-black/[0.07] flex justify-between items-center shrink-0">
          <span className="font-bold text-lg">Academic Progress</span>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#6b7280] leading-none">
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-5">
          {/* Credit summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-[22px]">
            {[
              ['Completed', compCr, '#101828'],
              ['Planned', planCr, '#9ca3af'],
              ['Remaining', remaining, '#d1d5db'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="bg-[#fafafa] border border-black/[0.07] rounded-[10px] px-4 py-3.5">
                <div className="text-[26px] font-bold" style={{ color: color as string }}>{value}</div>
                <div className="text-[13px] text-[#6b7280] mt-0.5">{label} credits</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex justify-between text-[13px] text-[#4a5565] mb-1.5">
            <span>Total progress toward {TOTAL_CREDITS} credits</span>
            <span className="font-semibold">{compCr + planCr} / {TOTAL_CREDITS}</span>
          </div>
          <div className="h-2.5 bg-[#e5e7eb] rounded-[5px] mb-[22px] overflow-hidden relative">
            <div
              className="absolute left-0 top-0 h-full bg-[#101828] rounded-[5px]"
              style={{ width: `${Math.min(100, (compCr / TOTAL_CREDITS) * 100)}%` }}
            />
            <div
              className="absolute top-0 h-full bg-[#9ca3af] rounded-[5px]"
              style={{
                left: `${Math.min(100, (compCr / TOTAL_CREDITS) * 100)}%`,
                width: `${Math.min(100 - Math.min(100, (compCr / TOTAL_CREDITS) * 100), (planCr / TOTAL_CREDITS) * 100)}%`,
              }}
            />
          </div>

          {/* Core requirements */}
          <div className="font-semibold text-sm mb-2.5">Core Requirements — {satisfied}/{CORE_REQS.length} Satisfied</div>
          <div className="border border-black/[0.08] rounded-[10px] overflow-hidden">
            <div className="grid grid-cols-[1fr_60px_100px] bg-[#f9f9f9] px-3.5 py-2 text-xs text-[#6b7280] font-semibold">
              <span>Requirement</span><span>Credits</span><span>Status</span>
            </div>
            {CORE_REQS.map((req, i) => {
              const done = compIds.has(req);
              const inPlan = planIds.has(req);
              return (
                <div key={i} className="grid grid-cols-[1fr_60px_100px] px-3.5 py-2.5 border-t border-black/[0.06] items-center">
                  <span className="text-[13px]">{req}</span>
                  <span className="text-[13px] text-[#6b7280]">{coreReqCredits(req)}</span>
                  {done ? (
                    <span className="flex items-center gap-1 text-[13px] text-green-600 font-semibold">
                      <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M2 8l4 4 8-8" />
                      </svg>
                      Satisfied
                    </span>
                  ) : inPlan ? (
                    <span className="text-xs bg-[#eff6ff] text-blue-700 px-2 py-0.5 rounded-full font-semibold inline-block w-fit">Planned</span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold inline-block w-fit">Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
