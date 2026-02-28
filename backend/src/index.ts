import "dotenv/config";
import { createApp } from "./app";
import { startWorkers } from "./services/queue";

const PORT = process.env.PORT || 3000;

const app = createApp();

// Start BullMQ workers if Redis is configured
if (process.env.REDIS_URL) {
  try {
    startWorkers();
  } catch (err) {
    console.warn("Failed to start workers (Redis may not be available):", err);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
