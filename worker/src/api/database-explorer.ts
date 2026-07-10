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
