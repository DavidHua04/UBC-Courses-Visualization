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
import type { PlanWithEntries, EntryRow, CourseRow, ValidationResult } from '../types';
import { TERMS } from '../types';
import { addEntry, deleteEntry, updateEntry, validatePlan } from '../services/api';
import TermColumn from './TermColumn';
import SummaryPanel from './SummaryPanel';
import CourseSearchModal from './CourseSearchModal';

interface Props {
  plan: PlanWithEntries;
  courseMap: Map<string, CourseRow>;
  onPlanUpdated: () => void;
}

const YEAR_RANGE = [1, 2, 3, 4] as const;

export default function PlanBoard({ plan, courseMap, onPlanUpdated }: Props) {
  const [modal, setModal] = useState<{ year: number; term: string } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

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

    // Find the dragged entry
    const draggedEntry = allEntries.find(e => e.id === active.id);
    if (!draggedEntry) return;

    // Determine if dropped on a droppable column (format: "year-term")
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

    // Dropped on another card in the same column — reorder (same term)
    const overEntry = allEntries.find(e => e.id === over.id);
    if (!overEntry || overEntry.year !== draggedEntry.year || overEntry.term !== draggedEntry.term) {
      // Cross-column drop via card — move to that column
      if (overEntry && (overEntry.year !== draggedEntry.year || overEntry.term !== draggedEntry.term)) {
        try {
          await updateEntry(plan.id, draggedEntry.id, { year: overEntry.year, term: overEntry.term });
          onPlanUpdated();
        } catch (err) {
          console.error('Move failed:', err);
        }
      }
      return;
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

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Main board */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-white flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
          {plan.description && (
            <p className="text-sm text-gray-500">{plan.description}</p>
          )}
        </div>

        {/* Term columns */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
            <div className="flex gap-4 min-h-full">
              {YEAR_RANGE.map(year =>
                TERMS.map(term => (
                  <TermColumn
                    key={`${year}-${term}`}
                    year={year}
                    term={term}
                    entries={getEntries(year, term)}
                    courseMap={courseMap}
                    errorEntryIds={errorEntryIds}
                    onAddCourse={(y, t) => setModal({ year: y, term: t })}
                    onRemoveEntry={handleRemoveEntry}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        </DndContext>
      </div>

      {/* Right panel */}
      <SummaryPanel
        validation={validation}
        validating={validating}
        entries={allEntries}
        onValidate={handleValidate}
      />

      {/* Course search modal */}
      {modal && (
        <CourseSearchModal
          planId={plan.id}
          onAdd={handleAddCourse}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
