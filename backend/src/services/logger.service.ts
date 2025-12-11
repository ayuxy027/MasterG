import pino from "pino";

// Structured logger for observability
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
});

// Request logger with correlation ID
export const requestLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

export default logger;
