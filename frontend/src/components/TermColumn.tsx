import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EntryRow, CourseRow } from '../types';
import { TERM_LABELS } from '../types';
import CourseCard from './CourseCard';

interface Props {
  year: number;
  term: string;
  entries: EntryRow[];
  courseMap: Map<string, CourseRow>;
  errorEntryIds: Set<string>;
  onAddCourse: (year: number, term: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onStatusChange: (entryId: string, status: string) => void;
}

export default function TermColumn({
  year,
  term,
  entries,
  courseMap,
  errorEntryIds,
  onAddCourse,
  onRemoveEntry,
  onStatusChange,
}: Props) {
  const droppableId = `${year}-${term}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const totalCredits = entries.reduce((sum, e) => {
    const c = courseMap.get(e.courseId);
    return sum + (c ? parseFloat(c.credits) || 0 : 0);
  }, 0);

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Year {year} – {TERM_LABELS[term] ?? term}
          </h3>
          <p className="text-xs text-gray-400">{totalCredits} credits</p>
        </div>
        <button
          onClick={() => onAddCourse(year, term)}
          className="text-blue-600 hover:text-blue-800 text-xl leading-none font-light"
          title="Add course"
        >
          +
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-32 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map(entry => (
            <CourseCard
              key={entry.id}
              entry={entry}
              courseTitle={courseMap.get(entry.courseId)?.title}
              courseCredits={courseMap.get(entry.courseId)?.credits}
              hasError={errorEntryIds.has(entry.id)}
              onRemove={onRemoveEntry}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>
        {entries.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">Drop courses here</p>
        )}
      </div>
    </div>
  );
}
