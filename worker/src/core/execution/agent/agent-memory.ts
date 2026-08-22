import { config } from '../../config';
import { HybridMemoryService } from '../../../shared/memory';
import type { AgentMessage } from './agent-types';

/**
 * Attaching a Memory node to the agent turns conversation memory ON (n8n parity): when a Memory
 * node is present and the agent hasn't explicitly chosen a scope, default to 'conversation'. An
 * explicit non-'none' scope on the agent always wins.
 */
export function resolveAgentMemoryScope(
  hasMemoryNode: boolean,
  configuredScope: 'none' | 'conversation' | 'user'
): 'none' | 'conversation' | 'user' {
  return hasMemoryNode && configuredScope === 'none' ? 'conversation' : configuredScope;
}

/** How many past messages the agent recalls, taken from the Memory node's config (1..50, default 10). */
export function resolveAgentMemoryWindow(memoryNodeConfig: Record<string, unknown>): number {
  const raw =
    memoryNodeConfig.maxMessages ??
    memoryNodeConfig.contextWindowLength ??
    memoryNodeConfig.contextWindow;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  const value = Number.isFinite(parsed) ? parsed : 10;
  return Math.min(Math.max(value, 1), 50);
}

export function resolveMemorySessionKey(args: {
  scope: 'none' | 'conversation' | 'user';
  workflowId: string;
  nodeId: string;
  userId?: string;
  input?: Record<string, unknown>;
}): string | null {
  if (args.scope === 'none') return null;
  if (args.scope === 'user') return args.userId ? `agent:user:${args.userId}` : null;
  const explicit = args.input?.sessionId || args.input?.session_id;
  if (typeof explicit === 'string' && explicit.trim()) return `agent:conversation:${explicit.trim()}`;
  return `agent:conversation:${args.workflowId}:${args.nodeId}`;
}

export async function loadAgentMemory(sessionKey: string | null, limit = 10): Promise<AgentMessage[]> {
  if (!sessionKey) return [];
  try {
    const service = new HybridMemoryService(config.supabaseUrl, config.supabaseKey, {
      type: 'hybrid',
      ttl: 3600,
      maxMessages: limit,
    });
    await service.initialize();
    const messages = await service.retrieve(sessionKey, limit);
    return messages.map((message) => ({
      role: message.role === 'system' ? 'system' : message.role,
      content: message.content,
    }));
  } catch {
    return [];
  }
}

export async function appendAgentMemory(
  sessionKey: string | null,
  userInput: string,
  assistantOutput: string
): Promise<void> {
  if (!sessionKey) return;
  try {
    const service = new HybridMemoryService(config.supabaseUrl, config.supabaseKey, {
      type: 'hybrid',
      ttl: 3600,
      maxMessages: 100,
    });
    await service.initialize();
    await service.store(sessionKey, 'user', userInput, { source: 'agent' });
    await service.store(sessionKey, 'assistant', assistantOutput, { source: 'agent' });
  } catch {
    // Memory is an optional enhancement; execution should not fail when storage is unavailable.
  }
}
