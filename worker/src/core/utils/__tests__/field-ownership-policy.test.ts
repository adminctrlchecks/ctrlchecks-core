import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../registry/unified-node-registry', () => ({
  unifiedNodeRegistry: { get: jest.fn() },
}));

jest.mock('../credential-field-vault-meta', () => ({
  getCredentialVaultMetaForField: jest.fn(),
}));

import { unifiedNodeRegistry } from '../../registry/unified-node-registry';
import { getCredentialVaultMetaForField } from '../credential-field-vault-meta';
import { resolveFieldOwnershipPolicy } from '../field-ownership-policy';

const registryGet = unifiedNodeRegistry.get as jest.Mock;
const getVaultMeta = getCredentialVaultMetaForField as jest.Mock;

describe('resolveFieldOwnershipPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps registry value ownership even when connector vault metadata exists', () => {
    registryGet.mockReturnValue({
      inputSchema: {
        destination: {
          type: 'string',
          description: 'Destination',
          required: false,
          ownership: 'value',
          fillMode: {
            default: 'manual_static',
            supportsRuntimeAI: false,
            supportsBuildtimeAI: false,
          },
        },
      },
    });
    getVaultMeta.mockReturnValue({ vaultKey: 'connector', credentialId: 'connector' });

    const policy = resolveFieldOwnershipPolicy('generic_connector', 'destination', {});

    expect(policy?.ownership).toBe('value');
    expect(policy?.isVaultCredential).toBe(false);
    expect(getVaultMeta).not.toHaveBeenCalled();
  });

  it('coerces an unsupported AI runtime selection through registry policy', () => {
    registryGet.mockReturnValue({
      inputSchema: {
        rules: {
          type: 'array',
          description: 'Rules',
          required: true,
          ownership: 'structural',
          fillMode: {
            default: 'buildtime_ai_once',
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        },
      },
    });

    const policy = resolveFieldOwnershipPolicy('generic_branch', 'rules', {
      _fillMode: { rules: 'runtime_ai' },
    });

    expect(policy?.fillMode).toBe('buildtime_ai_once');
    expect(policy?.mode).toBe('ai_built');
    expect(policy?.supportsRuntimeAI).toBe(false);
  });

  it('prevents locked credentials from becoming AI-owned', () => {
    registryGet.mockReturnValue({
      inputSchema: {
        secret: {
          type: 'string',
          description: 'Secret',
          required: true,
          ownership: 'credential',
          fillMode: {
            default: 'manual_static',
            supportsRuntimeAI: true,
            supportsBuildtimeAI: true,
          },
        },
      },
    });
    getVaultMeta.mockReturnValue({ vaultKey: 'generic', credentialId: 'generic' });

    const policy = resolveFieldOwnershipPolicy('generic_connector', 'secret', {
      _fillMode: { secret: 'runtime_ai' },
    });

    expect(policy?.fillMode).toBe('manual_static');
    expect(policy?.isLocked).toBe(true);
    expect(policy?.isVaultCredential).toBe(true);
  });
});
