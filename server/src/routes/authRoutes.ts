import { Router, type Request, type Response } from "express";

import { AuthError, loginUser, registerUser } from "../services/authService";

const authRoutes = Router();

function sendAuthError(error: unknown, res: Response) {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("[authRoutes] Request failed:", error);
  res.status(500).json({ error: "Failed to process authentication request." });
}

authRoutes.post("/register", async (req: Request, res: Response) => {
  try {
    const authResponse = await registerUser(req.body);
    res.status(201).json(authResponse);
  } catch (error) {
    sendAuthError(error, res);
  }
});

authRoutes.post("/login", async (req: Request, res: Response) => {
  try {
    const authResponse = await loginUser(req.body);
    res.json(authResponse);
  } catch (error) {
    sendAuthError(error, res);
  }
});

export default authRoutes;
