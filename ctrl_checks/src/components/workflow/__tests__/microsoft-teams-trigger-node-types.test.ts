import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Microsoft Teams trigger node catalog', () => {
  it('includes Microsoft Teams Trigger with Bot Framework activity fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'microsoft_teams_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'teamIds',
      'channelIds',
      'allowedUserIds',
      'tenantId',
      'appId',
      'validationSecret',
      'validateJwt',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('serviceUrl');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('conversationId');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('microsoft_teams_trigger')).toBe(true);
    expect(getIntegrationLogo('microsoft_teams_trigger')).toBe('/integrations-logos/Microsoft-Teams.svg');
  });

  it('keeps Microsoft Teams action fields available for same-conversation replies', () => {
    const teams = NODE_TYPES.find((node) => node.type === 'microsoft_teams');
    expect(teams).toBeTruthy();
    expect(teams?.defaultConfig.serviceUrl).toBe('{{$json.serviceUrl}}');
    expect(teams?.defaultConfig.conversationId).toBe('{{$json.conversationId}}');
    expect(teams?.defaultConfig.replyToId).toBe('{{$json.replyToId}}');
    expect(teams?.configFields.some((field) => field.key === 'serviceUrl')).toBe(true);
  });
});
