#!/bin/bash

# Piper Cache Management Script
# Usage: ./scripts/clear-cache.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REDIS_CONTAINER="piper-cache-dev"
CONFIG_ONLY=false
TOKENS_ONLY=false
TOOLS_ONLY=false
DRY_RUN=false
VERBOSE=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Function to check if Redis container is running
check_redis() {
    if ! docker ps | grep -q "$REDIS_CONTAINER"; then
        print_error "Redis container '$REDIS_CONTAINER' is not running"
        exit 1
    fi
    print_debug "Redis container is running"
}

# Function to execute Redis command
redis_exec() {
    local cmd="$1"
    if [ "$DRY_RUN" = true ]; then
        print_debug "DRY RUN: docker exec $REDIS_CONTAINER redis-cli $cmd"
        return 0
    fi
    
    docker exec "$REDIS_CONTAINER" redis-cli $cmd
}

# Function to count keys matching pattern
count_keys() {
    local pattern="$1"
    if [ "$DRY_RUN" = true ]; then
        echo "0"
        return
    fi
    
    local keys=$(docker exec "$REDIS_CONTAINER" redis-cli KEYS "$pattern" 2>/dev/null)
    if [ -n "$keys" ] && [ "$keys" != "" ]; then
        echo "$keys" | wc -l
    else
        echo "0"
    fi
}

# Function to clear config cache
clear_config_cache() {
    print_status "Clearing config cache..."
    
    if [ "$DRY_RUN" = true ]; then
        local config_keys=$(docker exec "$REDIS_CONTAINER" redis-cli EVAL "return #redis.call('keys', ARGV[1])" 0 "config_file:*" 2>/dev/null || echo "0")
        print_debug "Found $config_keys config cache keys (dry run)"
        print_debug "Would delete keys matching: config_file:*"
        return
    fi
    
    # Get keys and delete them
    local keys=$(docker exec "$REDIS_CONTAINER" redis-cli KEYS "config_file:*")
    if [ -n "$keys" ] && [ "$keys" != "" ]; then
        local count=$(echo "$keys" | wc -l)
        print_debug "Found $count config cache keys: $keys"
        echo "$keys" | xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL
        print_status "Cleared $count config cache keys"
    else
        print_status "No config cache keys found"
    fi
}

# Function to clear token cache
clear_token_cache() {
    print_status "Clearing token cache..."
    
    if [ "$DRY_RUN" = true ]; then
        local token_keys=$(docker exec "$REDIS_CONTAINER" redis-cli EVAL "return #redis.call('keys', ARGV[1])" 0 "token_count:*" 2>/dev/null || echo "0")
        print_debug "Found $token_keys token cache keys (dry run)"
        print_debug "Would delete keys matching: token_count:*"
        return
    fi
    
    # Get keys and delete them
    local keys=$(docker exec "$REDIS_CONTAINER" redis-cli KEYS "token_count:*")
    if [ -n "$keys" ] && [ "$keys" != "" ]; then
        local count=$(echo "$keys" | wc -l)
        print_debug "Found $count token cache keys"
        echo "$keys" | xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL
        print_status "Cleared $count token cache keys"
    else
        print_status "No token cache keys found"
    fi
}

# Function to clear tool definition cache
clear_tools_cache() {
    print_status "Clearing tool definition cache..."
    
    if [ "$DRY_RUN" = true ]; then
        local tool_keys=$(docker exec "$REDIS_CONTAINER" redis-cli EVAL "return #redis.call('keys', ARGV[1])" 0 "tool_def:*" 2>/dev/null || echo "0")
        print_debug "Found $tool_keys tool definition cache keys (dry run)"
        print_debug "Would delete keys matching: tool_def:*"
        return
    fi
    
    # Get keys and delete them
    local keys=$(docker exec "$REDIS_CONTAINER" redis-cli KEYS "tool_def:*")
    if [ -n "$keys" ] && [ "$keys" != "" ]; then
        local count=$(echo "$keys" | wc -l)
        print_debug "Found $count tool definition cache keys"
        echo "$keys" | xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL
        print_status "Cleared $count tool definition cache keys"
    else
        print_status "No tool definition cache keys found"
    fi
}

