#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display section headers
section() {
  echo -e "\n${BLUE}========== $1 ==========${NC}"
}

# Function to pause script execution
pause() {
  echo -e "${YELLOW}$1${NC}"
  sleep $2
}

# Make scripts executable
chmod +x ./run.sh
chmod +x ./demo/create-duplicates.sh
chmod +x ./demo/create-ai-mistakes.sh

# Create test environment
section "CREATING TEST ENVIRONMENT"
echo -e "${YELLOW}This script will demonstrate how the code watcher detects file changes in real-time${NC}"

# Set up initial demo project
echo -e "Setting up initial test environment..."
rm -rf demo/project 2>/dev/null
mkdir -p demo/project/src/components

# Create base files with proper config first
echo '{
  "name": "demo-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "next": "15.0.0-canary",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "tailwindcss": "4.0.0"
  },
  "devDependencies": {
    "@types/react": "18.2.15",
    "@types/react-dom": "18.2.7",
    "typescript": "5.0.2",
    "eslint": "9.0.0"
  }
}' > demo/project/package.json

echo 'export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3490dc",
      },
    },
  },
  plugins: [],
}' > demo/project/tailwind.config.ts

echo 'export default {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
  },
};' > demo/project/eslint.config.mjs

echo 'import React from "react";

export const Button: React.FC<{children: React.ReactNode}> = (props) => {
  return <button className="bg-blue-500 text-white px-4 py-2 rounded">
    {props.children}
  </button>
}' > demo/project/src/components/Button.tsx

# Modify the .env file to watch the demo directory
sed -i 's|WATCH_PATHS=.*|WATCH_PATHS=./demo/project|g' .env
echo -e "${GREEN}Updated .env to watch the demo/project directory${NC}"

# Disable embeddings for faster startup
sed -i 's|ENABLE_EMBEDDINGS=.*|ENABLE_EMBEDDINGS=false|g' .env

section "RUNNING THE WATCHER"
echo -e "${YELLOW}We'll start the watcher and then make changes to files to demonstrate real-time detection${NC}"
echo -e "The watcher process will be started in the background"

# Run the watcher in the background
npm run dev > watcher_output.log 2>&1 &
WATCHER_PID=$!

# Wait for watcher to initialize
pause "Waiting for watcher to initialize..." 5

section "DEMONSTRATION: REAL-TIME FILE CHANGES"

# 1. Create a duplicate file with different extension
pause "Creating a duplicate file with a different extension..." 2
echo 'export function Button(props) {
  return <button className="bg-blue-500 text-white px-4 py-2 rounded">
    {props.children}
  </button>
}' > demo/project/src/components/Button.jsx
echo -e "${GREEN}Created Button.jsx alongside existing Button.tsx${NC}"

# 2. Downgrade packages in package.json
pause "Downgrading packages in package.json..." 3
sed -i 's|"tailwindcss": "4.0.0"|"tailwindcss": "3.3.3"|g' demo/project/package.json
sed -i 's|"next": "15.0.0-canary"|"next": "13.4.19"|g' demo/project/package.json
echo -e "${GREEN}Downgraded TailwindCSS and Next.js versions in package.json${NC}"

# 3. Create incorrect ESLint config
pause "Creating incorrect ESLint config file..." 2
echo 'module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  rules: {},
};' > demo/project/eslintrc.js
echo -e "${GREEN}Created eslintrc.js file (incorrect for ESLint 9)${NC}"

# 4. Convert tailwind.config.ts to .js with incorrect format
pause "Converting tailwind.config.ts to tailwind.config.js (incorrect format)..." 2
echo 'module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3490dc",
      },
    },
  },
  plugins: [],
}' > demo/project/tailwind.config.js
echo -e "${GREEN}Created tailwind.config.js with incorrect module.exports format${NC}"

# 5. Remove an important file
pause "Removing an important file (eslint.config.mjs)..." 3
rm demo/project/eslint.config.mjs
echo -e "${GREEN}Removed eslint.config.mjs${NC}"

# Display watcher output
pause "Checking watcher output..." 2
section "WATCHER OUTPUT"
echo -e "${YELLOW}Latest output from the watcher:${NC}"
tail -n 20 watcher_output.log

# Clean up
section "CLEANUP"
echo -e "${YELLOW}Press Enter to stop the watcher and clean up${NC}"
read

# Kill the watcher process
kill $WATCHER_PID 2>/dev/null
wait $WATCHER_PID 2>/dev/null
rm watcher_output.log

echo -e "${GREEN}Test completed. Would you like to remove the demo project? (y/n)${NC}"
read RESPONSE
if [[ "$RESPONSE" == "y" || "$RESPONSE" == "Y" ]]; then
  rm -rf demo/project
  echo -e "${GREEN}Demo project removed.${NC}"
else
  echo -e "${GREEN}Demo project left in place for further inspection.${NC}"
fi

echo -e "\n${BLUE}========== TEST COMPLETED ==========${NC}"