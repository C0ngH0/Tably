import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

const PASSWORD_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";
const MIN_PASSWORD_LENGTH = 8;

type AuthRequestBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError("Email is required.");
  }

  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new AuthError("A valid email is required.");
  }

  return email;
}

function normalizePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError("Password is required.");
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  return value;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function signAuthToken(user: AuthUser): string {
  return jwt.sign({ email: user.email }, getJwtSecret(), {
    subject: user.id,
    expiresIn: JWT_EXPIRES_IN,
  });
}

function toAuthResponse(user: AuthUser) {
  return {
    user,
    token: signAuthToken(user),
  };
}

export async function registerUser(body: AuthRequestBody) {
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);
  const displayName = normalizeOptionalString(body.displayName);
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user.email) {
      throw new Error("Created user is missing an email.");
    }

    return toAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthError("A user with this email already exists.", 409);
    }

    throw error;
  }
}

export async function loginUser(body: AuthRequestBody) {
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      displayName: true,
    },
  });

  if (!user?.email || !user.passwordHash) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  return toAuthResponse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  });
}
