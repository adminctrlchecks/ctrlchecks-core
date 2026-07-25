import type { WorkflowNode } from '../types/ai-types';
import type {
  FieldFillMode,
  NodeInputField,
  UnifiedNodeDefinition,
} from '../types/unified-node-contract';
import { unifiedNodeRegistry } from '../registry/unified-node-registry';
import { unifiedNormalizeNodeType } from '../utils/unified-node-type-normalizer';
import { buildEffectiveFillModes, resolveEffectiveFieldFillMode } from '../utils/fill-mode-resolver';
import { isCredentialOwnership } from '../utils/field-ownership';
import { isPlaceholderValue } from '../utils/placeholder-filter';
import { isEmptyConfigValue } from '../validation/registry-field-contract';
import {
  pickActiveInputSchema,
  resolveFieldPolicyForNode,
} from '../operations/field-policy-resolver';

export type NodeReadinessIssueKind = 'missing_input' | 'missing_credential' | 'invalid_input';

export interface NodeReadinessIssue {
  kind: NodeReadinessIssueKind;
  code: 'NODE_MISSING_INPUT' | 'NODE_MISSING_CREDENTIAL' | 'NODE_INVALID_INPUT';
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  provider?: string;
  credentialType?: string;
  credentialId?: string;
  credentialTypeId?: string;
  connectionId?: string;
  connectionName?: string;
  status?: string;
  action?: string;
  requiredScopes?: string[];
  availableScopes?: string[];
  operation?: string;
  operationLabel?: string;
  fieldKey?: string;
  fieldPath?: string[];
  fieldName?: string;
  fieldLabel?: string;
  fieldType?: string;
  inputType?: string;
  message: string;
  reason?: string;
  helpText?: string;
  docsUrl?: string;
  exampleValue?: string;
  examples?: unknown[];
  nextSteps?: string[];
  recommendations?: string[];
}

export interface NodeReadinessDetails {
  readinessIssues: NodeReadinessIssue[];
  missingInputs: NodeReadinessIssue[];
  missingCredentials: NodeReadinessIssue[];
  invalidInputs: NodeReadinessIssue[];
  runtimeValidationIssues: NodeReadinessIssue[];
  missingInputsCount: number;
  missingCredentialsCount: number;
  invalidInputsCount: number;
  issues: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    operation?: string;
    missingFields: Array<{
      fieldName: string;
      fieldKey: string;
      friendlyLabel: string;
      fieldLabel: string;
      description: string;
      reason?: string;
    }>;
  }>;
}

export interface CredentialReadinessInput {
  provider?: string;
  type?: string;
  category?: string;
  vaultKey?: string;
  displayName?: string;
  required?: boolean;
  satisfied?: boolean;
  nodeIds?: string[];
  nodeTypes?: string[];
  scopes?: string[];
  credentialId?: string;
  simpleDescription?: string;
  technicalDescription?: string;
  howToObtain?: string;
  status?: string;
  action?: string;
  nodeId?: string;
  nodeType?: string;
  nodeLabel?: string;
  operation?: string;
  operationLabel?: string;
  connectionId?: string;
  connectionName?: string;
  requiredScopes?: string[];
  availableScopes?: string[];
  reason?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function nodeTypeOf(node: WorkflowNode): string {
  try {
    return unifiedNormalizeNodeType(node);
  } catch {
    return String((node.data as any)?.type || node.type || '');
  }
}

function nodeConfig(node: WorkflowNode, nodeType: string): Record<string, unknown> {
  const config = ((node.data as any)?.config || {}) as Record<string, unknown>;
  return unifiedNodeRegistry.migrateConfig(nodeType, config);
}

function operationDisplay(def: UnifiedNodeDefinition, operation: string | undefined): string | undefined {
  if (!operation) return undefined;
  const fromContract = def.operationContracts?.find((contract) => contract.operation === operation)?.label;
  if (fromContract) return fromContract;
  const option = def.inputSchema?.operation?.ui?.options?.find((item) => item.value === operation);
  if (option?.label) return option.label;
  return humanizeKey(operation);
}

function fieldLabel(fieldKey: string, field: NodeInputField | undefined): string {
  const description = field?.description?.trim();
  if (
    description &&
    /^[A-Z][A-Za-z0-9 _-]{1,40}$/.test(description) &&
    !description.includes('.') &&
    !/\bfor\b/i.test(description)
  ) {
    return description;
  }
  return humanizeKey(fieldKey);
}

function fieldHelp(fieldKey: string, field: NodeInputField | undefined): string {
  const label = fieldLabel(fieldKey, field);
  const description = field?.description?.trim();
  if (description) return description;
  return `${label} is required for this operation.`;
}

function recommendationsFor(field: NodeInputField | undefined): string[] {
  const notes = field?.fieldIntelligence?.useCaseNotes?.map((note) => note.guidance).filter(Boolean) || [];
  const hints = field?.fieldIntelligence?.validationHints?.map((hint) => hint.message).filter(Boolean) || [];
  return Array.from(new Set([...notes, ...hints]));
}

function exampleValue(field: NodeInputField | undefined): string | undefined {
  if (field?.exampleValue) return field.exampleValue;
  const first = field?.examples?.[0];
  if (first === undefined) return undefined;
  if (typeof first === 'string') return first;
  try {
    return JSON.stringify(first);
  } catch {
    return undefined;
  }
}

function typeIsCompatible(expectedType: string | undefined, value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!expectedType || expectedType === 'expression') return true;
  if (expectedType === 'json') return isRecord(value) || Array.isArray(value);
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'object') return isRecord(value);
  if (expectedType === 'string') return typeof value === 'string';
  if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expectedType === 'boolean') return typeof value === 'boolean';
  return true;
}

