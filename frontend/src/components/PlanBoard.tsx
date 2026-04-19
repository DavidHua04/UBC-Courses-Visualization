import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { PlanSummary, PlanWithEntries, EntryRow, CourseRow, ValidationResult, AcademicGoal } from '../types';
import { TERMS, TERM_LABELS } from '../types';
import { addEntry, deleteEntry, updateEntry, validatePlan } from '../services/api';
import TermColumn from './TermColumn';
import SummaryPanel from './SummaryPanel';
import CourseSearchModal from './CourseSearchModal';
import ProgressModal from './ProgressModal';
import CompareModal from './CompareModal';

interface Props {
  plan: PlanWithEntries;
  plans: PlanSummary[];
  courseMap: Map<string, CourseRow>;
  goals: AcademicGoal[];
  completedEntries: EntryRow[];
  onPlanUpdated: () => void;
}

const YEAR_RANGE = [1, 2, 3, 4] as const;

export default function PlanBoard({ plan, plans, courseMap, goals, completedEntries, onPlanUpdated }: Props) {
  const [modal, setModal] = useState<{ year: number; term: string } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Flatten all entries from the nested structure
  const allEntries: EntryRow[] = [];
  for (const yearStr of Object.keys(plan.entries)) {
    for (const term of Object.keys(plan.entries[yearStr])) {
      allEntries.push(...plan.entries[yearStr][term]);
    }
  }

  const getEntries = useCallback(
    (year: number, term: string): EntryRow[] => plan.entries[String(year)]?.[term] ?? [],
    [plan]
  );

  const errorEntryIds = new Set(validation?.errors.map(e => e.entryId) ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedEntry = allEntries.find(e => e.id === active.id);
    if (!draggedEntry) return;

    const overId = String(over.id);
    const match = overId.match(/^(\d+)-(\w+)$/);
    if (match) {
      const newYear = parseInt(match[1]);
      const newTerm = match[2];
      if (newYear !== draggedEntry.year || newTerm !== draggedEntry.term) {
        try {
          await updateEntry(plan.id, draggedEntry.id, { year: newYear, term: newTerm });
          onPlanUpdated();
        } catch (err) {
          console.error('Move failed:', err);
        }
      }
      return;
    }

    const overEntry = allEntries.find(e => e.id === over.id);
    if (overEntry && (overEntry.year !== draggedEntry.year || overEntry.term !== draggedEntry.term)) {
      try {
        await updateEntry(plan.id, draggedEntry.id, { year: overEntry.year, term: overEntry.term });
        onPlanUpdated();
      } catch (err) {
        console.error('Move failed:', err);
      }
    }
  };

  const handleAddCourse = async (courseId: string, year: number, term: string) => {
    try {
      await addEntry(plan.id, courseId, year, term);
      setModal(null);
      onPlanUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add course');
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    try {
      await deleteEntry(plan.id, entryId);
      onPlanUpdated();
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  const handleStatusChange = async (entryId: string, status: string) => {
    try {
      await updateEntry(plan.id, entryId, { status });
      onPlanUpdated();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await validatePlan(plan.id);
      setValidation(result);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  };

  const PLAN_BTNS = [
    { label: 'Progress', fn: () => setShowProgress(true) },
    { label: 'Compare', fn: () => setShowCompare(true) },
    { label: 'Export', fn: null as (() => void) | null },
  ];

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Main board */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-white border-b border-black/[0.09] px-[18px] flex items-center justify-between shrink-0 gap-3">
          <h2 className="text-[22px] font-semibold text-black whitespace-nowrap shrink-0">{plan.name}</h2>
          <div className="flex gap-[7px]">
            {PLAN_BTNS.map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn ?? undefined}
                className="h-7 px-3 rounded-xl border border-black/50 text-xs whitespace-nowrap transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  color: fn ? '#000' : '#aaa',
                  cursor: fn ? 'pointer' : 'default',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                }}
                onMouseEnter={e => fn && (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setModal({ year: 1, term: 'W1' })}
              className="h-7 px-3 rounded-xl border border-black/50 text-xs whitespace-nowrap cursor-pointer transition-colors"
              style={{
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
            >
              + Term
            </button>
          </div>
        </div>

        {/* Term columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex-1 overflow-x-auto overflow-y-hidden p-[18px_20px] flex gap-3.5 items-start"
            onClick={e => { if (e.target === e.currentTarget) setSelectedCourse(null); }}
          >
            {YEAR_RANGE.map(year =>
              TERMS.map(term => {
                const entries = getEntries(year, term);
                if (entries.length === 0 && !isDefaultTerm(year, term)) return null;
                return (
                  <TermColumn
                    key={`${year}-${term}`}
                    year={year}
                    term={term}
                    label={`Year ${year} ${TERM_LABELS[term] ?? term}`}
                    entries={entries}
                    courseMap={courseMap}
                    errorEntryIds={errorEntryIds}
                    selectedCourseId={selectedCourse}
                    onAddCourse={(y, t) => setModal({ year: y, term: t })}
                    onRemoveEntry={handleRemoveEntry}
                    onStatusChange={handleStatusChange}
                    onSelectCourse={id => setSelectedCourse(prev => prev === id ? null : id)}
                  />
                );
              })
            )}
            {/* Add term button */}
            <button
              onClick={() => setModal({ year: 1, term: 'W1' })}
              className="w-[46px] h-[46px] rounded-full shrink-0 border-2 border-dashed border-black/15 bg-transparent cursor-pointer text-[#9ca3af] flex items-center justify-center mt-2.5"
            >
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
            </button>
          </div>
        </DndContext>
      </div>

      {/* Right panel */}
      <SummaryPanel
        validation={validation}
        validating={validating}
        entries={allEntries}
        courseMap={courseMap}
        goals={goals}
        onValidate={handleValidate}
        selectedCourseId={selectedCourse}
        onClearSelection={() => setSelectedCourse(null)}
      />

      {/* Modals */}
      {modal && (
        <CourseSearchModal
          onAdd={handleAddCourse}
          onClose={() => setModal(null)}
          year={modal.year}
          term={modal.term}
        />
      )}
      {showProgress && (
        <ProgressModal
          onClose={() => setShowProgress(false)}
          completedEntries={completedEntries}
          planEntries={allEntries}
          courseMap={courseMap}
        />
      )}
      {showCompare && (
        <CompareModal
          plans={plans}
          activePlan={plan}
          courseMap={courseMap}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

// Show W1 and W2 by default for all years
function isDefaultTerm(_year: number, term: string): boolean {
  return term === 'W1' || term === 'W2';
}
