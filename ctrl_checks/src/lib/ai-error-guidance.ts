import { ENDPOINTS } from '@/config/endpoints';
import { mapWorkflowIssueToGuidance, type GuidedStatusContent } from '@/lib/workflow-guidance';

export interface AIGuidanceErrorData {
  code?: string;
  message?: string;
  hint?: string;
  details?: Record<string, unknown>;
  operation?: string;
}

export interface AIGuidanceWorkflowContext {
  name?: string;
  intent?: string;
  nodeType?: string;
  phase?: string;
  provider?: string;
  operation?: string;
  missingInputs?: Array<{ fieldName: string; nodeLabel: string; description?: string }>;
  missingCredentials?: Array<{ provider: string; displayName: string }>;
  validationErrors?: string[];
  runtimeValidationIssues?: Array<{
    type?: string;
    nodeId?: string;
    nodeType?: string;
    nodeLabel?: string;
    fieldName?: string;
    fieldLabel?: string;
    description?: string;
    reason?: string;
    fillMode?: string;
    source?: string;
  }>;
  runtimeInputAudit?: unknown[];
  runtimeInputHandoffAudit?: unknown[];
  executionValidationErrors?: string[];
  executionValidationIssues?: Array<{
    type?: string;
    severity?: string;
    issue?: string;
    nodeLabel?: string;
    nodeType?: string;
    previousNodeLabel?: string;
    previousNodeType?: string;
  }>;
  structuralDrifts?: Array<{
    nodeId?: string;
    nodeLabel?: string;
    nodeType?: string;
    field: string;
    changedKeys?: string[];
  }>;
}

/**
 * Fetches AI-generated guidance from the backend.
 * Falls back to static rule-based guidance on any failure.
 */
export async function getAIGuidance(
  errorData: AIGuidanceErrorData,
  workflowContext?: AIGuidanceWorkflowContext
): Promise<GuidedStatusContent> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ENDPOINTS.itemBackend}/api/ai/error-guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorCode: errorData.code,
        errorMessage: errorData.message,
        hint: errorData.hint,
        context: {
          workflowName: workflowContext?.name,
          workflowIntent: workflowContext?.intent,
          nodeType: workflowContext?.nodeType,
          phase: workflowContext?.phase || (errorData.details as any)?.phase,
          provider: workflowContext?.provider,
          operation: workflowContext?.operation || errorData.operation,
          missingInputs:
            workflowContext?.missingInputs ||
            (Array.isArray((errorData.details as any)?.missingInputs)
              ? (errorData.details as any).missingInputs
              : undefined),
          missingCredentials:
            workflowContext?.missingCredentials ||
            (Array.isArray((errorData.details as any)?.missingCredentials)
              ? (errorData.details as any).missingCredentials
              : undefined),
          validationErrors:
            workflowContext?.validationErrors ||
            (Array.isArray((errorData.details as any)?.validationErrors)
              ? (errorData.details as any).validationErrors
              : Array.isArray((errorData.details as any)?.output?._validationErrors)
                ? (errorData.details as any).output._validationErrors
                : undefined),
          runtimeValidationIssues:
            workflowContext?.runtimeValidationIssues ||
            (Array.isArray((errorData.details as any)?.runtimeValidationIssues)
              ? (errorData.details as any).runtimeValidationIssues
              : undefined),
          runtimeInputAudit:
            workflowContext?.runtimeInputAudit ||
            (Array.isArray((errorData.details as any)?.runtimeInputAudit)
              ? (errorData.details as any).runtimeInputAudit
              : Array.isArray((errorData.details as any)?.output?._runtimeInputAudit)
                ? (errorData.details as any).output._runtimeInputAudit
                : undefined),
          runtimeInputHandoffAudit:
            workflowContext?.runtimeInputHandoffAudit ||
            (Array.isArray((errorData.details as any)?.runtimeInputHandoffAudit)
              ? (errorData.details as any).runtimeInputHandoffAudit
              : Array.isArray((errorData.details as any)?.output?._runtimeInputHandoffAudit)
                ? (errorData.details as any).output._runtimeInputHandoffAudit
                : undefined),
          executionValidationErrors:
            workflowContext?.executionValidationErrors ||
            (Array.isArray((errorData.details as any)?.executionValidationErrors)
              ? (errorData.details as any).executionValidationErrors
              : undefined),
          executionValidationIssues:
            workflowContext?.executionValidationIssues ||
            (Array.isArray((errorData.details as any)?.executionValidationIssues)
              ? (errorData.details as any).executionValidationIssues
              : undefined),
          structuralDrifts:
            workflowContext?.structuralDrifts ||
            (Array.isArray((errorData.details as any)?.drifts)
              ? (errorData.details as any).drifts
              : undefined),
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json() as {
      title?: string;
      description?: string;
      resolution?: string;
      nextSteps?: string[];
      tone?: string;
    };

    if (data.title && data.description) {
      return {
        title: data.title,
        description: data.description,
        resolution: data.resolution,
        nextSteps: data.nextSteps,
        tone: (data.tone as GuidedStatusContent['tone']) || 'attention',
      };
    }
  } catch {
    // Network error, timeout, or AI failure — fall through to static guidance
  }

  return mapWorkflowIssueToGuidance(errorData);
}
