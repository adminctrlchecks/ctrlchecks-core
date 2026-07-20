import { FacebookApiClient } from '../../shared/FacebookApi.client';
import { FacebookNodeParams } from '../../types/facebook.types';

function textFromParams(params: FacebookNodeParams): string {
  return String(params.text || params.message || params.replyText || '').trim();
}

export async function executeSendTextMessageOperation(
  client: FacebookApiClient,
  params: FacebookNodeParams,
): Promise<{ data: Record<string, unknown> }> {
  const pageId = String(params.pageId || '').trim();
  const recipientId = String(params.recipientId || params.userId || params.senderId || params.chatId || '').trim();
  const message = textFromParams(params);

  if (!pageId) throw new Error('pageId is required to send a Facebook Messenger message.');
  if (!recipientId) throw new Error('recipientId is required to send a Facebook Messenger message.');
  if (!message) throw new Error('message or text is required to send a Facebook Messenger message.');

  const pageToken = await client.getPageAccessToken(pageId);
  const response = await client.post(
    `/${encodeURIComponent(pageId)}/messages`,
    {
      recipient: JSON.stringify({ id: recipientId }),
      messaging_type: String(params.messagingType || 'RESPONSE'),
      message: JSON.stringify({ text: message }),
    },
    pageToken,
  );

  return {
    data: {
      success: true,
      pageId,
      recipientId,
      message,
      messageId: response?.message_id || response?.messageId || null,
      raw: response,
    },
  };
}
