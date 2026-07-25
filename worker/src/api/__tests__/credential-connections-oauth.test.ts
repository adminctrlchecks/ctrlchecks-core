import { oauthCallbackHandler, oauthReconnectHandler } from '../credential-connections';
import { connectionService } from '../../credentials-system/connection-service';
import { oauthService } from '../../credentials-system/oauth-service';
import { getCacheRedisClient, invalidateMissingItemsCache } from '../../middleware/redisGetCache';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    getDecryptedConnection: jest.fn(),
  },
}));

jest.mock('../../credentials-system/oauth-service', () => ({
  oauthService: {
    callback: jest.fn(),
    start: jest.fn(),
  },
}));

jest.mock('../../middleware/redisGetCache', () => ({
  getCacheRedisClient: jest.fn(),
  invalidateMissingItemsCache: jest.fn(),
  invalidateAllMissingItemsCaches: jest.fn(),
}));

describe('credential connection OAuth reconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards workflow-required scopes into the reconnect OAuth start', async () => {
    (connectionService.getDecryptedConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      credentialTypeId: 'google_oauth2',
    });
    (oauthService.start as jest.Mock).mockResolvedValue({
      authorizationUrl: 'https://oauth.example/start',
      state: 'state-1',
    });

    const req = {
      user: { id: 'user-1' },
      params: { id: 'conn-1' },
      query: {},
      body: {
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        returnTo: 'https://ctrlchecks.ai/connections?returnTo=%2Fworkflow%2Fwf-1',
      },
      headers: {},
    } as any;
    const res = {
      json: jest.fn(),
    } as any;

    await oauthReconnectHandler(req, res);

    expect(connectionService.getDecryptedConnection).toHaveBeenCalledWith('user-1', 'conn-1');
    expect(oauthService.start).toHaveBeenCalledWith({
      userId: 'user-1',
      credentialTypeId: 'google_oauth2',
      connectionId: 'conn-1',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      returnTo: 'https://ctrlchecks.ai/connections?returnTo=%2Fworkflow%2Fwf-1',
    });
    expect(res.json).toHaveBeenCalledWith({
      authorizationUrl: 'https://oauth.example/start',
      state: 'state-1',
    });
  });

  it('invalidates workflow readiness cache when workflow returnTo is nested on the Connections page', async () => {
    const redis = { ok: true };
    (oauthService.callback as jest.Mock).mockResolvedValue({
      connectionId: 'conn-1',
      returnTo: 'https://ctrlchecks.ai/connections?returnTo=%2Fworkflow%2F2853dee8-ad93-4f13-9b20-3b14dd908529',
    });
    (getCacheRedisClient as jest.Mock).mockResolvedValue(redis);
    (invalidateMissingItemsCache as jest.Mock).mockResolvedValue(undefined);

    const req = {
      method: 'GET',
      query: { code: 'code-1', state: 'state-1' },
      body: {},
    } as any;
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await oauthCallbackHandler(req, res);
    await new Promise(resolve => setImmediate(resolve));

    expect(getCacheRedisClient).toHaveBeenCalled();
    expect(invalidateMissingItemsCache).toHaveBeenCalledWith('2853dee8-ad93-4f13-9b20-3b14dd908529', redis);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('oauth-success'));
  });
});
