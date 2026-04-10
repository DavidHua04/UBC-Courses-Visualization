import "dotenv/config";
import { createApp } from "./app";

const PORT = process.env.PORT || 3000;

const app = createApp();

// Start BullMQ workers only if Redis is configured
// Dynamic import avoids loading redis/bullmq modules when Redis isn't available
if (process.env.REDIS_URL) {
  import("./services/queue")
    .then(({ startWorkers }) => startWorkers())
    .catch((err) =>
      console.warn("Failed to start workers (Redis may not be available):", err)
    );
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
