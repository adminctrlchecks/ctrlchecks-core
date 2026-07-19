import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Jira trigger node catalog', () => {
  it('includes Jira Trigger with siteUrl/projectKey/eventTypes fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'jira_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['siteUrl', 'projectKey', 'eventTypes', 'secretToken', 'jql', 'query']);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('issueSummary');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('commentBody');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('jira_trigger')).toBe(true);
    expect(getIntegrationLogo('jira_trigger')).toBe('/integrations-logos/Jira.svg');
  });

  it('keeps the existing Jira action node available and distinct', () => {
    const jiraAction = NODE_TYPES.find((node) => node.type === 'jira');
    expect(jiraAction).toBeTruthy();
    expect(jiraAction?.category).not.toBe('triggers');
  });
});
