# Piper Scripts

This directory contains utility scripts for managing and maintaining Piper.

## Available Scripts

### `clear-cache.sh`

Cache management script for clearing Redis caches.

**Usage:**
```bash
# Clear all caches
./scripts/clear-cache.sh

# Clear only specific cache types
./scripts/clear-cache.sh --config-only
./scripts/clear-cache.sh --tokens-only  
./scripts/clear-cache.sh --tools-only

# Show cache statistics
./scripts/clear-cache.sh --stats

# Dry run (show what would be cleared)
./scripts/clear-cache.sh --dry-run --verbose
```

**Options:**
- `--config-only`: Clear only configuration cache
- `--tokens-only`: Clear only token counting cache
- `--tools-only`: Clear only tool definition cache
- `--stats`: Show cache statistics only
- `--dry-run`: Show what would be done without executing
- `--verbose`: Enable verbose output
- `--help`: Show help message

**Examples:**
```bash
# Emergency cache clear
./scripts/clear-cache.sh

# Debug config issues
./scripts/clear-cache.sh --config-only --verbose

# Check cache health
./scripts/clear-cache.sh --stats
```

See [Cache Management Documentation](../docs/cache-management.md) for detailed information.

## Requirements

- Docker and docker-compose
- Running Piper containers (specifically `piper-cache-dev`)
- Bash shell

## Development

When adding new scripts:
1. Make them executable: `chmod +x scripts/script-name.sh`
2. Follow the existing pattern for options and help
3. Add documentation here and in the main docs
4. Test with `--dry-run` option when applicable 