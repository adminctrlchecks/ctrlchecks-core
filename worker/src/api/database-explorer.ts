/**
 * Database Explorer
 *
 * Lets the workflow builder UI browse a user's connected MySQL database
 * (tables) so they can insert a starter query instead of typing table names
 * blind. Resolves credentials from the user's saved Connection — the MySQL
 * node itself only stores raw SQL, not host/port/username/password.
 */

import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import * as admin from 'firebase-admin';
import { Pool as PgPool } from 'pg';
import { connectionService } from '../credentials-system/connection-service';

interface MySQLConnectionInput {
  host: string;
  port?: number | string;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | object;
}

function buildPoolConfig(input: MySQLConnectionInput) {
  const poolConfig: any = {
    host: input.host,
    port: parseInt(String(input.port || 3306)),
    user: input.username,
    password: input.password,
    database: input.database,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  };
  if (input.ssl === true) {
    poolConfig.ssl = { rejectUnauthorized: false };
  } else if (input.ssl && typeof input.ssl === 'object') {
    poolConfig.ssl = input.ssl;
  }
  return poolConfig;
}

async function resolveConnectionInput(userId: string, connectionId: string): Promise<MySQLConnectionInput> {
  const connection = await connectionService.getDecryptedConnection(userId, connectionId);
  const creds = connection.credentials as Record<string, unknown>;
  return {
    host: String(creds.host || ''),
    port: creds.port as number | string,
    username: String(creds.username || ''),
    password: String(creds.password || ''),
    database: String(creds.database || ''),
  };
}

export async function listMysqlTablesHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });

  let input: MySQLConnectionInput;
  try {
    input = await resolveConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.host || !input.username || !input.database) {
    return res.status(400).json({ success: false, error: 'Connection is missing host/username/database' });
  }

  const pool = mysql.createPool(buildPoolConfig(input));
  try {
    const [rows] = await pool.query('SHOW TABLES');
    const tables = (rows as any[]).map((row) => Object.values(row)[0] as string);
    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not connect to MySQL' });
  } finally {
    await pool.end();
  }
}

const PREVIEW_ROW_LIMIT = 5;

export async function previewMysqlTableHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  const table = String(req.body?.table || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  if (!table) return res.status(400).json({ success: false, error: 'table is required' });

  let input: MySQLConnectionInput;
  try {
    input = await resolveConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.host || !input.username || !input.database) {
    return res.status(400).json({ success: false, error: 'Connection is missing host/username/database' });
  }

  const pool = mysql.createPool(buildPoolConfig(input));
  try {
    // Only preview tables that actually exist in this database — avoids building
    // a query string out of a client-supplied table name.
    const [tableRows] = await pool.query('SHOW TABLES');
    const knownTables = (tableRows as any[]).map((row) => Object.values(row)[0] as string);
    if (!knownTables.includes(table)) {
      return res.status(404).json({ success: false, error: `Table "${table}" not found` });
    }

    const [rows] = await pool.query(`SELECT * FROM ${mysql.escapeId(table)} LIMIT ${PREVIEW_ROW_LIMIT}`);
    const dataRows = rows as Record<string, unknown>[];
    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];
    res.json({ success: true, columns, rows: dataRows });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not preview table' });
  } finally {
    await pool.end();
  }
}

// ─── MongoDB ──────────────────────────────────────────────────────────────────
// The mongodb_connection credential stores the full connection string in its
// `username` field and an optional DB-name override in `password` (see
// credential-type-registry.ts) — same shape runMongoDBNode() now understands.

interface MongoConnectionInput {
  connectionString: string;
  database?: string;
}

async function resolveMongoConnectionInput(userId: string, connectionId: string): Promise<MongoConnectionInput> {
  const connection = await connectionService.getDecryptedConnection(userId, connectionId);
  const creds = connection.credentials as Record<string, unknown>;
  const connectionString = String(creds.username || creds.connectionString || '').trim();
  const database = creds.password ? String(creds.password).trim() : undefined;
  return { connectionString, database };
}

