import express, { type Application } from "express";
import cors from "cors";

import { spellsRouter } from "#server/routes/spells.routes";
import { notFoundMiddleware } from "#server/middlewares/notfound.middleware";
import { errorMiddleware } from "#server/middlewares/error.middleware";
import { rulebooksRouter } from "#server/routes/rulebooks.routes";
import { classesRouter } from "#server/routes/classes.routes";
import { httpLogger } from "#server/logger";
import { domainsRouter } from "#server/routes/domains.routes";
import { i18nQuery } from "#server/middlewares/i18nQuery";
import { metaRouter } from "#server/routes/meta.routes";
import { statusRouter } from "#server/routes/status.routes";
import {
  createCorsOptions,
  securityHeadersMiddleware,
} from "#server/middlewares/security.middleware";

const app: Application = express();

// Middleware
app.use(securityHeadersMiddleware);
app.use(cors(createCorsOptions()));
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
app.use("/api/status", statusRouter);

// 404 + error handler (must be last)
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