function valueMissing(value: unknown): boolean {
  return isEmptyConfigValue(value) || isPlaceholderValue(value);
}

function inputTypeFor(field: NodeInputField | undefined): string | undefined {
  if (!field) return undefined;
  if (field.ui?.widget === 'textarea' || field.type === 'object' || field.type === 'array' || field.type === 'json') {
    return 'textarea';
  }
  if (field.type === 'number') return 'number';
  if (field.type === 'boolean' || field.ui?.options?.length) return 'select';
  return 'text';
}

export function buildNodeInputReadinessIssues(input: {
  node: WorkflowNode;
  nodeType?: string;
  config?: Record<string, unknown>;
  fillModes?: Record<string, FieldFillMode>;
  includeProviderDefaultFields?: boolean;
}): NodeReadinessIssue[] {
  const node = input.node;
  const nodeType = input.nodeType || nodeTypeOf(node);
  const def = unifiedNodeRegistry.get(nodeType);
  if (!def) return [];

  const config = input.config || nodeConfig(node, nodeType);
  const effectiveFillModes = input.fillModes || buildEffectiveFillModes(def.inputSchema, config as Record<string, any>);
  const fieldPolicy = resolveFieldPolicyForNode(def, config, effectiveFillModes);
  const activeSchema = pickActiveInputSchema(def.inputSchema, fieldPolicy);
  const operation = fieldPolicy.operation;
  const operationLabel = operationDisplay(def, operation);
  const nodeLabel = String((node.data as any)?.label || def.label || nodeType);
  const issues: NodeReadinessIssue[] = [];

  const fieldKeys = input.includeProviderDefaultFields
    ? Array.from(new Set([...fieldPolicy.requiredFields, ...fieldPolicy.providerDefaultFields]))
    : fieldPolicy.requiredFields;

  for (const fieldKey of fieldKeys) {
    const field = activeSchema[fieldKey] || def.inputSchema[fieldKey];
    if (!field || isCredentialOwnership(fieldKey, field)) continue;

    const effectiveMode = effectiveFillModes[fieldKey] ||
      resolveEffectiveFieldFillMode(fieldKey, def.inputSchema, config as Record<string, any>);
    if (effectiveMode === 'runtime_ai' && fieldPolicy.fields[fieldKey]?.runtimeAiAllowed) {
      continue;
    }

    const value = (config as Record<string, unknown>)[fieldKey];
    const label = fieldLabel(fieldKey, field);
    if (valueMissing(value)) {
      issues.push({
        kind: 'missing_input',
        code: 'NODE_MISSING_INPUT',
        nodeId: node.id,
        nodeType,
        nodeLabel,
        operation,
        operationLabel,
        fieldKey,
        fieldPath: [fieldKey],
        fieldName: fieldKey,
        fieldLabel: label,
        fieldType: field.type,
        inputType: inputTypeFor(field),
        message: `${nodeLabel} ${label} is required${operationLabel ? ` for ${operationLabel}` : ''}.`,
        reason: `${label} is empty or missing.`,
        helpText: fieldHelp(fieldKey, field),
        docsUrl: field.docsUrl,
        exampleValue: exampleValue(field),
        examples: field.examples,
        nextSteps: [`Open ${nodeLabel} and fill ${label}.`],
        recommendations: recommendationsFor(field),
      });
      continue;
    }

    if (!typeIsCompatible(field.type, value)) {
      issues.push({
        kind: 'invalid_input',
        code: 'NODE_INVALID_INPUT',
        nodeId: node.id,
        nodeType,
        nodeLabel,
        operation,
        operationLabel,
        fieldKey,
        fieldPath: [fieldKey],
        fieldName: fieldKey,
        fieldLabel: label,
        fieldType: field.type,
        inputType: inputTypeFor(field),
        message: `${nodeLabel} ${label} must be ${field.type}${operationLabel ? ` for ${operationLabel}` : ''}.`,
        reason: `${label} has the wrong value type.`,
        helpText: fieldHelp(fieldKey, field),
        docsUrl: field.docsUrl,
        exampleValue: exampleValue(field),
        examples: field.examples,
        nextSteps: [`Open ${nodeLabel} and update ${label}.`],
        recommendations: recommendationsFor(field),
      });
    }
  }

  return issues;
}

