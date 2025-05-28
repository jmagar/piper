import fs from "fs"
import path from "path"

const LOGS_DIR = path.join(process.cwd(), "logs")
const UPLOAD_LOG_FILE = path.join(LOGS_DIR, "upload.log")

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

function formatLogMessage(level: LogLevel, message: string, details?: unknown): string {
  const timestamp = new Date().toISOString()
  let logMessage = `${timestamp} [${level}] - ${message}`
  if (details) {
    if (typeof details === "string") {
      logMessage += ` - ${details}`
    } else if (details instanceof Error) {
      logMessage += ` - Error: ${details.message}${details.stack ? `\nStack: ${details.stack}` : ""}`
    } else {
     try {
       logMessage += ` - Details: ${JSON.stringify(details, null, 2)}`
     } catch { // Error object not needed here
       logMessage += ` - Details: (Unserializable object)`
     }
    }
  }
  return logMessage
}

function appendToLogFile(filePath: string, message: string): void {
  try {
    fs.appendFileSync(filePath, message + "\n", "utf8")
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error)
  }
}

export const uploadLogger = {
  info: (message: string, details?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.INFO, message, details)
    console.log(formattedMessage)
    appendToLogFile(UPLOAD_LOG_FILE, formattedMessage)
  },
  warn: (message: string, details?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.WARN, message, details)
    console.warn(formattedMessage)
    appendToLogFile(UPLOAD_LOG_FILE, formattedMessage)
  },
  error: (message: string, error?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.ERROR, message, error)
    console.error(formattedMessage)
    appendToLogFile(UPLOAD_LOG_FILE, formattedMessage)
  },
}

// General purpose logger (can be expanded later if needed for other logs)
export const generalLogger = {
  info: (logFile: string, message: string, details?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.INFO, message, details)
    console.log(formattedMessage)
    appendToLogFile(path.join(LOGS_DIR, logFile), formattedMessage)
  },
  warn: (logFile: string, message: string, details?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.WARN, message, details)
    console.warn(formattedMessage)
    appendToLogFile(path.join(LOGS_DIR, logFile), formattedMessage)
  },
  error: (logFile: string, message: string, error?: unknown): void => {
    const formattedMessage = formatLogMessage(LogLevel.ERROR, message, error)
    console.error(formattedMessage)
    appendToLogFile(path.join(LOGS_DIR, logFile), formattedMessage)
  },
}