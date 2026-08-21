import { createHash } from 'crypto';
import type {
  INodeRegistry,
  NodeInputField,
  NodeInputSchema,
  NodeOperationContract,
  UnifiedNodeDefinition,
} from '../../types/unified-node-contract';
import type { WorkflowEdge, WorkflowNode } from '../../types/ai-types';
import {
  AgentToolDescriptor,
  isAgentAttachmentHandle,
  normalizeAgentAttachmentHandle,
} from './agent-types';

const CREDENTIAL_FIELD_HINTS = ['apikey', 'api_key', 'token', 'secret', 'password', 'authorization', 'privatekey', 'private_key'];

export function getAttachedToolNodes(
  agentNodeId: string,
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
): WorkflowNode[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const attached: WorkflowNode[] = [];
  for (const edge of graph.edges) {
    if (edge.target !== agentNodeId) continue;
    if (normalizeAgentAttachmentHandle(edge.targetHandle) !== 'tool') continue;
    if (seen.has(edge.source)) continue;
    const node = nodeById.get(edge.source);
    if (node) {
      attached.push(node);
      seen.add(edge.source);
    }
  }
  return attached;
}

export function getAttachedNodeForHandle(
  agentNodeId: string,
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
  handle: 'chat_model' | 'memory'
): WorkflowNode | undefined {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edge = graph.edges.find((candidate) =>
    candidate.target === agentNodeId &&
    normalizeAgentAttachmentHandle(candidate.targetHandle) === handle
  );
  return edge ? nodeById.get(edge.source) : undefined;
}

export function isEligibleAgentTool(
  nodeType: string,
  definition: UnifiedNodeDefinition | undefined,
  agentNodeType: string
): boolean {
  if (!definition) return false;
  if (nodeType === agentNodeType || definition.type === agentNodeType) return false;
  const category = String(definition.category || '').toLowerCase();
  if (category === 'trigger' || category === 'triggers') return false;
  if ((definition as UnifiedNodeDefinition & { internalOnly?: boolean }).internalOnly === true) return false;
  return true;
}

export function isAgentAttachmentEdge(
  edge: WorkflowEdge,
  nodesById: Map<string, WorkflowNode>,
  agentNodeType: string
): boolean {
  const target = nodesById.get(edge.target);
  if (!target) return false;
  const targetType = target.data?.type || target.type;
  if (!targetType) return false;
  return isAgentAttachmentHandle(edge.targetHandle) && Boolean(targetType === agentNodeType);
}

export function buildToolManifest(args: {
  attachedNodes: WorkflowNode[];
  registry: INodeRegistry;
  agentNodeType: string;
}): AgentToolDescriptor[] {
  const descriptors: AgentToolDescriptor[] = [];
  for (const node of args.attachedNodes) {
    const nodeType = String(node.data?.type || node.type || '');
    const definition = args.registry.get(nodeType);
    if (!isEligibleAgentTool(nodeType, definition, args.agentNodeType)) continue;
    const inputSchema = args.registry.getInputSchema(nodeType) || definition?.inputSchema || {};
    const operation = pickOperationContract(definition, node);
    const parameters = toJsonSchema(inputSchema, operation);
    const required = Array.isArray(parameters.required) ? parameters.required as string[] : [];
    descriptors.push({
      toolId: node.id,
      functionName: toFunctionName(node.id, nodeType),
      nodeId: node.id,
      nodeType,
      label: definition?.label || node.data?.label || nodeType,
      description: buildDescription(definition, node),
      parameters,
      required,
      firstRunClass: operation?.firstRunClass || 'write',
      node,
      operationContract: operation,
    });
  }
  return descriptors;
}

export function validateToolArgs(
  descriptor: AgentToolDescriptor,
  args: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const properties = (descriptor.parameters.properties || {}) as Record<string, { type?: string; enum?: unknown[] }>;
  for (const field of descriptor.required) {
    const value = args[field];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`Missing required argument "${field}"`);
    }
  }
  for (const [field, value] of Object.entries(args)) {
    const spec = properties[field];
    if (!spec) {
      errors.push(`Unknown argument "${field}"`);
      continue;
    }
    if (spec.enum && !spec.enum.includes(value)) {
      errors.push(`Argument "${field}" must be one of: ${spec.enum.join(', ')}`);
    }
    if (spec.type && !isJsonTypeCompatible(value, spec.type)) {
      errors.push(`Argument "${field}" must be ${spec.type}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function pickOperationContract(
  definition: UnifiedNodeDefinition | undefined,
  node: WorkflowNode
): NodeOperationContract | undefined {
  const contracts = definition?.operationContracts || [];
  if (contracts.length === 0) return undefined;
  const selected = String((node.data?.config || {}).operation || '');
  return contracts.find((contract) => contract.operation === selected) || contracts[0];
}

function toJsonSchema(
  inputSchema: NodeInputSchema,
  operation?: NodeOperationContract
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required = new Set(operation?.requiredFields || []);
  const forbidden = new Set(operation?.forbiddenFields || []);

  for (const [fieldName, field] of Object.entries(inputSchema)) {
    if (forbidden.has(fieldName)) continue;
    if (isCredentialField(fieldName, field)) continue;
    properties[fieldName] = fieldToJsonSchema(field);
    if (field.required) required.add(fieldName);
  }

  return {
    type: 'object',
    properties,
    required: Array.from(required).filter((field) => field in properties),
    additionalProperties: false,
  };
}

function fieldToJsonSchema(field: NodeInputField): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: field.type === 'json' || field.type === 'expression' ? 'string' : field.type,
    description: field.fieldIntelligence?.purpose || field.description,
  };
  if (field.ui?.options && field.ui.options.length > 0) {
    schema.enum = field.ui.options.map((option) => option.value);
  }
  if (field.examples && field.examples.length > 0) {
    schema.examples = field.examples.slice(0, 3);
  }
  return schema;
}

function isCredentialField(fieldName: string, field: NodeInputField): boolean {
  if (field.ownership === 'credential') return true;
  const compact = fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return CREDENTIAL_FIELD_HINTS.some((hint) => compact.includes(hint));
}

function buildDescription(definition: UnifiedNodeDefinition | undefined, node: WorkflowNode): string {
  const parts = [
    definition?.description,
    definition?.aiSelectionCriteria?.whenToUse?.join('; '),
    node.data?.label ? `Attached node label: ${node.data.label}` : undefined,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join('\n');
}

function toFunctionName(nodeId: string, nodeType: string): string {
  const cleaned = `${nodeType}_${nodeId}`.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_');
  const prefix = /^[A-Za-z]/.test(cleaned) ? cleaned : `tool_${cleaned}`;
  if (prefix.length <= 60) return prefix;
  const hash = createHash('sha1').update(`${nodeType}:${nodeId}`).digest('hex').slice(0, 10);
  return `${prefix.slice(0, 49)}_${hash}`;
}

function isJsonTypeCompatible(value: unknown, type: string): boolean {
  if (value === null || value === undefined) return true;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return typeof value === 'object' && !Array.isArray(value);
  if (type === 'number') return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
  if (type === 'boolean') return typeof value === 'boolean' || value === 'true' || value === 'false';
  return typeof value === 'string' || type === 'string';
}