function credentialDisplayName(credential: CredentialReadinessInput): string {
  return String(
    credential.displayName ||
    credential.provider ||
    credential.vaultKey ||
    credential.credentialId ||
    'Connection'
  );
}

function actionLabel(action: string | undefined): string {
  if (action === 'connect') return 'Connect';
  if (action === 'select_connection') return 'Select a connection';
  if (action === 'reconnect') return 'Reconnect';
  if (action === 'repair') return 'Repair';
  return 'Review';
}

export function buildCredentialReadinessIssues(input: {
  nodes: WorkflowNode[];
  credentials?: CredentialReadinessInput[];
}): NodeReadinessIssue[] {
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const issues: NodeReadinessIssue[] = [];

  for (const credential of input.credentials || []) {
    if (credential.required === false || credential.satisfied === true) continue;
    const nodeIds = Array.isArray(credential.nodeIds) && credential.nodeIds.length > 0
      ? credential.nodeIds
      : [undefined];
    for (const nodeId of nodeIds) {
      const node = nodeId ? nodesById.get(nodeId) : undefined;
      const nodeType = node ? nodeTypeOf(node) : String(credential.nodeTypes?.[0] || '');
      const def = nodeType ? unifiedNodeRegistry.get(nodeType) : undefined;
      const nodeLabel = node
        ? String((node.data as any)?.label || def?.label || nodeType || node.id)
        : String(def?.label || nodeType || 'This node');
      const displayName = credentialDisplayName(credential);
      const reason = credential.reason || credential.simpleDescription || credential.technicalDescription || `${displayName} is not connected or active.`;
      const operation = credential.operation;
      const operationLabel = credential.operationLabel;
      issues.push({
        kind: 'missing_credential',
        code: 'NODE_MISSING_CREDENTIAL',
        nodeId: credential.nodeId || node?.id || String(nodeId || ''),
        nodeType: credential.nodeType || nodeType,
        nodeLabel: credential.nodeLabel || nodeLabel,
        provider: credential.provider,
        credentialType: credential.type || credential.category,
        credentialTypeId: credential.credentialId,
        credentialId: credential.connectionId || credential.credentialId || credential.vaultKey,
        connectionId: credential.connectionId,
        connectionName: credential.connectionName,
        status: credential.status,
        action: credential.action,
        requiredScopes: credential.requiredScopes || credential.scopes,
        availableScopes: credential.availableScopes,
        operation,
        operationLabel,
        message: `${credential.nodeLabel || nodeLabel} needs ${displayName}${operationLabel ? ` for ${operationLabel}` : ''}.`,
        reason,
        helpText: credential.howToObtain || reason,
        nextSteps: [`${actionLabel(credential.action)} ${displayName}.`],
      });
    }
  }

  return issues;
}

