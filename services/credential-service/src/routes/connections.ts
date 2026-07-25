import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { queryDb } from '../lib/db';
import { encryptJson, decryptJson } from '../lib/crypto';
import { extractUserId, requireServiceKey } from '../middleware/auth';

const router = Router();

// ── Row mapper (never returns encrypted_credentials) ─────────────────────────

function mapRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    credentialTypeId: row.credential_type_id,
    provider: row.provider,
    authType: row.auth_type,
    status: row.status,
    metadata: row.metadata ?? {},
    expiresAt: row.expires_at,
    lastTestedAt: row.last_tested_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── GET /connections ──────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'USER_ID_REQUIRED',
      message: 'Provide x-user-id header or Authorization: Bearer <Cognito JWT>',
      ref: req.requestId,
    });
  }

  try {
    const rows = await queryDb(
      `SELECT id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
              expires_at, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1
         AND status <> 'revoked'
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY updated_at DESC`,
      [uid],
    );
    return res.json({ connections: rows.map(mapRow), source: 'credential-service' });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] list error:`, err?.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      code: 'DB_ERROR',
      ref: req.requestId,
    });
  }
});

// ── POST /connections ─────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'USER_ID_REQUIRED',
      ref: req.requestId,
    });
  }

  const {
    name,
    credentialTypeId,
    provider,
    authType,
    credentials,
    metadata,
    expiresAt,
  } = req.body ?? {};

  if (!name || !credentialTypeId || !provider || !authType) {
    return res.status(400).json({
      error: 'Bad Request',
      code: 'MISSING_FIELDS',
      message: 'name, credentialTypeId, provider, and authType are required',
      ref: req.requestId,
    });
  }

  try {
    const id = randomUUID();
    const encrypted = encryptJson(credentials ?? {});

    const rows = await queryDb(
      `INSERT INTO connections (
           id, user_id, name, credential_type_id, provider, auth_type,
           encrypted_credentials, status, metadata, expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8::jsonb, $9, NOW(), NOW())
         RETURNING id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
                   expires_at, last_tested_at, last_used_at, created_at, updated_at`,
      [
        id,
        uid,
        name,
        credentialTypeId,
        provider,
        authType,
        encrypted,
        JSON.stringify(metadata ?? {}),
        expiresAt ?? null,
      ],
    );

    return res.status(201).json({ connection: mapRow(rows[0]) });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] create error:`, err?.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      code: 'DB_ERROR',
      ref: req.requestId,
    });
  }
});

// ── GET /connections/:provider ────────────────────────────────────────────────

router.get('/:provider', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'USER_ID_REQUIRED',
      ref: req.requestId,
    });
  }

  const { provider } = req.params;

  try {
    const rows = await queryDb(
      `SELECT id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
              expires_at, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1
         AND provider = $2
         AND status <> 'revoked'
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY updated_at DESC
       LIMIT 1`,
      [uid, provider],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        code: 'CONNECTION_NOT_FOUND',
        provider,
        ref: req.requestId,
      });
    }

    return res.json({ connection: mapRow(rows[0]) });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] get-by-provider error:`, err?.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      code: 'DB_ERROR',
      ref: req.requestId,
    });
  }
});

// ── GET /connections/:id/decrypted ───────────────────────────────────────────
// Internal worker runtime endpoint. Normal connection metadata routes never
// return secret material; this route is service-key-only so execution can use
// credentials saved in the remote store without diverging from readiness.

router.get('/:id/decrypted', requireServiceKey, async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'USER_ID_REQUIRED',
      ref: req.requestId,
    });
  }

  const { id } = req.params;

  try {
    const rows = await queryDb(
      `SELECT id, user_id, name, credential_type_id, provider, auth_type, encrypted_credentials,
              status, metadata, expires_at, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE id = $1
         AND user_id = $2
         AND status <> 'revoked'
       LIMIT 1`,
      [id, uid],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', code: 'CONNECTION_NOT_FOUND', ref: req.requestId });
    }

    return res.json({
      connection: {
        ...mapRow(rows[0]),
        credentials: decryptJson(rows[0].encrypted_credentials),
      },
    });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] decrypted-by-id error:`, err?.message);
    return res.status(503).json({ error: 'Service Unavailable', code: 'DB_ERROR', ref: req.requestId });
  }
});

// ── PATCH /connections/:id — update by UUID (Phase 4) ────────────────────────

router.patch('/:id', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'USER_ID_REQUIRED', ref: req.requestId });
  }

  const { id } = req.params;
  const { name, credentials, metadata } = req.body ?? {};

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
  if (credentials !== undefined) { updates.push(`encrypted_credentials = $${idx++}`); values.push(encryptJson(credentials)); }
  if (metadata !== undefined) { updates.push(`metadata = $${idx++}::jsonb`); values.push(JSON.stringify(metadata)); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Bad Request', code: 'NO_FIELDS_TO_UPDATE', ref: req.requestId });
  }

  updates.push(`updated_at = NOW()`);
  values.push(id, uid);

  try {
    const rows = await queryDb(
      `UPDATE connections SET ${updates.join(', ')}
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
                 expires_at, last_tested_at, last_used_at, created_at, updated_at`,
      values,
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', code: 'CONNECTION_NOT_FOUND', ref: req.requestId });
    }
    return res.json({ connection: mapRow(rows[0]) });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] update-by-id error:`, err?.message);
    return res.status(503).json({ error: 'Service Unavailable', code: 'DB_ERROR', ref: req.requestId });
  }
});

// ── POST /connections/:id/test — test by UUID (Phase 4) ──────────────────────

router.post('/:id/test', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'USER_ID_REQUIRED', ref: req.requestId });
  }

  const { id } = req.params;

  try {
    const rows = await queryDb(
      `SELECT id, user_id, status, expires_at, encrypted_credentials, credential_type_id
       FROM connections WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, uid],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', code: 'CONNECTION_NOT_FOUND', ref: req.requestId });
    }

    const row = rows[0];
    const isExpired = row.expires_at && new Date(row.expires_at) < new Date();
    const hasCredentials = !!row.encrypted_credentials;

    await queryDb(
      `UPDATE connections SET last_tested_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, uid],
    );

    return res.json({
      success: row.status === 'active' && !isExpired && hasCredentials,
      connectionId: row.id,
      status: row.status,
      expired: isExpired,
      testedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] test-by-id error:`, err?.message);
    return res.status(503).json({ error: 'Service Unavailable', code: 'DB_ERROR', ref: req.requestId });
  }
});

// ── DELETE /connections/:id — delete by UUID (Phase 4) ───────────────────────
// Also handles provider-name deletes for backwards compat (worker fallback).
// UUID pattern: 8-4-4-4-12 hex chars; anything else is treated as provider name.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.delete('/:idOrProvider', async (req: Request, res: Response) => {
  const uid = extractUserId(req);
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'USER_ID_REQUIRED', ref: req.requestId });
  }

  const { idOrProvider } = req.params;

  try {
    if (UUID_RE.test(idOrProvider)) {
      await queryDb(`DELETE FROM connections WHERE id = $1 AND user_id = $2`, [idOrProvider, uid]);
    } else {
      await queryDb(`DELETE FROM connections WHERE user_id = $1 AND provider = $2`, [uid, idOrProvider]);
    }
    return res.status(204).send();
  } catch (err: any) {
    console.error(`[${req.requestId}] [connections] delete error:`, err?.message);
    return res.status(503).json({ error: 'Service Unavailable', code: 'DB_ERROR', ref: req.requestId });
  }
});

export default router;
