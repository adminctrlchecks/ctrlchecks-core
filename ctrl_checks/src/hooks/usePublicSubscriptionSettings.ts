import { useQuery } from '@tanstack/react-query';
import { getBackendUrl } from '@/lib/api/getBackendUrl';

export interface PublicSubscriptionSettings {
  unlimitedModeEnabled: boolean;
}

export const PUBLIC_SUBSCRIPTION_SETTINGS_QUERY_KEY = ['subscription', 'public-settings'] as const;

async function fetchPublicSubscriptionSettings(): Promise<PublicSubscriptionSettings> {
  const response = await fetch(`${getBackendUrl()}/api/subscriptions/plans`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load subscription settings');
  }

  const data = await response.json();
  return {
    unlimitedModeEnabled: Boolean(data.unlimitedModeEnabled),
  };
}

/**
 * Public read path for whether pricing UI should be visible.
 *
 * The backend already exposes `unlimitedModeEnabled` on the public plans
 * endpoint. Marketing pages use only that flag, so they do not need admin APIs
 * or signed-in subscription state.
 */
export function usePublicSubscriptionSettings() {
  const query = useQuery({
    queryKey: PUBLIC_SUBSCRIPTION_SETTINGS_QUERY_KEY,
    queryFn: fetchPublicSubscriptionSettings,
    staleTime: 15_000,
  });

  return {
    ...query,
    unlimitedModeEnabled: Boolean(query.data?.unlimitedModeEnabled),
    showPlanLinks: query.isSuccess && !query.data.unlimitedModeEnabled,
  };
}
