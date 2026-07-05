import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { prisma } from "../db/prisma";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

function getBearerToken(req: Request): string | null {
  const authorization = req.header("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function parseVerifiedPayload(token: string): JwtPayload {
  const payload = jwt.verify(token, getJwtSecret());

  if (typeof payload === "string") {
    throw new Error("Invalid token payload.");
  }

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid token claims.");
  }

  return payload;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const payload = parseVerifiedPayload(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user?.email) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch (error) {
    console.error("[authMiddleware] Token verification failed:", error);
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
