export type GuidedStatusTone = 'configuration' | 'connection' | 'attention' | 'success';

export interface GuidedStatusContent {
  title: string;
  description: string;
  resolution?: string;
  details?: string;
  missingItems?: string[];
  nextSteps?: string[];
  tone: GuidedStatusTone;
}

type WorkflowIssueInput = unknown;

const VALID_PHASE_CODES = new Set(['PHASE_LOCKED', 'INVALID_PHASE', 'WORKFLOW_INVALID_PHASE']);

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function humanizePhase(phase: string): string {
  if (!phase) return 'workflow setup';
  return phase
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatMissingInput(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return humanizeKey(value);
  if (typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const nodeLabel = getString(item.nodeLabel) || getString(item.nodeName) || getString(item.nodeType) || getString(item.nodeId);
  const fieldName = getString(item.fieldName) || getString(item.field) || getString(item.name);
  const description = getString(item.description);
  const fieldLabel = fieldName ? humanizeKey(fieldName) : 'Required field';
  const prefix = nodeLabel ? `${fieldLabel} for ${nodeLabel}` : fieldLabel;

  return description && description.toLowerCase() !== fieldLabel.toLowerCase() && description !== fieldName
    ? `${prefix} — ${description}`
    : prefix;
}

function formatCredential(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return humanizeKey(value);
  if (typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const direct =
    getString(item.displayName) ||
    getString(item.providerName) ||
    getString(item.name) ||
    getString(item.provider) ||
    getString(item.vaultKey) ||
    getString(item.credentialId);

  if (!direct) return null;

  const nodeLabel = getString(item.nodeLabel) || getString(item.nodeName);
  return nodeLabel ? `${humanizeKey(direct)} for ${nodeLabel}` : humanizeKey(direct);
}

function formatValidationIssue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const issue = getString(item.issue) || getString(item.message) || getString(item.description) || 'Check this node';
  const nodeLabel = getString(item.nodeLabel) || getString(item.nodeName) || getString(item.nodeType) || getString(item.nodeId);
  const fieldName = getString(item.fieldLabel) || getString(item.fieldName) || getString(item.field) || getString(item.name);
  const previousNodeLabel =
    getString(item.previousNodeLabel) ||
    getString(item.previousNodeName) ||
    getString(item.previousNodeType) ||
    getString(item.previousNodeId);

  if (nodeLabel && fieldName) return `${nodeLabel}: ${humanizeKey(fieldName)} - ${issue}`;
  if (fieldName) return `${humanizeKey(fieldName)} - ${issue}`;
  if (previousNodeLabel && nodeLabel) return `${previousNodeLabel} -> ${nodeLabel}: ${issue}`;
  if (nodeLabel) return `${nodeLabel}: ${issue}`;
  return issue;
}

function formatRuntimeValidationIssue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const fieldName = getString(item.fieldLabel) || getString(item.fieldName) || getString(item.field);
  if (!fieldName) return null;

  const nodeLabel = getString(item.nodeLabel) || getString(item.nodeName) || getString(item.nodeType) || getString(item.nodeId);
  const reason = getString(item.reason) || getString(item.description) || getString(item.blockedReason);
  const fieldLabel = humanizeKey(fieldName);
  const prefix = nodeLabel ? `${fieldLabel} for ${nodeLabel}` : fieldLabel;
  return reason && !reason.toLowerCase().includes(fieldName.toLowerCase())
    ? `${prefix} - ${reason}`
    : prefix;
}

function formatRuntimeAuditIssue(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const valid = item.valid;
  const validationStatus = getString(item.validationStatus);
  const fieldName = getString(item.field) || getString(item.fieldName);
  if (!fieldName) return null;
  if (valid !== false && validationStatus !== 'invalid' && !getString(item.blockedReason)) return null;

  const nodeLabel = getString(item.nodeLabel) || getString(item.nodeType) || getString(item.nodeId);
  const errors = Array.isArray(item.errors)
    ? (item.errors as unknown[]).filter((entry): entry is string => typeof entry === 'string')
    : [];
  const reason = errors.join('; ') || getString(item.blockedReason);
  return formatRuntimeValidationIssue({
    fieldName,
    nodeLabel,
    reason,
  });
}

function parseValidationErrorAsInput(value: unknown): string | null {
  if (value && typeof value === 'object') return formatValidationIssue(value);

  const message = getString(value);
  if (!message) return null;

  const runtimeMatch = message.match(/^Required runtime_ai field ['"]?([^'"]+)['"]?/i);
  const requiredMatch = message.match(/^([A-Za-z0-9_.-]+)\s+is\s+required\b/i);
  const prefixMatch = message.match(/^([A-Za-z0-9_.-]+)\s*:/);
  const fieldName = runtimeMatch?.[1] || requiredMatch?.[1] || prefixMatch?.[1];
  return fieldName ? `${humanizeKey(fieldName)} - ${message}` : null;
}

function nestedArray(record: Record<string, unknown>, path: string[]): unknown[] {
  let current: unknown = record;
  for (const part of path) {
    current = toRecord(current)[part];
  }
  return Array.isArray(current) ? current : [];
}

function collectValidationDetails(details: Record<string, unknown>): unknown[] {
  const output = toRecord(details.output);
  return [
    ...(Array.isArray(details.validationErrors) ? details.validationErrors : []),
    ...(Array.isArray(details.errors) ? details.errors : []),
    ...(Array.isArray(details.schemaValidationFailures) ? details.schemaValidationFailures : []),
    ...(Array.isArray(output._validationErrors) ? output._validationErrors : []),
    ...nestedArray(details, ['contractDiagnostics', 'validationErrors']),
    ...nestedArray(details, ['contractDiagnostics', 'errors']),
    ...nestedArray(details, ['diagnostics', 'contract', 'validationErrors']),
    ...nestedArray(details, ['diagnostics', 'contract', 'errors']),
    ...nestedArray(details, ['validationResult', 'errors']),
    ...nestedArray(details, ['validation', 'errors']),
  ];
}

function extractMissingInputs(details: Record<string, unknown>): string[] {
  const raw = Array.isArray(details.missingInputs) ? details.missingInputs : [];
  const items = raw.map(formatMissingInput).filter((item): item is string => Boolean(item));
  if (items.length > 0) return unique(items);

  const runtimeIssues = Array.isArray(details.runtimeValidationIssues) ? details.runtimeValidationIssues : [];
  const runtimeIssueItems = runtimeIssues
    .map(formatRuntimeValidationIssue)
    .filter((item): item is string => Boolean(item));
  if (runtimeIssueItems.length > 0) return unique(runtimeIssueItems);

  const output = toRecord(details.output);
  const runtimeAudit = Array.isArray(details.runtimeInputAudit)
    ? details.runtimeInputAudit
    : Array.isArray(output._runtimeInputAudit)
      ? output._runtimeInputAudit
      : [];
  const handoffAudit = Array.isArray(details.runtimeInputHandoffAudit)
    ? details.runtimeInputHandoffAudit
    : Array.isArray(output._runtimeInputHandoffAudit)
      ? output._runtimeInputHandoffAudit
      : [];
  const auditItems = [...runtimeAudit, ...handoffAudit]
    .map(formatRuntimeAuditIssue)
    .filter((item): item is string => Boolean(item));
  if (auditItems.length > 0) return unique(auditItems);

  const validationItems = collectValidationDetails(details)
    .map(parseValidationErrorAsInput)
    .filter((item): item is string => Boolean(item));
  if (validationItems.length > 0) return unique(validationItems);

  const count = Number(details.missingInputsCount || 0);
  return count > 0 ? [`${count} required input${count === 1 ? '' : 's'} still need values.`] : [];
}

function extractMissingCredentials(details: Record<string, unknown>): string[] {
  const source =
    Array.isArray(details.missingCredentials) ? details.missingCredentials :
    Array.isArray(details.executionValidationMissingCredentials) ? details.executionValidationMissingCredentials :
    [];
  const items = source.map(formatCredential).filter((item): item is string => Boolean(item));
  if (items.length > 0) return unique(items);

  const count = Number(details.missingCredentialsCount || 0);
  return count > 0 ? [`${count} required connection${count === 1 ? '' : 's'} must be connected.`] : [];
}

function extractExecutionValidationIssues(details: Record<string, unknown>): string[] {
  const structured = Array.isArray(details.executionValidationIssues) ? details.executionValidationIssues : [];
  const structuredItems = structured
    .map(formatValidationIssue)
    .filter((item): item is string => Boolean(item));
  if (structuredItems.length > 0) return unique(structuredItems);

  const errors = Array.isArray(details.executionValidationErrors) ? details.executionValidationErrors : [];
  return unique([...errors, ...collectValidationDetails(details)].map(formatValidationIssue).filter((item): item is string => Boolean(item)));
}

function buildReadinessGuidance(payload: Record<string, unknown>, message: string): GuidedStatusContent {
  const details = toRecord(payload.details);
  const currentPhase = getString(payload.currentPhase) || getString(payload.phase) || getString(details.phase);
  const currentStatus = getString(payload.status) || getString(details.status);
  const missingInputs = extractMissingInputs(details);
  const missingCredentials = extractMissingCredentials(details);
  const validationIssues = extractExecutionValidationIssues(details);
  const missingItems = [
    ...missingInputs.map((item) => `Input: ${item}`),
    ...missingCredentials.map((item) => `Connection: ${item}`),
    ...validationIssues.map((item) => `Workflow: ${item}`),
  ];

  const nextSteps: string[] = [];
  if (missingInputs.length > 0) {
    nextSteps.push('Open the listed node in the setup panel and fill each required field.');
  }
  if (missingCredentials.length > 0) {
    nextSteps.push('Open Connections and connect or reconnect each listed account.');
  }
  if (validationIssues.length > 0) {
    nextSteps.push('Review the listed workflow node or connection.');
  }
  nextSteps.push('Save the workflow, then run it again.');

  return {
    title: 'Finish setup before running',
    description:
      'This workflow is not ready yet. Complete the missing setup items below so the run can start cleanly.',
    resolution:
      missingItems.length > 0
        ? 'Everything missing is listed here. Your current progress is preserved.'
        : 'Review required fields and connected accounts, then save again.',
    missingItems,
    nextSteps,
    details: [
      currentPhase ? `Current stage: ${humanizePhase(currentPhase)}` : '',
      currentStatus ? `Status: ${humanizePhase(currentStatus)}` : '',
      message && missingItems.length === 0 ? message : '',
    ].filter(Boolean).join(' | '),
    tone: missingCredentials.length > 0 ? 'connection' : 'configuration',
  };
}

export function mapWorkflowIssueToGuidance(input: WorkflowIssueInput): GuidedStatusContent {
  if (typeof input === 'string') {
    return {
      title: 'Configuration needs one more step',
      description: input,
      resolution: 'Review required fields and continue setup from the workflow panel.',
      tone: 'configuration',
    };
  }

  const payload = toRecord(input);
  const code = getString(payload.code).toUpperCase();
  const message = getString(payload.message) || getString(payload.error) || 'Configuration update is pending.';
  const currentPhase = getString(payload.currentPhase) || getString(payload.phase);
  const normalizedMessage = message.toLowerCase();

  // Provider-specific rejections are checked first: a precise "the service said X" diagnostic
  // must always win over the generic missing-data safety net below. Otherwise an unrelated
  // (or stale) locally-scanned missing field can mask the real, actionable provider error —
  // e.g. Slack rejecting a send with not_in_channel while message/channel are both filled in.
  if (normalizedMessage.includes('not_in_channel')) {
    return {
      title: 'Slack app needs channel access',
      description:
        'The message and channel are filled, but Slack rejected the send because the connected CtrlChecks app is not a member of that channel.',
      resolution:
        'Invite the CtrlChecks Slack app to the selected channel, or choose a channel where the app is already a member.',
      details: message,
      nextSteps: [
        'Open the Slack channel selected in this node.',
        'Invite the CtrlChecks app to that channel, for example with /invite @CtrlChecks.',
        'Run this node again after the app appears in the channel.',
      ],
      tone: 'connection',
    };
  }

  if (normalizedMessage.includes('channel_not_found')) {
    return {
      title: 'Slack channel was not found',
      description:
        'Slack could not match the configured channel to a channel this app can see.',
      resolution:
        'Use the exact channel name or Slack channel ID, then save and run the node again.',
      details: message,
      nextSteps: [
        'Check the channel spelling and casing.',
        'Prefer the Slack channel ID if the name still fails.',
        'Make sure the connected Slack app has access to that channel.',
      ],
      tone: 'connection',
    };
  }

  if (
    code === 'EXECUTION_NOT_READY' ||
    code === 'EXECUTION_MISSING_INPUTS' ||
    code === 'EXECUTION_MISSING_CREDENTIALS' ||
    normalizedMessage.includes('not ready for execution') ||
    normalizedMessage.includes('requires inputs') ||
    normalizedMessage.includes('requires credentials')
  ) {
    return buildReadinessGuidance(payload, message);
  }

  if (code === 'TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS') {
    const details = toRecord(payload.details);
    const drifts = Array.isArray(details.drifts) ? (details.drifts as Record<string, unknown>[]) : [];
    if (drifts.length > 0) {
      const items = drifts.map((d) => {
        const label = getString(d.nodeLabel) || getString(d.nodeType) || 'This node';
        const field = humanizeKey(getString(d.field));
        return `${label} → ${field}`;
      });
      const itemList = items.join(', ');
      const nodeNames = [...new Set(drifts.map((d) => getString(d.nodeLabel) || getString(d.nodeType)).filter(Boolean))];
      const nodeHint = nodeNames.length > 0 ? ` Open the ${nodeNames.join(' or ')} node to review it.` : '';
      return {
        title: 'This structure is locked',
        description: `${itemList} changed shape after this workflow was frozen, so it can't be saved as-is.${nodeHint}`,
        resolution: 'Add a new field or case instead of renaming/retyping an existing one, or undo this change and save again.',
        nextSteps: [
          nodeNames.length > 0 ? `Open the ${nodeNames.join(' or ')} node on the canvas` : 'Open the node that changed',
          `Undo the structural change to: ${itemList}`,
          'Save again — editing labels, options, or other values on existing fields is always allowed',
        ],
        tone: 'configuration',
      };
    }
  }

  // Safety-net: if details carry concrete missing items, always show readiness guidance
  // regardless of error code — prevents fallback from masking real structured data.
  const safetyDetails = toRecord(payload.details);
  const hasMissingData =
    (Array.isArray(safetyDetails.missingCredentials) && (safetyDetails.missingCredentials as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.missingInputs) && (safetyDetails.missingInputs as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.runtimeValidationIssues) && (safetyDetails.runtimeValidationIssues as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.runtimeInputAudit) && (safetyDetails.runtimeInputAudit as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.runtimeInputHandoffAudit) && (safetyDetails.runtimeInputHandoffAudit as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.validationErrors) && (safetyDetails.validationErrors as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.errors) && (safetyDetails.errors as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.schemaValidationFailures) && (safetyDetails.schemaValidationFailures as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.executionValidationIssues) && (safetyDetails.executionValidationIssues as unknown[]).length > 0) ||
    (Array.isArray(safetyDetails.executionValidationErrors) && (safetyDetails.executionValidationErrors as unknown[]).length > 0) ||
    collectValidationDetails(safetyDetails).length > 0 ||
    Number(safetyDetails.missingCredentialsCount || 0) > 0 ||
    Number(safetyDetails.missingInputsCount || 0) > 0;
  if (hasMissingData) {
    return buildReadinessGuidance(payload, message);
  }

  if (
    VALID_PHASE_CODES.has(code) ||
    normalizedMessage.includes('valid phase') ||
    normalizedMessage.includes('attach-inputs first') ||
    normalizedMessage.includes('must be "ready_for_ownership"')
  ) {
    return {
      title: 'Configuration step needed',
      description:
        'Your workflow is safe. This field update needs the setup sequence to finish before it can sync.',
      resolution: currentPhase
        ? `Current stage: ${humanizePhase(currentPhase)}. Complete the required setup step, then save again.`
        : 'Complete required inputs and credentials in order, then save again.',
      details: message,
      tone: 'configuration',
    };
  }

  if (
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('token') ||
    normalizedMessage.includes('session')
  ) {
    return {
      title: 'Connection refresh needed',
      description: 'Please refresh your sign-in session to continue syncing workflow changes.',
      resolution: 'Reconnect your account in this tab and retry.',
      details: message,
      tone: 'connection',
    };
  }

  return {
    title: 'Let us finish this setup smoothly',
    description: 'We could not sync this change yet, but your progress is preserved.',
    resolution: 'Retry after a moment, or continue with manual configuration and save again.',
    details: message,
    tone: 'attention',
  };
}
