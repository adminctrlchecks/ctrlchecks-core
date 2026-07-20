import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGithubTrigger(
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
    type: 'github_trigger',
    label: 'GitHub Trigger',
    category: 'triggers',
    description: 'Trigger workflows on GitHub push, issue, pull request, release, or comment events',
    icon: 'GitBranch',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved GitHub connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      owner: {
        type: 'string',
        description: 'GitHub repository owner (user or organization).',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      repo: {
        type: 'string',
        description: 'GitHub repository name.',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'string',
        description: 'Comma-separated GitHub event types to listen for (push, issues, pull_request, release, issue_comment, ...).',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      webhookSecret: {
        type: 'string',
        description: 'Optional override for the generated webhook signing secret.',
        required: false,
        ownership: 'credential',
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
        description: 'Normalized GitHub event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            repository: { type: 'string' },
            action: { type: 'string' },
            ref: { type: 'string' },
            commits: { type: 'array' },
            issueNumber: { type: 'number' },
            issueTitle: { type: 'string' },
            issueUrl: { type: 'string' },
            prNumber: { type: 'number' },
            prTitle: { type: 'string' },
            prUrl: { type: 'string' },
            merged: { type: 'boolean' },
            releaseTag: { type: 'string' },
            releaseName: { type: 'string' },
            commentBody: { type: 'string' },
            commentUrl: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['owner', 'repo'],
    defaultConfig: () => ({ eventTypes: 'push, issues, pull_request, release, issue_comment' }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config?.owner || '').trim()) {
        errors.push('A GitHub repository owner is required.');
      }
      if (!String(config?.repo || '').trim()) {
        errors.push('A GitHub repository name is required.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
