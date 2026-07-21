import { api } from './client';
import { awsClient } from '@/integrations/aws/client';
import { prefilterDocsCandidates } from '@/lib/search/docsPrefilter';
import type { SearchResponse } from '@/types/search';

export async function runSmartSearch(query: string): Promise<SearchResponse> {
  const [docsCandidates, sessionResult] = await Promise.all([
    prefilterDocsCandidates(query),
    awsClient.auth.getSession(),
  ]);

  const headers: Record<string, string> = {};
  if (sessionResult.data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${sessionResult.data.session.access_token}`;
  }

  const response = await api.post('/api/search', { query, docsCandidates }, headers);
  return response as SearchResponse;
}
