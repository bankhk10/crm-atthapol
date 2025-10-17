import pino from "pino";

// Pretty print logs in dev, JSON in production
const isProd = process.env.NODE_ENV === "production";

let logger: pino.Logger;

if (isProd) {
  logger = pino({
    level: process.env.LOG_LEVEL || "info",
  });
} else {
  // Use pino-pretty as a direct stream in dev to avoid worker_threads
  // transports that Next.js bundles into vendor chunks.
  // This keeps pretty output without spawning a worker.
  // Import is inside the dev branch to keep it server-only.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pretty = require("pino-pretty");
  const stream = pretty({
    colorize: true,
    translateTime: "SYS:standard",
    singleLine: true,
  });
  logger = pino(
    {
      level: process.env.LOG_LEVEL || "debug",
    },
    stream,
  );
}

export { logger };
export default logger;
