// ESLint v10 flat config (CommonJS format — worker uses CJS)
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    // Enforce no-console in API route files.
    // Use logger from worker/src/core/logger.ts instead.
    // This prevents console.* from being reintroduced after the Phase 0 migration.
    files: ['src/api/**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'error',
    },
  },
];
