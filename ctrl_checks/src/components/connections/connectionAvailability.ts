const COMING_SOON_PROVIDERS = new Set([
  'microsoft',
  'instagram',
  'dropbox',
  'stripe',
  'paypal',
  'quickbooks',
  'xero',
  'woocommerce',
]);

export function isComingSoonProvider(provider?: string): boolean {
  return COMING_SOON_PROVIDERS.has((provider ?? '').toLowerCase());
}
