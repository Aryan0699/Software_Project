import pino from "pino"
import { env } from "../config/env.js"

const isDevelopment = env.NODE_ENV === "development"

const transport = isDevelopment
    ? {
          target: "pino-pretty",
          options: {
              colorize: true,
              translateTime: "yyyy-mm-dd HH:MM:ss",
              ignore: "pid,hostname",
              singleLine: true,
          },
      }
    : undefined

const logger = pino({
    level: env.LOG_LEVEL,
    transport,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password",
            "currentPassword",
            "newPassword",
            "credential",
        ],
        censor: "[REDACTED]",
    },
})

export default logger
