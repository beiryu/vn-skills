// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import n from 'eslint-plugin-n';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', 'packages/cli/skills/**', '.scratch/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['packages/*/tsup.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { n },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'n/prefer-node-protocol': 'error',
      // MCP tool handlers and e-invoice adapters are async by contract even when they do not await.
      '@typescript-eslint/require-await': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // The core library runs offline and stays quiet: only scripts/build-data.ts downloads data.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'packages/core is offline; network access belongs in scripts/build-data.ts.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'node:http',
                'node:https',
                'node:net',
                'node:dgram',
                'node:dns',
                'http',
                'https',
                'net',
                'dns',
                'undici',
                'axios',
                'node-fetch',
              ],
              message: 'packages/core is offline; network access belongs in scripts/build-data.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // commander hands option values over as `any`; core functions validate them.
    files: ['packages/cli/src/commands/**/*.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // Upstream JSON fields are strings or numbers, read as `unknown`.
    files: ['scripts/**/*.ts'],
    rules: { '@typescript-eslint/no-base-to-string': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
