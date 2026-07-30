/**
 * OAuth callback — a failure must be delivered to the origin that started the flow.
 *
 * The callback redirects the popup to a same-origin relay derived from `returnTo`. The error
 * path used to omit `returnTo`, so every failure fell back to FRONTEND_URL. Anyone who started
 * the flow from a different origin — a local dev server, or any provider whose redirect URI
 * points at another deployment — was never told the attempt failed and simply watched a
 * spinner until it timed out. That swallowed OAuth failures for every provider, in production
 * as well as locally.
 */

import { oauthCallbackHandler } from '../credential-connections';
import { oauthService } from '../../credentials-system/oauth-service';

jest.mock('../../credentials-system/oauth-service', () => {
  const actual = jest.requireActual('../../credentials-system/oauth-service');
  return {
    // returnToFromError is the real implementation — it is part of what we are testing.
    returnToFromError: actual.returnToFromError,
    oauthService: { callback: jest.fn() },
  };
});

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: { listCredentialTypes: jest.fn(() => []), getDecryptedConnection: jest.fn() },
}));

jest.mock('../../services/canonical-credential-lookup', () => ({
  listCanonicalConnections: jest.fn(async () => ({ connections: [], source: 'connections' })),
  canonicalProvider: (p: string) => String(p || '').toLowerCase(),
}));

jest.mock('../../core/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockedCallback = oauthService.callback as jest.MockedFunction<typeof oauthService.callback>;

function makeRes() {
  const res: any = {};
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq() {
  return { method: 'GET', query: { code: 'c', state: 's' }, body: {} } as any;
}

const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FRONTEND_URL = 'https://www.ctrlchecks.ai';
});

afterAll(() => {
  process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL;
});

/** The relay href the popup is redirected to. */
function relayHref(res: ReturnType<typeof makeRes>): string {
  const html = res.send.mock.calls[0][0] as string;
  const match = html.match(/window\.location\.replace\("([^"]+)"\)/);
  if (!match) throw new Error(`no relay redirect in: ${html}`);
  return match[1];
}

describe('OAuth callback failure routing', () => {
  it('sends the failure back to the origin that started the flow', async () => {
    const error = Object.assign(new Error('invalid_grant'), {
      returnTo: 'http://localhost:8080/workflow/ai',
    });
    mockedCallback.mockRejectedValue(error);
    const res = makeRes();

    await oauthCallbackHandler(makeReq(), res);

    const href = relayHref(res);
    expect(new URL(href).origin).toBe('http://localhost:8080');
    expect(href).toContain('/auth/oauth-relay');
    expect(href).toContain('type=oauth-error');
  });

  it('falls back to FRONTEND_URL only when the origin is genuinely unknowable', async () => {
    // No state row was found, so there is no return_to to recover.
    mockedCallback.mockRejectedValue(new Error('Invalid or expired OAuth state'));
    const res = makeRes();

    await oauthCallbackHandler(makeReq(), res);

    expect(new URL(relayHref(res)).origin).toBe('https://www.ctrlchecks.ai');
  });

  it('still routes a success to the origin that started the flow', async () => {
    mockedCallback.mockResolvedValue({
      connectionId: 'conn-1',
      returnTo: 'http://localhost:8080/workflow/ai',
    } as any);
    const res = makeRes();

    await oauthCallbackHandler(makeReq(), res);

    const href = relayHref(res);
    expect(new URL(href).origin).toBe('http://localhost:8080');
    expect(href).toContain('type=oauth-success');
  });

  it('surfaces the provider error rather than a generic spinner', async () => {
    mockedCallback.mockRejectedValue(
      Object.assign(new Error('invalid_grant'), { returnTo: 'http://localhost:8080/workflow/ai' }),
    );
    const res = makeRes();

    await oauthCallbackHandler(makeReq(), res);

    // The user-facing message must say something actionable, not nothing at all.
    expect(decodeURIComponent(relayHref(res))).toMatch(/message=.+/);
  });
});
