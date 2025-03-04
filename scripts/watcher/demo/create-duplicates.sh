#!/bin/bash

# Create a demo directory structure with duplicate files
mkdir -p demo/src/components
mkdir -p demo/src/utils
mkdir -p demo/src/pages
mkdir -p demo/src/types

# Create some duplicate files with different extensions
echo "function Button() { return <button>Click me</button> }" > demo/src/components/Button.jsx
echo "export function Button() { return <button>Click me</button> }" > demo/src/components/Button.tsx

echo "export const formatDate = (date) => { return new Date(date).toLocaleDateString(); }" > demo/src/utils/date-formatter.js
echo "export const formatDate = (date: Date): string => { return date.toLocaleDateString(); }" > demo/src/utils/date-formatter.ts

echo "const API_URL = 'https://api.example.com';" > demo/src/config.js
echo "export const API_URL: string = 'https://api.example.com';" > demo/src/config.ts

echo "// Type definitions for the app" > demo/src/types/index.d.ts
echo "export interface User { id: number; name: string; }" > demo/src/types/index.ts

echo "Done creating demo files with duplicates!"