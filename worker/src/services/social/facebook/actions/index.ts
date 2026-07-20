import { executePageListOperation } from './page/PageList.operation';
import { executeSendTextMessageOperation } from './page-message/SendTextMessage.operation';
import { executeCreateCommentOperation } from './comment/CreateComment.operation';
import { notImplementedOperation } from './not-implemented.operation';
import { FacebookApiClient } from '../shared/FacebookApi.client';
import { FacebookNodeParams } from '../types/facebook.types';

export type FacebookOperationHandler = (
  client: FacebookApiClient,
  params: FacebookNodeParams,
) => Promise<{ data: Record<string, unknown>; pagination?: { next?: string; previous?: string; cursors?: { before?: string; after?: string } } }>;

const handlerMap: Record<string, FacebookOperationHandler> = {
  'page.getAllPages': executePageListOperation,
  'page_message.sendTextMessage': executeSendTextMessageOperation,
  'comment.createComment': executeCreateCommentOperation,
};

export function resolveFacebookOperationHandler(params: FacebookNodeParams): FacebookOperationHandler {
  const key = `${params.resource}.${params.operation}`;
  return handlerMap[key] ?? notImplementedOperation;
}
