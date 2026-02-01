import "dotenv/config";
import { app } from "./app";
import { logger } from "./logger";
import { rulesPrismaClient } from "./lib/rules-prisma-client";

const port = Number(process.env.PORT ?? 3000);

logger.info("Starting server...");

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}/`);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await rulesPrismaClient.$disconnect();
  process.exit(0);
});
