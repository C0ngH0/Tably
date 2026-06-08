import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import receiptRoutes from "./routes/receiptRoutes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "splitsnap-server" });
});

app.use("/api/receipt", receiptRoutes);

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
