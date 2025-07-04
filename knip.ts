import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'app/layout.tsx',
    'app/**/page.tsx',
    'app/**/route.ts',
    'lib/actions.ts',
    'middleware.ts',
  ],
  project: ['app/**/*.tsx', 'lib/**/*.ts', 'components/**/*.tsx'],
};

export default config; 