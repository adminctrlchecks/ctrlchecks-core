/**
 * Database client — canonical entry point.
 *
 * Re-exports everything from aws-db-client.ts (name is a historical holdover; the
 * database is no longer AWS RDS — see that file's header for details).
 * New code should import from this file:
 *
 *   import { getDbClient } from '../core/database/db-client';
 *
 * The underlying implementation uses pg.Pool → PostgreSQL (self-hosted on the
 * production server as of Aug 2026).
 */

export { getDbClient, createDbClient } from './aws-db-client';
