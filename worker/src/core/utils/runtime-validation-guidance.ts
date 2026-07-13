import { nodeDefinitionRegistry } from '../types/node-definition';
import type { RuntimeFieldAuditEntry } from '../execution/runtime-field-contract';
import type { RuntimeInputHandoffAudit } from '../types/unified-node-contract';

export interface RuntimeValidationIssue {
  type: 'runtime_input';
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  fieldName: string;
  fieldLabel: string;
  description: string;
  reason: string;
  fillMode?: string;
  source?: string;
  preview?: unknown;
}

export interface RuntimeValidationGuidance {
  validationErrors: string[];
  runtimeInputAudit: RuntimeFieldAuditEntry[];
  runtimeInputHandoffAudit: RuntimeInputHandoffAudit[];
  runtimeValidationIssues: RuntimeValidationIssue[];
  missingInputs: Array<{ fieldName: string; nodeLabel: string; description: string }>;
  missingInputsCount: number;
  issues: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    missingFields: Array<{
      fieldName: string;
      friendlyLabel: string;
      description: string;
    }>;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asAuditArray<T extends object>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => isRecord(item)) : [];
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

function schemaLabel(description: string | undefined, fallback: string): string {
  const trimmed = (description || '').trim();
  if (!trimmed) return humanizeKey(fallback);
  const firstSentence = trimmed.split(/[.\n]/)[0]?.trim();
  const firstClause = firstSentence?.split(/\s[-\u2014]\s/)[0]?.trim();
  return firstClause || humanizeKey(fallback);
}

function fieldDescription(nodeType: string, fieldName: string, reason: string): { label: string; description: string } {
  const def = nodeDefinitionRegistry.get(nodeType);
  const fieldDef = def?.inputSchema?.[fieldName];
  const label = schemaLabel(fieldDef?.description, fieldName);
  return {
    label,
    description: reason || fieldDef?.description || `${label} is required`,
  };
}

function inferFieldFromValidationError(message: string): string | null {
  const runtimeMatch = message.match(/^Required runtime_ai field ['"]?([^'"]+)['"]?/i);
  if (runtimeMatch?.[1]) return runtimeMatch[1].trim();

  const requiredMatch = message.match(/^([A-Za-z0-9_.-]+)\s+is\s+required\b/i);
  if (requiredMatch?.[1]) return requiredMatch[1].trim();

  const prefixMatch = message.match(/^([A-Za-z0-9_.-]+)\s*:/);
  if (prefixMatch?.[1]) return prefixMatch[1].trim();

  return null;
}

function uniqueByField(issues: RuntimeValidationIssue[]): RuntimeValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.nodeId}:${issue.fieldName}:${issue.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildRuntimeValidationGuidance(input: {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  output: unknown;
}): RuntimeValidationGuidance {
  const output = isRecord(input.output) ? input.output : {};
  const validationErrors = asStringArray(output._validationErrors);
  const runtimeInputAudit = asAuditArray<RuntimeFieldAuditEntry>(output._runtimeInputAudit);
  const runtimeInputHandoffAudit = asAuditArray<RuntimeInputHandoffAudit>(output._runtimeInputHandoffAudit);
  const nodeLabel = input.nodeLabel || input.nodeType;

  const issues: RuntimeValidationIssue[] = [];

  for (const audit of runtimeInputAudit) {
    const errors = asStringArray((audit as unknown as Record<string, unknown>).errors);
    if (audit.valid !== false && errors.length === 0) continue;

    const fieldName = audit.field;
    if (!fieldName) continue;

    const reason = errors.join('; ') || validationErrors.find((error) => error.includes(fieldName)) || `${fieldName} is required`;
    const field = fieldDescription(input.nodeType, fieldName, reason);
    issues.push({
      type: 'runtime_input',
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeLabel,
      fieldName,
      fieldLabel: field.label,
      description: field.description,
      reason,
      fillMode: audit.fillMode,
      source: audit.source,
      preview: audit.preview,
    });
  }

  for (const audit of runtimeInputHandoffAudit) {
    if (audit.validationStatus !== 'invalid' && !audit.blockedReason) continue;

    const fieldName = audit.fieldName;
    if (!fieldName) continue;

    const reason = audit.blockedReason || validationErrors.find((error) => error.includes(fieldName)) || `${fieldName} was not delivered to the provider`;
    const field = fieldDescription(input.nodeType, fieldName, reason);
    issues.push({
      type: 'runtime_input',
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeLabel,
      fieldName,
      fieldLabel: field.label,
      description: field.description,
      reason,
      fillMode: audit.ownership,
      source: audit.resolvedSource,
      preview: audit.resolvedValuePreview,
    });
  }

  if (issues.length === 0) {
    for (const error of validationErrors) {
      const fieldName = inferFieldFromValidationError(error);
      if (!fieldName) continue;

      const field = fieldDescription(input.nodeType, fieldName, error);
      issues.push({
        type: 'runtime_input',
        nodeId: input.nodeId,
        nodeType: input.nodeType,
        nodeLabel,
        fieldName,
        fieldLabel: field.label,
        description: field.description,
        reason: error,
      });
    }
  }

  const runtimeValidationIssues = uniqueByField(issues);
  const missingFields = runtimeValidationIssues.map((issue) => ({
    fieldName: issue.fieldName,
    friendlyLabel: issue.fieldLabel,
    description: issue.reason || issue.description,
  }));

  return {
    validationErrors,
    runtimeInputAudit,
    runtimeInputHandoffAudit,
    runtimeValidationIssues,
    missingInputs: runtimeValidationIssues.map((issue) => ({
      fieldName: issue.fieldLabel || issue.fieldName,
      nodeLabel: issue.nodeLabel,
      description: issue.reason || issue.description,
    })),
    missingInputsCount: runtimeValidationIssues.length,
    issues: missingFields.length > 0
      ? [{
          nodeId: input.nodeId,
          nodeLabel,
          nodeType: input.nodeType,
          missingFields,
        }]
      : [],
  };
}
