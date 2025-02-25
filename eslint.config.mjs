import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
        plugins: {
            '@typescript-eslint': ts
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                window: true,
                document: true,
                console: true,
                process: true,
                HTMLDivElement: true,
                File: true,
                ScrollBehavior: true
            }
        },
        rules: {
            ...ts.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_|Props$|State$|[A-Z][a-zA-Z]*Props$',
                caughtErrorsIgnorePattern: '^_',
                ignoreRestSiblings: true
            }],
            'no-console': 'off',
            'no-process-env': 'off'
        }
    },
    {
        files: ['**/*.d.ts', '**/types/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off'
        }
    }
];
