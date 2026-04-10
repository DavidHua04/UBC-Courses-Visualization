import { Worker } from "bullmq";
import { planQueue, seedQueue } from "../redis";
import { validationService, courseService } from "../container";
import { SEED_COURSES } from "../data/seed";

export async function enqueueValidation(planId: string): Promise<void> {
  await planQueue.add("validate", { planId }, { jobId: `validate:${planId}` });
}

export async function enqueueSeed(): Promise<{ jobId: string }> {
  const job = await seedQueue.add("seed", {});
  return { jobId: job.id! };
}

export function startWorkers(): void {
  const bullConnection = { url: process.env.REDIS_URL! };

  const validationWorker = new Worker(
    "plan-validation",
    async (job) => {
      const { planId } = job.data as { planId: string };
      const result = await validationService.validate(planId, true);
      return result;
    },
    { connection: bullConnection }
  );

  validationWorker.on("failed", (job, err) => {
    console.error(`Validation job ${job?.id} failed:`, err);
  });

  const seedWorker = new Worker(
    "course-seed",
    async (_job) => {
      await courseService.seed(SEED_COURSES);
      return { seeded: true };
    },
    { connection: bullConnection }
  );

  seedWorker.on("failed", (job, err) => {
    console.error(`Seed job ${job?.id} failed:`, err);
  });

  console.log("BullMQ workers started");
}
