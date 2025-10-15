// ** import core packages
import { env } from "./env"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogMessage {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
}

const createLogger = () => {
  const log = (level: LogLevel, message: string, data?: any) => {
    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    }

    if (env.NODE_ENV === "development") {
      console.log(`[${logMessage.timestamp}] ${level.toUpperCase()}: ${message}`, data || "")
    } else {
      console.log(JSON.stringify(logMessage))
    }
  }

  return {
    debug: (message: string, data?: any) => log("debug", message, data),
    info: (message: string, data?: any) => log("info", message, data),
    warn: (message: string, data?: any) => log("warn", message, data),
    error: (message: string, data?: any) => log("error", message, data),
  }
}

export const logger = createLogger()