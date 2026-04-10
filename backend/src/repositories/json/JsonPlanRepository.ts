import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import type { PlanRow } from "../../models/types";
import type { IPlanRepository } from "../interfaces";

interface StoredPlan extends PlanRow {
  entryCount?: number;
}

export class JsonPlanRepository implements IPlanRepository {
  constructor(
    private filePath: string,
    private entriesFilePath: string,
  ) {}

  private load(): StoredPlan[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as StoredPlan[];
  }

  private save(plans: StoredPlan[]): void {
    writeFileSync(this.filePath, JSON.stringify(plans, null, 2), "utf-8");
  }

  private loadEntries(): Array<{ planId: string }> {
    if (!existsSync(this.entriesFilePath)) return [];
    const raw = readFileSync(this.entriesFilePath, "utf-8");
    return JSON.parse(raw) as Array<{ planId: string }>;
  }

  async findAll(): Promise<(PlanRow & { entryCount: number })[]> {
    const plans = this.load();
    const entries = this.loadEntries();

    const countMap = new Map<string, number>();
    for (const entry of entries) {
      countMap.set(entry.planId, (countMap.get(entry.planId) ?? 0) + 1);
    }

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      entryCount: countMap.get(p.id) ?? 0,
    }));
  }

  async findById(id: string): Promise<PlanRow | null> {
    const plans = this.load();
    return plans.find((p) => p.id === id) ?? null;
  }

  async create(name: string, description?: string): Promise<PlanRow> {
    const plans = this.load();
    const now = new Date();
    const plan: PlanRow = {
      id: randomUUID(),
      name,
      description: description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    plans.push(plan);
    this.save(plans);
    return plan;
  }

  async update(
    id: string,
    updates: Partial<Pick<PlanRow, "name" | "description">>
  ): Promise<PlanRow | null> {
    const plans = this.load();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    if (updates.name !== undefined) plans[index].name = updates.name;
    if (updates.description !== undefined)
      plans[index].description = updates.description;
    plans[index].updatedAt = new Date();

    this.save(plans);
    return plans[index];
  }

  async delete(id: string): Promise<PlanRow | null> {
    const plans = this.load();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const [deleted] = plans.splice(index, 1);
    this.save(plans);
    return deleted;
  }
}
