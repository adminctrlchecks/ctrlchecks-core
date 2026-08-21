import type { AgentRunContext, AgentToolDescriptor } from './agent-types';
import { isIdentityField } from '../../registry/identity-field-policy';

export async function executeAttachedTool(
  descriptor: AgentToolDescriptor,
  args: Record<string, unknown>,
  context: AgentRunContext
): Promise<unknown> {
  const { executeNode } = await import('../../../api/execute-workflow');
  const sourceNode = descriptor.node;
  const baseConfig = (sourceNode.data?.config || {}) as Record<string, unknown>;
  const connectionRefs = {
    ...((baseConfig.connectionRefs || {}) as Record<string, unknown>),
    ...(((sourceNode.data as Record<string, unknown>)?.connectionRefs || {}) as Record<string, unknown>),
  };

  // The model may fill data/query fields, but it must NEVER set an identity field
  // (spreadsheetId, sheetName, range, url, *_id, …). Identifiers come only from the user's
  // configuration — a fabricated one (e.g. the model inventing spreadsheetId:"Business
  // Knowledge" from the system prompt) looks valid and silently hits the wrong/missing
  // entity (404). Universal across every attached tool node; non-identity args still win.
  const mergedConfig: Record<string, unknown> = { ...baseConfig };
  for (const [key, value] of Object.entries(args)) {
    if (isIdentityField(key)) continue;
    mergedConfig[key] = value;
  }

  const syntheticNode = {
    ...sourceNode,
    data: {
      ...sourceNode.data,
      config: {
        ...mergedConfig,
        ...(Object.keys(connectionRefs).length > 0 ? { connectionRefs } : {}),
      },
      ...(Object.keys(connectionRefs).length > 0 ? { connectionRefs } : {}),
    },
  };
  return executeNode(
    syntheticNode as Parameters<typeof executeNode>[0],
    args,
    context.nodeOutputs,
    context.db,
    context.workflowId,
    context.userId,
    context.currentUserId,
  );
}
