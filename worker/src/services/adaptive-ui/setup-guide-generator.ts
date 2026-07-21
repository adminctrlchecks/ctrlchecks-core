/**
 * Adaptive UI Engine — Setup Guide Generator
 *
 * Pure reshaping of the existing readiness/missing-items envelopes
 * (`getWorkflowConnectionReadiness`, `getUnifiedMissingItems`) into the flat
 * `SetupGuideItem[]` list the Adaptive UI response exposes. No new
 * credential or validation logic is introduced here.
 *
 * There is no "validation warnings" field anywhere in the existing
 * missing-items/readiness envelopes (confirmed before writing this) — so
 * `kind: 'validation'` items are never fabricated here. If that data source
 * is added later, this generator is the only place that needs to change.
 */

import type { UnifiedMissingItems } from '../ai/credential-input-discovery';
import type { WorkflowConnectionReadinessResponse } from '../workflow-connection-readiness';
import type { SetupGuideItem, SetupGuideItemStatus } from './types';

function displayName(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function buildSetupGuide(
  missingItems: UnifiedMissingItems | null,
  connectionReadiness: WorkflowConnectionReadinessResponse | null,
): SetupGuideItem[] {
  const items: SetupGuideItem[] = [];

  if (connectionReadiness) {
    for (const row of connectionReadiness.missing) {
      items.push({
        id: `credential:${row.provider}:${row.nodeId}`,
        kind: 'credential',
        status: row.status as SetupGuideItemStatus,
        label: `Connect ${displayName(row.provider)}`,
        description: row.reason,
        provider: row.provider,
        nodeId: row.nodeId,
        nodeLabel: row.nodeLabel,
        actionRoute: '/connections',
      });
    }
  } else if (missingItems) {
    for (const cred of missingItems.credentials) {
      if (cred.satisfied) continue;
      items.push({
        id: `credential:${cred.vaultKey}:${cred.nodes.join(',') || 'any'}`,
        kind: 'credential',
        status: 'missing',
        label: `Connect ${cred.displayName}`,
        provider: cred.provider,
        actionRoute: '/connections',
      });
    }
  }

  if (missingItems) {
    for (const input of missingItems.inputs) {
      items.push({
        id: `input:${input.nodeId}:${input.fieldName}`,
        kind: 'input',
        status: 'missing',
        label: `Fill in "${input.fieldName}" on ${input.nodeLabel}`,
        description: input.description,
        nodeId: input.nodeId,
        nodeLabel: input.nodeLabel,
      });
    }
  }

  return items;
}
