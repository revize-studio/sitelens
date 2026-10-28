import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.wrangler/**', 'packages/core/src/cards/generated.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Build scripts run in Node; TypeScript files get their globals from the type checker
    files: ['**/*.mjs'],
    languageOptions: { globals: { URL: 'readonly', console: 'readonly', process: 'readonly' } },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': 'error',
    },
  },
);
