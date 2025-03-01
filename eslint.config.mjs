import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create compat layer for interop between new flat config and legacy config system
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

// Next.js config is provided through the compat layer
export default [
    js.configs.recommended,
    // Global ignore patterns
    {
        ignores: [
            'node_modules/**',
            '.next/**',
            'out/**',
            'public/**',
            'lib/api/generated/**',
            'lib/generated/**',
            '**/dist/**'
        ]
    },
    // TypeScript files configuration
    ...compat.config({
        extends: [
            'next/core-web-vitals', 
            'plugin:@typescript-eslint/recommended'
        ],
        plugins: ['@typescript-eslint'],
        parser: '@typescript-eslint/parser',
        settings: {
            next: {
                rootDir: './'
            },
            react: {
                version: 'detect'
            }
        },
        rules: {
            'react/no-unescaped-entities': 'off',
            'react/no-unknown-property': ['error', { 
                ignore: ['cmdk-input-wrapper'] 
            }],
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_|Props$|State$|[A-Z][a-zA-Z]*Props$',
                caughtErrorsIgnorePattern: '^_',
                ignoreRestSiblings: true
            }]
        },
    }),
    // Additional per-file type configurations
    {
        files: ['**/*.d.ts', '**/types/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off'
        }
    }
];
