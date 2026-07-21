import { api } from './client';
import { awsClient } from '@/integrations/aws/client';
import type { AdaptiveUIRequest, AdaptiveUIResponse } from '@/types/adaptive-ui';

export async function fetchAdaptiveUI(request: AdaptiveUIRequest): Promise<AdaptiveUIResponse> {
  const { data: sessionData } = await awsClient.auth.getSession();
  const headers: Record<string, string> = {};
  if (sessionData?.session?.access_token) {
    headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
  }

  const response = await api.post('/api/adaptive-ui', request, headers);
  return response as AdaptiveUIResponse;
}
