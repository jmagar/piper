#!/bin/bash

# MCP Server Monitoring Script
# This script monitors file descriptor usage and MCP server health
# Usage: ./scripts/mcp-monitor.sh [--daemon] [--interval=30] [--alert-threshold=80]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DAEMON_MODE=false
INTERVAL=30
ALERT_THRESHOLD=80
CONFIG_FILE="config/config.json"
LOG_FILE="/tmp/mcp-monitor.log"
METRICS_FILE="/tmp/mcp-metrics.log"
PID_FILE="/tmp/mcp-monitor.pid"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --daemon)
            DAEMON_MODE=true
            shift
            ;;
        --interval=*)
            INTERVAL="${1#*=}"
            shift
            ;;
        --alert-threshold=*)
            ALERT_THRESHOLD="${1#*=}"
            shift
            ;;
        --config-file=*)
            CONFIG_FILE="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--daemon] [--interval=30] [--alert-threshold=80] [--config-file=/path/to/config.json]"
            echo "       $0 {stop|status|restart}"
            echo "  --daemon: Run in daemon mode (continuous monitoring)"
            echo "  --interval: Monitoring interval in seconds (default: 30)"
            echo "  --alert-threshold: File descriptor usage threshold % for alerts (default: 80)"
            echo "  --config-file: Path to MCP configuration file (default: config/config.json)"
            echo "  stop: Stop the daemon"
            echo "  status: Check daemon status"
            echo "  restart: Restart the daemon"
            exit 0
            ;;
        stop|status|restart)
            # Leave command in $1 for the post-parse handler
            break
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

log_metric() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$METRICS_FILE"
}

# Function to check file descriptor usage
check_fd_usage() {
    local current_fd_raw
    current_fd_raw=$(ulimit -n)
    local current_fd=${current_fd_raw/unlimited/1048576}  # fallback to 1M
    local used_fd=0
    
    # Try to count actually used file descriptors
    if [ -d "/proc/self/fd" ]; then
        used_fd=$(ls -1 /proc/self/fd | wc -l)
    fi
    
    # Skip percentage calculation if unlimited
    if [ "$current_fd_raw" = "unlimited" ]; then
        log_info "File descriptor usage: $used_fd (limit: unlimited)"
        log_metric "FD_USAGE: current_limit=unlimited used=$used_fd usage_percent=0"
        return 0
    fi
    
    local usage_percent=$((used_fd * 100 / current_fd))
    
    log_metric "FD_USAGE: current_limit=$current_fd used=$used_fd usage_percent=$usage_percent"
    
    if [ "$usage_percent" -ge "$ALERT_THRESHOLD" ]; then
        log_warning "File descriptor usage is high: $usage_percent% ($used_fd/$current_fd)"
        return 1
    else
        log_info "File descriptor usage: $usage_percent% ($used_fd/$current_fd)"
        return 0
    fi
}

# Function to check system resources
check_system_resources() {
    log_info "=== System Resources Check ==="
    
    # Memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_info=$(free -m | awk 'NR==2{printf "Used: %dMB, Available: %dMB, Usage: %.1f%%", $3, $7, $3*100/$2}')
        log_info "Memory: $mem_info"
        log_metric "MEMORY: $mem_info"
    fi
    
    # Disk usage for important directories
    local dirs=("/tmp" "$(dirname "$CONFIG_FILE")" "/logs" "/uploads")
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            local disk_info=$(df -h "$dir" 2>/dev/null | awk 'NR==2 {printf "Used: %s, Available: %s, Usage: %s", $3, $4, $5}' || echo "unavailable")
            log_info "Disk usage for $dir: $disk_info"
            # Sanitize directory path for Prometheus metrics (replace / with _)
            local sanitized_dir=$(echo "$dir" | sed 's|/|_|g' | sed 's|^_||')
            log_metric "DISK_${sanitized_dir}: $disk_info"
        fi
    done
    
    # Load average
    if [ -f "/proc/loadavg" ]; then
        local load_avg=$(cat /proc/loadavg | awk '{print $1", "$2", "$3}')
        log_info "Load average (1m, 5m, 15m): $load_avg"
        log_metric "LOAD_AVG: $load_avg"
    fi
}