function resolveMongoDatabaseName(input: MongoConnectionInput): string | undefined {
  if (input.database) return input.database;
  const afterScheme = input.connectionString.split('?')[0].split('://')[1] || '';
  const pathPart = afterScheme.split('/').slice(1).join('/');
  return pathPart || undefined;
}

export async function listMongoCollectionsHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });

  let input: MongoConnectionInput;
  try {
    input = await resolveMongoConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.connectionString) {
    return res.status(400).json({ success: false, error: 'Connection is missing a connection string' });
  }

  const client = new MongoClient(input.connectionString);
  try {
    await client.connect();
    const db = client.db(resolveMongoDatabaseName(input));
    const collections = await db.listCollections().toArray();
    res.json({ success: true, collections: collections.map((c) => c.name) });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not connect to MongoDB' });
  } finally {
    await client.close();
  }
}

const PREVIEW_DOC_LIMIT = 5;

export async function previewMongoCollectionHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  const collectionName = String(req.body?.collection || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  if (!collectionName) return res.status(400).json({ success: false, error: 'collection is required' });

  let input: MongoConnectionInput;
  try {
    input = await resolveMongoConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.connectionString) {
    return res.status(400).json({ success: false, error: 'Connection is missing a connection string' });
  }

  const client = new MongoClient(input.connectionString);
  try {
    await client.connect();
    const db = client.db(resolveMongoDatabaseName(input));

    // Only preview collections that actually exist — avoids querying an arbitrary
    // client-supplied collection name.
    const knownCollections = (await db.listCollections().toArray()).map((c) => c.name);
    if (!knownCollections.includes(collectionName)) {
      return res.status(404).json({ success: false, error: `Collection "${collectionName}" not found` });
    }

    const docs = await db.collection(collectionName).find({}).limit(PREVIEW_DOC_LIMIT).toArray();
    // Documents can have varying shapes, so union the keys across the sample instead
    // of assuming the first document's shape applies to all rows.
    const columns = Array.from(new Set(docs.flatMap((doc) => Object.keys(doc))));
    res.json({ success: true, columns, rows: docs });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not preview collection' });
  } finally {
    await client.close();
  }
}

// ─── Firebase / Firestore ───────────────────────────────────────────────────
// The firebase_credentials connection stores projectId/apiKey plus the full
// service account JSON — the Web API Key isn't usable server-side, so admin
// access (and therefore browsing) requires parsing client_email/private_key
// out of the pasted service account JSON, same as runFirebaseNode() does.

interface FirebaseConnectionInput {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

async function resolveFirebaseConnectionInput(userId: string, connectionId: string): Promise<FirebaseConnectionInput> {
  const connection = await connectionService.getDecryptedConnection(userId, connectionId);
  const creds = connection.credentials as Record<string, unknown>;
  const rawServiceAccount = String(creds.serviceAccountJson || '').trim();
  if (!rawServiceAccount) {
    throw new Error('Connection is missing a Service Account JSON');
  }
  let parsed: any;
  try {
    parsed = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('Service Account JSON is not valid JSON');
  }
  return {
    projectId: String(parsed.project_id || creds.projectId || ''),
    clientEmail: String(parsed.client_email || ''),
    privateKey: String(parsed.private_key || ''),
  };
}

function initFirebaseExplorerApp(input: FirebaseConnectionInput, tag: string): admin.app.App {
  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: input.projectId,
        clientEmail: input.clientEmail,
        privateKey: input.privateKey.replace(/\\n/g, '\n'),
      }),
    },
    `db-explorer-${tag}-${Date.now()}`
  );
}

export async function listFirestoreCollectionsHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });

  let input: FirebaseConnectionInput;
  try {
    input = await resolveFirebaseConnectionInput(userId, connectionId);
  } catch (err: any) {
    return res.status(404).json({ success: false, error: err.message || 'Connection not found' });
  }
  if (!input.projectId || !input.clientEmail || !input.privateKey) {
    return res.status(400).json({ success: false, error: 'Connection is missing projectId/clientEmail/privateKey' });
  }

  const app = initFirebaseExplorerApp(input, 'list');
  try {
    const db = admin.firestore(app);
    const collections = await db.listCollections();
    res.json({ success: true, collections: collections.map((c) => c.id) });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not connect to Firestore' });
  } finally {
    await app.delete();
  }
}

