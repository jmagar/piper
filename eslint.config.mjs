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

// Define the ESLint configuration
const eslintConfig = [
    // Global ignore patterns - MUST come first for proper ignoring
    {
        ignores: [
            // Build and output directories - next.js
            '.next/**',
            '**/.next/**', // More explicit pattern
            'frontend/.next/**', // Explicitly target frontend's .next directory
            'out/**',
            '**/out/**',
            '**/dist/**',
            // Dependency directories
            'node_modules/**',
            '**/node_modules/**',
            // Generated files
            'public/**',
            // OpenAPI generated code - expanded patterns
            'lib/api/generated/**',
            'lib/generated/**',
            'frontend/lib/api/generated/**',
            'frontend/lib/generated/**',
            '**/generated/**', // All generated directories
            '**/lib/generated/**',
            '**/*.generated.*', // Files with .generated in name
            // Other common generated files
            '**/*.min.js',
            '**/*.bundle.js'
        ]
    },
    // Base recommendations
    js.configs.recommended,
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

// Export the configuration
export default eslintConfig;
