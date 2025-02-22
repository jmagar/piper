// @ts-nocheck
import js from '@eslint/js';
import globals from 'globals';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import a11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/*.d.ts',
      '*.config.{js,mjs,cjs}',
      '**/postcss.config.*',
      '.eslintrc.*'
    ]
  },
  // Config files override
  {
    files: ['*.config.{js,mjs,cjs}', '**/postcss.config.*', '.eslintrc.*'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        module: 'writable'
      }
    }
  },
  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': a11yPlugin,
      'import': importPlugin,
      'next': nextPlugin
    },
    settings: {
      react: {
        version: '19.0.0',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
      next: {
        rootDir: '.',
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
        allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        allowFunctionsWithoutTypeParameters: true,
        allowedNames: [
          'render',
          'getInitialProps',
          'getStaticProps',
          'getServerSideProps',
          'getLayout',
          'default'
        ],
        allowIIFEs: true
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        destructuredArrayIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: true,
        allowAny: false
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
        disallowTypeAnnotations: false
      }],
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: false,
        checksConditionals: true,
        checksSpreads: true
      }],
      '@typescript-eslint/no-floating-promises': ['error', {
        ignoreVoid: true,
        ignoreIIFE: true
      }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': ['error', {
        ignoreConditionalTests: true,
        ignoreMixedLogicalExpressions: true
      }],
      '@typescript-eslint/prefer-optional-chain': 'error',

      // React
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off', // We use TypeScript instead
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/display-name': 'off', // Not needed with function components
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-pascal-case': 'error',
      'react/jsx-no-leaked-render': ['error', {
        validStrategies: ['ternary']
      }],
      'react/jsx-curly-brace-presence': ['error', {
        'props': 'never',
        'children': 'never'
      }],
      'react/hook-use-state': ['error', {
        'allowDestructuredState': true
      }],
      'react/no-array-index-key': 'warn',
      'react/no-danger': 'error',
      'react/no-deprecated': 'error',
      'react/no-unknown-property': ['error', {
        'ignore': ['css']
      }],
      'react/self-closing-comp': ['error', {
        'component': true,
        'html': true
      }],
      
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      
      // Next.js
      'next/no-html-link-for-pages': 'error',
      'next/no-img-element': 'error',
      'next/no-unwanted-polyfillio': 'error',
      'next/no-sync-scripts': 'error',
      
      // Imports
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type'
        ],
        'pathGroups': [
          {
            'pattern': 'react',
            'group': 'builtin',
            'position': 'before'
          },
          {
            'pattern': 'next/**',
            'group': 'builtin',
            'position': 'before'
          },
          {
            'pattern': '@/**',
            'group': 'internal',
            'position': 'after'
          }
        ],
        'pathGroupsExcludedImportTypes': ['react', 'next'],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/no-duplicates': 'error',
      'import/no-unresolved': ['error', {
        'ignore': ['swagger-ui-react', 'swagger-ui-react/swagger-ui.css']
      }],
      'import/no-cycle': 'error',
      'import/no-unused-modules': 'error',
      'import/no-default-export': 'off',
      'import/no-named-as-default': 'error',
      
      // General
      'no-console': ['warn', {
        'allow': ['warn', 'error', 'info', 'debug', 'group', 'groupEnd']
      }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-expressions': 'error',
      'no-duplicate-imports': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'multi-line', 'consistent'],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'app/**/page.tsx', 'app/**/layout.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/jsx-filename-extension': 'off',
      'import/no-default-export': 'off', // Allow default exports in Next.js pages
    },
  },
]; 