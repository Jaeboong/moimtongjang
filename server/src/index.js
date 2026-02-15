import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import ledgerRouter from "./routes/ledger.js";
import { ensureAdminUser } from "./seedAdmin.js";

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/ledger", ledgerRouter);

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  await mongoose.connect(config.mongodbUri);
  await ensureAdminUser();

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
