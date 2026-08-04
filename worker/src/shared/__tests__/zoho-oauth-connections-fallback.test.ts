import { getZohoCredentials } from '../zoho-oauth';
import * as credentialResolver from '../../services/credential-resolver';

jest.mock('../../services/credential-resolver');

function makeLegacyDbStub(): any {
  // Mimics the chainable `.from().select().eq().eq().single()` shape used by the
  // legacy zoho_oauth_tokens lookup, always reporting "no row found".
  const chain: any = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: null }),
  };
  return chain;
}

describe('getZohoCredentials — unified credential resolver fallback', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...OLD_ENV, ZOHO_CLIENT_ID: 'live-client-id', ZOHO_CLIENT_SECRET: 'live-client-secret' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('falls back to resolveCredential() (unified_credentials, with auto-refresh) when the legacy zoho_oauth_tokens row is missing', async () => {
    // Regression test, two layers deep:
    // 1) The standard "Connect Zoho" OAuth flow (the same generic credential-type-registry.ts
    //    system every other OAuth provider uses) writes to unified_credentials/connections,
    //    never to the legacy zoho_oauth_tokens table this function originally only checked —
    //    so a genuinely connected account was reported as "not connected" at execution time.
    // 2) The first fix read connections.credentials.access_token directly, which is the raw
    //    token from the original OAuth grant and is never updated when the token is refreshed
    //    elsewhere (refreshes land in unified_credentials) — Zoho immediately rejected it with
    //    "invalid oauth token" (401) on the very first live call. Using the canonical
    //    resolveCredential(), which auto-refreshes an expiring token before returning it, is
    //    what every other OAuth provider in this codebase already relies on.
    (credentialResolver.resolveCredential as jest.Mock).mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'zoho',
      scopes: [],
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: null,
      source: 'unified_credentials',
    });

    const result = await getZohoCredentials(makeLegacyDbStub(), {}, 'user-1');

    expect(result).toEqual({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      clientId: 'live-client-id',
      clientSecret: 'live-client-secret',
      region: 'US',
    });
  });

  it('returns null when neither the legacy table nor resolveCredential() has anything', async () => {
    (credentialResolver.resolveCredential as jest.Mock).mockRejectedValue(new Error('not found'));

    const result = await getZohoCredentials(makeLegacyDbStub(), {}, 'user-1');

    expect(result).toBeNull();
  });
});
