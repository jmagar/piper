/**
 * Log level type representing different severity levels
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Log entry interface representing a single log message
 */
export interface LogEntry {
  /**
   * Unique identifier for the log entry
   */
  id: string;

  /**
   * Timestamp when the log was created
   */
  timestamp: Date;

  /**
   * Severity level of the log
   */
  level: LogLevel;

  /**
   * Log message content
   */
  message: string;

  /**
   * Optional source of the log (e.g., "database", "api", "auth")
   */
  source?: string;

  /**
   * Optional additional metadata associated with the log
   */
  metadata?: Record<string, any>;
}

/**
 * Props for the LogViewer component
 */
export interface LogViewerProps {
  /**
   * Array of log entries to display
   */
  logs?: LogEntry[];

  /**
   * Callback when search query changes
   */
  onSearch?: (query: string) => void;

  /**
   * Callback when log level filters change
   */
  onFilter?: (levels: LogLevel[]) => void;

  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void;

  /**
   * Callback when export button is clicked
   */
  onExport?: () => void;

  /**
   * Whether to enable auto-scrolling to latest logs
   * @default true
   */
  autoScroll?: boolean;

  /**
   * Height of the log viewer container
   * @default "h-[500px]"
   */
  height?: string;

  /**
   * Additional className to apply to the container
   */
  className?: string;

  /**
   * Title displayed in the header
   * @default "Log Viewer"
   */
  title?: string;

  /**
   * Whether to show live update indicator
   * @default true
   */
  liveUpdate?: boolean;
}
