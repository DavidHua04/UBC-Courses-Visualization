import { useState } from 'react';
import type { PlanSummary, PlanWithEntries, CourseRow } from '../types';
import { TERMS } from '../types';
import { getPlan } from '../services/api';

interface Props {
  plans: PlanSummary[];
  activePlan: PlanWithEntries;
  courseMap: Map<string, CourseRow>;
  onClose: () => void;
}

const YEAR_RANGE = [1, 2, 3, 4];

export default function CompareModal({ plans, activePlan, courseMap, onClose }: Props) {
  const [otherPlan, setOtherPlan] = useState<PlanWithEntries | null>(null);
  const [loadingOther, setLoadingOther] = useState(false);

  const handleSelectOther = async (planId: string) => {
    if (!planId) { setOtherPlan(null); return; }
    setLoadingOther(true);
    try {
      const data = await getPlan(planId);
      setOtherPlan(data);
    } catch {
      setOtherPlan(null);
    } finally {
      setLoadingOther(false);
    }
  };

  const getEntries = (plan: PlanWithEntries, year: number, term: string) =>
    plan.entries[String(year)]?.[term] ?? [];

  const getTotalCredits = (plan: PlanWithEntries) => {
    let total = 0;
    for (const yearStr of Object.keys(plan.entries)) {
      for (const term of Object.keys(plan.entries[yearStr])) {
        for (const entry of plan.entries[yearStr][term]) {
          const c = courseMap.get(entry.courseId);
          total += c ? parseFloat(c.credits) || 0 : 0;
        }
      }
    }
    return total;
  };

  const PlanCol = ({ plan, color }: { plan: PlanWithEntries | null; color: string }) => {
    if (!plan) {
      return (
        <div className="flex-1 flex items-center justify-center text-[#9ca3af] text-sm">
          {loadingOther ? 'Loading...' : 'No plan selected'}
        </div>
      );
    }
    return (
      <div className="flex-1 min-w-0 overflow-y-auto px-3">
        <div className="mb-3 pb-2.5" style={{ borderBottom: `2px solid ${color}` }}>
          <div className="text-lg font-bold text-[#101828]">{plan.name}</div>
          <div className="text-[13px] text-[#6b7280] mt-0.5">{getTotalCredits(plan)} planned credits</div>
        </div>
        {YEAR_RANGE.map(year =>
          TERMS.map(term => {
            const entries = getEntries(plan, year, term);
            if (entries.length === 0) return null;
            const termCredits = entries.reduce((s, e) => {
              const c = courseMap.get(e.courseId);
              return s + (c ? parseFloat(c.credits) || 0 : 0);
            }, 0);
            return (
              <div key={`${year}-${term}`} className="mb-3.5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[13px] font-semibold text-[#101828]">Year {year} {term}</span>
                  <span className="text-[11px] text-[#9ca3af]">{termCredits}cr</span>
                </div>
                {entries.map(e => {
                  const course = courseMap.get(e.courseId);
                  return (
                    <div key={e.id} className="bg-white border border-black/[0.09] rounded-lg px-2.5 py-[7px] mb-[5px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-semibold text-[#101828]">{e.courseId}</span>
                        <span className="text-[11px] text-[#9ca3af]">{course?.credits ?? '?'}cr</span>
                      </div>
                      <div className="text-[11px] text-[#6b7280] mt-[1px]">{course?.title ?? e.courseId}</div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#f4f3f3] rounded-2xl w-[90vw] max-w-[960px] h-[82vh] flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.25)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-black/[0.09] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[16px]">Compare Plans</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#101828] font-semibold bg-sky-100 px-3 py-[3px] rounded-full">
                {activePlan.name}
              </span>
              <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
              <select
                onChange={e => handleSelectOther(e.target.value)}
                className="h-[30px] rounded-lg border border-black/15 px-2.5 text-[13px] outline-none bg-white"
                defaultValue=""
              >
                <option value="">Select plan…</option>
                {plans.filter(p => p.id !== activePlan.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#6b7280] leading-none">
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {/* Side-by-side */}
        <div className="flex-1 flex overflow-hidden p-4 gap-1">
          <PlanCol plan={activePlan} color="#3b82f6" />
          <div className="w-px bg-black/10 shrink-0" />
          <PlanCol plan={otherPlan} color="#8b5cf6" />
        </div>
      </div>
    </div>
  );
}
