import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";

import authRoutes from "./routes/authRoutes";
import receiptRoutes from "./routes/receiptRoutes";
import { initializeEmailService } from "./services/email";
import splitSessionRoutes from "./routes/splitSessionRoutes";

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath, override: true });
initializeEmailService();
const DEVELOPMENT_CORS_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tably-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/split-sessions", splitSessionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Tably server bound to ${host}:${port}`);
});
