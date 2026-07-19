import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('GitHub trigger node catalog', () => {
  it('includes GitHub Trigger with owner/repo/eventTypes fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'github_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['owner', 'repo', 'eventTypes', 'webhookSecret', 'query']);
    expect(trigger?.configFields.find((field) => field.key === 'webhookSecret')?.type).toBe('text');
    const outputGuide = trigger?.usageGuide?.outputs.join(' ') || '';
    expect(outputGuide).toContain('eventType');
    expect(outputGuide).toContain('issueTitle');
    expect(outputGuide).toContain('prTitle');
    expect(outputGuide).toContain('commentBody');
    expect(outputGuide).toContain('sessionId');
    expect(outputGuide).toContain('_github');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('github_trigger')).toBe(true);
    expect(getIntegrationLogo('github_trigger')).toBe('/integrations-logos/Github.svg');
  });

  it('keeps the existing GitHub action node available and distinct', () => {
    const githubAction = NODE_TYPES.find((node) => node.type === 'github');
    expect(githubAction).toBeTruthy();
    expect(githubAction?.category).not.toBe('triggers');
  });
});
