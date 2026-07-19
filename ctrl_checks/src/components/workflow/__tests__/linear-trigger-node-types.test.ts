import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Linear trigger node catalog', () => {
  it('includes Linear Trigger with team/resource/event/filter fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'linear_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'teamId',
      'allPublicTeams',
      'resourceTypes',
      'eventTypes',
      'issueId',
      'projectId',
      'actorId',
      'query',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('issueId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('commentBody');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('linear_trigger')).toBe(true);
    expect(getIntegrationLogo('linear_trigger')).toBe('/integrations-logos/Linear.svg');
  });

  it('keeps the existing Linear action node available and distinct', () => {
    const linearAction = NODE_TYPES.find((node) => node.type === 'linear');
    expect(linearAction).toBeTruthy();
    expect(linearAction?.category).not.toBe('triggers');
  });
});
