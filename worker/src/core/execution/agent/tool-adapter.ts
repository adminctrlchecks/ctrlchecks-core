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

  // The model may fill data/query fields, but it must not override an identity field
  // (spreadsheetId, sheetName, range, url, *_id, …) that the USER already configured.
  // A fabricated one (e.g. the model inventing spreadsheetId:"Business Knowledge" from
  // the system prompt, or range:"read") looks valid and silently hits the wrong entity.
  //
  // However, when an identity field is ABSENT from the user's config, the model must be
  // allowed to supply it. This is the core CRM search→update/delete pattern: the agent
  // searches for a record, obtains its `id` from the result, and passes that `id` to the
  // update/delete tool. Stripping it unconditionally breaks every agent workflow that
  // chains a search to a mutation on the found record.
  //
  // Rule: strip an identity-field arg only when the user/builder already placed a
  // non-nullish value for it in config (even empty string — `range: ''` means "all
  // cells" and must be protected). When the key is absent or explicitly null/undefined,
  // the model's value flows through.
  const safeArgs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (isIdentityField(key) && key in baseConfig && baseConfig[key] != null) {
      continue;                             // user's config wins — drop the model's arg
    }
    safeArgs[key] = value;
  }
  const mergedConfig: Record<string, unknown> = { ...baseConfig, ...safeArgs };

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
    safeArgs,
    context.nodeOutputs,
    context.db,
    context.workflowId,
    context.userId,
    context.currentUserId,
  );
}
