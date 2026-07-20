import { FacebookApiClient } from '../../shared/FacebookApi.client';
import { FacebookNodeParams } from '../../types/facebook.types';

function messageFromParams(params: FacebookNodeParams): string {
  return String(params.replyText || params.commentText || params.text || params.message || '').trim();
}

export async function executeCreateCommentOperation(
  client: FacebookApiClient,
  params: FacebookNodeParams,
): Promise<{ data: Record<string, unknown> }> {
  const targetId = String(params.commentId || params.postId || '').trim();
  const pageId = String(params.pageId || '').trim();
  const message = messageFromParams(params);

  if (!targetId) throw new Error('commentId or postId is required to create a Facebook comment reply.');
  if (!message) throw new Error('message, text, replyText, or commentText is required to create a Facebook comment reply.');

  const pageToken = pageId ? await client.getPageAccessToken(pageId) : undefined;
  const response = await client.post(
    `/${encodeURIComponent(targetId)}/comments`,
    { message },
    pageToken,
  );

  return {
    data: {
      success: true,
      pageId: pageId || null,
      targetId,
      commentId: response?.id || null,
      message,
      raw: response,
    },
  };
}
