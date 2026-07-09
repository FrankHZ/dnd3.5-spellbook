import "dotenv/config";
import { app } from "#server/app";
import { logger } from "#server/logger";
import { rulesPrisma } from "#server/lib/rules-prisma-client";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

logger.info("Starting server...");

app.listen(port, host, () => {
  logger.info(`Server is running on http://${host}:${port}/`);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await rulesPrisma.$disconnect();
  process.exit(0);
});
