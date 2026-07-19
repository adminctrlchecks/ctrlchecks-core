import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Outlook trigger node catalog', () => {
  it('includes Outlook Trigger with Graph subscription fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'outlook_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'resource',
      'changeTypes',
      'folderName',
      'query',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('conversationId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('attendees');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('outlook_trigger')).toBe(true);
    expect(getIntegrationLogo('outlook_trigger')).toBe('/integrations-logos/Outlook.svg');
  });

  it('keeps the Outlook action node available for replies', () => {
    const outlook = NODE_TYPES.find((node) => node.type === 'outlook');
    expect(outlook).toBeTruthy();
    expect(outlook?.category).toBe('output');
  });
});
