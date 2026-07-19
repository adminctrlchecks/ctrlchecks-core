import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Shopify trigger node catalog', () => {
  it('includes Shopify Trigger with event/filter fields and no secret fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'shopify_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'shopDomain',
      'topics',
      'financialStatus',
      'fulfillmentStatus',
      'customerId',
      'productId',
      'minTotalPrice',
      'currency',
      'query',
    ]);
    expect(trigger?.configFields.map((field) => field.key)).not.toEqual(expect.arrayContaining(['apiKey', 'accessToken', 'token', 'clientSecret', 'webhookSecret']));
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('orderId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('customerEmail');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('shopify_trigger')).toBe(true);
    expect(getIntegrationLogo('shopify_trigger')).toBe('/integrations-logos/Shopify.svg');
  });

  it('keeps the existing Shopify action node available and removes visible token entry from new node config', () => {
    const shopifyAction = NODE_TYPES.find((node) => node.type === 'shopify');
    expect(shopifyAction).toBeTruthy();
    expect(shopifyAction?.category).not.toBe('triggers');
    expect(shopifyAction?.configFields.map((field) => field.key)).not.toContain('accessToken');
  });
});