export function buildWorkflowReadinessIssues(input: {
  nodes: WorkflowNode[];
  credentials?: CredentialReadinessInput[];
}): NodeReadinessIssue[] {
  const inputIssues = input.nodes.flatMap((node) => buildNodeInputReadinessIssues({ node }));
  const credentialIssues = buildCredentialReadinessIssues({
    nodes: input.nodes,
    credentials: input.credentials,
  });
  return dedupeReadinessIssues([...credentialIssues, ...inputIssues]);
}

export function dedupeReadinessIssues(issues: NodeReadinessIssue[]): NodeReadinessIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = [
      issue.kind,
      issue.nodeId,
      issue.nodeType,
      issue.provider || '',
      issue.credentialId || '',
      issue.fieldKey || '',
      issue.reason || '',
    ].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildReadinessDetails(issues: NodeReadinessIssue[]): NodeReadinessDetails {
  const readinessIssues = dedupeReadinessIssues(issues);
  const missingInputs = readinessIssues.filter((issue) => issue.kind === 'missing_input');
  const missingCredentials = readinessIssues.filter((issue) => issue.kind === 'missing_credential');
  const invalidInputs = readinessIssues.filter((issue) => issue.kind === 'invalid_input');
  const runtimeValidationIssues = [...missingInputs, ...invalidInputs];

  const grouped = new Map<string, NodeReadinessDetails['issues'][number]>();
  for (const issue of runtimeValidationIssues) {
    if (!issue.fieldKey) continue;
    const groupKey = issue.nodeId || issue.nodeType;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        nodeId: issue.nodeId,
        nodeLabel: issue.nodeLabel,
        nodeType: issue.nodeType,
        operation: issue.operation,
        missingFields: [],
      });
    }
    grouped.get(groupKey)!.missingFields.push({
      fieldName: issue.fieldKey,
      fieldKey: issue.fieldKey,
      friendlyLabel: issue.fieldLabel || humanizeKey(issue.fieldKey),
      fieldLabel: issue.fieldLabel || humanizeKey(issue.fieldKey),
      description: issue.reason || issue.helpText || issue.message,
      reason: issue.reason,
    });
  }
  for (const issue of missingCredentials) {
    const groupKey = issue.nodeId || issue.nodeType;
    if (!groupKey) continue;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        nodeId: issue.nodeId,
        nodeLabel: issue.nodeLabel,
        nodeType: issue.nodeType,
        operation: issue.operation,
        missingFields: [],
      });
    }
    grouped.get(groupKey)!.missingFields.push({
      fieldName: 'connection',
      fieldKey: 'connection',
      friendlyLabel: issue.credentialType || issue.provider || 'Connection',
      fieldLabel: issue.credentialType || issue.provider || 'Connection',
      description: issue.reason || issue.helpText || issue.message,
      reason: issue.reason,
    });
  }

  return {
    readinessIssues,
    missingInputs,
    missingCredentials,
    invalidInputs,
    runtimeValidationIssues,
    missingInputsCount: missingInputs.length,
    missingCredentialsCount: missingCredentials.length,
    invalidInputsCount: invalidInputs.length,
    issues: Array.from(grouped.values()),
  };
}

export function readinessErrorCode(issues: NodeReadinessIssue[]): 'EXECUTION_NOT_READY' | 'EXECUTION_MISSING_INPUTS' | 'EXECUTION_MISSING_CREDENTIALS' {
  const hasCredential = issues.some((issue) => issue.kind === 'missing_credential');
  const hasInput = issues.some((issue) => issue.kind === 'missing_input' || issue.kind === 'invalid_input');
  if (hasCredential && !hasInput) return 'EXECUTION_MISSING_CREDENTIALS';
  if (hasInput && !hasCredential) return 'EXECUTION_MISSING_INPUTS';
  return 'EXECUTION_NOT_READY';
}
