import express, { type Application } from "express";
import cors from "cors";

import { spellsRouter } from "./routes/spells.routes";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { rulebooksRouter } from "./routes/rulebooks.routes";
import { classesRouter } from "./routes/classes.routes";
import { httpLogger } from "./logger";
import { domainsRouter } from "./routes/domains.routes";
import { i18nQuery } from "./middlewares/i18nQuery";
import { metaRouter } from "./routes/meta.routes";

const app: Application = express();

// Middleware
app.use(cors()); // ok for MVP; tighten later
app.use(express.json());
app.use(i18nQuery);

app.use(httpLogger);

// Health
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use("/api/spells", spellsRouter);
app.use("/api/rulebooks", rulebooksRouter);
app.use("/api/classes", classesRouter);
app.use("/api/domains", domainsRouter);
app.use("/api/meta", metaRouter);

// 404 + error handler (must be last)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
