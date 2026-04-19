import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EntryRow } from '../types';
import { STATUS_OPTIONS, STATUS_LABELS } from '../types';

interface Props {
  entry: EntryRow;
  courseTitle?: string;
  courseCredits?: string;
  hasError?: boolean;
  isSelected?: boolean;
  onRemove: (entryId: string) => void;
  onStatusChange: (entryId: string, status: string) => void;
  onSelect?: (courseId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  planned: '#60a5fa',
  in_progress: '#fbbf24',
  completed: '#4ade80',
  failed: '#f87171',
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  planned: { bg: '#eff6ff', color: '#1d4ed8' },
  in_progress: { bg: '#fefce8', color: '#854d0e' },
  completed: { bg: '#f0fdf4', color: '#15803d' },
  failed: { bg: '#fef2f2', color: '#b91c1c' },
};

export default function CourseCard({
  entry,
  courseTitle,
  courseCredits,
  hasError,
  isSelected,
  onRemove,
  onStatusChange,
  onSelect,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const borderColor = isSelected ? '#6366f1' : hasError ? '#fca5a5' : 'rgba(0,0,0,0.09)';
  const bgColor = isSelected ? '#f5f3ff' : hasError ? '#fff5f5' : '#fff';
  const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.planned;

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const opts = [...STATUS_OPTIONS];
    const idx = opts.indexOf(entry.status as typeof STATUS_OPTIONS[number]);
    const next = opts[(idx + 1) % opts.length];
    onStatusChange(entry.id, next);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 9,
        padding: '8px 10px 8px 8px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        cursor: 'pointer',
        position: 'relative',
      }}
      className={`transition-all duration-100 hover:bg-[#fafafa] ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => onSelect?.(entry.courseId)}
    >
      {/* Grip handle */}
      <div {...attributes} {...listeners} className="text-gray-300 pt-0.5 shrink-0 cursor-grab active:cursor-grabbing">
        <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor" stroke="none">
          <circle cx="5" cy="3" r="1" /><circle cx="11" cy="3" r="1" />
          <circle cx="5" cy="7" r="1" /><circle cx="11" cy="7" r="1" />
          <circle cx="5" cy="11" r="1" /><circle cx="11" cy="11" r="1" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: STATUS_DOT[entry.status] ?? '#d1d5db' }}
            />
            <span
              className="text-[13px] font-semibold whitespace-nowrap"
              style={{ color: hasError ? '#b91c1c' : isSelected ? '#4338ca' : '#101828' }}
            >
              {entry.courseId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {courseCredits && (
              <span className="text-[11px] text-[#9ca3af]">{courseCredits}cr</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onRemove(entry.id); }}
              className="text-[#9ca3af] hover:text-red-500 leading-none p-0.5 rounded"
              title="Remove"
            >
              <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </div>

        {courseTitle && (
          <p className="text-[11px] text-[#6b7280] mt-0.5 ml-3 overflow-hidden text-ellipsis whitespace-nowrap">
            {courseTitle}
          </p>
        )}

        <div className="mt-1.5 ml-3">
          <button
            onClick={cycleStatus}
            className="text-[10px] font-semibold px-[7px] py-[1px] rounded-full border-none cursor-pointer"
            style={{ background: badge.bg, color: badge.color }}
          >
            {STATUS_LABELS[entry.status] ?? 'Planned'}
          </button>
        </div>
      </div>
    </div>
  );
}
