import pino from "pino";
import { pinoHttp } from "pino-http";

const env = process.env.NODE_ENV ?? "development";
const isTest = env === "test";
const isProd = env === "production";

export const logger = isTest
  ? pino({ level: "silent" })
  : pino({
      level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    });

export const httpLogger = pinoHttp({
  logger,
  enabled: !isTest,
});
