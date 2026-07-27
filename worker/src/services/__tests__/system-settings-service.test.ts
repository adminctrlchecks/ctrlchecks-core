import { queryAsService } from '../../core/database/db-pool';
import {
  clearSystemSettingsCache,
  getUnlimitedMode,
  isUnlimitedModeEnabled,
  setUnlimitedMode,
} from '../system-settings-service';

jest.mock('../../core/database/db-pool', () => ({
  queryAsService: jest.fn(),
}));

jest.mock('../../core/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockQuery = queryAsService as jest.MockedFunction<typeof queryAsService>;

describe('system-settings-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSystemSettingsCache();
  });

  describe('isUnlimitedModeEnabled', () => {
    it('returns false when the setting row is missing', async () => {
      mockQuery.mockResolvedValueOnce([]);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(false);
    });

    it('returns true when the stored value is enabled', async () => {
      mockQuery.mockResolvedValueOnce([{ value: { enabled: true }, updated_at: null, updated_by: null }]);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(true);
    });

    it('parses a JSON string value (driver-dependent jsonb shape)', async () => {
      mockQuery.mockResolvedValueOnce([{ value: '{"enabled":true}', updated_at: null, updated_by: null }]);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(true);
    });

    it('fails closed when the database read throws', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));
      await expect(isUnlimitedModeEnabled()).resolves.toBe(false);
    });

    it('caches the result so repeated gate checks do not hit the database', async () => {
      mockQuery.mockResolvedValueOnce([{ value: { enabled: true }, updated_at: null, updated_by: null }]);

      await isUnlimitedModeEnabled();
      await isUnlimitedModeEnabled();
      await isUnlimitedModeEnabled();

      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed read', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));
      mockQuery.mockResolvedValueOnce([{ value: { enabled: true }, updated_at: null, updated_by: null }]);

      await expect(isUnlimitedModeEnabled()).resolves.toBe(false);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(true);
    });
  });

  describe('setUnlimitedMode', () => {
    it('persists the flag and invalidates the cache so the next read is fresh', async () => {
      // Seed the cache with "off"
      mockQuery.mockResolvedValueOnce([{ value: { enabled: false }, updated_at: null, updated_by: null }]);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(false);

      mockQuery.mockResolvedValueOnce([
        { value: { enabled: true }, updated_at: '2026-07-27T00:00:00.000Z', updated_by: 'admin-1' },
      ]);
      const setting = await setUnlimitedMode(true, 'admin-1');
      expect(setting.enabled).toBe(true);

      // Cache was dropped, so this triggers a fresh read rather than serving "off"
      mockQuery.mockResolvedValueOnce([{ value: { enabled: true }, updated_at: null, updated_by: null }]);
      await expect(isUnlimitedModeEnabled()).resolves.toBe(true);
    });
  });

  describe('getUnlimitedMode', () => {
    it('returns audit metadata alongside the flag', async () => {
      mockQuery.mockResolvedValueOnce([
        { value: { enabled: true }, updated_at: '2026-07-27T00:00:00.000Z', updated_by: 'admin-1' },
      ]);

      await expect(getUnlimitedMode()).resolves.toEqual({
        enabled: true,
        updatedAt: '2026-07-27T00:00:00.000Z',
        updatedBy: 'admin-1',
      });
    });

    it('reports disabled with null metadata when no row exists', async () => {
      mockQuery.mockResolvedValueOnce([]);
      await expect(getUnlimitedMode()).resolves.toEqual({
        enabled: false,
        updatedAt: null,
        updatedBy: null,
      });
    });
  });
});
