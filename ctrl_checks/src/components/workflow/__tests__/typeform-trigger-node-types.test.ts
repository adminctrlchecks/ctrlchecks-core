import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Typeform trigger node catalog', () => {
  it('includes Typeform Trigger with form ID and query fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'typeform_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual(['formId', 'query']);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('answers');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('typeform_trigger')).toBe(true);
    expect(getIntegrationLogo('typeform_trigger')).toBe('/integrations-logos/Typeform.svg');
  });

  it('keeps the Typeform action node available for reading responses', () => {
    const typeform = NODE_TYPES.find((node) => node.type === 'typeform');
    expect(typeform).toBeTruthy();
    expect(typeform?.category).toBe('productivity');
  });
});
