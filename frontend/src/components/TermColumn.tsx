import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EntryRow, CourseRow } from '../types';
import CourseCard from './CourseCard';

interface Props {
  year: number;
  term: string;
  label: string;
  entries: EntryRow[];
  courseMap: Map<string, CourseRow>;
  errorEntryIds: Set<string>;
  selectedCourseId: string | null;
  onAddCourse: (year: number, term: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onStatusChange: (entryId: string, status: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export default function TermColumn({
  year,
  term,
  label,
  entries,
  courseMap,
  errorEntryIds,
  selectedCourseId,
  onAddCourse,
  onRemoveEntry,
  onStatusChange,
  onSelectCourse,
}: Props) {
  const droppableId = `${year}-${term}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const totalCredits = entries.reduce((sum, e) => {
    const c = courseMap.get(e.courseId);
    return sum + (c ? parseFloat(c.credits) || 0 : 0);
  }, 0);

  return (
    <div className="w-[300px] shrink-0 bg-white rounded-[14px] border border-black/[0.09] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-3.5 pt-3 pb-[7px]">
        <span className="text-[15px] font-semibold text-[#101828] whitespace-nowrap">{label}</span>
        <span className="text-xs text-[#4a5565] whitespace-nowrap">{totalCredits} cr</span>
      </div>

      {/* Add Course button */}
      <div className="px-3 pb-2.5">
        <button
          onClick={() => onAddCourse(year, term)}
          className="w-full h-[30px] rounded-lg bg-white border border-black/[0.09] flex items-center justify-center gap-1.5 cursor-pointer text-[13px] text-[#101828] hover:bg-[#f5f5f5] transition-colors"
        >
          <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          Add Course
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[140px] mx-2.5 mb-2.5 rounded-[10px] flex flex-col gap-[5px] overflow-y-auto transition-all duration-150"
        style={{
          padding: entries.length ? 7 : 0,
          border: isOver ? '2px dashed #818cf8' : '1px solid rgb(209,213,220)',
          background: isOver ? 'rgba(129,140,248,0.04)' : 'transparent',
        }}
      >
        <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map(entry => (
            <CourseCard
              key={entry.id}
              entry={entry}
              courseTitle={courseMap.get(entry.courseId)?.title}
              courseCredits={courseMap.get(entry.courseId)?.credits}
              hasError={errorEntryIds.has(entry.id)}
              isSelected={selectedCourseId === entry.courseId}
              onRemove={onRemoveEntry}
              onStatusChange={onStatusChange}
              onSelect={onSelectCourse}
            />
          ))}
        </SortableContext>
        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[130px] text-[#9ca3af] text-sm">
            Drop courses here
          </div>
        )}
      </div>
    </div>
  );
}
