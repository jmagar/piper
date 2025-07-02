#!/bin/bash

# MCP Server Health Check Script
# This script validates uvx accessibility and tests MCP server startup
# Usage: ./scripts/mcp-health-check.sh [--verbose] [--config-file=/path/to/config.json]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERBOSE=false
CONFIG_FILE="config/config.json"
LOG_FILE="/tmp/mcp-health-check.log"

# Error and warning counters
ERROR_COUNT=0
WARNING_COUNT=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --config-file=*)
            CONFIG_FILE="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--verbose] [--config-file=/path/to/config.json]"
            echo "  --verbose: Enable verbose output"
            echo "  --config-file: Path to MCP configuration file (default: config/config.json)"
            exit 0
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
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE"
    fi
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
    fi
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
    WARNING_COUNT=$((WARNING_COUNT + 1))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
    ERROR_COUNT=$((ERROR_COUNT + 1))
}

# Initialize log file
if [ "$VERBOSE" = true ]; then
    echo "MCP Health Check - $(date)" > "$LOG_FILE"
else
    # Remove any old log file if not in verbose mode
    rm -f "$LOG_FILE" 2>/dev/null || true
fi

# Check if running in container
if [ -f /.dockerenv ]; then
    log_info "Running inside Docker container"
else
    log_info "Running on host system"
fi

# 1. Check uvx installation and accessibility
log_info "Checking uvx installation..."

if command -v uvx >/dev/null 2>&1; then
    UVX_VERSION=$(uvx --version 2>/dev/null || echo "unknown")
    log_success "✓ uvx is installed and accessible (version: $UVX_VERSION)"
    
    # Check uvx path
    UVX_PATH=$(which uvx)
    log_info "uvx location: $UVX_PATH"
    
    # Test uvx help command
    if uvx --help >/dev/null 2>&1; then
        log_success "✓ uvx help command works"
    else
        log_error "✗ uvx help command failed"
        exit 1
    fi
else
    log_error "✗ uvx is not installed or not in PATH"
    log_info "Current PATH: $PATH"
    exit 1
fi

# 2. Check uv installation (uvx dependency)
log_info "Checking uv installation..."

if command -v uv >/dev/null 2>&1; then
    UV_VERSION=$(uv --version 2>/dev/null || echo "unknown")
    log_success "✓ uv is installed and accessible (version: $UV_VERSION)"
else
    log_warning "⚠ uv is not found in PATH (uvx may still work)"
fi

# 3. Check file descriptor limits
log_info "Checking file descriptor limits..."

CURRENT_FD_LIMIT_RAW=$(ulimit -n)
if [ "$CURRENT_FD_LIMIT_RAW" = "unlimited" ]; then
    CURRENT_FD_LIMIT=1048576   # treat as 1M
    log_info "Current file descriptor limit: unlimited (treating as $CURRENT_FD_LIMIT)"
    log_success "✓ File descriptor limit is unlimited (more than adequate)"
else
    CURRENT_FD_LIMIT=$CURRENT_FD_LIMIT_RAW
    log_info "Current file descriptor limit: $CURRENT_FD_LIMIT"
    
    if [ "$CURRENT_FD_LIMIT" -ge 4096 ]; then
        log_success "✓ File descriptor limit is adequate ($CURRENT_FD_LIMIT >= 4096)"
    elif [ "$CURRENT_FD_LIMIT" -ge 1024 ]; then
        log_warning "⚠ File descriptor limit is moderate ($CURRENT_FD_LIMIT). Consider increasing to 4096 for large packages"
    else
        log_error "✗ File descriptor limit is low ($CURRENT_FD_LIMIT). This may cause issues with large Python packages"
    fi
fi

# 4. Check environment variables
log_info "Checking important environment variables..."

ENV_VARS=("NODE_ENV" "LOG_LEVEL" "CONFIG_DIR" "UV_COMPILE_BYTECODE")
for var in "${ENV_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        log_success "✓ $var is set: ${!var}"
    else
        # On host systems, these are usually not set and that's fine
        if [ -f /.dockerenv ]; then
            log_warning "⚠ $var is not set"
        else
            log_info "$var is not set (normal for host systems)"
        fi
    fi
done

# 5. Check MCP configuration file
log_info "Checking MCP configuration file..."

