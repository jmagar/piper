#!/bin/bash

# Create a demo directory with common AI mistakes
mkdir -p demo/project

echo "Creating a project with common AI mistakes that the file watcher will detect..."

# Create ESLint mistakes (wrong config file format)
echo "module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
  },
};" > demo/project/.eslintrc.js

# Create a package.json with downgraded dependencies
echo '{
  "name": "demo-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "next": "13.4.19",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "tailwindcss": "3.3.3"
  },
  "devDependencies": {
    "@types/react": "18.2.15",
    "@types/react-dom": "18.2.7",
    "@typescript-eslint/eslint-plugin": "6.0.0",
    "@typescript-eslint/parser": "6.0.0",
    "autoprefixer": "10.4.14",
    "eslint": "8.45.0",
    "eslint-plugin-react-hooks": "4.6.0",
    "eslint-plugin-react-refresh": "0.4.3",
    "postcss": "8.4.27",
    "typescript": "5.0.2",
    "vite": "4.4.5"
  }
}' > demo/project/package.json

# Create duplicate files with different extensions
mkdir -p demo/project/src/components
mkdir -p demo/project/src/utils

echo 'export function Button(props) {
  return <button className="bg-blue-500 text-white px-4 py-2 rounded">
    {props.children}
  </button>
}' > demo/project/src/components/Button.jsx

echo 'import React from "react";

export const Button: React.FC<{children: React.ReactNode}> = (props) => {
  return <button className="bg-blue-500 text-white px-4 py-2 rounded">
    {props.children}
  </button>
}' > demo/project/src/components/Button.tsx

# Create a tailwind.config.js with incompatible config for v4
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

# Create tsconfig with common issues
echo '{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}' > demo/project/tsconfig.json

echo "Done creating demo project with common AI mistakes!"
echo "Run the watcher with: npx ts-node --esm src/index.ts"
echo "The watcher should detect and report the following issues:"
echo "  1. .eslintrc.js file instead of eslint.config.mjs (ESLint 9)"
echo "  2. Downgraded dependencies in package.json:"
echo "     - next: 13.4.19 (should be 15.0.0-canary)"
echo "     - tailwindcss: 3.3.3 (should be 4.0.0)"
echo "  3. Duplicate components with different extensions (Button.jsx and Button.tsx)"
echo "  4. tailwind.config.js with incompatible configuration for v4"