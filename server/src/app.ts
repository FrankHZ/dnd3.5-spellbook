import express, { type Application } from "express";
import cors from "cors";

import { spellsRouter } from "./routes/spells.routes";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { rulebooksRouter } from "./routes/rulebooks.routes";
import { classesRouter } from "./routes/classes.routes";
import { pinoHttp } from "pino-http";
import { logger } from "./logger";

const app: Application = express();

// Middleware
app.use(cors()); // ok for MVP; tighten later
app.use(express.json());

app.use(
  pinoHttp({
    logger,
    autoLogging: true,
  }),
);

// Health
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use("/api/spells", spellsRouter);
app.use("/api/rulebooks", rulebooksRouter);
app.use("/api/classes", classesRouter);

// 404 + error handler (must be last)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
