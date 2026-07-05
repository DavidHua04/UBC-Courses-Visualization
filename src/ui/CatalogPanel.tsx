import { useDraggable } from "@dnd-kit/core";
import type { Course, CourseLite, Plan } from "../engine/types";
import { displayId, liteCredits, liteId, liteIsGeneric, liteTitle, slotLabel } from "../engine/types";
import { checkEligibility, type CourseMap } from "../engine/validate";
import { useStore } from "../state/store";
import { EligibilityDot } from "./bits";

function ResultRow({
  lite,
  course,
  plan,
  courseMap,
}: {
  lite: CourseLite;
  course: Course | undefined;
  plan: Plan;
  courseMap: CourseMap;
}) {
  const target = useStore((s) => s.target);
  const addEntry = useStore((s) => s.addEntry);
  const selectCourse = useStore((s) => s.selectCourse);
  const selected = useStore((s) => s.selectedCourseId) === liteId(lite);

  const id = liteId(lite);
  const elig = course ? checkEligibility(course, target.year, target.term, plan, courseMap) : null;
  const inPlan = elig?.kind === "already_planned";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cat:${id}`,
    disabled: inPlan,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => selectCourse(id)}
      className={`group flex cursor-pointer items-center gap-2 border-b border-line-soft px-3 py-2 transition-colors hover:bg-navy-wash ${
        selected ? "bg-navy-wash" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {elig ? <EligibilityDot elig={elig} /> : <span className="size-2 shrink-0 rounded-full bg-line" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs font-semibold">{displayId(id)}</span>
          <span className="text-[11px] text-ink-faint">{liteCredits(lite)} cr</span>
          {liteIsGeneric(lite) && (
            <span
              className="rounded-sm bg-gold-wash px-1 py-px text-[9px] font-bold tracking-wide text-gold uppercase"
              title="Generic placeholder — no specific UBC course equivalent"
            >
              Generic
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-soft">{liteTitle(lite)}</div>
      </div>
      {inPlan ? (
        <span className="shrink-0 text-[10px] text-ink-faint">in plan</span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            addEntry(id, target.year, target.term);
            selectCourse(id);
          }}
          title={`Add to ${slotLabel(target.year, target.term)}`}
          className="invisible shrink-0 rounded-md border border-line bg-paper px-2 py-0.5 text-xs font-semibold text-navy group-hover:visible hover:border-navy"
        >
          + Add
        </button>
      )}
    </div>
  );
}

export function CatalogPanel({
  plan,
  results,
  courseMap,
}: {
  plan: Plan;
  results: CourseLite[];
  courseMap: CourseMap;
}) {
  const index = useStore((s) => s.index);
  const query = useStore((s) => s.query);
  const setQuery = useStore((s) => s.setQuery);
  const target = useStore((s) => s.target);
  const courses = useStore((s) => s.courses);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-panel">
      <div className="border-b border-line p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={index ? `Search ${index.length.toLocaleString()} UBC courses` : "Loading catalog…"}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm placeholder:text-ink-faint focus:border-navy"
        />
        <p className="mt-2 text-[11px] text-ink-faint">
          Adding to{" "}
          <span className="font-semibold text-gold">{slotLabel(target.year, target.term)}</span>{" "}
          — click a term header to change
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.trim() === "" ? (
          <div className="px-4 py-6 text-xs leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">Find courses to plan</p>
            <p className="mt-2">
              Try <span className="font-mono">CPSC 110</span>, <span className="font-mono">MATH</span>,
              or a topic like <span className="font-mono">statistics</span>.
            </p>
            <p className="mt-3">
              The dot on each result shows whether you could take it in the selected term:
            </p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-met" /> prerequisites met
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-unmet" /> not met yet
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-judge" /> needs your judgment
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-ink-faint" /> already in your plan
              </li>
            </ul>
            <p className="mt-3">Drag a result onto the board, or use its + Add button.</p>
          </div>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-xs text-ink-soft">
            No courses match “{query}”. Try a course code like{" "}
            <span className="font-mono">CPSC 210</span> or a word from the title.
          </p>
        ) : (
          results.map((lite) => (
            <ResultRow
              key={liteId(lite)}
              lite={lite}
              course={courses[liteId(lite)]}
              plan={plan}
              courseMap={courseMap}
            />
          ))
        )}
      </div>
    </aside>
  );
}
