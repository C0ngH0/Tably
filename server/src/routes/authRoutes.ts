import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";

import { AuthError, loginUser, registerUser } from "../services/authService";

const authRoutes = Router();
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});

function sendAuthError(error: unknown, res: Response) {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("[authRoutes] Request failed:", error);
  res.status(500).json({ error: "Failed to process authentication request." });
}

authRoutes.post(
  "/register",
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const authResponse = await registerUser(req.body);
      res.status(201).json(authResponse);
    } catch (error) {
      sendAuthError(error, res);
    }
  },
);

authRoutes.post(
  "/login",
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const authResponse = await loginUser(req.body);
      res.json(authResponse);
    } catch (error) {
      sendAuthError(error, res);
    }
  },
);

export default authRoutes;
