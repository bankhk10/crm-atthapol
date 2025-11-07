import pino from "pino";

// Ensure a single logger instance in dev to avoid accumulating
// process 'exit' listeners across Next.js HMR reloads.
type GlobalLoggerStore = { logger?: pino.Logger };
const globalForLogger = global as unknown as GlobalLoggerStore;

function createLogger(): pino.Logger {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    return pino({
      level: process.env.LOG_LEVEL || "info",
    });
  }
  // In development, use pino-pretty directly as the destination stream
  // to avoid worker_threads transports that can add process exit listeners.

  const pretty = require("pino-pretty");
  const stream = pretty({
    colorize: true,
    translateTime: "SYS:standard",
    singleLine: true,
  });
  return pino({ level: process.env.LOG_LEVEL || "debug" }, stream);
}

export const logger: pino.Logger = globalForLogger.logger ?? createLogger();

if (process.env.NODE_ENV !== "production") {
  globalForLogger.logger = logger;
}

export default logger;
