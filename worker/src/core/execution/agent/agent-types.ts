import type { DbClient } from '@db/db-js';
import type { LRUNodeOutputsCache } from '../../cache/lru-node-outputs-cache';
import type {
  NodeExecutionContext,
  NodeOperationContract,
} from '../../types/unified-node-contract';
import type { WorkflowEdge, WorkflowNode } from '../../types/ai-types';

export const AI_AGENT_ATTACHMENT_HANDLES = ['chat_model', 'memory', 'tool'] as const;
export const AI_AGENT_USER_INPUT_HANDLES = ['userInput', 'input', 'default'] as const;

export type AIAgentAttachmentHandle = typeof AI_AGENT_ATTACHMENT_HANDLES[number];
export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type RequireApprovalPolicy = 'none' | 'destructive' | 'write_and_destructive';

export type AgentErrorCode =
  | 'MODEL_FAILED'
  | 'TOOL_NOT_ATTACHED'
  | 'INVALID_ARGS'
  | 'TOOL_FAILED'
  | 'CRED_FAILED'
  | 'ITERATION_LIMIT'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'LOOP_DETECTED'
  | 'APPROVAL_REQUIRED'
  | 'NO_TOOLS'
  | 'CONFIG_ERROR';

export interface AgentGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface AgentMessage {
  role: AgentMessageRole;
  content: string;
  toolCallId?: string;
  toolId?: string;
}

export interface AgentToolDescriptor {
  toolId: string;
  functionName: string;
  nodeId: string;
  nodeType: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  required: string[];
  firstRunClass: 'none' | 'read' | 'write' | 'destructive';
  node: WorkflowNode;
  operationContract?: NodeOperationContract;
}

export interface AgentToolCall {
  toolId?: string;
  functionName?: string;
  args: Record<string, unknown>;
}

export interface AgentModelFinal {
  kind: 'final';
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export interface AgentModelToolCall {
  kind: 'tool_call';
  toolId?: string;
  functionName?: string;
  args: Record<string, unknown>;
  usage?: AgentModelFinal['usage'];
  model?: string;
}

export type AgentModelResponse = AgentModelFinal | AgentModelToolCall;

export interface ChatModelAdapter {
  supportsNativeToolCalling(): boolean;
  complete(request: {
    system: string;
    messages: AgentMessage[];
    tools: AgentToolDescriptor[];
    model: string;
    provider: 'openai' | 'claude' | 'gemini' | 'ollama';
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
  }): Promise<AgentModelResponse>;
}

export interface AgentLimits {
  maxIterations: number;
  timeoutMs: number;
  maxToolResultChars: number;
  maxRepeatedToolCalls: number;
}

export interface AgentRunContext {
  nodeContext: NodeExecutionContext;
  graph: AgentGraph;
  agentNode: WorkflowNode;
  db: DbClient;
  nodeOutputs: LRUNodeOutputsCache;
  workflowId: string;
  userId?: string;
  currentUserId?: string;
  systemPrompt: string;
  userInput: string;
  model: string;
  provider: 'openai' | 'claude' | 'gemini' | 'ollama';
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  outputFormat: string;
  memoryScope: 'none' | 'conversation' | 'user';
  requireApprovalFor: RequireApprovalPolicy;
  limits: AgentLimits;
}

export interface AgentToolCallRecord {
  toolId: string;
  nodeType: string;
  functionName: string;
  args: Record<string, unknown>;
  ok: boolean;
  ms: number;
  resultPreview?: unknown;
  error?: string;
}

export interface AgentStructuredError {
  success: false;
  error: string;
  code: AgentErrorCode;
  iteration: number;
  tool?: string;
}

export interface AgentStructuredSuccess {
  success: true;
  output: string;
  iterations: number;
  toolCalls: AgentToolCallRecord[];
  metadata: {
    model: string;
    provider: string;
    memoryScope: string;
    nativeToolCalling: boolean;
    durationMs: number;
    tokens?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

export type AgentStructuredOutput = AgentStructuredSuccess | AgentStructuredError;

export function normalizeAgentAttachmentHandle(handle: string | undefined): string {
  if (!handle) return 'input';
  if (handle === 'chatModel') return 'chat_model';
  return handle;
}

export function isAgentAttachmentHandle(handle: string | undefined): boolean {
  const normalized = normalizeAgentAttachmentHandle(handle);
  return (AI_AGENT_ATTACHMENT_HANDLES as readonly string[]).includes(normalized);
}
