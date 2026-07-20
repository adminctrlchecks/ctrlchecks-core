import type { Node } from '@xyflow/react';
import { nodeSchemaService, type InputFieldSchema, type NodeDefinition } from '@/services/nodeSchemaService';
import { validateNodeInputsAgainstSchema } from '@/lib/schemaConverter';
import { resolveEffectiveFieldFillMode, supportsRuntimeAI } from '@/lib/fillMode';
import { isEffectivelyEmptyValue } from '@/lib/workflow-value-readiness';

export type WorkflowGuidanceMissingInput = {
  fieldName: string;
  nodeLabel: string;
  description?: string;
};

export type WorkflowGuidanceValidationIssue = {
  type: 'missing_input';
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  fieldName: string;
  fieldLabel: string;
  description: string;
  reason: string;
};

export type WorkflowGuidanceContext = {
  missingInputs?: WorkflowGuidanceMissingInput[];
  runtimeValidationIssues?: WorkflowGuidanceValidationIssue[];
  validationErrors?: string[];
};

type WorkflowNodeLike = Pick<Node, 'id' | 'type' | 'data'>;

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fieldExample(fieldSchema?: InputFieldSchema): string {
  const direct = fieldSchema?.exampleValue;
  if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct);
  const first = fieldSchema?.examples?.find((item) => item !== undefined && item !== null && String(item).trim());
  if (first === undefined) return '';
  return typeof first === 'string' ? first : JSON.stringify(first);
}

function nodeTypeOf(node: WorkflowNodeLike): string {
  return getString((node.data as Record<string, unknown> | undefined)?.type) || getString(node.type);
}

function nodeLabelOf(node: WorkflowNodeLike, schema?: NodeDefinition | null): string {
  const data = (node.data || {}) as Record<string, unknown>;
  return getString(data.label) || schema?.label || humanizeKey(nodeTypeOf(node)) || node.id;
}

function buildReadableDescription(fieldKey: string, fieldSchema: InputFieldSchema | undefined, message: string): string {
  const fieldLabel = humanizeKey(fieldKey);
  const readableMessage = message.replace(new RegExp(`\\b${fieldKey}\\b`, 'g'), fieldLabel);
  const description = fieldSchema?.description ? `${fieldSchema.description}` : '';
  const example = fieldExample(fieldSchema);
  return [readableMessage, description, example ? `Example: ${example}` : '']
    .filter(Boolean)
    .join(' ');
}

function sanitizedInputsForValidation(
  schema: NodeDefinition,
  config: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...config };
  for (const fieldKey of Object.keys(schema.inputSchema || {})) {
    if (isEffectivelyEmptyValue(sanitized[fieldKey])) {
      sanitized[fieldKey] = '';
    }
  }
  return sanitized;
}

export async function buildWorkflowGuidanceContext(nodes: WorkflowNodeLike[]): Promise<WorkflowGuidanceContext> {
  let schemas: NodeDefinition[];
  try {
    schemas = await nodeSchemaService.fetchAllSchemas();
  } catch {
    return {};
  }

  const missingInputs: WorkflowGuidanceMissingInput[] = [];
  const runtimeValidationIssues: WorkflowGuidanceValidationIssue[] = [];
  const validationErrors: string[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const nodeType = nodeTypeOf(node);
    if (!nodeType) continue;

    const schema = schemas.find((candidate) => candidate.type === nodeType);
    if (!schema) continue;

    const config = (((node.data || {}) as Record<string, unknown>).config || {}) as Record<string, unknown>;
    const validation = validateNodeInputsAgainstSchema(schema, sanitizedInputsForValidation(schema, config) as Record<string, any>);
    if (validation.valid) continue;

    const inputSchema = (schema.inputSchema || {}) as Record<string, InputFieldSchema>;
    const nodeLabel = nodeLabelOf(node, schema);

    for (const err of validation.errors) {
      const fieldSchema = inputSchema[err.field];
      if (fieldSchema?.ownership === 'credential' || fieldSchema?.ownership === 'structural') continue;

      const effectiveMode = resolveEffectiveFieldFillMode(err.field, inputSchema, config);
      if (effectiveMode === 'runtime_ai' && supportsRuntimeAI(err.field, inputSchema)) continue;

      const dedupeKey = `${node.id}:${err.field}:${err.message}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const fieldLabel = humanizeKey(err.field);
      const description = buildReadableDescription(err.field, fieldSchema, err.message);
      missingInputs.push({ fieldName: fieldLabel, nodeLabel, description });
      runtimeValidationIssues.push({
        type: 'missing_input',
        nodeId: node.id,
        nodeType,
        nodeLabel,
        fieldName: err.field,
        fieldLabel,
        description,
        reason: err.message,
      });
      validationErrors.push(`${nodeLabel}: ${fieldLabel} - ${description}`);
    }
  }

  return {
    ...(missingInputs.length > 0 ? { missingInputs } : {}),
    ...(runtimeValidationIssues.length > 0 ? { runtimeValidationIssues } : {}),
    ...(validationErrors.length > 0 ? { validationErrors } : {}),
  };
}