# Function to check uvx accessibility
check_uvx_status() {
    log_info "=== uvx Status Check ==="
    
    if command -v uvx >/dev/null 2>&1; then
        local uvx_version=$(uvx --version 2>/dev/null || echo "unknown")
        local uvx_path=$(which uvx)
        log_success "uvx is accessible: $uvx_version at $uvx_path"
        log_metric "UVX_STATUS: available version=$uvx_version path=$uvx_path"
        return 0
    else
        log_error "uvx is not accessible"
        log_metric "UVX_STATUS: unavailable"
        return 1
    fi
}

# Function to check MCP server health
check_mcp_servers() {
    log_info "=== MCP Servers Health Check ==="
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    # Count total servers and uvx servers
    local total_servers=0
    local uvx_servers=0
    local healthy_servers=0
    
    if command -v jq >/dev/null 2>&1; then
        total_servers=$(jq -r '.mcpServers | length' "$CONFIG_FILE" 2>/dev/null || echo "0")
        uvx_servers=$(jq -r '.mcpServers | to_entries[] | select(.value.command == "uvx") | .key' "$CONFIG_FILE" 2>/dev/null | wc -l)
        
        log_info "Total MCP servers configured: $total_servers"
        log_info "uvx-based servers: $uvx_servers"
        log_metric "MCP_SERVERS: total=$total_servers uvx=$uvx_servers"
        
        # Check each uvx server
        if [ "$uvx_servers" -gt 0 ]; then
            log_info "Checking uvx-based servers:"
            while IFS= read -r server_name; do
                if [ -n "$server_name" ]; then
                    local package_name=$(jq -r ".mcpServers.\"$server_name\".args[0]" "$CONFIG_FILE" 2>/dev/null || echo "unknown")
                    log_info "  - $server_name (package: $package_name)"
                    
                    # Simple health check: try to get help from the package
                    if command -v timeout >/dev/null 2>&1; then
                        timeout 5s uvx "$package_name" --help >/dev/null 2>&1
                        local exit_code=$?
                        if [ "$exit_code" -eq 0 ]; then
                            log_success "    ✓ $server_name is accessible"
                            healthy_servers=$((healthy_servers + 1))
                            log_metric "MCP_HEALTH: server=$server_name package=$package_name status=healthy"
                        elif [ "$exit_code" -eq 124 ]; then
                            log_warning "    ⚠ $server_name timed out (slow network/installation)"
                            log_metric "MCP_HEALTH: server=$server_name package=$package_name status=timeout"
                        else
                            log_warning "    ⚠ $server_name may have issues (exit code: $exit_code)"
                            log_metric "MCP_HEALTH: server=$server_name package=$package_name status=unhealthy"
                        fi
                    else
                        # Fallback without timeout (less reliable)
                        if uvx "$package_name" --help >/dev/null 2>&1; then
                            log_success "    ✓ $server_name is accessible"
                            healthy_servers=$((healthy_servers + 1))
                            log_metric "MCP_HEALTH: server=$server_name package=$package_name status=healthy"
                        else
                            log_warning "    ⚠ $server_name may have issues (timeout not available)"
                            log_metric "MCP_HEALTH: server=$server_name package=$package_name status=unhealthy"
                        fi
                    fi
                fi
            done < <(jq -r '.mcpServers | to_entries[] | select(.value.command == "uvx") | .key' "$CONFIG_FILE" 2>/dev/null)
        fi
    else
        log_warning "jq not available, skipping detailed MCP server analysis"
    fi
    
    log_info "MCP health summary: $healthy_servers/$uvx_servers uvx servers responding"
    log_metric "MCP_SUMMARY: healthy=$healthy_servers total_uvx=$uvx_servers"
}

