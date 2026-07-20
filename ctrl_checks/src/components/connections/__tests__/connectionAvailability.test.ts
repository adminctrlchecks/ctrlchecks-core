import { describe, expect, it } from 'vitest';
import { isComingSoonProvider } from '../connectionAvailability';

describe('isComingSoonProvider', () => {
  it('flags currently unavailable providers case-insensitively', () => {
    const comingSoonProviders = [
      'microsoft',
      'instagram',
      'dropbox',
      'stripe',
      'paypal',
      'quickbooks',
      'xero',
      'shopify',
      'woocommerce',
    ];

    for (const provider of comingSoonProviders) {
      expect(isComingSoonProvider(provider)).toBe(true);
      expect(isComingSoonProvider(provider.toUpperCase())).toBe(true);
    }
  });

  it('leaves enabled and empty providers available', () => {
    for (const provider of ['google', 'slack', 'github', 'notion', 'typeform', '']) {
      expect(isComingSoonProvider(provider)).toBe(false);
    }

    expect(isComingSoonProvider()).toBe(false);
  });
});
