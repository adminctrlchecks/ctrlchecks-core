import { AuthInjectionEngine } from '../execution-auth';
import type { DecryptedConnection } from '../types';

const baseConnection: DecryptedConnection = {
  id: 'conn-1',
  userId: 'user-1',
  name: 'Test Token',
  credentialTypeId: 'bearer_token',
  provider: 'generic',
  authType: 'bearer_token',
  status: 'active',
  metadata: {},
  expiresAt: null,
  lastTestedAt: null,
  lastUsedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  credentials: { token: 'abc123' },
};

describe('AuthInjectionEngine', () => {
  it('injects bearer token credentials into request headers', async () => {
    const marks: string[] = [];
    const engine = new AuthInjectionEngine({
      getDecryptedConnection: jest.fn().mockResolvedValue(baseConnection),
      markUsed: jest.fn().mockImplementation(async (_userId: string, id: string) => {
        marks.push(id);
      }),
    } as any);

    const request = await engine.injectIntoRequest(
      { userId: 'user-1', nodeId: 'n1', nodeType: 'http_request', connectionId: 'conn-1' },
      { method: 'GET', url: 'https://api.example.test/items', headers: { Accept: 'application/json' } },
    );

    expect(request.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer abc123',
    });
    expect(marks).toEqual(['conn-1']);
  });

  it('injects query auth into URL search params', async () => {
    const engine = new AuthInjectionEngine({
      getDecryptedConnection: jest.fn().mockResolvedValue({
        ...baseConnection,
        credentialTypeId: 'query_auth',
        authType: 'query_auth',
        credentials: { queryName: 'api_key', queryValue: 'xyz' },
      }),
      markUsed: jest.fn(),
    } as any);

    const request = await engine.injectIntoRequest(
      { userId: 'user-1', nodeId: 'n1', nodeType: 'http_request', connectionId: 'conn-1' },
      { method: 'GET', url: 'https://api.example.test/items?existing=1' },
    );

    expect(request.url).toBe('https://api.example.test/items?existing=1&api_key=xyz');
  });

  it('renders saved credential fields in request URL, headers, query, and body', async () => {
    const engine = new AuthInjectionEngine({
      getDecryptedConnection: jest.fn().mockResolvedValue({
        ...baseConnection,
        credentialTypeId: 'shopify_api_key',
        provider: 'shopify',
        credentials: {
          storeUrl: 'ctrlchecks-test.myshopify.com',
          token: 'shpat_test',
          shop: 'ctrlchecks-test',
        },
      }),
      markUsed: jest.fn(),
    } as any);

    const request = await engine.injectIntoRequest(
      { userId: 'user-1', nodeId: 'n1', nodeType: 'shopify', connectionId: 'conn-1' },
      {
        method: 'POST',
        url: 'https://{{storeUrl}}/admin/api/2025-10/shop.json',
        headers: { 'X-Shop': '{{shop}}' },
        query: { source: '{{shop}}' },
        body: { shop: '{{shop}}' },
      },
    );

    expect(request.url).toBe('https://ctrlchecks-test.myshopify.com/admin/api/2025-10/shop.json?source=ctrlchecks-test');
    expect(request.headers).toMatchObject({
      'X-Shop': 'ctrlchecks-test',
      'X-Shopify-Access-Token': 'shpat_test',
    });
    expect(request.body).toEqual({ shop: 'ctrlchecks-test' });
  });

  it('injects Bitbucket Basic Auth from username + appPassword', async () => {
    // Regression test: the registry's injection rule for bitbucket_app_password used to be
    // `{ target: 'header', valueTemplate: 'Basic {{base64({{username}}:{{appPassword}})}}' }`.
    // renderTemplate() has no base64() function and can't parse nested {{...}} — it silently
    // produced a garbage, non-base64 Authorization header, so the "Test Bitbucket" connection
    // button always failed even with valid credentials. Fixed by using the engine's real
    // `target: 'basic_auth'` mode, which actually base64-encodes the rendered template.
    const engine = new AuthInjectionEngine({
      getDecryptedConnection: jest.fn().mockResolvedValue({
        ...baseConnection,
        credentialTypeId: 'bitbucket_app_password',
        provider: 'bitbucket',
        authType: 'basic_auth',
        credentials: { username: 'someone@example.com', appPassword: 'secret-app-password' },
      }),
      markUsed: jest.fn(),
    } as any);

    const request = await engine.injectIntoRequest(
      { userId: 'user-1', nodeId: 'n1', nodeType: 'bitbucket', connectionId: 'conn-1' },
      { method: 'GET', url: 'https://api.bitbucket.org/2.0/user' },
    );

    const expected = `Basic ${Buffer.from('someone@example.com:secret-app-password').toString('base64')}`;
    expect(request.headers?.Authorization).toBe(expected);
  });

  it('injects Zendesk Basic Auth from username/token + apiToken', async () => {
    const engine = new AuthInjectionEngine({
      getDecryptedConnection: jest.fn().mockResolvedValue({
        ...baseConnection,
        credentialTypeId: 'zendesk_api',
        provider: 'zendesk',
        authType: 'basic_auth',
        credentials: { subdomain: 'acme', username: 'agent@example.com', apiToken: 'zd-token' },
      }),
      markUsed: jest.fn(),
    } as any);

    const request = await engine.injectIntoRequest(
      { userId: 'user-1', nodeId: 'n1', nodeType: 'zendesk', connectionId: 'conn-1' },
      { method: 'GET', url: 'https://acme.zendesk.com/api/v2/users/me.json' },
    );

    const expected = `Basic ${Buffer.from('agent@example.com/token:zd-token').toString('base64')}`;
    expect(request.headers?.Authorization).toBe(expected);
  });
});
