import { useRef, useState } from "react";
import type { Plan } from "../engine/types";
import { planToShareUrl, useStore } from "../state/store";

function BarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/85 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

export function TopBar({ plan }: { plan: Plan }) {
  const plans = useStore((s) => s.plans);
  const programs = useStore((s) => s.programs);
  const setActivePlan = useStore((s) => s.setActivePlan);
  const createPlan = useStore((s) => s.createPlan);
  const duplicatePlan = useStore((s) => s.duplicatePlan);
  const deletePlan = useStore((s) => s.deletePlan);
  const renamePlan = useStore((s) => s.renamePlan);
  const setProgram = useStore((s) => s.setProgram);
  const importPlan = useStore((s) => s.importPlan);

  const [editing, setEditing] = useState(false);
  const [shared, setShared] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(planToShareUrl(plan));
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions); show the URL instead.
      window.prompt("Copy this share link:", planToShareUrl(plan));
    }
  };

  const exportPlan = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${plan.name.replace(/[^\w-]+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Plan;
        if (!parsed || !Array.isArray(parsed.entries)) throw new Error("bad shape");
        parsed.exemptions ??= [];
        parsed.years ??= 4;
        importPlan(parsed);
      } catch {
        alert("That file doesn't look like an exported plan.");
      }
    });
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 bg-navy px-4 text-white">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg font-semibold tracking-tight">Degree Map</span>
        <span className="rounded-sm bg-gold-bright px-1 py-px text-[10px] font-bold tracking-wider text-navy">
          UBC
        </span>
      </div>

      <div className="mx-2 h-5 w-px bg-white/20" />

      {editing ? (
        <input
          autoFocus
          defaultValue={plan.name}
          className="w-48 rounded-md border border-white/30 bg-white/10 px-2 py-1 text-sm text-white"
          onBlur={(e) => {
            renamePlan(plan.id, e.target.value);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <select
          value={plan.id}
          onChange={(e) => setActivePlan(e.target.value)}
          className="max-w-52 rounded-md border border-white/20 bg-navy px-2 py-1 text-sm"
          title="Switch plan"
        >
          {Object.values(plans).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <BarButton onClick={() => setEditing(true)} title="Rename this plan">
        Rename
      </BarButton>
      <BarButton onClick={() => createPlan()} title="Start a blank plan">
        New
      </BarButton>
      <BarButton
        onClick={() => duplicatePlan(plan.id)}
        title="Copy this plan to try a what-if scenario"
      >
        Duplicate
      </BarButton>
      <BarButton
        onClick={() => {
          if (confirm(`Delete “${plan.name}”? This can't be undone.`)) deletePlan(plan.id);
        }}
        title="Delete this plan"
      >
        Delete
      </BarButton>

      <div className="flex-1" />

      <label className="flex items-center gap-2 text-xs text-white/70">
        Program
        <select
          value={plan.programId ?? ""}
          onChange={(e) => setProgram(e.target.value || null)}
          className="max-w-64 rounded-md border border-white/20 bg-navy px-2 py-1 text-sm text-white"
        >
          <option value="">None — free planning</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mx-1 h-5 w-px bg-white/20" />

      <BarButton onClick={share} title="Copy a link that contains this whole plan">
        {shared ? "Link copied ✓" : "Share"}
      </BarButton>
      <BarButton onClick={exportPlan} title="Download this plan as a JSON file">
        Export
      </BarButton>
      <BarButton onClick={() => fileRef.current?.click()} title="Import a plan from a JSON file">
        Import
      </BarButton>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
        }}
      />
    </header>
  );
}
