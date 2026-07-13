import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";

import authRoutes from "./routes/authRoutes";
import receiptRoutes from "./routes/receiptRoutes";
import splitSessionRoutes from "./routes/splitSessionRoutes";

const envPath = path.resolve(__dirname, "../.env");
const dotenvResult = dotenv.config({ path: envPath, override: true });
const DEVELOPMENT_CORS_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

function getOpenAIKeyStatus(value: string | undefined) {
  if (!value) {
    return {
      exists: false,
      startsWithSk: false,
      hasMinimumLength: false,
    };
  }

  return {
    exists: true,
    startsWithSk: value.startsWith("sk-"),
    hasMinimumLength: value.length >= 20,
  };
}

function countEnvDefinitions(key: string): number {
  try {
    const envContents = fs.readFileSync(envPath, "utf8");
    return envContents
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith(`${key}=`)).length;
  } catch {
    return 0;
  }
}

function logOpenAIKeyStatus() {
  const keyStatus = getOpenAIKeyStatus(process.env.OPENAI_API_KEY);
  const definitionCount = countEnvDefinitions("OPENAI_API_KEY");

  console.log("[env] OPENAI_API_KEY exists:", keyStatus.exists);
  console.log("[env] OPENAI_API_KEY starts with sk-:", keyStatus.startsWithSk);
  console.log("[env] OPENAI_API_KEY definitions in .env:", definitionCount);

  if (definitionCount > 1) {
    console.warn("[env] OPENAI_API_KEY is defined multiple times in server/.env.");
  }

  if (!keyStatus.exists) {
    console.warn("[env] OPENAI_API_KEY is missing.");
  } else if (!keyStatus.startsWithSk || !keyStatus.hasMinimumLength) {
    console.warn(
      "[env] OPENAI_API_KEY looks malformed. Check for quotes, comments, spaces, or a copied placeholder.",
    );
  }
}

function parseCorsAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter((origin: string) => origin.length > 0);

  if (process.env.NODE_ENV === "production") {
    return configuredOrigins;
  }

  return Array.from(new Set([...DEVELOPMENT_CORS_ORIGINS, ...configuredOrigins]));
}

const corsAllowedOrigins = parseCorsAllowedOrigins();

console.log("[env] process.cwd():", process.cwd());
console.log("[env] dotenv path:", envPath);
console.log("[env] dotenv loaded:", !dotenvResult.error);
if (dotenvResult.error) {
  console.error("[env] dotenv error:", dotenvResult.error.message);
}
console.log("[env] AWS_REGION:", process.env.AWS_REGION);
console.log("[env] AWS_ACCESS_KEY_ID exists:", Boolean(process.env.AWS_ACCESS_KEY_ID));
console.log(
  "[env] AWS_SECRET_ACCESS_KEY exists:",
  Boolean(process.env.AWS_SECRET_ACCESS_KEY),
);
logOpenAIKeyStatus();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);
app.use(express.json({ limit: "10mb" }));
// Multipart receipt uploads are handled by multer in receiptRoutes.

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "splitsnap-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/split-sessions", splitSessionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`SplitSnap server bound to ${host}:${port}`);
  console.log(`Local URL:   http://localhost:${port}`);
  console.log(`Network URL: http://192.168.1.9:${port}`);
  console.log(`Health check: http://192.168.1.9:${port}/health`);
});
