/**
 * Connections route tests — real CRUD handlers with mocked DB and crypto.
 * No real database or encryption key needed.
 */

// ─── Mock DB ──────────────────────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('../lib/db', () => ({
  getDb: jest.fn().mockResolvedValue({ query: mockQuery }),
  queryDb: jest.fn(),
}));

// ─── Mock crypto (avoid needing real CREDENTIAL_ENCRYPTION_KEY) ───────────────
jest.mock('../lib/crypto', () => ({
  encryptJson: jest.fn(() => 'v1:mocked-encrypted'),
  decryptJson: jest.fn(() => ({ token: '[DECRYPTED]' })),
  maskSecrets: jest.fn((v: unknown) => v),
}));

import request from 'supertest';

// Override queryDb to use mockQuery so tests control rows returned
const { queryDb } = jest.requireMock('../lib/db') as { queryDb: jest.Mock };

process.env.CREDENTIAL_SERVICE_KEY = '';

import app from '../index';

const MOCK_ROW = {
  id: 'conn-uuid-1',
  user_id: 'user-123',
  name: 'My Google',
  credential_type_id: 'google_oauth',
  provider: 'google',
  auth_type: 'oauth2',
  status: 'active',
  metadata: {},
  expires_at: null,
  last_tested_at: null,
  last_used_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  queryDb.mockResolvedValue([]);
});

describe('GET /connections', () => {
  it('returns empty list when DB returns no rows', async () => {
    queryDb.mockResolvedValue([]);
    const res = await request(app)
      .get('/connections')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(200);
    expect(res.body.connections).toEqual([]);
    expect(res.body.source).toBe('credential-service');
  });

  it('returns mapped connections from DB rows', async () => {
    queryDb.mockResolvedValue([MOCK_ROW]);
    const res = await request(app)
      .get('/connections')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(200);
    expect(res.body.connections).toHaveLength(1);
    expect(res.body.connections[0].id).toBe('conn-uuid-1');
    expect(res.body.connections[0].provider).toBe('google');
    // Encrypted credentials must NOT appear in the response
    expect(JSON.stringify(res.body)).not.toContain('encrypted_credentials');
    expect(JSON.stringify(res.body)).not.toContain('v1:mocked-encrypted');
  });

  it('returns 401 when no user identity is provided', async () => {
    const res = await request(app).get('/connections');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('USER_ID_REQUIRED');
  });

  it('extracts user ID from JWT sub when x-user-id absent', async () => {
    queryDb.mockResolvedValue([]);
    // JWT with sub=user-from-jwt (header.payload.sig — payload is base64url JSON)
    const payload = Buffer.from(JSON.stringify({ sub: 'user-from-jwt' })).toString('base64url');
    const fakeJwt = `header.${payload}.sig`;
    const res = await request(app)
      .get('/connections')
      .set('Authorization', `Bearer ${fakeJwt}`);
    expect(res.status).toBe(200);
    // queryDb should have been called with the decoded userId
    expect(queryDb).toHaveBeenCalledWith(expect.any(String), ['user-from-jwt']);
  });

  it('returns 503 when DB throws', async () => {
    queryDb.mockRejectedValue(new Error('connection refused'));
    const res = await request(app)
      .get('/connections')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DB_ERROR');
  });
});

describe('POST /connections', () => {
  it('creates a connection and returns 201 with the mapped row', async () => {
    queryDb.mockResolvedValue([MOCK_ROW]);
    const res = await request(app)
      .post('/connections')
      .set('x-user-id', 'user-123')
      .send({
        name: 'My Google',
        credentialTypeId: 'google_oauth',
        provider: 'google',
        authType: 'oauth2',
        credentials: { token: 'secret-token' },
      });
    expect(res.status).toBe(201);
    expect(res.body.connection.provider).toBe('google');
    // Response must not leak the plaintext credentials
    expect(JSON.stringify(res.body)).not.toContain('secret-token');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/connections')
      .set('x-user-id', 'user-123')
      .send({ name: 'Test' }); // missing credentialTypeId, provider, authType
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELDS');
  });

  it('returns 401 without user identity', async () => {
    const res = await request(app).post('/connections').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('GET /connections/:provider', () => {
  it('returns the connection when found', async () => {
    queryDb.mockResolvedValue([MOCK_ROW]);
    const res = await request(app)
      .get('/connections/google')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(200);
    expect(res.body.connection.provider).toBe('google');
  });

  it('returns 404 when provider not found', async () => {
    queryDb.mockResolvedValue([]);
    const res = await request(app)
      .get('/connections/unknown-provider')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONNECTION_NOT_FOUND');
  });

  it('returns 401 without user identity', async () => {
    const res = await request(app).get('/connections/google');
    expect(res.status).toBe(401);
  });
});

describe('GET /connections/:id/decrypted', () => {
  it('returns decrypted credentials for worker runtime service-key calls', async () => {
    queryDb.mockResolvedValue([{ ...MOCK_ROW, encrypted_credentials: 'v1:encrypted-secret' }]);
    const res = await request(app)
      .get('/connections/conn-uuid-1/decrypted')
      .set('x-user-id', 'user-123')
      .set('x-service-key', 'test-service-key');

    expect(res.status).toBe(200);
    expect(res.body.connection.id).toBe('conn-uuid-1');
    expect(res.body.connection.credentials).toEqual({ token: '[DECRYPTED]' });
  });

  it('returns 404 when the runtime connection does not exist', async () => {
    queryDb.mockResolvedValue([]);
    const res = await request(app)
      .get('/connections/missing/decrypted')
      .set('x-user-id', 'user-123')
      .set('x-service-key', 'test-service-key');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONNECTION_NOT_FOUND');
  });
});

describe('DELETE /connections/:provider', () => {
  it('returns 204 on successful delete', async () => {
    queryDb.mockResolvedValue([]);
    const res = await request(app)
      .delete('/connections/google')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(204);
  });

  it('returns 401 without user identity', async () => {
    const res = await request(app).delete('/connections/google');
    expect(res.status).toBe(401);
  });

  it('returns 503 when DB throws', async () => {
    queryDb.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .delete('/connections/google')
      .set('x-user-id', 'user-123');
    expect(res.status).toBe(503);
  });
});

describe('Response shape — no secrets in output', () => {
  it('connections list response never contains encrypted_credentials field', async () => {
    queryDb.mockResolvedValue([{ ...MOCK_ROW, encrypted_credentials: 'v1:secret' }]);
    const res = await request(app)
      .get('/connections')
      .set('x-user-id', 'user-123');
    expect(res.body).not.toHaveProperty('encrypted_credentials');
    expect(JSON.stringify(res.body)).not.toContain('v1:secret');
  });
});
