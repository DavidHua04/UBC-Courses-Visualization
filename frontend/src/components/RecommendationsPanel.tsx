import { useEffect, useState } from 'react';
import type { Recommendation, RecommendationSeverity } from '../types';
import { getRecommendations } from '../services/api';

interface Props {
  planId: string;
  programId: string | null;
  // bump this to force re-fetch when the plan changes
  refreshKey?: number;
}

const SEVERITY_STYLES: Record<RecommendationSeverity, string> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  suggestion: 'bg-blue-50 border-blue-200 text-blue-900',
  info: 'bg-green-50 border-green-200 text-green-900',
};

const SEVERITY_LABEL: Record<RecommendationSeverity, string> = {
  warning: 'Warning',
  suggestion: 'Suggestion',
  info: 'Info',
};

export default function RecommendationsPanel({ planId, programId, refreshKey }: Props) {
  const [open, setOpen] = useState(true);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecommendations(planId, programId ?? undefined)
      .then((r) => { if (!cancelled) setRecs(r); })
      .catch(() => { if (!cancelled) setRecs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [planId, programId, refreshKey]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 bg-[#101828] text-white p-3 rounded-full shadow-lg z-40"
        title="Show recommendations"
      >
        <svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" />
          <circle cx="8" cy="8" r="3" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-white border border-black/10 rounded-[12px] shadow-[0_14px_40px_rgba(0,0,0,0.14)] z-40 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-black/[0.07] bg-[#101828] text-white flex items-center justify-between">
        <span className="font-semibold text-sm">Recommendations</span>
        <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="p-3 overflow-y-auto flex flex-col gap-2.5">
        {loading && recs.length === 0 ? (
          <p className="text-xs text-gray-500 px-2 py-3">Loading…</p>
        ) : recs.length === 0 ? (
          <p className="text-xs text-gray-500 px-2 py-3">No recommendations.</p>
        ) : (
          recs.map((r) => (
            <div
              key={r.id}
              className={`border rounded-[10px] p-3 ${SEVERITY_STYLES[r.severity]}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[13px]">{r.title}</span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">{SEVERITY_LABEL[r.severity]}</span>
              </div>
              <p className="text-xs whitespace-pre-line opacity-90">{r.message}</p>
            </div>
          ))
        )}
        {!programId && (
          <p className="text-[11px] text-gray-500 italic px-1">
            Select a program to enable graduation-pace and requirement-coverage checks.
          </p>
        )}
      </div>
    </div>
  );
}
