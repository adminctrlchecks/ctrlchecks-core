/**
 * Template library contract — every shipped template must be executable.
 *
 * The 2026-07-31 audit found 17 of 20 live templates carried a defect that made
 * them fail or silently misbehave on first run. None of those defects were
 * structural (node types and graph shape had been verified); every single one was
 * a RUNTIME DATA CONTRACT violation that only shows up when a workflow actually
 * executes — and no template had ever been executed.
 *
 * This suite is the gate that stops that recurring. It runs against the real
 * registry and the real resolver rules, over the corrected template sources in
 * `ctrl_checks/templates/src/`. Every assertion here corresponds to a defect that
 * was actually found in production data, not a hypothetical.
 *
 * If you add or edit a template, edit `ctrl_checks/templates/apply-fixes.cjs` and
 * regenerate — do not hand-edit the JSON.
 */

import * as fs from 'fs';
import * as path from 'path';
import { nodeLibrary, isValidCanonicalNodeType } from '../../../services/nodes/node-library';

// Overridable so the same rules can be pointed at the pre-fix snapshot to prove
// the gate has teeth: TEMPLATE_SRC_DIR=... npx jest template-library-contract
const TEMPLATE_DIR =
  process.env.TEMPLATE_SRC_DIR ?? path.resolve(__dirname, '../../../../../ctrl_checks/templates/src');

interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { type: string; label: string; category: string; icon: string; config: Record<string, unknown> };
}
interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  tags?: string[];
}

/**
 * The note registry, extracted from the repo's own 176 doc pages by
 * ctrl_checks/templates/extract-registry-notes.cjs. It is the authority on which
 * family each node belongs to.
 */
const REGISTRY: Record<string, { nodeCategory: string | null; docsCategory: string | null }> =
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../../../../ctrl_checks/templates/registry-notes.json'),
      'utf8',
    ),
  );

/** The two generic internal DB nodes have no doc page; they are database nodes. */
const CATEGORY_FALLBACK: Record<string, string> = {
  database_read: 'database',
  database_write: 'database',
};

/**
 * Node types the FRONTEND catalog knows about. Parsed from nodeTypes.ts rather than
 * imported, because that file is a React module the worker's Jest config cannot load.
 * This is the set `workflowValidation.ts` validates a copied template against.
 */
const FRONTEND_NODE_TYPES: Set<string> = new Set(
  [
    ...fs
      .readFileSync(
        path.resolve(__dirname, '../../../../../ctrl_checks/src/components/workflow/nodeTypes.ts'),
        'utf8',
      )
      .matchAll(/^\s{4}type: '([a-z0-9_]+)',$/gm),
  ].map((m) => m[1]),
);

const templates: Template[] = fs
  .readdirSync(TEMPLATE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf8')));

const eachTemplate = templates.map((t) => [t.name, t] as [string, Template]);

/** Node types that start a workflow. Mirrors the trigger lists in execute-workflow.ts. */
const TRIGGER_TYPES = new Set([
  'manual_trigger',
  'webhook',
  'schedule',
  'interval',
  'form',
  'chat_trigger',
  'telegram_trigger',
  'workflow_trigger',
]);

/**
 * Expression prefixes `universal-template-resolver.ts` actually implements.
 * Anything else in a {{...}} is resolved as a bare key lookup and, failing that,
 * passed through as a literal string — which is how `{{$now}}` ended up written
 * into an Airtable cell verbatim.
 */
const SUPPORTED_PREFIXES = ['$json.', 'json.', 'input.', 'trigger.'];

/**
 * Config keys the executor reads but the registry does not (yet) declare.
 * Keeping this list explicit means a genuinely unknown key still fails the test.
 */
const RUNTIME_ONLY_KEYS: Record<string, string[]> = {
  javascript: ['code', 'timeout'],
  log_output: ['level', 'message'],
  memory: ['operation', 'memoryType', 'maxMessages'],
  database_read: ['table', 'columns', 'filters', 'limit', 'orderBy'],
  database_write: ['table', 'operation', 'dataTemplate'],
  slack_webhook: ['message', 'username', 'webhookUrl'],
  slack_message: ['channel', 'message'],
  whatsapp: ['to', 'text', 'resource', 'operation'],
  google_gmail: ['to', 'body', 'subject', 'operation', 'recipientEmails', 'recipientSource'],
  google_sheets: ['range', 'values', 'operation', 'sheetName', 'spreadsheetId'],
  google_drive: ['operation'],
  http_request: ['url', 'method', 'headers', 'timeout'],
  openai_gpt: ['model', 'prompt', 'temperature', 'memory'],
  google_gemini: ['model', 'prompt', 'temperature'],
  ai_agent: ['model', 'userInput', 'systemPrompt', 'temperature'],
  form: ['fields', 'formTitle', 'formDescription', 'submitButtonText', 'successMessage'],
  schedule: ['cron', 'timezone'],
  webhook: ['method'],
  hubspot: ['id', 'resource', 'operation', 'properties'],
  merge: [],
  chat_trigger: [],
  if_else: ['conditions', 'combineOperation'],
  switch: ['expression', 'cases', 'routingType'],
};

function allExpressions(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const m of value.match(/\{\{([^}]+)\}\}/g) || []) acc.push(m.slice(2, -2).trim());
  } else if (Array.isArray(value)) {
    value.forEach((v) => allExpressions(v, acc));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => allExpressions(v, acc));
  }
  return acc;
}

