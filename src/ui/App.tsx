import { useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { Term } from "../engine/types";
import { deptOf, displayId } from "../engine/types";
import { validatePlan } from "../engine/validate";
import { loadDept, loadIndex, loadPrograms } from "../catalog/loader";
import { searchCourses } from "../catalog/loader";
import { activePlan, planFromHash, useStore } from "../state/store";
import { TopBar } from "./TopBar";
import { CatalogPanel } from "./CatalogPanel";
import { Board } from "./Board";
import { InsightPanel } from "./InsightPanel";

/** Fetch dept chunks for any course ids we don't have full records for. */
function useEnsureCourses(courseIds: string[]) {
  const courses = useStore((s) => s.courses);
  const addCourses = useStore((s) => s.addCourses);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = new Set<string>();
    for (const id of courseIds) {
      if (!courses[id]) {
        const dept = deptOf(id);
        if (!requested.current.has(dept)) missing.add(dept);
      }
    }
    for (const dept of missing) {
      requested.current.add(dept);
      loadDept(dept)
        .then(addCourses)
        .catch(() => requested.current.delete(dept));
    }
  }, [courseIds, courses, addCourses]);
}

export function App() {
  const setIndex = useStore((s) => s.setIndex);
  const setPrograms = useStore((s) => s.setPrograms);
  const importPlan = useStore((s) => s.importPlan);
  const index = useStore((s) => s.index);
  const courses = useStore((s) => s.courses);
  const plan = useStore((s) => activePlan(s));
  const query = useStore((s) => s.query);
  const selectedCourseId = useStore((s) => s.selectedCourseId);
  const addEntry = useStore((s) => s.addEntry);
  const moveEntry = useStore((s) => s.moveEntry);
  const selectCourse = useStore((s) => s.selectCourse);

  // One-time bootstrap: catalog index, programs, and share-link import.
  useEffect(() => {
    loadIndex().then(setIndex).catch(console.error);
    loadPrograms().then(setPrograms).catch(console.error);
    const shared = planFromHash(location.hash);
    if (shared) {
      history.replaceState(null, "", location.pathname);
      importPlan({ ...shared, name: `${shared.name} (shared)` });
    }
  }, [setIndex, setPrograms, importPlan]);

  const results = useMemo(
    () => (index ? searchCourses(index, query) : []),
    [index, query],
  );

  // Full records needed for validation (plan) and eligibility (results, selection).
  const neededIds = useMemo(() => {
    const ids = plan.entries.map((e) => e.courseId);
    for (const lite of results) ids.push(lite[0]);
    if (selectedCourseId) ids.push(selectedCourseId);
    return ids;
  }, [plan.entries, results, selectedCourseId]);
  useEnsureCourses(neededIds);

  const courseMap = useMemo(() => new Map(Object.entries(courses)), [courses]);
  const report = useMemo(() => validatePlan(plan, courseMap), [plan, courseMap]);

  // ── Drag and drop ─────────────────────────────────────────────────
  // Draggables: board entries (id = entry id) and catalog rows ("cat:CPSC210").
  // Droppables: term cells ("cell:2:W1").
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const courseId = id.startsWith("cat:")
      ? id.slice(4)
      : plan.entries.find((en) => en.id === id)?.courseId;
    setDragLabel(courseId ? displayId(courseId) : null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragLabel(null);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || !overId.startsWith("cell:")) return;
    const [, yearStr, term] = overId.split(":");
    const year = Number(yearStr);
    const activeId = String(e.active.id);
    if (activeId.startsWith("cat:")) {
      const courseId = activeId.slice(4);
      addEntry(courseId, year, term as Term);
      selectCourse(courseId);
    } else {
      moveEntry(activeId, year, term as Term);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar plan={plan} />
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1">
          <CatalogPanel plan={plan} results={results} courseMap={courseMap} />
          <Board plan={plan} report={report} courseMap={courseMap} />
          <InsightPanel plan={plan} report={report} courseMap={courseMap} />
        </div>
        <DragOverlay dropAnimation={null}>
          {dragLabel && (
            <div className="rounded-md border border-navy bg-paper px-2.5 py-1.5 font-mono text-xs font-semibold shadow-lg">
              {dragLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
