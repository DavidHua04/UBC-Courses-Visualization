// Small shared visual atoms: status marks and eligibility badges.
// Status is never conveyed by color alone — every mark has a distinct
// glyph shape, and interactive ones carry a title.

import type { Eligibility, EntryStatus } from "../engine/types";
import { TERM_LABELS } from "../engine/types";

export function StatusGlyph({ status }: { status: EntryStatus }) {
  switch (status) {
    case "planned":
      return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "in_progress":
      return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.5 A4.5 4.5 0 0 1 6 10.5 Z" fill="currentColor" />
        </svg>
      );
    case "completed":
      return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <path
            d="M2 6.5 L5 9.5 L10 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "failed":
      return (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <path
            d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export const STATUS_META: Record<EntryStatus, { label: string; className: string }> = {
  planned: { label: "Planned", className: "text-ink-faint" },
  in_progress: { label: "In progress", className: "text-progress" },
  completed: { label: "Completed", className: "text-met" },
  failed: { label: "Failed", className: "text-unmet" },
};

export function describeEligibility(elig: Eligibility): string {
  switch (elig.kind) {
    case "eligible":
      return "Prerequisites met for this term";
    case "no_prereq":
      return "No prerequisites";
    case "ineligible":
      return "Prerequisites not met for this term";
    case "unknown":
      return `Needs your judgment: ${elig.prereqText}`;
    case "already_planned":
      return `Already in plan — Year ${elig.year}, ${TERM_LABELS[elig.term]}`;
  }
}

export function EligibilityDot({ elig }: { elig: Eligibility }) {
  const styles: Record<Eligibility["kind"], string> = {
    eligible: "bg-met",
    no_prereq: "bg-met",
    ineligible: "bg-unmet",
    unknown: "bg-judge",
    already_planned: "bg-ink-faint",
  };
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${styles[elig.kind]}`}
      title={describeEligibility(elig)}
      aria-label={describeEligibility(elig)}
    />
  );
}
