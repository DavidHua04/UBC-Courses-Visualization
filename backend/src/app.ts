import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import coursesRouter from "./routes/courses";
import plansRouter from "./routes/plans";
import type { ApiError } from "./models/types";

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/api/v1/courses", coursesRouter);
  app.use("/api/v1/plans", plansRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not_found", message: "Route not found" } satisfies ApiError);
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "internal_error", message: err.message } satisfies ApiError);
  });

  return app;
}
