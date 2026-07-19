import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Stripe trigger node catalog', () => {
  it('includes Stripe Trigger with event/filter fields and no secret fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'stripe_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'connect',
      'livemode',
      'customerId',
      'currency',
      'minAmount',
      'query',
    ]);
    expect(trigger?.configFields.map((field) => field.key)).not.toEqual(expect.arrayContaining(['apiKey', 'signingSecret']));
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('paymentIntentId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('customerId');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('stripe_trigger')).toBe(true);
    expect(getIntegrationLogo('stripe_trigger')).toBe('/integrations-logos/Stripe.svg');
  });

  it('keeps the existing Stripe action node available and distinct', () => {
    const stripeAction = NODE_TYPES.find((node) => node.type === 'stripe');
    expect(stripeAction).toBeTruthy();
    expect(stripeAction?.category).not.toBe('triggers');
  });
});
