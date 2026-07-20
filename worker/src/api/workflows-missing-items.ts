/**
 * GET /api/workflows/:workflowId/missing-items
 *
 * Returns unified list of missing credentials and sensitive inputs for a workflow.
 * Input discovery still comes from getUnifiedMissingItems (wizard-phase discovery),
 * but credential readiness is delegated to the scope-aware
 * workflow-connection-readiness service, which reconciles saved `connections`
 * rows against runtime `unified_credentials` (including node-specific scopes
 * such as Gmail `gmail.send`).
 *
 * Response is backward compatible: the legacy `credentials` array is preserved
 * (readiness-covered providers are re-derived from readiness rows), and the new
 * `connectionReadiness` envelope is returned alongside it.
 */

import { Request, Response } from 'express';
import { getUnifiedMissingItems } from '../services/ai/credential-input-discovery';
import {
  getWorkflowConnectionReadiness,
  canonicalProvider,
  type WorkflowConnectionReadinessResponse,
  type ConnectionReadinessRow,
} from '../services/workflow-connection-readiness';
import { getDbClient } from '../core/database/aws-db-client';
import { logger } from '../core/logger';

/** Human-readable provider display names */
const PROVIDER_DISPLAY: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  salesforce: 'Salesforce',
  zoho: 'Zoho',
  youtube: 'YouTube',
};

function providerDisplayName(provider: string): string {
  return PROVIDER_DISPLAY[provider.toLowerCase()] ?? (provider.charAt(0).toUpperCase() + provider.slice(1));
}

export default async function getMissingItemsHandler(req: Request, res: Response) {
  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId is required' });
    }

    // Extract user ID from auth header (optional — readiness needs it for credential lookup)
    const db = getDbClient();
    const authHeader = req.headers.authorization;
    let userId: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) {
        try {
          const { data: { user }, error: authError } = await db.auth.getUser(token);
          if (!authError && user) userId = user.id;
        } catch {
          // non-fatal
        }
      }
    }

    logger.info(`[MissingItems] Getting missing items for workflow ${workflowId}, userId=${userId || 'anonymous'}`);

    // ── 1. Standard unified discovery (credentials + inputs) ─────────────
    const missingItems = await getUnifiedMissingItems(workflowId, userId);

    // ── 2. Authoritative scope-aware connection readiness ─────────────────
    // discoverCredentials() sometimes silently discards credentials when the
    // node config has credentialId set to a string alias ("google") rather than
    // a real UUID, and can also report a provider as missing even though a
    // scope-covering unified credential exists. The readiness service checks
    // unified_credentials by provider + node-required scopes and reconciles
    // against saved connections rows, so it is authoritative for both cases.
    let connectionReadiness: WorkflowConnectionReadinessResponse | undefined;

    if (userId) {
      try {
        // Load the workflow nodes so we can run the readiness check
        const { data: workflowRow } = await db
          .from('workflows')
          .select('nodes, graph')
          .eq('id', workflowId)
          .single();

        if (workflowRow) {
          const graphData =
            typeof workflowRow.graph === 'string'
              ? JSON.parse(workflowRow.graph)
              : workflowRow.graph || {};
          const nodes: any[] = workflowRow.nodes || graphData.nodes || [];

          connectionReadiness = await getWorkflowConnectionReadiness({
            workflowId,
            userId,
            nodes,
            includeSatisfied: true,
          });

          // Rebuild the legacy credentials array for readiness-covered
          // providers from readiness rows, so the two never disagree.
          const readinessProviders = new Set(connectionReadiness.rows.map((row) => row.provider));
          const untouched = missingItems.credentials.filter(
            (cred) => !readinessProviders.has(canonicalProvider(cred.provider)),
          );

          const byProvider = new Map<string, ConnectionReadinessRow[]>();
          for (const row of connectionReadiness.rows) {
            const list = byProvider.get(row.provider) || [];
            list.push(row);
            byProvider.set(row.provider, list);
          }

          const derived = Array.from(byProvider.entries()).map(([provider, rows]) => {
            const notReady = rows.filter((row) => row.status !== 'ready');
            const relevant = notReady.length > 0 ? notReady : rows;
            return {
              provider,
              type: 'oauth' as const,
              nodes: Array.from(new Set(relevant.map((row) => row.nodeId))),
              fields: [],
              displayName: providerDisplayName(provider),
              vaultKey: provider,
              scopes: Array.from(new Set(relevant.flatMap((row) => row.requiredScopes))),
              satisfied: notReady.length === 0,
            };
          });

          missingItems.credentials = [...untouched, ...derived];

          // Rebuild display summary
          const missingCount = missingItems.credentials.filter((c) => c.satisfied === false).length;
          if (missingItems.display) {
            missingItems.display.summary.missingCredentialCount = missingCount;
          }
        }
      } catch (readinessErr) {
        // Non-fatal — return whatever discoverCredentials found
        logger.warn('[MissingItems] Connection readiness check failed (non-fatal):', readinessErr);
      }
    }

    return res.json({
      success: true,
      workflowId,
      ...missingItems,
      ...(connectionReadiness ? { connectionReadiness } : {}),
    });
  } catch (error: any) {
    logger.error('[MissingItems] Error:', error);
    return res.status(500).json({
      error: 'Failed to get missing items',
      message: error.message || 'Unknown error',
    });
  }
}
