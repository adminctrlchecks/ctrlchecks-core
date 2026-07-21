import { api } from './client';
import { awsClient } from '@/integrations/aws/client';
import type { AIHelpContext, AIHelpTip } from '@/lib/smart-help/types';

export async function fetchAIHelpTip(context: AIHelpContext): Promise<AIHelpTip> {
  const headers: Record<string, string> = {};
  try {
    const { data: sessionData } = await awsClient.auth.getSession();
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    }
  } catch {
    // Unauthenticated users can still get help — proceed without a token.
  }

  const response = await api.post('/api/ai-help', { context }, headers);
  return response as AIHelpTip;
}
