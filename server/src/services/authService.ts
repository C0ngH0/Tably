import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";
import { getSafeErrorDetails } from "../utils/safeError";
import { emailService } from "./email";

const PASSWORD_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_RESET_RESPONSE_MESSAGE =
  "If an account exists for that email, a reset email has been sent.";

type AuthRequestBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
};

type ForgotPasswordRequestBody = {
  email?: unknown;
};

type ResetPasswordRequestBody = {
  email?: unknown;
  code?: unknown;
  newPassword?: unknown;
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

function getPasswordResetTtlMinutes(): number {
  const configuredValue = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES);

  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  return 15;
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

function normalizeResetCode(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError("Reset code is required.");
  }

  const code = value.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new AuthError("Reset code must be 6 digits.");
  }

  return code;
}

function generateResetCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashResetCode(code: string): string {
  return crypto.createHash("sha256").update(code, "utf8").digest("hex");
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

export async function requestPasswordReset(body: ForgotPasswordRequestBody) {
  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user?.email) {
    return { message: PASSWORD_RESET_RESPONSE_MESSAGE };
  }

  const code = generateResetCode();
  const codeHash = hashResetCode(code);
  const expiresAt = new Date(
    Date.now() + getPasswordResetTtlMinutes() * 60 * 1000,
  );

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: codeHash,
        expiresAt,
      },
    });
  });

  try {
    await emailService.sendPasswordReset({
      toEmail: user.email,
      code,
      expiresAt,
    });
  } catch (error) {
    console.error(
      "[authService] Failed to send password reset email:",
      getSafeErrorDetails(error),
    );
  }

  return { message: PASSWORD_RESET_RESPONSE_MESSAGE };
}

export async function resetPassword(body: ResetPasswordRequestBody) {
  const email = normalizeEmail(body.email);
  const code = normalizeResetCode(body.code);
  const newPassword = normalizePassword(body.newPassword);
  const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  const codeHash = hashResetCode(code);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const resetCodeRecord = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash: codeHash,
        used: false,
        expiresAt: {
          gt: now,
        },
        user: {
          email,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!resetCodeRecord) {
      throw new AuthError("Invalid or expired reset code.", 400);
    }

    await tx.user.update({
      where: { id: resetCodeRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    await tx.passwordResetToken.updateMany({
      where: { userId: resetCodeRecord.userId },
      data: { used: true },
    });
  });

  return { message: "Password has been reset." };
}
