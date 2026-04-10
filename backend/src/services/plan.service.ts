import type { PlanRow, EntryRow, PlanWithEntries } from "../models/types";
import type {
  IPlanRepository,
  IPlanEntryRepository,
  IValidationCache,
  NewEntry,
  EntryUpdates,
} from "../repositories/interfaces";

export class PlanService {
  constructor(
    private plans: IPlanRepository,
    private entries: IPlanEntryRepository,
    private validationCache: IValidationCache,
  ) {}

  async list(): Promise<(PlanRow & { entryCount: number })[]> {
    return this.plans.findAll();
  }

  async getById(id: string): Promise<PlanRow | null> {
    return this.plans.findById(id);
  }

  async getWithEntries(id: string): Promise<PlanWithEntries | null> {
    const plan = await this.plans.findById(id);
    if (!plan) return null;

    const entries = await this.entries.findByPlanId(id);

    // Group entries by [year][term]
    const grouped: Record<string, Record<string, EntryRow[]>> = {};
    for (const entry of entries) {
      const yearKey = String(entry.year);
      const termKey = entry.term;
      if (!grouped[yearKey]) grouped[yearKey] = {};
      if (!grouped[yearKey][termKey]) grouped[yearKey][termKey] = [];
      grouped[yearKey][termKey].push(entry);
    }

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      entries: grouped,
    };
  }

  async create(name: string, description?: string): Promise<PlanRow> {
    return this.plans.create(name, description);
  }

  async update(
    id: string,
    updates: Partial<Pick<PlanRow, "name" | "description">>
  ): Promise<PlanRow | null> {
    return this.plans.update(id, updates);
  }

  async delete(id: string): Promise<PlanRow | null> {
    const deleted = await this.plans.delete(id);
    if (deleted) {
      await this.validationCache.invalidate(id);
    }
    return deleted;
  }

  // ── Entry operations ─────────────────────────────────────────

  async addEntry(planId: string, input: Omit<NewEntry, "planId">): Promise<EntryRow> {
    const entry = await this.entries.create({ planId, ...input });
    await this.validationCache.invalidate(planId);
    return entry;
  }

  async updateEntry(
    planId: string,
    entryId: string,
    updates: EntryUpdates,
  ): Promise<EntryRow | null> {
    const updated = await this.entries.update(entryId, updates);
    if (updated) {
      await this.validationCache.invalidate(planId);
    }
    return updated;
  }

  async deleteEntry(planId: string, entryId: string): Promise<EntryRow | null> {
    const deleted = await this.entries.delete(entryId);
    if (deleted) {
      await this.validationCache.invalidate(planId);
    }
    return deleted;
  }

  async reorderEntries(
    positions: Array<{ entryId: string; position: number }>
  ): Promise<void> {
    return this.entries.reorder(positions);
  }
}
