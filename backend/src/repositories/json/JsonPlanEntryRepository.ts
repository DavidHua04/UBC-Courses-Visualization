import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import type { EntryRow } from "../../models/types";
import type { IPlanEntryRepository, NewEntry, EntryUpdates } from "../interfaces";

export class JsonPlanEntryRepository implements IPlanEntryRepository {
  constructor(private filePath: string) {}

  private load(): EntryRow[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as EntryRow[];
  }

  private save(entries: EntryRow[]): void {
    writeFileSync(this.filePath, JSON.stringify(entries, null, 2), "utf-8");
  }

  async findByPlanId(planId: string): Promise<EntryRow[]> {
    const entries = this.load();
    return entries
      .filter((e) => e.planId === planId)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const termOrder: Record<string, number> = { W1: 0, W2: 1, S: 2 };
        if (a.term !== b.term)
          return (termOrder[a.term] ?? 0) - (termOrder[b.term] ?? 0);
        return a.position - b.position;
      });
  }

  async create(entry: NewEntry): Promise<EntryRow> {
    const entries = this.load();

    // Check uniqueness: one course per plan
    const duplicate = entries.find(
      (e) =>
        e.planId === entry.planId &&
        e.courseId === entry.courseId.toUpperCase()
    );
    if (duplicate) {
      const err = new Error("Course already exists in this plan") as Error & { code: string };
      err.code = "23505";
      throw err;
    }

    const position =
      entry.position ??
      (await this.getMaxPosition(entry.planId)) + 1;

    const row: EntryRow = {
      id: randomUUID(),
      planId: entry.planId,
      courseId: entry.courseId.toUpperCase(),
      year: entry.year,
      term: entry.term,
      status: entry.status ?? "planned",
      position,
    };

    entries.push(row);
    this.save(entries);
    return row;
  }

  async update(entryId: string, updates: EntryUpdates): Promise<EntryRow | null> {
    const entries = this.load();
    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;

    if (updates.year !== undefined) entries[index].year = updates.year;
    if (updates.term !== undefined) entries[index].term = updates.term;
    if (updates.status !== undefined) entries[index].status = updates.status;
    if (updates.position !== undefined) entries[index].position = updates.position;

    this.save(entries);
    return entries[index];
  }

  async delete(entryId: string): Promise<EntryRow | null> {
    const entries = this.load();
    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;

    const [deleted] = entries.splice(index, 1);
    this.save(entries);
    return deleted;
  }

  async reorder(
    positions: Array<{ entryId: string; position: number }>
  ): Promise<void> {
    const entries = this.load();
    const posMap = new Map(positions.map((p) => [p.entryId, p.position]));

    for (const entry of entries) {
      const newPos = posMap.get(entry.id);
      if (newPos !== undefined) entry.position = newPos;
    }

    this.save(entries);
  }

  async getMaxPosition(planId: string): Promise<number> {
    const entries = this.load();
    const planEntries = entries.filter((e) => e.planId === planId);
    if (planEntries.length === 0) return -1;
    return Math.max(...planEntries.map((e) => e.position));
  }
}