# Function to check network connectivity
check_network() {
    log_info "=== Network Connectivity Check ==="
    
    local test_hosts=("8.8.8.8" "1.1.1.1")
    local connectivity_ok=true
    
    for host in "${test_hosts[@]}"; do
        if ping -c 1 -W 2 "$host" >/dev/null 2>&1; then
            log_success "Connectivity to $host: OK"
        else
            log_warning "Connectivity to $host: FAILED"
            connectivity_ok=false
        fi
    done
    
    log_metric "NETWORK: connectivity_ok=$connectivity_ok"
    
    if [ "$connectivity_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to perform a complete monitoring cycle
monitoring_cycle() {
    log_info "=== MCP Monitoring Cycle - $(date) ==="
    
    local issues_found=0
    
    # Check file descriptor usage
    if ! check_fd_usage; then
        issues_found=$((issues_found + 1))
    fi
    
    # Check system resources
    check_system_resources
    
    # Check uvx status
    if ! check_uvx_status; then
        issues_found=$((issues_found + 1))
    fi
    
    # Check MCP servers
    if ! check_mcp_servers; then
        issues_found=$((issues_found + 1))
    fi
    
    # Check network connectivity
    if ! check_network; then
        issues_found=$((issues_found + 1))
    fi
    
    # Summary
    if [ "$issues_found" -eq 0 ]; then
        log_success "✅ Monitoring cycle completed - No issues found"
    else
        log_warning "⚠️ Monitoring cycle completed - $issues_found issue(s) detected"
    fi
    
    log_metric "CYCLE_SUMMARY: issues_found=$issues_found timestamp=$(date '+%s')"
    
    return "$issues_found"
}

# Function to run in daemon mode
run_daemon() {
    log_info "Starting MCP monitor in daemon mode (interval: ${INTERVAL}s, threshold: ${ALERT_THRESHOLD}%)"
    
    # Check if daemon is already running
    if [ -f "$PID_FILE" ]; then
        local existing_pid=$(cat "$PID_FILE" 2>/dev/null)
        if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
            log_error "Daemon is already running with PID: $existing_pid"
            exit 1
        else
            log_warning "Stale PID file found, removing it"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Store PID atomically using temp file
    local temp_pid_file="${PID_FILE}.$$"
    echo $$ > "$temp_pid_file" && mv "$temp_pid_file" "$PID_FILE"
    
    # Set up signal handlers
    trap 'log_info "Received SIGTERM, shutting down daemon"; rm -f "$PID_FILE"; exit 0' TERM
    trap 'log_info "Received SIGINT, shutting down daemon"; rm -f "$PID_FILE"; exit 0' INT
    
    while true; do
        monitoring_cycle
        log_info "Sleeping for ${INTERVAL} seconds..."
        sleep "$INTERVAL"
    done
}

# Function to stop daemon
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping MCP monitor daemon (PID: $pid)"
            kill -TERM "$pid"
            rm -f "$PID_FILE"
            log_success "Daemon stopped"
        else
            log_warning "Daemon PID file exists but process is not running"
            rm -f "$PID_FILE"
        fi
    else
        log_warning "No daemon PID file found"
    fi
}

# Function to show daemon status
daemon_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "MCP monitor daemon is running (PID: $pid)"
            return 0
        else
            log_warning "Daemon PID file exists but process is not running"
            return 1
        fi
    else
        log_info "MCP monitor daemon is not running"
        return 1
    fi
}

# Function to rotate logs if they get too large
rotate_logs_if_needed() {
    local max_size_kb=1024  # 1MB limit
    
    # Rotate main log file
    if [ -f "$LOG_FILE" ] && [ $(du -k "$LOG_FILE" 2>/dev/null | cut -f1) -gt $max_size_kb ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        log_info "Rotated log file (size limit reached)"
    fi
    
    # Rotate metrics file
    if [ -f "$METRICS_FILE" ] && [ $(du -k "$METRICS_FILE" 2>/dev/null | cut -f1) -gt $max_size_kb ]; then
        mv "$METRICS_FILE" "${METRICS_FILE}.old"
        log_info "Rotated metrics file (size limit reached)"
    fi
}

# Initialize log files
rotate_logs_if_needed
echo "MCP Monitor - $(date)" > "$LOG_FILE"
echo "MCP Metrics - $(date)" > "$METRICS_FILE"

# Check for daemon commands
if [ "$1" = "stop" ]; then
    stop_daemon
    exit 0
elif [ "$1" = "status" ]; then
    daemon_status
    exit $?
elif [ "$1" = "restart" ]; then
    stop_daemon
    sleep 2
    exec "$0" --daemon --interval="$INTERVAL" --alert-threshold="$ALERT_THRESHOLD" --config-file="$CONFIG_FILE"
fi

# Run monitoring
if [ "$DAEMON_MODE" = true ]; then
    run_daemon
else
    monitoring_cycle
    exit_code=$?
    
    log_info "Single monitoring cycle completed"
    log_info "Log file: $LOG_FILE"
    log_info "Metrics file: $METRICS_FILE"
    
    if [ "$exit_code" -eq 0 ]; then
        log_success "🎉 All checks passed!"
    else
        log_warning "⚠️ Some issues were detected. Check the logs for details."
    fi
    
    exit "$exit_code"
fi 