export const QUERY_KEYS = {
  connections: ['connections'] as const,
  credentialTypes: ['credential-types'] as const,
  /** Root key — matches every workflow's connection-status query. */
  workflowConnectionStatusRoot: ['workflow-connection-status'] as const,
  workflowConnectionStatus: (workflowId: string) => ['workflow-connection-status', workflowId] as const,
} as const;
