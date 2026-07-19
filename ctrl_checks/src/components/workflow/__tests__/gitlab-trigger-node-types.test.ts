import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('GitLab trigger node catalog', () => {
  it('includes GitLab Trigger with baseUrl/projectId/eventTypes fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'gitlab_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['baseUrl', 'projectId', 'eventTypes', 'secretToken', 'query']);
    expect(trigger?.configFields.find((field) => field.key === 'secretToken')?.type).toBe('text');
    expect(trigger?.configFields.find((field) => field.key === 'secretToken')?.helpText).toContain('not HMAC');
    expect(trigger?.configFields.find((field) => field.key === 'eventTypes')?.helpText).toContain('job');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('eventType');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('issueTitle');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('mrTitle');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('noteBody');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('sessionId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('_gitlab');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('gitlab_trigger')).toBe(true);
    expect(getIntegrationLogo('gitlab_trigger')).toBe('/integrations-logos/Gitlab.svg');
  });

  it('keeps the existing GitLab action node available and distinct', () => {
    const gitlabAction = NODE_TYPES.find((node) => node.type === 'gitlab');
    expect(gitlabAction).toBeTruthy();
    expect(gitlabAction?.category).not.toBe('triggers');
  });
});
