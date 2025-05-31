#!/bin/bash

# Development Environment Management Script for Piper

# Ensure the script is run from the project root (where docker-compose.dev.yml is)
cd "$(dirname "$0")"

# Default Docker Compose command
COMPOSE_CMD="docker-compose -f docker-compose.dev.yml"

# Function to print usage
usage() {
  echo "Usage: $0 [up|down|logs|build|ps|restart|exec|prisma-generate|prisma-migrate-dev|prisma-studio] [service_name (for logs, exec, restart)]"
  echo "Commands:"
  echo "  up                Start the development services in detached mode."
  echo "  down              Stop and remove the development services."
  echo "  logs [service]    Follow logs for all services or a specific service (e.g., piper-app)."
  echo "  build [service]   Build or rebuild services (all or specific)."
  echo "  ps                List running development services."
  echo "  restart [service] Restart all services or a specific service."
  echo "  exec <service>    Execute a command in a running service (e.g., $0 exec piper-app sh)."
  echo "  prisma-generate   Run 'npx prisma generate' in the piper-app service."
  echo "  prisma-migrate-dev Run 'npx prisma migrate dev' in the piper-app service."
  echo "  prisma-studio     Run 'npx prisma studio' in the piper-app service (ensure port 5555 is free on host)."
  exit 1
}

# Main command handling
COMMAND=$1
shift # Remove the first argument, leaving the rest for service names or exec commands

case "$COMMAND" in
  up)
    echo "Starting development services..."
    $COMPOSE_CMD up -d --remove-orphans
    ;;
  down)
    echo "Stopping development services..."
    $COMPOSE_CMD down
    ;;
  logs)
    echo "Following logs... (Ctrl+C to stop)"
    if [ -z "$1" ]; then
      $COMPOSE_CMD logs -f
    else
      $COMPOSE_CMD logs -f "$@"
    fi
    ;;
  build)
    echo "Building services..."
    if [ -z "$1" ]; then
      $COMPOSE_CMD build --no-cache
    else
      $COMPOSE_CMD build --no-cache "$@"
    fi
    ;;
  ps)
    $COMPOSE_CMD ps
    ;;
  restart)
    echo "Restarting services..."
    if [ -z "$1" ]; then
      $COMPOSE_CMD restart
    else
      $COMPOSE_CMD restart "$@"
    fi
    ;;
  exec)
    if [ -z "$1" ]; then
      echo "Error: Service name required for exec."
      usage
    fi
    SERVICE_NAME=$1
    shift
    if [ -z "$1" ]; then
      echo "Error: Command required for exec."
      usage
    fi
    $COMPOSE_CMD exec "$SERVICE_NAME" "$@"
    ;;
  prisma-generate)
    echo "Running 'npx prisma generate' in piper-app..."
    $COMPOSE_CMD exec piper-app npx prisma generate
    ;;
  prisma-migrate-dev)
    echo "Running 'npx prisma migrate dev' in piper-app..."
    # You might need to pass --name for the migration
    $COMPOSE_CMD exec piper-app npx prisma migrate dev "$@"
    ;;
  prisma-studio)
    echo "Running 'npx prisma studio' in piper-app..."
    echo "Access Prisma Studio at http://localhost:5555"
    # Prisma studio needs the port exposed from the container.
    # We'll run it with a temporary service definition or by adding the port to piper-app if always needed.
    # For simplicity here, we assume you might add -p 5555:5555 to piper-app in docker-compose.dev.yml if used often.
    # Or, run it attached to see output and stop easily:
    $COMPOSE_CMD exec piper-app npx prisma studio
    ;;
  *)
    usage
    ;;
esac

exit 0