# Function to clear all caches
clear_all_cache() {
    print_status "Clearing all Piper caches..."
    
    clear_config_cache
    clear_token_cache
    clear_tools_cache
    
    # Clear any other Piper-specific keys
    local other_patterns=("mcp:*" "cache:*" "session:*")
    for pattern in "${other_patterns[@]}"; do
        if [ "$DRY_RUN" = true ]; then
            local keys=$(docker exec "$REDIS_CONTAINER" redis-cli EVAL "return #redis.call('keys', ARGV[1])" 0 "$pattern" 2>/dev/null || echo "0")
            if [ "$keys" -gt 0 ]; then
                print_debug "Would clear $keys keys matching $pattern"
            fi
        else
            local keys=$(docker exec "$REDIS_CONTAINER" redis-cli KEYS "$pattern")
            if [ -n "$keys" ] && [ "$keys" != "" ]; then
                local count=$(echo "$keys" | wc -l)
                print_debug "Clearing $count keys matching $pattern"
                echo "$keys" | xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL
            fi
        fi
    done
    
    print_status "Cache clearing completed"
}

# Function to show cache statistics
show_cache_stats() {
    print_status "Cache Statistics:"
    echo "=================="
    
    local config_keys=$(count_keys "config_file:*")
    local token_keys=$(count_keys "token_count:*")
    local tool_keys=$(count_keys "tool_def:*")
    local total_keys=$(count_keys "*")
    
    echo "Config Cache Keys:     $config_keys"
    echo "Token Cache Keys:      $token_keys"
    echo "Tool Cache Keys:       $tool_keys"
    echo "Total Redis Keys:      $total_keys"
    echo ""
    
    if [ "$DRY_RUN" = false ]; then
        print_status "Redis Info:"
        docker exec "$REDIS_CONTAINER" redis-cli INFO memory | grep -E "(used_memory_human|used_memory_peak_human)"
        docker exec "$REDIS_CONTAINER" redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses)" | head -2
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Cache Management Script for Piper

OPTIONS:
    --config-only       Clear only configuration cache
    --tokens-only       Clear only token counting cache  
    --tools-only        Clear only tool definition cache
    --stats             Show cache statistics only
    --dry-run           Show what would be done without executing
    --verbose           Enable verbose output
    --help              Show this help message

EXAMPLES:
    $0                          # Clear all caches
    $0 --config-only           # Clear only config cache
    $0 --stats                 # Show cache statistics
    $0 --dry-run --verbose     # See what would be cleared
    $0 --tokens-only --verbose # Clear token cache with verbose output

CONTAINERS:
    Redis Container: $REDIS_CONTAINER

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --config-only)
            CONFIG_ONLY=true
            shift
            ;;
        --tokens-only)
            TOKENS_ONLY=true
            shift
            ;;
        --tools-only)
            TOOLS_ONLY=true
            shift
            ;;
        --stats)
            STATS_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_status "Piper Cache Management Script"
    print_debug "Redis Container: $REDIS_CONTAINER"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Check Redis container
    check_redis
    
    # Show stats if requested
    if [ "$STATS_ONLY" = true ]; then
        show_cache_stats
        exit 0
    fi
    
    # Execute cache clearing based on options
    if [ "$CONFIG_ONLY" = true ]; then
        clear_config_cache
    elif [ "$TOKENS_ONLY" = true ]; then
        clear_token_cache
    elif [ "$TOOLS_ONLY" = true ]; then
        clear_tools_cache
    else
        # Clear all if no specific option provided
        clear_all_cache
    fi
    
    # Show final stats
    echo ""
    show_cache_stats
    
    print_status "Cache management completed successfully"
}

# Run main function
main "$@" 