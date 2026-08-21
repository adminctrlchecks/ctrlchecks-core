import { config } from '../../config';
import { HybridMemoryService } from '../../../shared/memory';
import type { AgentMessage } from './agent-types';

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
