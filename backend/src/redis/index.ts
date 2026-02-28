import Redis from "ioredis";
import { Queue } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is required");
}

const REDIS_URL = process.env.REDIS_URL;

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// BullMQ bundles its own ioredis — pass the URL as a plain connection object
// to avoid type conflicts between the two ioredis versions.
const bullConnection = { url: REDIS_URL };

export const planQueue = new Queue("plan-validation", {
  connection: bullConnection,
});

export const seedQueue = new Queue("course-seed", {
  connection: bullConnection,
});
