import { Router, Request, Response, NextFunction } from "express";
import { programService } from "../container";

const router = Router();

router.get("/faculties", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faculties = await programService.listFaculties();
    res.json({ data: faculties });
  } catch (err) {
    next(err);
  }
});

router.get("/programs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facultyId = typeof req.query.facultyId === "string" ? req.query.facultyId : undefined;
    const programs = await programService.listPrograms(facultyId);
    res.json({ data: programs });
  } catch (err) {
    next(err);
  }
});

router.get("/programs/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const program = await programService.getProgramWithFacultyRequirements(id);
    if (!program) {
      res.status(404).json({ error: "NOT_FOUND", message: `Program ${id} not found` });
      return;
    }
    res.json({ data: program });
  } catch (err) {
    next(err);
  }
});

export default router;
