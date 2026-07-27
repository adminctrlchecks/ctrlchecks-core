import type { Response } from 'express';
import { tierRateLimit } from '../tier-rate-limit';
import { isUnlimitedModeEnabled } from '../../../services/system-settings-service';
import type { AuthenticatedRequest } from '../subscription-auth';

jest.mock('../../../services/system-settings-service', () => ({
  isUnlimitedModeEnabled: jest.fn(),
}));

const mockUnlimited = isUnlimitedModeEnabled as jest.MockedFunction<typeof isUnlimitedModeEnabled>;

function buildReq(): Partial<AuthenticatedRequest> {
  return {
    ip: '127.0.0.1',
    user: { id: 'user-123', email: 'user@example.com', role: 'user', subscriptionPlan: 'Free' } as any,
  };
}

function buildRes(): Partial<Response> {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('tierRateLimit — unlimited mode bypass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL; // force the in-memory limiter path
  });

  it('skips plan-tier throttling entirely when unlimited mode is on', async () => {
    mockUnlimited.mockResolvedValue(true);
    const middleware = tierRateLimit('generate');

    // Free tier normally allows 20 generate calls per minute; go well past it.
    for (let i = 0; i < 40; i += 1) {
      const res = buildRes();
      const next = jest.fn();
      await middleware(buildReq() as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'unlimited');
    }
  });

  it('still enforces the free-tier cap when unlimited mode is off', async () => {
    mockUnlimited.mockResolvedValue(false);
    const middleware = tierRateLimit('generate');
    let blocked = false;

    for (let i = 0; i < 40; i += 1) {
      const res = buildRes();
      const next = jest.fn();
      await middleware(buildReq() as AuthenticatedRequest, res as Response, next);
      if ((res.status as jest.Mock).mock.calls.length > 0) {
        expect(res.status).toHaveBeenCalledWith(429);
        blocked = true;
        break;
      }
    }

    expect(blocked).toBe(true);
  });
});
