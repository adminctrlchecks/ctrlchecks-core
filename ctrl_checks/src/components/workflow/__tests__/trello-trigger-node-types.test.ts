import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Trello trigger node catalog', () => {
  it('includes Trello Trigger with model/event/filter fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'trello_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['modelId', 'eventTypes', 'boardId', 'listId', 'cardId', 'memberId', 'query']);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('cardId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('commentText');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('trello_trigger')).toBe(true);
    expect(getIntegrationLogo('trello_trigger')).toBe('/integrations-logos/Trello.svg');
  });

  it('keeps the existing Trello action node available and distinct', () => {
    const trelloAction = NODE_TYPES.find((node) => node.type === 'trello');
    expect(trelloAction).toBeTruthy();
    expect(trelloAction?.category).not.toBe('triggers');
  });
});
