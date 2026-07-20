import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGitlabTrigger(
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
    type: 'gitlab_trigger',
    label: 'GitLab Trigger',
    category: 'triggers',
    description: 'Trigger workflows on GitLab push, issue, merge request, comment, tag push, pipeline, or release events',
    icon: 'GitBranch',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved GitLab connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      baseUrl: {
        type: 'string',
        description: 'GitLab instance base URL. Use https://gitlab.com for GitLab.com, or your self-hosted GitLab URL.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      projectId: {
        type: 'string',
        description: 'GitLab project ID (numeric) or URL-encoded path (e.g. group%2Fproject).',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'string',
        description: 'Comma-separated GitLab event types to listen for (push, issue, merge_request, note, tag_push, pipeline, release).',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      secretToken: {
        type: 'string',
        description: 'Optional override for the generated X-Gitlab-Token webhook secret.',
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
        description: 'Normalized GitLab event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            projectId: { type: 'string' },
            projectName: { type: 'string' },
            action: { type: 'string' },
            ref: { type: 'string' },
            commits: { type: 'array' },
            issueIid: { type: 'number' },
            issueTitle: { type: 'string' },
            issueUrl: { type: 'string' },
            mrIid: { type: 'number' },
            mrTitle: { type: 'string' },
            mrUrl: { type: 'string' },
            mrState: { type: 'string' },
            noteBody: { type: 'string' },
            noteUrl: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['projectId'],
    defaultConfig: () => ({ baseUrl: 'https://gitlab.com', eventTypes: 'push, issue, merge_request, note' }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config?.projectId || '').trim()) {
        errors.push('A GitLab project ID (or URL-encoded path) is required.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
