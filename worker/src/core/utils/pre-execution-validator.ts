/**
 * Universal pre-execution config validator.
 *
 * The public return shape is kept for existing GuidedStatusCard consumers, but
 * missing fields now come from the operation-aware readiness resolver.
 */

import { validateWorkflowNodeIntelligence, type NodeFieldIntelligenceIssue } from './node-field-intelligence';
import {
  buildReadinessDetails,
  buildWorkflowReadinessIssues,
} from '../readiness/node-readiness-resolver';

export interface MissingField {
  fieldName: string;
  friendlyLabel: string;
  description: string;
}

export interface ConfigIssue {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  missingFields: MissingField[];
}

export interface ConfigValidationResult {
  valid: boolean;
  issues: ConfigIssue[];
  validationIssues?: NodeFieldIntelligenceIssue[];
  /** Flat list in the format ai-error-guidance.ts expects for GuidedStatusCard */
  missingInputs: Array<{ fieldName: string; nodeLabel: string; description: string }>;
}

const SKIP_TYPES = new Set([
  'trigger',
  'webhook_trigger',
  'schedule_trigger',
  'manual_trigger',
  'log_output',
  'terminal',
  'no_op',
]);

export function validateWorkflowConfig(
  nodes: Array<{
    id: string;
    type: string;
    data?: {
      label?: string;
      config?: Record<string, any>;
      connectionRefs?: Record<string, any>;
      connectionId?: string;
    };
  }>,
): ConfigValidationResult {
  const readinessDetails = buildReadinessDetails(
    buildWorkflowReadinessIssues({
      nodes: nodes
        .filter((node) => !SKIP_TYPES.has(node.type))
        .map((node) => ({
          id: node.id,
          type: node.type,
          position: { x: 0, y: 0 },
          data: {
            type: node.type,
            label: node.data?.label || node.type,
            category: 'custom',
            config: node.data?.config || {},
            connectionRefs: node.data?.connectionRefs,
            connectionId: node.data?.connectionId,
          },
        })) as any,
    })
  );

  const issues: ConfigIssue[] = readinessDetails.issues.map((issue) => ({
    nodeId: issue.nodeId,
    nodeLabel: issue.nodeLabel,
    nodeType: issue.nodeType,
    missingFields: issue.missingFields.map((field) => ({
      fieldName: field.fieldKey,
      friendlyLabel: field.friendlyLabel,
      description: field.description,
    })),
  }));

  const missingInputs = readinessDetails.missingInputs.map((issue) => ({
    fieldName: issue.fieldKey || issue.fieldLabel || 'field',
    fieldKey: issue.fieldKey,
    fieldLabel: issue.fieldLabel,
    nodeId: issue.nodeId,
    nodeType: issue.nodeType,
    nodeLabel: issue.nodeLabel,
    operation: issue.operation,
    operationLabel: issue.operationLabel,
    description: issue.reason || issue.helpText || issue.message,
    helpText: issue.helpText,
    exampleValue: issue.exampleValue,
    examples: issue.examples,
  }));

  const intelligenceIssues = validateWorkflowNodeIntelligence({ nodes: nodes as any, edges: [] });

  return {
    valid: issues.length === 0,
    issues,
    validationIssues: intelligenceIssues,
    missingInputs: missingInputs as ConfigValidationResult['missingInputs'],
  };
}
