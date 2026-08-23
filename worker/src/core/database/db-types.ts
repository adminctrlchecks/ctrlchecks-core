/**
 * Database type shim — replaces @db/db-js type imports.
 *
 * Previously named db-shim.ts. Mapped via tsconfig paths so that
 * `import type { DbClient } from '@db/db-js'` resolves here
 * at compile time (no actual external DB SDK required at runtime).
 *
 * All types are `any` because the db client is duck-typed to match a
 * Postgres-backed client interface — no generated types needed.
 */

// Re-export everything from the shim for backward compatibility
export * from './db-shim';

// Preferred aliases for new code
export type DbClient = any;
export type DbError = any;
export type DbResponse<T = any> = { data: T | null; error: DbError | null };
