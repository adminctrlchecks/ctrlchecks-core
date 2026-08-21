import type { AgentRunContext, AgentToolDescriptor } from './agent-types';

export async function executeAttachedTool(
  descriptor: AgentToolDescriptor,
  args: Record<string, unknown>,
  context: AgentRunContext
): Promise<unknown> {
  const { executeNode } = await import('../../../api/execute-workflow');
  const sourceNode = descriptor.node;
  const baseConfig = sourceNode.data?.config || {};
  const connectionRefs = {
    ...(((baseConfig as Record<string, unknown>).connectionRefs || {}) as Record<string, unknown>),
    ...(((sourceNode.data as Record<string, unknown>)?.connectionRefs || {}) as Record<string, unknown>),
  };
  const syntheticNode = {
    ...sourceNode,
    data: {
      ...sourceNode.data,
      config: {
        ...baseConfig,
        ...args,
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
