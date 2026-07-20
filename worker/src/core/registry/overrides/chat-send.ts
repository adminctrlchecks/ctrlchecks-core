import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { LRUNodeOutputsCache } from '../../cache/lru-node-outputs-cache';
import { resolveConfigTemplates } from '../../utils/universal-template-resolver';
import { filterPlaceholderValues } from '../../utils/placeholder-filter';
import { getAuthoritativeInputs } from '../../execution/runtime-input-handoff';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function findSessionId(contextInput: Record<string, any>, upstreamOutputs: Map<string, any>): string {
  if (contextInput.sessionId) return String(contextInput.sessionId);

  for (const output of upstreamOutputs.values()) {
    if (output && typeof output === 'object' && 'sessionId' in output) {
      return String((output as Record<string, any>).sessionId);
    }
  }

  return '';
}

function stringifyMessage(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function deriveMessageFromPayload(payload: unknown): string {
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
    return stringifyMessage(payload);
  }

  const obj = asRecord(payload);
  const candidateKeys = [
    'response_text',
    'message',
    'text',
    'content',
    'output',
    'result',
    'body',
    'data',
    'value',
    'statusText',
  ];

  for (const key of candidateKeys) {
    const candidate = stringifyMessage(obj[key]);
    if (candidate.trim()) return candidate;
  }

  return Object.keys(obj).length > 0 ? stringifyMessage(obj) : '';
}

function deriveMessage(inputObj: Record<string, any>, upstreamOutputs: Map<string, any>): string {
  const inputMessage = deriveMessageFromPayload(inputObj);
  if (inputMessage.trim()) return inputMessage;

  for (const output of Array.from(upstreamOutputs.values()).reverse()) {
    const upstreamMessage = deriveMessageFromPayload(output);
    if (upstreamMessage.trim()) return upstreamMessage;
  }

  return '';
}

export function overrideChatSend(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    description: 'Send a message back to the active chat-trigger interface.',
    requiredInputs: ['message'],
    credentialSchema: {
      requirements: [],
      credentialFields: [],
    },
    operationContracts: [{
      operation: 'default',
      label: 'Send Chat Message',
      requiredFields: ['message'],
      optionalFields: ['sessionId'],
      credentialProviders: [],
      outputFields: ['id', 'status', 'provider', 'message', 'sessionId', 'sentAt', 'error'],
      status: 'implemented',
    }],
    tags: Array.from(new Set([...(def.tags || []), 'chat', 'output', 'terminal', 'message'])),
    execute: async (context) => {
      const inputObj = asRecord(context.rawInput);

      try {
        const nodeOutputs = new LRUNodeOutputsCache(100, false);
        context.upstreamOutputs.forEach((output, nodeId) => {
          nodeOutputs.set(nodeId, output, true);
        });
        if (context.rawInput !== undefined && context.rawInput !== null) {
          nodeOutputs.set('input', context.rawInput, true);
          nodeOutputs.set('$json', context.rawInput, true);
          nodeOutputs.set('json', context.rawInput, true);
        }

        const resolvedConfig = resolveConfigTemplates(context.config || {}, nodeOutputs, context.nodeType);
        const filteredConfig = filterPlaceholderValues(resolvedConfig);
        const mergedConfig = {
          ...filterPlaceholderValues(context.config || {}),
          ...filteredConfig,
          ...getAuthoritativeInputs(context),
        } as Record<string, any>;

        const message = String(mergedConfig.message || deriveMessage(inputObj, context.upstreamOutputs));
        if (!message.trim()) {
          return {
            success: true,
            output: {
              ...inputObj,
              _error: 'Chat Send node: Message is required',
            },
          };
        }

        const configuredSessionId = String(mergedConfig.sessionId || '');
        const resolvedSessionId = configuredSessionId || findSessionId(inputObj, context.upstreamOutputs);
        if (!resolvedSessionId) {
          return {
            success: true,
            output: {
              ...inputObj,
              _error: 'Chat Send node: Session ID is required. Connect this node to a Chat Trigger node to get the session ID, or provide it in the Session ID field.',
            },
          };
        }

        const { getChatServer } = await import('../../../services/chat/chat-server');
        const chatServer = getChatServer();
        const sent = chatServer.sendToSession(resolvedSessionId, {
          type: 'chat',
          message,
        });

        if (!sent) {
          return {
            success: true,
            output: {
              ...inputObj,
              _error: `Chat Send node: Failed to send message. Chat session ${resolvedSessionId} may not be connected.`,
              _warning: 'The chat interface may not be open or the session may have expired.',
            },
          };
        }

        return {
          success: true,
          output: {
            id: resolvedSessionId,
            status: 'sent' as const,
            provider: 'chat',
            message,
            sessionId: resolvedSessionId,
            sentAt: new Date().toISOString(),
          },
        };
      } catch (error: any) {
        return {
          success: true,
          output: {
            id: '',
            status: 'failed' as const,
            provider: 'chat',
            error: error?.message || 'Chat Send failed',
          },
        };
      }
    },
  };
}