if [ -f "$CONFIG_FILE" ]; then
    log_success "✓ Configuration file exists: $CONFIG_FILE"
    
    # Check if it's valid JSON
    if jq empty "$CONFIG_FILE" >/dev/null 2>&1; then
        log_success "✓ Configuration file is valid JSON"
        
        # Count uvx-based servers
        UVX_SERVERS=$(jq -r '.mcpServers | to_entries[] | select(.value.command == "uvx") | .key' "$CONFIG_FILE" 2>/dev/null | wc -l)
        log_info "Found $UVX_SERVERS uvx-based MCP servers"
        
        if [ "$UVX_SERVERS" -gt 0 ]; then
            log_info "uvx-based servers:"
            jq -r '.mcpServers | to_entries[] | select(.value.command == "uvx") | "  - \(.key): \(.value.args[0])"' "$CONFIG_FILE" 2>/dev/null || true
        fi
    else
        log_error "✗ Configuration file contains invalid JSON"
        exit 1
    fi
else
    log_error "✗ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# 6. Test uvx package installation (quick test)
log_info "Testing uvx package installation capability..."

# Test with a lightweight package
TEST_PACKAGE="cowsay"
if uvx --help | grep -q "from" 2>/dev/null; then
    # Try to list available packages (this doesn't install anything)
    if command -v timeout >/dev/null 2>&1; then
        timeout 10s uvx "$TEST_PACKAGE" --help >/dev/null 2>&1
        local exit_code=$?
        if [ "$exit_code" -eq 0 ]; then
            log_success "✓ uvx can access and prepare packages"
        elif [ "$exit_code" -eq 124 ]; then
            log_warning "⚠ uvx package access test timed out (network or package installation slow)"
        else
            log_warning "⚠ uvx package access test failed with exit code $exit_code (this may be normal)"
        fi
    else
        # Fallback without timeout
        if uvx "$TEST_PACKAGE" --help >/dev/null 2>&1; then
            log_success "✓ uvx can access and prepare packages"
        else
            log_warning "⚠ uvx package access test failed (this may be normal)"
        fi
    fi
else
    log_info "Skipping package test (uvx version doesn't support --from flag testing)"
fi

# 7. Memory and disk space checks
log_info "Checking system resources..."

# Check available memory
if command -v free >/dev/null 2>&1; then
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
    log_info "Available memory: ${AVAILABLE_MEM}GB"
    
    # Check memory threshold (use bc if available, fallback to integer comparison)
    if command -v bc >/dev/null 2>&1 && (( $(echo "$AVAILABLE_MEM > 1.0" | bc -l 2>/dev/null || echo "0") )); then
        log_success "✓ Sufficient memory available"
    elif ! command -v bc >/dev/null 2>&1 && [ "${AVAILABLE_MEM%.*}" -ge 1 ] 2>/dev/null; then
        log_success "✓ Sufficient memory available"
    else
        log_warning "⚠ Low memory available (${AVAILABLE_MEM}GB). MCP servers may have issues"
    fi
fi

# Check disk space for /tmp (where uvx might cache)
if command -v df >/dev/null 2>&1; then
    TMP_SPACE=$(df -h /tmp 2>/dev/null | awk 'NR==2 {print $4}' || echo "unknown")
    log_info "Available space in /tmp: $TMP_SPACE"
fi

# 8. Network connectivity test (for package downloads)
log_info "Testing network connectivity..."

if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    log_success "✓ Network connectivity is working"
else
    log_warning "⚠ Network connectivity test failed. Package downloads may not work"
fi

# 9. Summary
echo ""
log_info "=== Health Check Summary ==="

if [ "$VERBOSE" = true ]; then
    log_info "Detailed log saved to: $LOG_FILE"
fi

# Error and warning counts are tracked automatically by log_error/log_warning functions

if [ "$ERROR_COUNT" -eq 0 ] && [ "$WARNING_COUNT" -eq 0 ]; then
    log_success "🎉 All checks passed! MCP servers should work correctly."
    exit 0
elif [ "$ERROR_COUNT" -eq 0 ]; then
    log_warning "⚠ Health check completed with $WARNING_COUNT warnings. MCP servers should mostly work."
    exit 0
else
    echo -e "${RED}[ERROR]${NC} ❌ Health check failed with $ERROR_COUNT errors and $WARNING_COUNT warnings."
    exit 1
fi 