describe('template library contract', () => {
  it('finds the corrected template sources', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  describe.each(eachTemplate)('%s', (_name, t) => {
    it('uses only node types registered in the backend', () => {
      // Frontend-only catalog entries (document_ocr, vector_store, embeddings) look
      // real in the UI but are not registered here and fail at runtime.
      const unknown = t.nodes.filter((n) => !isValidCanonicalNodeType(n.data.type));
      expect(unknown.map((n) => `${n.id}:${n.data.type}`)).toEqual([]);
    });

    it('uses only node types that also exist in the frontend catalog', () => {
      // Backend registration is not enough. `workflowValidation.ts` builds its valid
      // set from the FRONTEND catalog (NODE_TYPES in nodeTypes.ts) and rewrites
      // anything it cannot find to `http_request` as a last resort — silently, on
      // "Use Template".
      //
      // That is exactly what happened to database_read / database_write: registered
      // in the backend, absent from the frontend, so all ten uses across the five
      // Agent templates turned into generic HTTP nodes the moment a user copied the
      // template. The Sales Agent's "Create CRM Entry" arrived on the canvas as an
      // HTTP & API node.
      const missing = t.nodes.filter((n) => !FRONTEND_NODE_TYPES.has(n.data.type));
      expect(missing.map((n) => `${n.id}:${n.data.type}`)).toEqual([]);
    });

    it('sets no config key the node does not accept', () => {
      const offenders: string[] = [];
      for (const n of t.nodes) {
        const schema = nodeLibrary.getSchema(n.data.type);
        if (!schema) continue;
        const declared = new Set([
          ...(schema.configSchema?.required ?? []),
          ...Object.keys(schema.configSchema?.optional ?? {}),
          ...(RUNTIME_ONLY_KEYS[n.data.type] ?? []),
        ]);
        for (const key of Object.keys(n.data.config ?? {})) {
          if (!declared.has(key)) offenders.push(`${n.id} (${n.data.type}).${key}`);
        }
      }
      // Customer Support Agent shipped switch.value instead of switch.expression.
      expect(offenders).toEqual([]);
    });

    it('uses only expression syntax the resolver implements', () => {
      const bad: string[] = [];
      for (const n of t.nodes) {
        for (const expr of allExpressions(n.data.config)) {
          // Function calls: {{JSON.stringify(input.violations)}} wrote a literal string to the DB.
          if (/[()]/.test(expr)) bad.push(`${n.id}: {{${expr}}} — the resolver cannot call functions`);
          // Built-ins that were never implemented: {{$now}} was written to Airtable verbatim.
          else if (expr.startsWith('$') && !expr.startsWith('$json.')) {
            bad.push(`${n.id}: {{${expr}}} — no such built-in; resolver handles ${SUPPORTED_PREFIXES.join(', ')}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it('has exactly one trigger', () => {
      const triggers = t.nodes.filter((n) => TRIGGER_TYPES.has(n.data.type));
      // Document Vault shipped two triggers and two disconnected subgraphs in one graph.
      expect(triggers.map((n) => n.id).length).toBe(1);
    });

    it('has no orphan nodes and no dangling edges', () => {
      const ids = new Set(t.nodes.map((n) => n.id));
      const dangling = t.edges.filter((e) => !ids.has(e.source) || !ids.has(e.target));
      expect(dangling.map((e) => `${e.source}->${e.target}`)).toEqual([]);

      const connected = new Set<string>();
      const trigger = t.nodes.find((n) => TRIGGER_TYPES.has(n.data.type));
      const queue = trigger ? [trigger.id] : [];
      while (queue.length) {
        const id = queue.shift()!;
        if (connected.has(id)) continue;
        connected.add(id);
        for (const e of t.edges.filter((x) => x.source === id)) queue.push(e.target);
      }
      const orphans = t.nodes.filter((n) => !connected.has(n.id));
      expect(orphans.map((n) => n.id)).toEqual([]);
    });

    it('has no cycles', () => {
      const outgoing = new Map<string, string[]>();
      for (const e of t.edges) outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
      const state = new Map<string, number>(); // 0 unvisited, 1 in-stack, 2 done
      const cycles: string[] = [];
      const walk = (id: string, trail: string[]) => {
        if (state.get(id) === 1) return cycles.push([...trail, id].join(' -> '));
        if (state.get(id) === 2) return;
        state.set(id, 1);
        for (const next of outgoing.get(id) ?? []) walk(next, [...trail, id]);
        state.set(id, 2);
      };
      t.nodes.forEach((n) => walk(n.id, []));
      expect(cycles).toEqual([]);
    });

    it('expresses if_else conditions in the canonical array form', () => {
      const legacy = t.nodes.filter((n) => n.data.type === 'if_else' && 'condition' in (n.data.config ?? {}));
      // A compound string ("a === true && b > 0") parses to a permanently false
      // comparison — that is how Internal Knowledge / Ops Agent never answered anything.
      expect(legacy.map((n) => n.id)).toEqual([]);

      for (const n of t.nodes.filter((x) => x.data.type === 'if_else')) {
        const conditions = (n.data.config as any)?.conditions;
        expect(Array.isArray(conditions)).toBe(true);
        expect(conditions.length).toBeGreaterThan(0);
        for (const c of conditions) {
          expect(typeof c.field).toBe('string');
          expect(typeof c.operator).toBe('string');
          expect(c).toHaveProperty('value');
        }
      }
    });

    it('leaves no required config field silently blank', () => {
      // `baseId: ""` is legitimate — the customer supplies it. A blank webhook URL
      // or spreadsheet ID is not: it is a field the author forgot, and the workflow
      // fails at run time with no indication anything was missing.
      const PER_CUSTOMER = new Set(['baseId', 'tableId', 'recordId']);
      const blanks: string[] = [];
      for (const n of t.nodes) {
        for (const [k, v] of Object.entries(n.data.config ?? {})) {
          if (v === '' && !PER_CUSTOMER.has(k)) blanks.push(`${n.id} (${n.data.type}).${k}`);
        }
      }
      expect(blanks).toEqual([]);
    });

    it('references an Airtable record id the node actually emits', () => {
      // Airtable create/update returns { records: [{ id, fields }] } — there is no
      // `recordId` output key, so {{input.recordId}} never resolved and results were
      // never written back.
      const bad: string[] = [];
      for (const n of t.nodes) {
        for (const expr of allExpressions(n.data.config)) {
          if (expr === 'input.recordId') {
            const producedUpstream = t.nodes.some(
              (u) => u.data.type === 'javascript' && String((u.data.config as any)?.code ?? '').includes('recordId:'),
            );
            if (!producedUpstream) bad.push(`${n.id}: {{input.recordId}} is not produced by any node`);
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it('parses AI output before branching on it', () => {
      // Every AI node told to return JSON needs a parse step before anything reads
      // its fields. FAQ Answering Assistant skipped it, so the confidence gate was
      // always false and every client question escalated instead of being answered.
      const jsonAiNodes = t.nodes.filter(
        (n) =>
          ['openai_gpt', 'google_gemini', 'ai_agent'].includes(n.data.type) &&
          /return.{0,40}json|reply as json|respond with a json|only json/i.test(
            String((n.data.config as any)?.prompt ?? (n.data.config as any)?.systemPrompt ?? ''),
          ),
      );
      const missing: string[] = [];
      for (const ai of jsonAiNodes) {
        const next = t.edges.filter((e) => e.source === ai.id).map((e) => t.nodes.find((n) => n.id === e.target));
        const parsed = next.some((n) => n?.data.type === 'javascript' && /JSON\.parse/.test(String((n.data.config as any)?.code ?? '')));
        if (!parsed) missing.push(`${ai.id} returns JSON but the next node does not parse it`);
      }
      expect(missing).toEqual([]);
    });

    it('does not claim to be production-ready', () => {
      // All five Agent templates carried this tag; two of them could not work at all.
      expect(t.tags ?? []).not.toContain('production-ready');
    });

    it('files every node under the family its help page sits under', () => {
      // The templates used to invent their own families: HubSpot — the only CRM node
      // in the library — was filed as `database`, as were Airtable, Sheets and Drive;
      // Gmail was `output` in 15 templates and `google` in the other 5. The family
      // drives the label and colour a user sees on the canvas, so it has to match the
      // family the node's own documentation is filed under.
      const wrong: string[] = [];
      for (const n of t.nodes) {
        const expected = REGISTRY[n.data.type]?.nodeCategory ?? CATEGORY_FALLBACK[n.data.type];
        if (expected && n.data.category !== expected) {
          wrong.push(`${n.id} (${n.data.type}): "${n.data.category}" should be "${expected}"`);
        }
      }
      expect(wrong).toEqual([]);
    });

    it('gives every node a note that explains why it is here', () => {
      // A node with no explanation is the single most common complaint about the
      // library: all 165 original nodes shipped without one.
      const bare: string[] = [];
      for (const n of t.nodes) {
        const notes = (n.data as any).notes;
        if (!notes) bare.push(`${n.id}: no notes at all`);
        else if (!notes.what) bare.push(`${n.id}: no "what" from the note registry`);
        else if (!notes.why) bare.push(`${n.id}: no per-instance "why"`);
      }
      expect(bare).toEqual([]);
    });

    it('does not restate the node label as its note', () => {
      // "Send Email" on a node called Send Email teaches nobody anything.
      const lazy = t.nodes.filter((n) => {
        const why = String((n.data as any).notes?.why ?? '');
        return why.trim().toLowerCase().replace(/[.]$/, '') === n.data.label.trim().toLowerCase();
      });
      expect(lazy.map((n) => n.id)).toEqual([]);
    });
  });
});
