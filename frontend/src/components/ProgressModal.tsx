import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntryRow, CourseRow, DegreeProgress, RequirementProgress, RequirementType } from '../types';
import { getProgress } from '../services/api';

interface Props {
  onClose: () => void;
  planId: string;
  programId: string | null;
  // Fallback rendering when no program is selected
  completedEntries: EntryRow[];
  planEntries: EntryRow[];
  courseMap: Map<string, CourseRow>;
}

const TYPE_LABEL: Record<RequirementType, string> = {
  required: 'Required',
  elective: 'Elective',
  breadth: 'Breadth',
  communication: 'Communication',
  lab: 'Lab',
  foundational: 'Foundational',
};

const transferStorageKey = (planId: string, programId: string) =>
  `ubc:transferCredits:${planId}:${programId}`;

function loadTransferCredits(planId: string, programId: string): Set<string> {
  try {
    const raw = localStorage.getItem(transferStorageKey(planId, programId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch { /* ignore */ }
  return new Set();
}

function saveTransferCredits(planId: string, programId: string, set: Set<string>) {
  try {
    localStorage.setItem(transferStorageKey(planId, programId), JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export default function ProgressModal({ onClose, planId, programId, completedEntries, planEntries, courseMap }: Props) {
  const [progress, setProgress] = useState<DegreeProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferCredits, setTransferCredits] = useState<Set<string>>(new Set());

  // Hydrate transfer credits from localStorage when the plan/program changes.
  useEffect(() => {
    if (!programId) {
      setTransferCredits(new Set());
      return;
    }
    setTransferCredits(loadTransferCredits(planId, programId));
  }, [planId, programId]);

  // Stable key so the effect below reacts to set-content changes, not identity.
  const transferKey = useMemo(() => [...transferCredits].sort().join('|'), [transferCredits]);

  useEffect(() => {
    if (!programId) {
      setProgress(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProgress(planId, programId, transferCredits)
      .then((p) => { if (!cancelled) setProgress(p); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load progress'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // transferKey captures Set content; planId/programId capture identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, programId, transferKey]);

  const toggleTransfer = useCallback(
    (key: string) => {
      if (!programId) return;
      setTransferCredits((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        saveTransferCredits(planId, programId, next);
        return next;
      });
    },
    [planId, programId],
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] w-[760px] max-h-[84vh] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[22px] py-[18px] border-b border-black/[0.07] flex justify-between items-center shrink-0">
          <span className="font-bold text-lg">Academic Progress</span>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#6b7280] leading-none">
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-5">
          {!programId ? (
            <FallbackProgress completedEntries={completedEntries} planEntries={planEntries} courseMap={courseMap} />
          ) : loading && !progress ? (
            <p className="text-sm text-gray-500">Loading progress…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : progress ? (
            <ProgressContent
              progress={progress}
              transferCredits={transferCredits}
              onToggleTransfer={toggleTransfer}
              refreshing={loading}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProgressContent({
  progress,
  transferCredits,
  onToggleTransfer,
  refreshing,
}: {
  progress: DegreeProgress;
  transferCredits: Set<string>;
  onToggleTransfer: (key: string) => void;
  refreshing: boolean;
}) {
  const remaining = Math.max(0, progress.totalCredits - progress.completedCredits);
  const satisfied = progress.requirements.filter((r) => r.satisfied).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-[22px]">
        <SummaryCard label="Scheduled credits" value={progress.completedCredits} color="#101828" />
        <SummaryCard label="Total required" value={progress.totalCredits} color="#9ca3af" />
        <SummaryCard label="Credits remaining" value={remaining} color="#d1d5db" />
      </div>

      <div className="flex justify-between text-[13px] text-[#4a5565] mb-1.5">
        <span>Total progress {refreshing && <span className="text-[11px] text-gray-400 ml-1">updating…</span>}</span>
        <span className="font-semibold">{progress.completedCredits} / {progress.totalCredits} ({progress.percent}%)</span>
      </div>
      <div className="h-2.5 bg-[#e5e7eb] rounded-[5px] mb-[22px] overflow-hidden relative">
        <div
          className="absolute left-0 top-0 h-full bg-[#101828] rounded-[5px] transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <span className="font-semibold text-sm">
          Requirements — {satisfied} / {progress.requirements.length} satisfied
        </span>
        <span className="text-[11px] text-gray-500 italic">
          Tip: toggle "Transfer" to mark a requirement satisfied by transfer credit.
        </span>
      </div>
      <div className="border border-black/[0.08] rounded-[10px] overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_90px_90px_88px] bg-[#f9f9f9] px-3.5 py-2 text-xs text-[#6b7280] font-semibold">
          <span>Requirement</span>
          <span>Type</span>
          <span>Credits</span>
          <span>Status</span>
          <span className="text-right">Transfer</span>
        </div>
        {progress.requirements.map((req) => (
          <RequirementRow
            key={req.requirementId}
            req={req}
            transferCredits={transferCredits}
            onToggleTransfer={onToggleTransfer}
          />
        ))}
      </div>
    </>
  );
}

function RequirementRow({
  req,
  transferCredits,
  onToggleTransfer,
}: {
  req: RequirementProgress;
  transferCredits: Set<string>;
  onToggleTransfer: (key: string) => void;
}) {
  // The whole-requirement transfer key matches the backend's expected format
  // (see ProgressService.compute()'s `transferCredits` set).
  const transferred = transferCredits.has(req.requirementId);

  return (
    <div className="grid grid-cols-[1fr_70px_90px_90px_88px] px-3.5 py-2.5 border-t border-black/[0.06] items-center">
      <div className="flex flex-col">
        <span className="text-[13px]">{req.requirementName}</span>
        {req.satisfyingCourseIds.length > 0 && (
          <span className="text-[11px] text-gray-500 mt-0.5 truncate">
            via {req.satisfyingCourseIds.slice(0, 3).join(', ')}
            {req.satisfyingCourseIds.length > 3 ? '…' : ''}
          </span>
        )}
      </div>
      <span className="text-[11px] text-[#6b7280]">{TYPE_LABEL[req.requirementType]}</span>
      <span className="text-[13px] text-[#6b7280]">
        {req.completedCredits} / {req.requiredCredits}
      </span>
      {req.satisfied ? (
        <span className="flex items-center gap-1 text-[13px] text-green-600 font-semibold">
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 8l4 4 8-8" />
          </svg>
          Met
        </span>
      ) : (
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold inline-block w-fit">
          Pending
        </span>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onToggleTransfer(req.requirementId)}
          aria-pressed={transferred}
          title={transferred ? 'Click to remove transfer credit' : 'Mark as satisfied by transfer credit'}
          className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
            transferred
              ? 'bg-[#101828] text-white border-[#101828] hover:bg-[#1e293b]'
              : 'bg-white text-[#4a5565] border-black/15 hover:bg-gray-50'
          }`}
        >
          {transferred ? '✓ Transfer' : 'Transfer'}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#fafafa] border border-black/[0.07] rounded-[10px] px-4 py-3.5">
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[13px] text-[#6b7280] mt-0.5">{label}</div>
    </div>
  );
}

// Fallback when no program is selected — keeps the user from seeing an empty modal.
const TOTAL_CREDITS_DEFAULT = 120;
function FallbackProgress({
  completedEntries,
  planEntries,
  courseMap,
}: {
  completedEntries: EntryRow[];
  planEntries: EntryRow[];
  courseMap: Map<string, CourseRow>;
}) {
  const sumCredits = (rows: EntryRow[]) =>
    rows.reduce((s, e) => {
      const c = courseMap.get(e.courseId);
      return s + (c ? parseFloat(c.credits) || 0 : 0);
    }, 0);

  const compCr = sumCredits(completedEntries);
  const planCr = sumCredits(planEntries);
  const remaining = Math.max(0, TOTAL_CREDITS_DEFAULT - compCr - planCr);

  return (
    <>
      <div className="bg-[#fafafa] border border-black/[0.07] rounded-[10px] px-4 py-3 mb-3 text-xs text-gray-600">
        Select a program above to track degree requirements. Showing a credit-only view in the meantime.
      </div>
      <div className="grid grid-cols-3 gap-3 mb-[22px]">
        <SummaryCard label="Completed credits" value={compCr} color="#101828" />
        <SummaryCard label="Planned credits" value={planCr} color="#9ca3af" />
        <SummaryCard label="Credits remaining" value={remaining} color="#d1d5db" />
      </div>
      <div className="flex justify-between text-[13px] text-[#4a5565] mb-1.5">
        <span>Total progress toward {TOTAL_CREDITS_DEFAULT} credits</span>
        <span className="font-semibold">{compCr + planCr} / {TOTAL_CREDITS_DEFAULT}</span>
      </div>
      <div className="h-2.5 bg-[#e5e7eb] rounded-[5px] overflow-hidden relative">
        <div
          className="absolute left-0 top-0 h-full bg-[#101828] rounded-[5px]"
          style={{ width: `${Math.min(100, (compCr / TOTAL_CREDITS_DEFAULT) * 100)}%` }}
        />
        <div
          className="absolute top-0 h-full bg-[#9ca3af] rounded-[5px]"
          style={{
            left: `${Math.min(100, (compCr / TOTAL_CREDITS_DEFAULT) * 100)}%`,
            width: `${Math.min(100 - Math.min(100, (compCr / TOTAL_CREDITS_DEFAULT) * 100), (planCr / TOTAL_CREDITS_DEFAULT) * 100)}%`,
          }}
        />
      </div>
    </>
  );
}
