import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EntryRow } from '../types';
import { STATUS_LABELS } from '../types';

interface Props {
  entry: EntryRow;
  courseTitle?: string;
  courseCredits?: string;
  hasError?: boolean;
  onRemove: (entryId: string) => void;
  onStatusChange: (entryId: string, status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-50 border-blue-200',
  in_progress: 'bg-yellow-50 border-yellow-200',
  completed: 'bg-green-50 border-green-200',
  failed: 'bg-red-50 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  planned: 'bg-blue-400',
  in_progress: 'bg-yellow-400',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export default function CourseCard({
  entry,
  courseTitle,
  courseCredits,
  hasError,
  onRemove,
  onStatusChange,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const colorClass = hasError
    ? 'bg-red-50 border-red-300'
    : (STATUS_COLORS[entry.status] ?? 'bg-gray-50 border-gray-200');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-3 mb-2 select-none ${colorClass} ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[entry.status] ?? 'bg-gray-400'}`}
            />
            <span className="font-semibold text-sm text-gray-900 truncate">{entry.courseId}</span>
            {courseCredits && (
              <span className="text-xs text-gray-400 shrink-0">{courseCredits}cr</span>
            )}
          </div>
          {courseTitle && (
            <p className="text-xs text-gray-500 mt-0.5 ml-3.5 truncate">{courseTitle}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(entry.id)}
          className="shrink-0 text-gray-300 hover:text-red-500 text-lg leading-none mt-0.5"
          title="Remove"
        >
          &times;
        </button>
      </div>
      <div className="mt-2 ml-3.5">
        <select
          value={entry.status}
          onChange={e => onStatusChange(entry.id, e.target.value)}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600"
          onClick={e => e.stopPropagation()}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