const PREVIEW_DOC_LIMIT_FIRESTORE = 5;

export async function previewFirestoreCollectionHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  const collectionName = String(req.body?.collection || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  if (!collectionName) return res.status(400).json({ success: false, error: 'collection is required' });

  let input: FirebaseConnectionInput;
  try {
    input = await resolveFirebaseConnectionInput(userId, connectionId);
  } catch (err: any) {
    return res.status(404).json({ success: false, error: err.message || 'Connection not found' });
  }
  if (!input.projectId || !input.clientEmail || !input.privateKey) {
    return res.status(400).json({ success: false, error: 'Connection is missing projectId/clientEmail/privateKey' });
  }

  const app = initFirebaseExplorerApp(input, 'preview');
  try {
    const db = admin.firestore(app);

    // Only preview collections that actually exist — avoids querying an arbitrary
    // client-supplied collection name.
    const knownCollections = (await db.listCollections()).map((c) => c.id);
    if (!knownCollections.includes(collectionName)) {
      return res.status(404).json({ success: false, error: `Collection "${collectionName}" not found` });
    }

    const snapshot = await db.collection(collectionName).limit(PREVIEW_DOC_LIMIT_FIRESTORE).get();
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Documents can have varying shapes, so union the keys across the sample instead
    // of assuming the first document's shape applies to all rows.
    const columns = Array.from(new Set(docs.flatMap((doc) => Object.keys(doc))));
    res.json({ success: true, columns, rows: docs });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not preview collection' });
  } finally {
    await app.delete();
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
// The supabase_api_key credential stores projectUrl + token (service role key).
// Tables and rows come from the project's PostgREST endpoint: the root returns an
// OpenAPI spec whose paths are the exposed tables, and each table is queryable at
// /rest/v1/<table>.

interface SupabaseConnectionInput {
  projectUrl: string;
  token: string;
}

async function resolveSupabaseConnectionInput(userId: string, connectionId: string): Promise<SupabaseConnectionInput> {
  const connection = await connectionService.getDecryptedConnection(userId, connectionId);
  const creds = connection.credentials as Record<string, unknown>;
  return {
    projectUrl: String(creds.projectUrl || creds.url || '').trim().replace(/\/$/, ''),
    token: String(creds.token || creds.serviceRoleKey || creds.anonKey || '').trim(),
  };
}

function supabaseHeaders(token: string): Record<string, string> {
  return { apikey: token, Authorization: `Bearer ${token}` };
}

export async function listSupabaseTablesHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });

  let input: SupabaseConnectionInput;
  try {
    input = await resolveSupabaseConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.projectUrl || !input.token) {
    return res.status(400).json({ success: false, error: 'Connection is missing projectUrl/token' });
  }

  try {
    const resp = await fetch(`${input.projectUrl}/rest/v1/`, { headers: supabaseHeaders(input.token) });
    if (!resp.ok) {
      return res.status(502).json({ success: false, error: `Supabase returned ${resp.status}` });
    }
    const spec: any = await resp.json();
    const tables = Object.keys(spec?.paths || {})
      .filter((p) => p !== '/')
      .map((p) => p.replace(/^\//, ''));
    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not connect to Supabase' });
  }
}

const PREVIEW_ROW_LIMIT_SUPABASE = 5;

export async function previewSupabaseTableHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  const table = String(req.body?.table || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  if (!table) return res.status(400).json({ success: false, error: 'table is required' });

  let input: SupabaseConnectionInput;
  try {
    input = await resolveSupabaseConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.projectUrl || !input.token) {
    return res.status(400).json({ success: false, error: 'Connection is missing projectUrl/token' });
  }

  try {
    // Only preview tables that actually exist — avoids issuing a request for an
    // arbitrary client-supplied table name.
    const specResp = await fetch(`${input.projectUrl}/rest/v1/`, { headers: supabaseHeaders(input.token) });
    const spec: any = await specResp.json().catch(() => ({}));
    const knownTables = Object.keys(spec?.paths || {}).filter((p) => p !== '/').map((p) => p.replace(/^\//, ''));
    if (!knownTables.includes(table)) {
      return res.status(404).json({ success: false, error: `Table "${table}" not found` });
    }

    const resp = await fetch(
      `${input.projectUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=${PREVIEW_ROW_LIMIT_SUPABASE}`,
      { headers: supabaseHeaders(input.token) }
    );
    if (!resp.ok) {
      return res.status(502).json({ success: false, error: `Supabase returned ${resp.status}` });
    }
    const rows = (await resp.json()) as Record<string, unknown>[];
    const columns = Array.isArray(rows) && rows.length > 0 ? Object.keys(rows[0]) : [];
    res.json({ success: true, columns, rows: Array.isArray(rows) ? rows : [] });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not preview table' });
  }
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
// The postgresql_connection credential stores host/port/database/username/password.
// The Postgres node is raw SQL against the linked connection, so this lists public
// tables (via information_schema) and previews a few rows to help write the query.

interface PostgresConnectionInput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: false | { rejectUnauthorized: boolean };
}

// Mirror the Postgres node's SSL normalization: an SSL *mode* string ('disable' |
// 'require' | 'verify-full') must not be treated as a plain truthy flag.
function normalizePgExplorerSsl(ssl: unknown): false | { rejectUnauthorized: boolean } {
  if (ssl === true || ssl === 'require' || ssl === 'true') return { rejectUnauthorized: false };
  if (ssl === 'verify-full' || ssl === 'verify-ca') return { rejectUnauthorized: true };
  return false;
}

async function resolvePostgresConnectionInput(userId: string, connectionId: string): Promise<PostgresConnectionInput> {
  const connection = await connectionService.getDecryptedConnection(userId, connectionId);
  const creds = connection.credentials as Record<string, unknown>;
  return {
    host: String(creds.host || ''),
    port: parseInt(String(creds.port || 5432), 10),
    database: String(creds.database || ''),
    username: String(creds.username || ''),
    password: String(creds.password || ''),
    ssl: normalizePgExplorerSsl(creds.ssl),
  };
}

function buildPgPool(input: PostgresConnectionInput): PgPool {
  return new PgPool({
    host: input.host,
    port: input.port,
    user: input.username,
    password: input.password,
    database: input.database,
    ssl: input.ssl,
    max: 1,
    connectionTimeoutMillis: 8000,
  });
}

export async function listPostgresTablesHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });

  let input: PostgresConnectionInput;
  try {
    input = await resolvePostgresConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.host || !input.username || !input.database) {
    return res.status(400).json({ success: false, error: 'Connection is missing host/username/database' });
  }

  const pool = buildPgPool(input);
  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    const tables = result.rows.map((r) => r.table_name as string);
    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not connect to PostgreSQL' });
  } finally {
    await pool.end();
  }
}

