import { Router, type Request, type Response } from "express";

import {
  createSplitSession,
  deleteSplitSession,
  getSplitSessionById,
  listSplitSessions,
  SplitSessionNotFoundError,
  SplitSessionValidationError,
  updateSplitSession,
} from "../services/splitSessionService";

const splitSessionRoutes = Router();

function getIdParam(req: Request): string {
  const { id } = req.params;

  if (typeof id !== "string") {
    throw new SplitSessionValidationError("id must be a string.");
  }

  return id;
}

function sendSplitSessionError(error: unknown, res: Response) {
  if (
    error instanceof SplitSessionValidationError ||
    error instanceof SplitSessionNotFoundError
  ) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("[splitSessionRoutes] Request failed:", error);
  res.status(500).json({ error: "Failed to process split session request." });
}

splitSessionRoutes.get("/", async (_req: Request, res: Response) => {
  try {
    const splitSessions = await listSplitSessions();
    res.json({ splitSessions });
  } catch (error) {
    sendSplitSessionError(error, res);
  }
});

splitSessionRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const splitSession = await getSplitSessionById(getIdParam(req));
    res.json({ splitSession });
  } catch (error) {
    sendSplitSessionError(error, res);
  }
});

splitSessionRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const splitSession = await createSplitSession(req.body);
    res.status(201).json({ splitSession });
  } catch (error) {
    sendSplitSessionError(error, res);
  }
});

splitSessionRoutes.put("/:id", async (req: Request, res: Response) => {
  try {
    const splitSession = await updateSplitSession(getIdParam(req), req.body);
    res.json({ splitSession });
  } catch (error) {
    sendSplitSessionError(error, res);
  }
});

splitSessionRoutes.delete("/:id", async (req: Request, res: Response) => {
  try {
    await deleteSplitSession(getIdParam(req));
    res.status(204).send();
  } catch (error) {
    sendSplitSessionError(error, res);
  }
});

export default splitSessionRoutes;
