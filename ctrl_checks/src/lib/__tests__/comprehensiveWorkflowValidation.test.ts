import { describe, it, expect, vi } from 'vitest';
import type { Node, Edge } from '@xyflow/react';

vi.mock('@xyflow/react', () => ({}));
vi.mock('@/stores/workflowStore', () => ({}));
vi.mock('@/components/workflow/nodeTypes', () => ({
  NODE_TYPES: [
    {
      type: 'manual_trigger',
      label: 'Manual Trigger',
      category: 'triggers',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'http_request',
      label: 'HTTP Request',
      category: 'actions',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [
        { key: 'url', label: 'URL', type: 'text', required: true },
        { key: 'retries', label: 'Retries', type: 'number', required: false },
      ],
    },
    {
      type: 'database_write',
      label: 'Database Write',
      category: 'actions',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [{ key: 'table', label: 'Table', type: 'text', required: true }],
    },
    {
      type: 'database_read',
      label: 'Database Read',
      category: 'actions',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [
        { key: 'table', label: 'Table', type: 'text', required: true },
        { key: 'limit', label: 'Limit', type: 'number', required: false },
      ],
    },
    {
      type: 'schedule',
      label: 'Schedule',
      category: 'triggers',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'set',
      label: 'Set Fields',
      category: 'transformations',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'edit_fields',
      label: 'Edit Fields',
      category: 'transformations',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'json_parser',
      label: 'JSON Parser',
      category: 'transformations',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'if_else',
      label: 'If/Else',
      category: 'flow',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'error_handler',
      label: 'Error Handler',
      category: 'utilities',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'chat_trigger',
      label: 'Chat Trigger',
      category: 'triggers',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'ai_agent',
      label: 'AI Agent',
      category: 'ai',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'ai_chat_model',
      label: 'AI Chat Model',
      category: 'ai',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'memory',
      label: 'Memory',
      category: 'ai',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'google_sheets',
      label: 'Google Sheets',
      category: 'google',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'chat_send',
      label: 'Chat Send',
      category: 'communication',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [],
    },
    {
      type: 'send_email',
      label: 'Send Email',
      category: 'actions',
      icon: '',
      description: '',
      defaultConfig: {},
      configFields: [
        { key: 'to', label: 'To', type: 'text', required: true },
        { key: 'numRetries', label: 'Num Retries', type: 'number', required: false },
        { key: 'enabled', label: 'Enabled', type: 'boolean', required: false },
      ],
    },
  ],
}));

import {
  validateWorkflowComprehensive,
  formatValidationReport,
  type ValidationResult,
} from '../comprehensiveWorkflowValidation';

// ── helpers ──────────────────────────────────────────────────────────────────

function mkNode(
  id: string,
  type: string,
  config: Record<string, unknown> = {},
  category = ''
): Node {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { type, label: id, config, category },
  } as unknown as Node;
}

function mkEdge(source: string, target: string, sourceHandle?: string): Edge {
  return { id: `${source}-${target}`, source, target, sourceHandle } as unknown as Edge;
}

