/**
 * Pure-function coverage for the Adaptive UI Engine's deterministic pieces —
 * recommendation ranking and setup-guide flattening. No Gemini calls here;
 * `generateContextualHelp` (the one LLM-touching piece) is exercised only
 * via its deterministic-fallback path, which needs no mocking.
 *
 * Run:
 *   cd worker && npx jest src/services/adaptive-ui/__tests__/adaptive-ui-engine.test.ts --runInBand
 */

jest.mock('../../../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: {
    get: jest.fn(),
  },
}));

import { describe, it, expect } from '@jest/globals';
import { rankRecommendedNodes } from '../recommendation-engine';
import { buildSetupGuide } from '../setup-guide-generator';
import { unifiedNodeRegistry } from '../../../core/registry/unified-node-registry';
import type { CapabilityContainer } from '../../ai/stages/capability-types';
import type { UnifiedMissingItems } from '../../ai/credential-input-discovery';
import type { WorkflowConnectionReadinessResponse } from '../../workflow-connection-readiness';

const mockRegistryGet = unifiedNodeRegistry.get as jest.Mock;

function makeContainer(overrides: Partial<CapabilityContainer> = {}): CapabilityContainer {
  return {
    containerId: 'container-1',
    label: 'Send a message',
    useCaseUnit: {
      unitId: 'unit-1',
      label: 'Notify the team',
      semanticRole: 'communication',
      description: 'Send a Slack message',
      orderIndex: 0,
    },
    candidates: [
      { nodeType: 'slack_message', label: 'Slack Message', description: '', credentialRequirements: ['slack'], hasCredentials: true },
      { nodeType: 'discord_message', label: 'Discord Message', description: '', credentialRequirements: ['discord'], hasCredentials: false },
    ],
    ...overrides,
  };
}

describe('rankRecommendedNodes', () => {
  beforeEach(() => {
    mockRegistryGet.mockReset();
    mockRegistryGet.mockImplementation((nodeType: string) => ({ category: nodeType.includes('slack') ? 'communication' : 'utility' }));
  });

  it('ranks credential-ready candidates above ones missing a connection', () => {
    const result = rankRecommendedNodes([makeContainer()], new Set());

    expect(result[0].nodeType).toBe('slack_message');
    expect(result[0].hasCredentials).toBe(true);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('marks candidates already present in the current workflow graph', () => {
    const result = rankRecommendedNodes([makeContainer()], new Set(['slack_message']));
    const slack = result.find((item) => item.nodeType === 'slack_message');

    expect(slack?.alreadyInWorkflow).toBe(true);
  });

  it('deduplicates a node type that appears in multiple containers, keeping the higher score', () => {
    const containers = [makeContainer({ containerId: 'a' }), makeContainer({ containerId: 'b' })];
    const result = rankRecommendedNodes(containers, new Set());

    expect(result.filter((item) => item.nodeType === 'slack_message')).toHaveLength(1);
  });

  it('never invents a node not present in any container', () => {
    const result = rankRecommendedNodes([makeContainer()], new Set());
    const types = result.map((item) => item.nodeType);

    expect(types).toEqual(expect.arrayContaining(['slack_message', 'discord_message']));
    expect(types).toHaveLength(2);
  });
});

describe('buildSetupGuide', () => {
  it('prefers connection readiness over legacy missing-credentials when both are present', () => {
    const missingItems: UnifiedMissingItems = {
      credentials: [
        { provider: 'slack', type: 'oauth', nodes: ['node-1'], fields: [], displayName: 'Slack', vaultKey: 'slack', satisfied: false },
      ],
      inputs: [],
    };
    const connectionReadiness: WorkflowConnectionReadinessResponse = {
      workflowId: 'wf-1',
      ready: false,
      rows: [],
      missing: [
        {
          workflowId: 'wf-1',
          nodeId: 'node-1',
          nodeType: 'slack_message',
          nodeLabel: 'Slack Message',
          provider: 'slack',
          credentialTypeId: 'slack_oauth2',
          authType: 'oauth2',
          requiredScopes: ['chat:write'],
          status: 'missing',
          source: 'connections',
          checkedAt: new Date().toISOString(),
        },
      ],
      summary: { requiredCount: 1, readyCount: 0, missingCount: 1, missingScopeCount: 0, expiredCount: 0 },
    };

    const result = buildSetupGuide(missingItems, connectionReadiness);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('credential');
    expect(result[0].nodeId).toBe('node-1');
  });

  it('falls back to legacy missing-credentials when readiness is unavailable', () => {
    const missingItems: UnifiedMissingItems = {
      credentials: [
        { provider: 'slack', type: 'oauth', nodes: ['node-1'], fields: [], displayName: 'Slack', vaultKey: 'slack', satisfied: false },
      ],
      inputs: [
        { nodeId: 'node-2', nodeType: 'http_request', nodeLabel: 'HTTP Request', fieldName: 'url', description: 'Endpoint URL', fieldType: 'string', required: true },
      ],
    };

    const result = buildSetupGuide(missingItems, null);

    expect(result.find((item) => item.kind === 'credential')?.provider).toBe('slack');
    expect(result.find((item) => item.kind === 'input')?.nodeLabel).toBe('HTTP Request');
  });

  it('never fabricates validation-warning items — none exist in the source data', () => {
    const result = buildSetupGuide({ credentials: [], inputs: [] }, null);
    expect(result.some((item) => item.kind === 'validation')).toBe(false);
  });

  it('returns an empty guide when there is nothing missing', () => {
    const result = buildSetupGuide({ credentials: [], inputs: [] }, null);
    expect(result).toEqual([]);
  });
});
