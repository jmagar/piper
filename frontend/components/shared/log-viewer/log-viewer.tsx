"use client";

import * as React from "react";
import { Search, X, AlertCircle, Info, AlertTriangle, Bug, Clock, Download, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { LogLevel, LogEntry, LogViewerProps } from "./types";

const levelIcons: Record<LogLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  debug: <Bug className="h-4 w-4 text-purple-500" />
};

const levelColors: Record<LogLevel, string> = {
  info: "text-blue-500 border-blue-500/20 bg-blue-500/10",
  warn: "text-amber-500 border-amber-500/20 bg-amber-500/10",
  error: "text-red-500 border-red-500/20 bg-red-500/10",
  debug: "text-purple-500 border-purple-500/20 bg-purple-500/10"
};

/**
 * LogViewer component for displaying and filtering log entries
 * 
 * Features:
 * - Real-time log updates
 * - Search functionality
 * - Log level filtering
 * - Auto-scrolling
 * - Export capabilities
 * - Metadata display
 * 
 * @example
 * ```tsx
 * <LogViewer
 *   logs={logs}
 *   onClear={handleClear}
 *   onExport={handleExport}
 *   title="Application Logs"
 * />
 * ```
 */
export function LogViewer({
  logs = [],
  onSearch,
  onFilter,
  onClear,
  onExport,
  autoScroll = true,
  height = "h-[500px]",
  className,
  title = "Log Viewer",
  liveUpdate = true
}: LogViewerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilters, setActiveFilters] = React.useState<LogLevel[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false);
  const [filteredLogs, setFilteredLogs] = React.useState<LogEntry[]>(logs);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(autoScroll);
  
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);

  // Handle outside click for filter menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter logs based on search query and active filters
  React.useEffect(() => {
    let filtered = logs;
    
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.source && log.source.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (activeFilters.length > 0) {
      filtered = filtered.filter(log => activeFilters.includes(log.level));
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchQuery, activeFilters]);

  // Auto-scroll to bottom when new logs arrive
  React.useEffect(() => {
    if (isAutoScrollEnabled && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, isAutoScrollEnabled]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const toggleFilter = (level: LogLevel) => {
    setActiveFilters(prev => {
      const newFilters = prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level];
      
      onFilter?.(newFilters);
      return newFilters;
    });
  };

  const clearFilters = () => {
    setActiveFilters([]);
    onFilter?.([]);
  };

  const handleClear = () => {
    onClear?.();
  };

  const handleExport = () => {
    onExport?.();
  };

  const toggleAutoScroll = () => {
    setIsAutoScrollEnabled(prev => !prev);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const handleScroll = React.useCallback(() => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    
    if (!isAtBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    }
  }, [isAutoScrollEnabled]);

  return (
    <div className={cn(
      "flex flex-col rounded-lg border border-border bg-background shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {liveUpdate && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleAutoScroll}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isAutoScrollEnabled 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Auto-scroll
          </button>
          <button 
            onClick={handleExport}
            className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button 
            onClick={handleClear}
            className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              activeFilters.length > 0 && "border-primary/50 text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFilters.length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeFilters.length}
              </span>
            )}
          </button>
          
          {isFilterMenuOpen && (
            <div 
              ref={filterMenuRef}
              className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-popover p-1 shadow-md"
            >
              <div className="space-y-1 p-1">
                <div className="mb-1 flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium">Log Levels</span>
                  {activeFilters.length > 0 && (
                    <button 
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(Object.keys(levelIcons) as LogLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => toggleFilter(level)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                      activeFilters.includes(level) && "bg-accent/50"
                    )}
                  >
                    {levelIcons[level]}
                    <span className="capitalize">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={logContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-auto p-1 font-mono text-xs",
          height
        )}
      >
        <AnimatePresence initial={false}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mb-1 rounded border px-3 py-2 transition-shadow hover:shadow-xs",
                  levelColors[log.level]
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{levelIcons[log.level]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">[{log.level.toUpperCase()}]</span>
                      <span className="text-muted-foreground">{formatDate(log.timestamp)}</span>
                      <span className="font-medium">{formatTimestamp(log.timestamp)}</span>
                      {log.source && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {log.source}
                        </span>
                      )}
                    </div>
                    <div className="break-words whitespace-pre-wrap">{log.message}</div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 rounded bg-background/50 p-2">
                        <pre className="text-[10px] text-muted-foreground">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {searchQuery || activeFilters.length > 0 
                ? "No logs match your filters" 
                : "No logs to display"}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <div>
          {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} 
          {(searchQuery || activeFilters.length > 0) && (
            <span> (filtered from {logs.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {Array.from(new Set(filteredLogs.map(log => log.level))).map(level => (
              <div 
                key={level}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-background"
                title={`${level} logs`}
              >
                {levelIcons[level]}
              </div>
            ))}
          </div>
          <div>
            <Clock className="h-3.5 w-3.5 mr-1 inline-block" />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
