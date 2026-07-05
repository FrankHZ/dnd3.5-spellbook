import "dotenv/config";
import { app } from "#server/app";
import { logger } from "#server/logger";
import { rulesPrisma } from "#server/lib/rules-prisma-client";

const port = Number(process.env.PORT ?? 3000);

logger.info("Starting server...");

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}/`);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await rulesPrisma.$disconnect();
  process.exit(0);
});
