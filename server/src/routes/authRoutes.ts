import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";

import {
  AuthError,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/authService";
import { getSafeErrorDetails } from "../utils/safeError";

const authRoutes = Router();
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});
const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});
const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please try again later." },
});

function sendAuthError(error: unknown, res: Response) {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(
    "[authRoutes] Request failed:",
    getSafeErrorDetails(error),
  );
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

authRoutes.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const response = await requestPasswordReset(req.body);
      res.json(response);
    } catch (error) {
      sendAuthError(error, res);
    }
  },
);

authRoutes.post(
  "/reset-password",
  resetPasswordRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const response = await resetPassword(req.body);
      res.json(response);
    } catch (error) {
      sendAuthError(error, res);
    }
  },
);

export default authRoutes;
