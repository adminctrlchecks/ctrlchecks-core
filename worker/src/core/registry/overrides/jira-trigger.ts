import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideJiraTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };

  return {
    ...def,
    type: 'jira_trigger',
    label: 'Jira Trigger',
    category: 'triggers',
    description: 'Trigger workflows on Jira issue created/updated/deleted or comment created/updated/deleted events',
    icon: 'AlertCircle',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Jira connection ID (email + API token).',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      siteUrl: {
        type: 'string',
        description: 'Your Atlassian site domain, e.g. yourcompany.atlassian.net.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      projectKey: {
        type: 'string',
        description: 'Jira project key to scope events to, e.g. PROJ. Leave blank to receive events for all projects the webhook is configured for.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'string',
        description: 'Comma-separated Jira webhook event types to listen for (jira:issue_created, jira:issue_updated, jira:issue_deleted, comment_created, comment_updated, comment_deleted).',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      secretToken: {
        type: 'string',
        description: 'Optional override for the generated webhook secret (sent as ?secret= or X-Jira-Webhook-Secret).',
        required: false,
        ownership: 'credential',
        role: 'config',
        fillMode: manualStatic,
      },
      jql: {
        type: 'string',
        description: 'Optional JQL filter to configure on the Jira webhook itself (set in Jira\'s WebHooks admin UI, not enforced by CtrlChecks).',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the event text.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Jira event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            siteUrl: { type: 'string' },
            cloudId: { type: 'string' },
            issueKey: { type: 'string' },
            issueId: { type: 'string' },
            issueSummary: { type: 'string' },
            issueUrl: { type: 'string' },
            issueType: { type: 'string' },
            issueStatus: { type: 'string' },
            projectKey: { type: 'string' },
            commentBody: { type: 'string' },
            commentUrl: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({ eventTypes: 'jira:issue_created, jira:issue_updated, comment_created' }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      // No required fields — a Jira Trigger node can legitimately listen to all projects
      // covered by the manually-configured Jira webhook (siteUrl/projectKey are optional
      // scoping filters, not identifiers CtrlChecks needs to call any Jira API with).
      void config;
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
