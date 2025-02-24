import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import a11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base config for all files
const baseConfig = {
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/generated/**',
    '**/.next/**',
    '**/*.d.ts'
  ]
};

// TypeScript base config
const tsConfig = {
  plugins: {
    '@typescript-eslint': tseslint,
    'import': importPlugin
  },
  rules: {
    '@typescript-eslint/no-explicit-any': ['warn', {
      ignoreRestArgs: true,
      fixToUnknown: true
    }],
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^(_|React$|Props$|State$|[A-Z][a-zA-Z]*Props$)',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      ignoreRestSiblings: true,
      args: 'none'
    }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-params': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports'
    }],
    '@typescript-eslint/no-non-null-assertion': 'off',
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' }
    }],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',
    'no-console': ['warn', {
      allow: ['warn', 'error', 'info', 'debug', 'group', 'groupEnd']
    }]
  }
};

// React/Next.js config
const reactConfig = {
  plugins: {
    'react': reactPlugin,
    'react-hooks': reactHooksPlugin,
    'jsx-a11y': a11yPlugin,
    'next': nextPlugin
  },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'next/no-html-link-for-pages': 'error',
    'next/no-img-element': 'off',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'react/no-unused-prop-types': 'off',
    'react/require-default-props': 'off'
  }
};

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Base JS config
  {
    ...baseConfig,
    ...js.configs.recommended
  },
  
  // Backend TypeScript
  {
    files: [
      'backend/**/*.ts',
      'backend/**/*.test.ts',
      'backend/**/*.spec.ts',
      'backend/prisma/**/*.ts',
      'backend/*.config.ts'
    ],
    ...tsConfig,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: resolve(__dirname, './backend/tsconfig.json'),
        tsconfigRootDir: __dirname,
        sourceType: 'module'
      },
      globals: {
        ...globals.node
      }
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: resolve(__dirname, './backend/tsconfig.json')
        },
        node: true
      }
    }
  },

  // Frontend TypeScript/React
  {
    files: ['frontend/**/*.{ts,tsx}'],
    ...tsConfig,
    ...reactConfig,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: resolve(__dirname, './frontend/tsconfig.json'),
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: true,
        JSX: true
      }
    },
    settings: {
      react: { version: '19.0.0' },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: resolve(__dirname, './frontend/tsconfig.json')
        },
        node: true
      },
      next: { rootDir: 'frontend' }
    }
  },

  // Config files
  {
    files: [
      '**/*.config.{js,mjs,cjs}',
      '**/postcss.config.*',
      '**/eslint.config.*',
      '**/next.config.*',
      '**/tailwind.config.*'
    ],
    ...js.configs.recommended,
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      }
    }
  },

  // Test files and Next.js pages/layouts
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'frontend/app/**/page.tsx',
      'frontend/app/**/layout.tsx'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-filename-extension': 'off',
      'import/no-default-export': 'off'
    }
  },

  // Generated files
  {
    files: ['**/generated/**/*.{ts,js}'],
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      // Import rules
      'import/no-cycle': 'off',
      'import/no-duplicates': 'off',
      'import/order': 'off',
      // General rules
      'no-empty': 'off',
      'no-useless-constructor': 'off',
      'no-empty-function': 'off',
      'prefer-const': 'off',
      'no-prototype-builtins': 'off',
      'no-unused-vars': 'off'
    },
    languageOptions: {
      parserOptions: {
        project: null // Disable project reference for generated files
      }
    }
  }
];