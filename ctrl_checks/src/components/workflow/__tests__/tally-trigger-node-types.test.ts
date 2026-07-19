import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Tally trigger node catalog', () => {
  it('includes Tally Trigger with form ID and query fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'tally_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['formId', 'query']);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('answers');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('tally_trigger')).toBe(true);
    expect(getIntegrationLogo('tally_trigger')).toBe('/integrations-logos/Tally.svg');
  });

  it('keeps the existing Tally ERP action node available and distinct', () => {
    const tallyErp = NODE_TYPES.find((node) => node.type === 'tally');
    expect(tallyErp).toBeTruthy();
    expect(tallyErp?.category).toBe('crm');
  });
});