const PREVIEW_ROW_LIMIT_PG = 5;

export async function previewPostgresTableHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthenticated' });

  const connectionId = String(req.body?.connectionId || '').trim();
  const table = String(req.body?.table || '').trim();
  if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required' });
  if (!table) return res.status(400).json({ success: false, error: 'table is required' });

  let input: PostgresConnectionInput;
  try {
    input = await resolvePostgresConnectionInput(userId, connectionId);
  } catch {
    return res.status(404).json({ success: false, error: 'Connection not found' });
  }
  if (!input.host || !input.username || !input.database) {
    return res.status(400).json({ success: false, error: 'Connection is missing host/username/database' });
  }

  const pool = buildPgPool(input);
  try {
    // Only preview tables that actually exist — don't build a query from an
    // arbitrary client-supplied table name.
    const known = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    if (known.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Table "${table}" not found` });
    }
    // Table name validated against the catalog above; quote it to be safe.
    const result = await pool.query(`SELECT * FROM "${table.replace(/"/g, '""')}" LIMIT ${PREVIEW_ROW_LIMIT_PG}`);
    const rows = result.rows as Record<string, unknown>[];
    const columns = result.fields.map((f) => f.name);
    res.json({ success: true, columns, rows });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message || 'Could not preview table' });
  } finally {
    await pool.end();
  }
}
