import { api } from './client';
import { awsClient } from '@/integrations/aws/client';
import type { OnboardingPathResponse, OnboardingState, OnboardingStatePatch } from '@/types/onboarding';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await awsClient.auth.getSession();
  const headers: Record<string, string> = {};
  if (sessionData?.session?.access_token) {
    headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
  }
  return headers;
}

export async function generateOnboardingPath(goal?: string): Promise<OnboardingPathResponse> {
  const headers = await authHeaders();
  const response = await api.post('/api/onboarding/generate', goal ? { goal } : {}, headers);
  return response as OnboardingPathResponse;
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const headers = await authHeaders();
  const response = await api.request('/api/onboarding/state', { method: 'GET', headers });
  return response as OnboardingState;
}

export async function patchOnboardingState(patch: OnboardingStatePatch): Promise<OnboardingState> {
  const headers = await authHeaders();
  const response = await api.request('/api/onboarding/state', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  return response as OnboardingState;
}
