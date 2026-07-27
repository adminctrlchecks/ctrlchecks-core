import { useQuery } from '@tanstack/react-query';
import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from '@/lib/api/getBackendUrl';

/**
 * Single source of truth for the signed-in user's plan, usage, and whether
 * system-wide unlimited access is currently on.
 *
 * When an admin turns unlimited mode on, the worker reports an effectively
 * infinite allowance and sets `unlimitedModeEnabled`, so every paywall and
 * usage meter in the UI should branch on that flag rather than on raw numbers.
 */

export interface SubscriptionState {
  planName: string;
  status: string;
  workflowsUsed: number;
  workflowLimit: number;
  remainingWorkflows: number;
  utilizationPercentage: number;
  canCreateWorkflow: boolean;
  unlimitedModeEnabled: boolean;
  billingMode: 'subscription' | 'gemini_wallet' | 'unlimited';
  subscriptionFrozen: boolean;
}

async function fetchSubscription(): Promise<SubscriptionState | null> {
  const token = (await awsClient.auth.getSession()).data.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${getBackendUrl()}/api/subscriptions/current`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const unlimitedModeEnabled = Boolean(data.unlimitedModeEnabled);

  return {
    planName: String(data.subscription?.planName ?? 'Free'),
    status: String(data.subscription?.status ?? 'active'),
    workflowsUsed: Number(data.usage?.workflowsUsed ?? data.subscription?.workflowsUsed ?? 0),
    workflowLimit: Number(data.usage?.workflowLimit ?? data.subscription?.workflowLimit ?? 2),
    remainingWorkflows: Number(data.usage?.remainingWorkflows ?? 0),
    utilizationPercentage: Number(data.usage?.utilizationPercentage ?? 0),
    canCreateWorkflow: Boolean(data.usage?.canCreateWorkflow ?? true),
    unlimitedModeEnabled,
    billingMode: (data.billingMode as SubscriptionState['billingMode']) ?? 'subscription',
    subscriptionFrozen: Boolean(data.subscriptionFrozen),
  };
}

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'current'] as const;

export function useSubscription() {
  const query = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: fetchSubscription,
    staleTime: 30_000,
  });

  const subscription = query.data ?? null;

  return {
    subscription,
    loading: query.isLoading,
    refresh: query.refetch,
    /** True when the admin has switched off subscription enforcement platform-wide. */
    unlimitedModeEnabled: Boolean(subscription?.unlimitedModeEnabled),
    /**
     * Whether the UI should show an upgrade paywall. False while unlimited mode
     * is on, while the Gemini wallet is covering usage, or while still loading.
     */
    isOutOfWorkflows: Boolean(
      subscription &&
        !subscription.unlimitedModeEnabled &&
        !subscription.subscriptionFrozen &&
        subscription.remainingWorkflows <= 0
    ),
  };
}
