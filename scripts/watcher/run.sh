#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Code Watcher ====${NC}"
echo -e "${YELLOW}Setting up and running the file extension watcher${NC}"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Check if .env file exists, if not copy from example
if [ ! -f "src/.env" ]; then
  echo -e "${YELLOW}Creating .env file from example...${NC}"
  cp src/.env.example src/.env
  echo -e "${YELLOW}Please edit src/.env to configure your watch paths and settings${NC}"
  exit 1
fi

# Run in dev mode
echo -e "${GREEN}Starting Code Watcher in dev mode...${NC}"
npm run dev