function mkHandledEdge(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
  data?: Record<string, unknown>
): Edge {
  return {
    id: `${source}-${target}-${targetHandle || sourceHandle || 'edge'}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    data,
  } as unknown as Edge;
}

function triggerNode(id = 't1'): Node {
  return mkNode(id, 'manual_trigger', {}, 'triggers');
}

// ── empty workflow ────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — empty workflow', () => {
  it('returns PASS summary with zero issue counts', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.summary.status).toBe('PASS');
    expect(result.summary.totalIssues).toBe(0);
    expect(result.summary.criticalIssues).toBe(0);
    expect(result.summary.warnings).toBe(0);
  });

  it('returns all scores at 100', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.score.configuration).toBe(100);
    expect(result.score.dataIntegrity).toBe(100);
    expect(result.score.errorResilience).toBe(100);
    expect(result.score.security).toBe(100);
    expect(result.score.performance).toBe(100);
    expect(result.score.overall).toBe(100);
  });

  it('returns all matrix categories as PASS', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.matrix.configuration.status).toBe('PASS');
    expect(result.matrix.dataFlow.status).toBe('PASS');
    expect(result.matrix.errorHandling.status).toBe('PASS');
    expect(result.matrix.security.status).toBe('PASS');
    expect(result.matrix.performance.status).toBe('PASS');
    expect(result.matrix.specificNodes.status).toBe('PASS');
  });

  it('returns 6 default test cases', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.testCases).toHaveLength(6);
  });
});

// ── configuration validation ──────────────────────────────────────────────────

describe('validateWorkflowComprehensive — configuration', () => {
  it('unknown node type emits configuration warning', () => {
    const n = mkNode('n1', 'unknown_widget');
    const result = validateWorkflowComprehensive([n], []);
    const cfg = result.issues.filter(i => i.category === 'configuration');
    expect(cfg.length).toBeGreaterThan(0);
    expect(cfg[0].severity).toBe('warning');
    expect(cfg[0].message).toMatch(/Unknown node type/);
  });

  it('missing required field emits critical configuration issue', () => {
    const n = mkNode('n1', 'send_email', {}); // 'to' is required but absent
    const result = validateWorkflowComprehensive([n], []);
    const critical = result.issues.filter(
      i => i.category === 'configuration' && i.severity === 'critical'
    );
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0].message).toMatch(/Required field "To" is missing/);
  });

  it('number field with string value emits critical type mismatch', () => {
    const n = mkNode('n1', 'send_email', { to: 'a@b.com', numRetries: 'five' });
    const result = validateWorkflowComprehensive([n], []);
    const typeMismatch = result.issues.filter(
      i => i.category === 'configuration' && i.severity === 'critical' && i.message.includes('must be a number')
    );
    expect(typeMismatch.length).toBeGreaterThan(0);
  });

  it('boolean field with string value emits critical type mismatch', () => {
    const n = mkNode('n1', 'send_email', { to: 'a@b.com', enabled: 'yes' });
    const result = validateWorkflowComprehensive([n], []);
    const typeMismatch = result.issues.filter(
      i => i.category === 'configuration' && i.severity === 'critical' && i.message.includes('must be a boolean')
    );
    expect(typeMismatch.length).toBeGreaterThan(0);
  });

  it('config value containing single-quoted credential pattern emits security critical', () => {
    // JSON does not escape single quotes so password='...' is searchable in the stringified config
    const n = mkNode('n1', 'send_email', {
      to: 'a@b.com',
      description: "password='supersecret123'",
    });
    const result = validateWorkflowComprehensive([n], []);
    const sec = result.issues.filter(
      i => i.category === 'security' && i.severity === 'critical'
    );
    expect(sec.length).toBeGreaterThan(0);
    expect(sec[0].message).toMatch(/hardcoded credentials/i);
  });

  it('circular edge pair emits configuration critical with cycle description', () => {
    const a = mkNode('a', 'send_email', { to: 'x@y.com' });
    const b = mkNode('b', 'send_email', { to: 'x@y.com' });
    const result = validateWorkflowComprehensive(
      [a, b],
      [mkEdge('a', 'b'), mkEdge('b', 'a')]
    );
    const cycle = result.issues.filter(
      i => i.category === 'configuration' && i.severity === 'critical' && i.message.includes('Circular')
    );
    expect(cycle.length).toBeGreaterThan(0);
  });
});

// ── data flow ─────────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — data flow', () => {
  it('trigger node with no incoming edges does not get orphan warning', () => {
    const t = triggerNode();
    const result = validateWorkflowComprehensive([t], []);
    const orphans = result.issues.filter(
      i => i.category === 'data_flow' && i.message.includes('has no input connections') && i.nodeId === 't1'
    );
    expect(orphans).toHaveLength(0);
  });

  it('non-trigger node with no incoming edge emits data_flow warning', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive([t, a], []); // no edges
    const orphan = result.issues.filter(
      i => i.category === 'data_flow' && i.severity === 'warning' && i.nodeId === 'a1'
    );
    expect(orphan.length).toBeGreaterThan(0);
    expect(orphan[0].message).toMatch(/has no input connections/);
  });

  it('trigger node with no outgoing edges does not get dead-end info', () => {
    const t = triggerNode();
    const result = validateWorkflowComprehensive([t], []);
    const dead = result.issues.filter(
      i => i.category === 'data_flow' && i.severity === 'info' && i.nodeId === 't1'
    );
    expect(dead).toHaveLength(0);
  });

  it('terminal non-trigger node (no outgoing) emits data_flow info', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const dead = result.issues.filter(
      i => i.category === 'data_flow' && i.severity === 'info' && i.nodeId === 'a1'
    );
    expect(dead.length).toBeGreaterThan(0);
    expect(dead[0].message).toMatch(/has no output connections/);
  });

  it('if_else missing true output emits critical data_flow issue', () => {
    const t = triggerNode();
    const ie = mkNode('ie1', 'if_else');
    const b = mkNode('b1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive(
      [t, ie, b],
      [mkEdge('t1', 'ie1'), mkEdge('ie1', 'b1', 'false')]
    );
    const trueMissing = result.issues.filter(
      i => i.category === 'data_flow' && i.severity === 'critical' && i.message.includes('TRUE output')
    );
    expect(trueMissing.length).toBeGreaterThan(0);
  });

  it('if_else missing false output emits warning data_flow issue', () => {
    const t = triggerNode();
    const ie = mkNode('ie1', 'if_else');
    const b = mkNode('b1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive(
      [t, ie, b],
      [mkEdge('t1', 'ie1'), mkEdge('ie1', 'b1', 'true')]
    );
    const falseMissing = result.issues.filter(
      i => i.category === 'data_flow' && i.severity === 'warning' && i.message.includes('FALSE output')
    );
    expect(falseMissing.length).toBeGreaterThan(0);
  });

  it('if_else with both true and false outputs has no missing-path issues', () => {
    const t = triggerNode();
    const ie = mkNode('ie1', 'if_else');
    const yes = mkNode('y1', 'send_email', { to: 'x' });
    const no = mkNode('n1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive(
      [t, ie, yes, no],
      [mkEdge('t1', 'ie1'), mkEdge('ie1', 'y1', 'true'), mkEdge('ie1', 'n1', 'false')]
    );
    const pathIssues = result.issues.filter(
      i => i.category === 'data_flow' && (i.message.includes('TRUE output') || i.message.includes('FALSE output'))
    );
    expect(pathIssues).toHaveLength(0);
  });

  it('does not report AI Agent sidecar attachments as disconnected normal workflow nodes', () => {
    const chat = mkNode('chat', 'chat_trigger', {}, 'triggers');
    const agent = mkNode('agent', 'ai_agent', {}, 'ai');
    const output = mkNode('reply', 'chat_send', {}, 'communication');
    const model = mkNode('model', 'ai_chat_model', {}, 'ai');
    const memory = mkNode('memory', 'memory', {}, 'ai');
    const readSheet = mkNode('read_sheet', 'google_sheets', {}, 'google');
    const writeSheet = mkNode('write_sheet', 'google_sheets', {}, 'google');

    model.data = { ...model.data, agentAttachmentRole: 'chat_model' };
    memory.data = { ...memory.data, agentAttachmentRole: 'memory' };
    readSheet.data = { ...readSheet.data, agentAttachmentRole: 'tool' };
    writeSheet.data = { ...writeSheet.data, agentAttachmentRole: 'tool' };

    const result = validateWorkflowComprehensive(
      [chat, agent, output, model, memory, readSheet, writeSheet],
      [
        mkHandledEdge('chat', 'agent', 'output', 'userInput'),
        mkHandledEdge('agent', 'reply', 'success', 'input'),
        mkHandledEdge('model', 'agent', 'output', 'chat_model', { agentAttachment: true, role: 'chat_model' }),
        mkHandledEdge('memory', 'agent', 'output', 'memory', { agentAttachment: true, role: 'memory' }),
        mkHandledEdge('read_sheet', 'agent', 'output', 'tool', { agentAttachment: true, role: 'tool' }),
        mkHandledEdge('write_sheet', 'agent', 'output', 'tool', { agentAttachment: true, role: 'tool' }),
      ]
    );

    const attachmentNodeIds = new Set(['model', 'memory', 'read_sheet', 'write_sheet']);
    const attachmentFlowIssues = result.issues.filter(
      issue =>
        issue.category === 'data_flow' &&
        issue.nodeId &&
        attachmentNodeIds.has(issue.nodeId)
    );

    expect(attachmentFlowIssues).toEqual([]);
    expect(result.issues.map(issue => issue.message).join('\n')).not.toMatch(/not reachable from trigger/i);
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — error handling', () => {
  it('critical node without error handler emits error_handling warning', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com', retries: 3 });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const warn = result.issues.filter(
      i => i.category === 'error_handling' && i.severity === 'warning'
    );
    expect(warn.length).toBeGreaterThan(0);
    expect(warn[0].message).toMatch(/no error handling mechanism/);
  });

  it('critical node with error_handler node suppresses error_handling warning', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com', retries: 3 });
    const err = mkNode('e1', 'error_handler');
    const result = validateWorkflowComprehensive(
      [t, a, err],
      [mkEdge('t1', 'a1'), mkEdge('a1', 'e1')]
    );
    const warn = result.issues.filter(
      i => i.category === 'error_handling' && i.severity === 'warning'
    );
    expect(warn).toHaveLength(0);
  });

  it('http_request without retries and no error handler emits error_handling info', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com' }); // no retries
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const info = result.issues.filter(
      i => i.category === 'error_handling' && i.severity === 'info'
    );
    expect(info.length).toBeGreaterThan(0);
    expect(info[0].message).toMatch(/no retry configuration/);
  });

  it('http_request with retries does not emit retry info', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com', retries: 3 });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const retryInfo = result.issues.filter(
      i => i.category === 'error_handling' && i.severity === 'info'
    );
    expect(retryInfo).toHaveLength(0);
  });
});

// ── security ──────────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — security', () => {
  it('node label with inline credential pattern emits security critical', () => {
    const n = {
      id: 'n1',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { type: 'send_email', label: "password='mysecretpass'", config: { to: 'x@y.com' }, category: '' },
    } as unknown as Node;
    const result = validateWorkflowComprehensive([n], []);
    const sec = result.issues.filter(
      i => i.category === 'security' && i.severity === 'critical' && i.message.includes('Sensitive data')
    );
    expect(sec.length).toBeGreaterThan(0);
  });

  it('database_write with raw ${} interpolation emits security warning', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_write', {
      table: 'users',
      data: 'INSERT INTO users WHERE id = ${userId}',
    });
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const sqlWarn = result.issues.filter(
      i => i.category === 'security' && i.severity === 'warning' && i.message.includes('SQL injection')
    );
    expect(sqlWarn.length).toBeGreaterThan(0);
  });

  it('database_write with parameterized query does not emit SQL injection warning', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_write', {
      table: 'users',
      data: 'INSERT INTO users WHERE id = ?$1',
    });
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const sqlWarn = result.issues.filter(
      i => i.category === 'security' && i.severity === 'warning' && i.message.includes('SQL injection')
    );
    expect(sqlWarn).toHaveLength(0);
  });
});

// ── performance ───────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — performance', () => {
  it('database_read without limit emits performance warning', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_read', { table: 'orders' }); // no limit
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const perf = result.issues.filter(
      i => i.category === 'performance' && i.severity === 'warning' && i.nodeId === 'db1'
    );
    expect(perf.length).toBeGreaterThan(0);
    expect(perf[0].message).toMatch(/large datasets/);
  });

  it('database_read with limit > 1000 emits performance warning', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_read', { table: 'orders', limit: 5000 });
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const perf = result.issues.filter(
      i => i.category === 'performance' && i.nodeId === 'db1'
    );
    expect(perf.length).toBeGreaterThan(0);
  });

  it('database_read with limit <= 1000 does not emit performance warning', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_read', { table: 'orders', limit: 100 });
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const perf = result.issues.filter(
      i => i.category === 'performance' && i.nodeId === 'db1'
    );
    expect(perf).toHaveLength(0);
  });

  it('transformation chain of 3+ nodes emits performance info', () => {
    const t = triggerNode();
    const s1 = mkNode('s1', 'set');
    const s2 = mkNode('s2', 'edit_fields');
    const s3 = mkNode('s3', 'json_parser');
    const result = validateWorkflowComprehensive(
      [t, s1, s2, s3],
      [mkEdge('t1', 's1'), mkEdge('s1', 's2'), mkEdge('s2', 's3')]
    );
    const chain = result.issues.filter(
      i => i.category === 'performance' && i.severity === 'info' && i.message.includes('transformation chain')
    );
    expect(chain.length).toBeGreaterThan(0);
  });

  it('transformation chain of 2 nodes does not emit performance info', () => {
    const t = triggerNode();
    const s1 = mkNode('s1', 'set');
    const s2 = mkNode('s2', 'edit_fields');
    const result = validateWorkflowComprehensive(
      [t, s1, s2],
      [mkEdge('t1', 's1'), mkEdge('s1', 's2')]
    );
    const chain = result.issues.filter(
      i => i.category === 'performance' && i.severity === 'info' && i.message.includes('transformation chain')
    );
    expect(chain).toHaveLength(0);
  });
});

// ── specific node checks ──────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — specific node checks', () => {
  it('schedule node without time or cron emits specific_node critical', () => {
    const n = mkNode('s1', 'schedule', {}); // no time, no cron
    const result = validateWorkflowComprehensive([n], []);
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.severity === 'critical' && i.nodeId === 's1'
    );
    expect(specific.length).toBeGreaterThan(0);
    expect(specific[0].message).toMatch(/missing time or cron/);
  });

  it('schedule node with time set emits no specific_node issue', () => {
    const n = mkNode('s1', 'schedule', { time: '09:00' });
    const result = validateWorkflowComprehensive([n], []);
    const specific = result.issues.filter(i => i.category === 'specific_node' && i.nodeId === 's1');
    expect(specific).toHaveLength(0);
  });

  it('http_request with empty url emits specific_node critical', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: '' });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.severity === 'critical' && i.nodeId === 'a1'
    );
    expect(specific.length).toBeGreaterThan(0);
    expect(specific[0].message).toMatch(/missing URL/);
  });

  it('http_request with url missing protocol emits specific_node warning', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'example.com/api' });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.severity === 'warning' && i.nodeId === 'a1'
    );
    expect(specific.length).toBeGreaterThan(0);
    expect(specific[0].message).toMatch(/should start with http/);
  });

  it('http_request with valid https url emits no specific_node url issue', () => {
    const t = triggerNode();
    const err = mkNode('e1', 'error_handler');
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com/data', retries: 3 });
    const result = validateWorkflowComprehensive(
      [t, a, err],
      [mkEdge('t1', 'a1'), mkEdge('a1', 'e1')]
    );
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.nodeId === 'a1' && i.message.includes('URL')
    );
    expect(specific).toHaveLength(0);
  });

  it('database_write with missing table emits specific_node critical', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_write', {}); // no table
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.severity === 'critical' && i.nodeId === 'db1'
    );
    expect(specific.length).toBeGreaterThan(0);
    expect(specific[0].message).toMatch(/missing table name/);
  });

  it('database_read with missing table emits specific_node critical', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_read', {}); // no table
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const specific = result.issues.filter(
      i => i.category === 'specific_node' && i.severity === 'critical' && i.nodeId === 'db1'
    );
    expect(specific.length).toBeGreaterThan(0);
  });
});

// ── summary status ────────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — summary status', () => {
  it('no issues → PASS', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.summary.status).toBe('PASS');
  });

  it('warnings but no criticals → WARNING', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'send_email', { to: 'x' });
    // a1 has no incoming → data_flow warning; schedule not used so no criticals
    const result = validateWorkflowComprehensive([t, a], []);
    expect(result.summary.status).toBe('WARNING');
    expect(result.summary.criticalIssues).toBe(0);
    expect(result.summary.warnings).toBeGreaterThan(0);
  });

  it('at least one critical issue → FAIL', () => {
    const a = mkNode('a', 'send_email', {}); // required 'to' missing → critical
    const b = mkNode('b', 'send_email', {}); // required 'to' missing → critical
    const result = validateWorkflowComprehensive([a, b], [mkEdge('a', 'b'), mkEdge('b', 'a')]);
    expect(result.summary.status).toBe('FAIL');
    expect(result.summary.criticalIssues).toBeGreaterThan(0);
  });
});

// ── score calculation ─────────────────────────────────────────────────────────

describe('validateWorkflowComprehensive — score calculation', () => {
  it('all category scores are 100 when no issues', () => {
    const result = validateWorkflowComprehensive([], []);
    expect(result.score.overall).toBe(100);
    expect(result.score.dataIntegrity).toBe(100);
    expect(result.score.errorResilience).toBe(100);
  });

  it('critical data_flow issue reduces dataIntegrity below 100', () => {
    const t = triggerNode();
    const ie = mkNode('ie1', 'if_else');
    const b = mkNode('b1', 'send_email', { to: 'x' });
    const result = validateWorkflowComprehensive(
      [t, ie, b],
      [mkEdge('t1', 'ie1'), mkEdge('ie1', 'b1', 'false')] // missing true handle → critical
    );
    expect(result.score.dataIntegrity).toBeLessThan(100);
  });

  it('single error_handling warning reduces errorResilience to 90', () => {
    // http_request with retries → no retry info, but critical node with no handler → warning
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com', retries: 3 });
    const result = validateWorkflowComprehensive([t, a], [mkEdge('t1', 'a1')]);
    // 1 error_handling warning → 100 - 10 = 90
    expect(result.score.errorResilience).toBe(90);
  });

  it('overall score is average of five category scores', () => {
    const result = validateWorkflowComprehensive([], []);
    const avg = Math.round(
      (result.score.configuration + result.score.dataIntegrity +
       result.score.errorResilience + result.score.security + result.score.performance) / 5
    );
    expect(result.score.overall).toBe(avg);
  });
});

// ── test case recommendations ─────────────────────────────────────────────────

describe('validateWorkflowComprehensive — test case recommendations', () => {
  it('rate limit test becomes recommended when http_request node present', () => {
    const t = triggerNode();
    const a = mkNode('a1', 'http_request', { url: 'https://api.example.com', retries: 3 });
    const err = mkNode('e1', 'error_handler');
    const result = validateWorkflowComprehensive(
      [t, a, err],
      [mkEdge('t1', 'a1'), mkEdge('a1', 'e1')]
    );
    const tc = result.testCases.find(c => c.name === 'Test rate limit simulation');
    expect(tc?.recommended).toBe(true);
  });

  it('max data size test becomes recommended when database_read node present', () => {
    const t = triggerNode();
    const db = mkNode('db1', 'database_read', { table: 'orders', limit: 100 });
    const result = validateWorkflowComprehensive([t, db], [mkEdge('t1', 'db1')]);
    const tc = result.testCases.find(c => c.name === 'Test with maximum data size');
    expect(tc?.recommended).toBe(true);
  });

  it('rate limit test is not recommended without http_request node', () => {
    const result = validateWorkflowComprehensive([], []);
    const tc = result.testCases.find(c => c.name === 'Test rate limit simulation');
    expect(tc?.recommended).toBe(false);
  });
});

// ── formatValidationReport ────────────────────────────────────────────────────

function minimalResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    summary: { status: 'PASS', totalIssues: 0, criticalIssues: 0, warnings: 0, recommendations: 0 },
    issues: [],
    matrix: {
      configuration: { status: 'PASS', issues: 0, details: '0 issues found in node configurations' },
      dataFlow: { status: 'PASS', issues: 0, details: '0 issues found in data flow' },
      errorHandling: { status: 'PASS', issues: 0, details: '0 issues found in error handling' },
      security: { status: 'PASS', issues: 0, details: '0 security issues found' },
      performance: { status: 'PASS', issues: 0, details: '0 performance issues found' },
      specificNodes: { status: 'PASS', issues: 0, details: '0 node-specific issues found' },
    },
    recommendations: [],
    score: {
      configuration: 100,
      dataIntegrity: 100,
      errorResilience: 100,
      security: 100,
      performance: 100,
      overall: 100,
    },
    testCases: [
      { name: 'Test with empty input', recommended: true },
      { name: 'Test with malformed input', recommended: true },
      { name: 'Test with maximum data size', recommended: false },
      { name: 'Test rate limit simulation', recommended: false },
      { name: 'Test concurrent execution', recommended: false },
      { name: 'Test recovery from failure', recommended: true },
    ],
    ...overrides,
  };
}

describe('formatValidationReport', () => {
  it('includes workflow name when provided', () => {
    const report = formatValidationReport(minimalResult(), 'My Test Workflow');
    expect(report).toContain('Workflow: My Test Workflow');
  });

  it('does not include Workflow: line when name omitted', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).not.toContain('Workflow:');
  });

  it('PASS status renders check-mark icon', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).toContain('✅ PASS');
  });

  it('WARNING status renders warning icon', () => {
    const result = minimalResult({
      summary: { status: 'WARNING', totalIssues: 1, criticalIssues: 0, warnings: 1, recommendations: 0 },
    });
    const report = formatValidationReport(result);
    expect(report).toContain('⚠️ WARNING');
  });

  it('FAIL status renders cross icon', () => {
    const result = minimalResult({
      summary: { status: 'FAIL', totalIssues: 1, criticalIssues: 1, warnings: 0, recommendations: 0 },
    });
    const report = formatValidationReport(result);
    expect(report).toContain('❌ FAIL');
  });

  it('includes VALIDATION MATRIX section with category rows', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).toContain('VALIDATION MATRIX');
    expect(report).toContain('Configuration');
    expect(report).toContain('Data Flow');
    expect(report).toContain('Error Handling');
  });

  it('includes VALIDATION SCORE section with overall score', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).toContain('VALIDATION SCORE');
    expect(report).toContain('Overall Score: 100%');
  });

  it('includes RECOMMENDED TEST CASES section', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).toContain('RECOMMENDED TEST CASES');
    expect(report).toContain('Test with empty input');
  });

  it('recommended test cases use ✅ and non-recommended use ◯', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).toContain('✅ Test with empty input');
    expect(report).toContain('◯ Test with maximum data size');
  });

  it('includes DETAILED FINDINGS section when issues are present', () => {
    const result = minimalResult({
      summary: { status: 'WARNING', totalIssues: 1, criticalIssues: 0, warnings: 1, recommendations: 1 },
      issues: [{
        nodeId: 'n1',
        nodeLabel: 'My Node',
        category: 'data_flow',
        severity: 'warning',
        message: 'Node has no input connections.',
        fix: 'Connect the node to a source.',
      }],
    });
    const report = formatValidationReport(result);
    expect(report).toContain('DETAILED FINDINGS');
    expect(report).toContain('Node has no input connections.');
    expect(report).toContain('Connect the node to a source.');
  });

  it('does not include DETAILED FINDINGS when there are no issues', () => {
    const report = formatValidationReport(minimalResult());
    expect(report).not.toContain('DETAILED FINDINGS');
  });

  it('includes RECOMMENDATIONS section when recommendations present', () => {
    const result = minimalResult({ recommendations: ['Address all critical issues.'] });
    const report = formatValidationReport(result);
    expect(report).toContain('RECOMMENDATIONS');
    expect(report).toContain('Address all critical issues.');
  });

  it('critical severity issue uses ❌ icon in detailed findings', () => {
    const result = minimalResult({
      summary: { status: 'FAIL', totalIssues: 1, criticalIssues: 1, warnings: 0, recommendations: 0 },
      issues: [{ category: 'configuration', severity: 'critical', message: 'Critical config error.' }],
    });
    const report = formatValidationReport(result);
    expect(report).toContain('❌');
    expect(report).toContain('CRITICAL');
  });

  it('info severity issue uses ℹ️ icon in detailed findings', () => {
    const result = minimalResult({
      summary: { status: 'PASS', totalIssues: 1, criticalIssues: 0, warnings: 0, recommendations: 0 },
      issues: [{ category: 'performance', severity: 'info', message: 'Consider optimizing.' }],
    });
    const report = formatValidationReport(result);
    expect(report).toContain('ℹ️');
  });

  it('issue location line is included when location field is set', () => {
    const result = minimalResult({
      issues: [{
        category: 'configuration',
        severity: 'critical',
        message: 'Missing field.',
        location: 'Node: n1, Field: url',
      }],
    });
    const report = formatValidationReport(result);
    expect(report).toContain('Location: Node: n1, Field: url');
  });
});
