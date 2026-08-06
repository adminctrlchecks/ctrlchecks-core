#!/usr/bin/env node
/**
 * Template Library v2 — fix generator.
 *
 * Reads the committed snapshot of what is live in production
 * (snapshot/live-2026-07-31.json) and applies every correction from
 * docs/TEMPLATE_LIBRARY_FIX_SPEC.md as an explicit, reviewable patch.
 *
 * Emits:
 *   src/<slug>.json                          — corrected template, one file each
 *   ../sql_migrations/templates_v2/*.sql     — apply scripts
 *   DEFERRED.md                              — fixes intentionally NOT applied, and why
 *
 * Run: node ctrl_checks/templates/apply-fixes.cjs
 *
 * ── Runtime constraints this generator is written against ────────────────────
 * 1. There is NO per-item fan-out. `loop` and `split_in_batches` only expose the
 *    array as data — execute-workflow.ts:13968 says so explicitly. So anywhere a
 *    template needs to act on N rows, we instead process ONE row per scheduled
 *    run (maxRecords:1 + filterByFormula excluding done rows + a write-back
 *    marker). Successive polls drain the queue. This also removes the duplicate
 *    -notification storms, since a processed row no longer matches the filter.
 * 2. Airtable create/update returns { records: [{id, fields}] } — there is no
 *    `recordId` output key. Use {{input.records.0.id}}.
 * 3. The template resolver does property lookup only: no $now, no $credentials,
 *    no function calls.
 * 4. Airtable nodes spread ...inputObj, so upstream context survives them.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SNAPSHOT = path.join(HERE, 'snapshot', 'live-2026-07-31.json');
const SRC_DIR = path.join(HERE, 'src');
const SQL_DIR = path.join(HERE, '..', 'sql_migrations', 'templates_v2');

const templates = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
const byName = new Map(templates.map((t) => [t.name, t]));

/**
 * Note registry content, keyed by node type — extracted from the repo's existing
 * 176 doc pages, layman descriptions and usage guides by extract-registry-notes.cjs.
 * Nothing here is authored for templates; it is the platform's own documentation.
 */
const REGISTRY = JSON.parse(fs.readFileSync(path.join(HERE, 'registry-notes.json'), 'utf8'));

/** Per-instance "why this node is in this workflow" — the layer the registry cannot know. */
const INSTANCE_NOTES = JSON.parse(fs.readFileSync(path.join(HERE, 'node-notes.json'), 'utf8'));

/**
 * Two node types have no doc page (they are the generic internal DB nodes), so the
 * registry cannot supply a family for them. They are database nodes; say so.
 */
const CATEGORY_FALLBACK = { database_read: 'database', database_write: 'database' };

/** Fixes we are deliberately NOT applying, with the reason. */
const deferred = [];
/** Nodes with no per-instance note — the generator fails rather than shipping a blank. */
const noteGaps = [];
/** Human-readable log of everything we did change. */
const changelog = [];
/** Notes authored inline for new generated templates. Existing templates still use node-notes.json. */
const generatedNodeNotes = new Map();
/** New template IDs that must be inserted by the generated SQL instead of updated. */
const newTemplateIds = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  javascript: 'Code',
  if_else: 'GitBranch',
  merge: 'GitMerge',
  airtable: 'Database',
  loop: 'Repeat',
  chat_send: 'Send',
  google_gmail: 'Mail',
  slack_message: 'Hash',
};

function T(name) {
  const t = byName.get(name);
  if (!t) throw new Error(`Template not found in snapshot: ${name}`);
  return t;
}

function N(t, id) {
  const n = t.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`[${t.name}] node not found: ${id}`);
  return n;
}

function log(t, kind, detail) {
  changelog.push({ template: t.name, kind, detail });
}

/** Merge keys into a node's config. `undefined` deletes the key. */
function cfg(t, id, patch, why) {
  const n = N(t, id);
  n.data.config = n.data.config || {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete n.data.config[k];
    else n.data.config[k] = v;
  }
  log(t, 'FIX', `${id}: ${why}`);
}

function relabel(t, id, label, why) {
  N(t, id).data.label = label;
  log(t, 'FIX', `${id}: ${why}`);
}

function mkNode(id, type, label, category, config) {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 }, // real coords assigned by relayout()
    data: { icon: ICONS[type] || 'Box', type, label, category, config },
  };
}

/** Insert `node` on the edge src → dst. */
function insertBetween(t, srcId, dstId, node, why) {
  const edge = t.edges.find((e) => e.source === srcId && e.target === dstId);
  if (!edge) throw new Error(`[${t.name}] no edge ${srcId} -> ${dstId}`);
  t.nodes.push(node);
  edge.target = node.id;
  t.edges.push({ id: `e_${node.id}_${dstId}`, source: node.id, target: dstId });
  log(t, 'ADD', `${node.id} (${node.data.type}) between ${srcId} and ${dstId}: ${why}`);
}

/** Insert `node` directly after src, re-parenting everything src fed. */
function insertAfter(t, srcId, node, why) {
  const outgoing = t.edges.filter((e) => e.source === srcId);
  t.nodes.push(node);
  for (const e of outgoing) e.source = node.id;
  t.edges.push({ id: `e_${srcId}_${node.id}`, source: srcId, target: node.id });
  log(t, 'ADD', `${node.id} (${node.data.type}) after ${srcId}: ${why}`);
}

/** Remove a node, bridging its inbound edges to its outbound targets. */
function delNode(t, id, why) {
  const incoming = t.edges.filter((e) => e.target === id);
  const outgoing = t.edges.filter((e) => e.source === id);
  t.nodes = t.nodes.filter((n) => n.id !== id);
  t.edges = t.edges.filter((e) => e.source !== id && e.target !== id);
  for (const i of incoming) {
    for (const o of outgoing) {
      if (!t.edges.some((e) => e.source === i.source && e.target === o.target)) {
        t.edges.push({
          id: `e_${i.source}_${o.target}`,
          source: i.source,
          target: o.target,
          ...(i.sourceHandle ? { sourceHandle: i.sourceHandle } : {}),
        });
      }
    }
  }
  log(t, 'DEL', `${id}: ${why}`);
}

/** Point an existing node's inbound edge at a different source. */
function reparent(t, nodeId, newSourceId, why, sourceHandle) {
  const edge = t.edges.find((e) => e.target === nodeId);
  if (!edge) throw new Error(`[${t.name}] ${nodeId} has no inbound edge`);
  edge.source = newSourceId;
  if (sourceHandle) edge.sourceHandle = sourceHandle;
  log(t, 'FIX', `${nodeId}: ${why}`);
}

/** Canonical if_else form — the registry requires conditions[], not a string. */
function canonicalCondition(t, id, conditions, why) {
  cfg(t, id, { condition: undefined, conditions, combineOperation: 'AND' }, why);
}

/**
 * Gate a polling workflow on "did this run actually find anything?".
 *
 * Every one-per-run template selects a single row and then continues. When the
 * filter matches nothing — which is the common case for a job running every 5-15
 * minutes — the selector emits blanks and every downstream node still fires:
 * empty WhatsApp messages, Airtable updates against an empty record id, wasted
 * LLM calls. The gate makes "nothing to do" the quiet path.
 */
function addWorkGate(t, afterId, field, label, why) {
  const gateId = `if_${field.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  const gate = mkNode(gateId, 'if_else', label, 'logic', {
    conditions: [{ field: `$json.${field}`, operator: 'equals', value: true }],
    combineOperation: 'AND',
  });
  const outgoing = t.edges.filter((e) => e.source === afterId);
  t.nodes.push(gate);
  for (const e of outgoing) {
    e.source = gateId;
    e.sourceHandle = 'true';
  }
  t.edges.push({ id: `e_${afterId}_${gateId}`, source: afterId, target: gateId });
  log(t, 'ADD', `${gateId} (if_else) after ${afterId}: ${why}`);
  return gateId;
}

function untag(t, tag) {
  if (Array.isArray(t.tags) && t.tags.includes(tag)) {
    t.tags = t.tags.filter((x) => x !== tag);
    log(t, 'FIX', `tags: removed "${tag}"`);
  }
}

function retag(t, oldTag, newTag) {
  if (!Array.isArray(t.tags) || !t.tags.includes(oldTag)) return;
  t.tags = t.tags.map((x) => (x === oldTag ? newTag : x));
  t.tags = [...new Set(t.tags)];
  log(t, 'FIX', `tags: replaced "${oldTag}" with "${newTag}"`);
}

const SECTORS = {
  verification: 'Business Verification & Compliance',
  healthcare: 'Healthcare & Clinics',
  finance: 'Finance, Accounting & Insurance',
  operations: 'Sales, Support & Internal Operations',
};

function setSector(templateName, sector) {
  const t = T(templateName);
  if (t.category !== sector) {
    t.category = sector;
    log(t, 'FIX', `category: moved to "${sector}" sector`);
  }
}

function addTemplate(def) {
  if (byName.has(def.name)) throw new Error(`Template already exists: ${def.name}`);
  const s = slug(def.name);
  const t = {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    nodes: def.nodes.map((n) => {
      generatedNodeNotes.set(`${s}.${n.id}`, n.why);
      return mkNode(n.id, n.type, n.label, n.category, n.config || {});
    }),
    edges: def.edges.map(([source, target, sourceHandle], i) => ({
      id: `e_${i + 1}_${source}_${target}`,
      source,
      target,
      ...(sourceHandle ? { sourceHandle } : {}),
    })),
    difficulty: def.difficulty,
    estimated_setup_time: def.estimated_setup_time,
    tags: def.tags,
    is_featured: Boolean(def.is_featured),
    is_active: true,
    use_count: 0,
    version: 1,
  };
  relayout(t);
  byName.set(t.name, t);
  newTemplateIds.add(t.id);
  log(t, 'ADD', `new ${def.category} template with ${t.nodes.length} working-node steps`);
}

function defer(template, item, reason) {
  deferred.push({ template, item, reason });
}

/**
 * Deterministic left-to-right layout by graph depth so the canvas stays readable
 * after nodes are inserted. Branch siblings are stacked vertically.
 */
function relayout(t) {
  const targets = new Set(t.edges.map((e) => e.target));
  const roots = t.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
  const depth = new Map();
  const queue = roots.map((id) => [id, 0]);
  while (queue.length) {
    const [id, d] = queue.shift();
    if (depth.has(id) && depth.get(id) >= d) continue;
    depth.set(id, d);
    for (const e of t.edges.filter((x) => x.source === id)) queue.push([e.target, d + 1]);
  }
  const byDepth = new Map();
  for (const n of t.nodes) {
    const d = depth.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(n);
  }
  for (const [d, group] of byDepth) {
    group.forEach((n, i) => {
      n.position = { x: 100 + d * 320, y: 300 + (i - (group.length - 1) / 2) * 190 };
    });
  }
}

// Shared code fragment: chat_trigger's output shape is contested in the codebase
// (execute-workflow.ts:3052 returns a bare string; the comment at :20086 claims an
// object). This reads correctly under EITHER contract, so it is safe to ship now.
const CHAT_MESSAGE = `const raw = (typeof input === 'string') ? input : (input && (input.message || input.query || input.text)) || '';`;

// ═════════════════════════════════════════════════════════════════════════════
// 1. Verification Readiness Checker
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Verification Readiness Checker');

  // The email asks for {{input.fixList}}, but ai_fix_list emits `response`.
  // Rather than rename it at every consumer, materialise the field once so both
  // outputs get it AND the score/contact fields are guaranteed present.
  insertAfter(
    t,
    'ai_fix_list',
    mkNode('js_compose_results', 'javascript', 'Assemble Result Payload', 'data', {
      code: [
        'const fixList = input.response || input.text || input.content || "";',
        'return {',
        '  ...input,',
        '  fixList,',
        '  score: input.score,',
        '  issueCount: input.issueCount,',
        '  businessName: input.businessName,',
        '  contactEmail: input.contactEmail,',
        '  whatsappNumber: input.whatsappNumber',
        '};',
      ].join('\n'),
      timeout: 5000,
    }),
    'gmail referenced {{input.fixList}}, which no node produced — the customer email shipped with a blank fix list',
  );

  cfg(
    t,
    'airtable_update_score',
    { recordId: '{{input.records.0.id}}' },
    'Airtable emits records[].id, never recordId — the score was never written back',
  );

  cfg(
    t,
    'whatsapp_send_results',
    { text: 'Hi {{input.businessName}}! Your verification readiness score is {{input.score}}/100. Check your email for the full fix list, or reply here with questions.' },
    'now sourced from the assembled payload so {{input.score}} resolves',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Approval Chance Predictor
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Approval Chance Predictor');

  cfg(
    t,
    'airtable_lookup_readiness',
    { filterByFormula: "{Email}='{{input.contactEmail}}'", maxRecords: 1 },
    'unfiltered read fed every client in the table into a single prediction prompt',
  );

  const n = N(t, 'ai_predict_chance');
  n.data.config.prompt = n.data.config.prompt.replace('{{input.record}}', '{{input.records}}');
  log(t, 'FIX', 'ai_predict_chance: {{input.record}} -> {{input.records}} (singular key never existed)');

  cfg(
    t,
    'airtable_save_prediction',
    { recordId: '{{input.records.0.id}}' },
    'Airtable emits records[].id, never recordId — the prediction was never saved',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Missing Document Finder  — logic was inverted from its own premise
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Missing Document Finder');

  cfg(
    t,
    'form_doc_upload',
    {
      fields: N(t, 'form_doc_upload').data.config.fields.map((f) =>
        f.key === 'clientType' ? { ...f, options: ['Individual', 'Business'] } : f,
      ),
    },
    'clientType was a select with no options, yet js_check_missing branches on exactly Individual/Business',
  );

  cfg(
    t,
    'airtable_log_document',
    { fields: { Client: '{{input.clientName}}', DocumentType: '{{input.response}}' } },
    'dropped ReceivedAt: {{$now}} — the resolver has no $now, so the literal string was written to Airtable (use an Airtable "Created time" field instead)',
  );

  insertBetween(
    t,
    'airtable_log_document',
    'js_check_missing',
    mkNode('airtable_read_prior_docs', 'airtable', 'Read All Documents Received So Far', 'database', {
      baseId: '',
      tableId: 'DocumentsReceived',
      operation: 'read',
      filterByFormula: "{Client}='{{input.clientName}}'",
      maxRecords: 100,
    }),
    'nothing read previously-received documents, so the checklist only ever saw the one file just uploaded and reported everything else missing',
  );

  cfg(
    t,
    'js_check_missing',
    {
      code: [
        "const required = { 'Individual': ['PAN Card','Address Proof','Photo ID'], 'Business': ['GST Certificate','PAN Card','Bank Statement','Business Registration'] };",
        "const checklist = required[input.clientType] || required['Business'];",
        '// Every document logged for this client so far, from the Airtable read above.',
        'const received = (input.records || []).map(r => (r.fields && r.fields.DocumentType) || "").filter(Boolean);',
        'const missing = checklist.filter(doc => !received.includes(doc));',
        'return { ...input, received, missing, isComplete: missing.length === 0 };',
      ].join('\n'),
    },
    'read input.receivedTypes, which nothing produced — now derived from the client\'s full document history',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Business Details Matcher — one client per poll, then mark it checked
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Business Details Matcher');

  cfg(
    t,
    'airtable_read_ready_clients',
    {
      filterByFormula: "AND({Status}='DocsComplete', {MatchCheckedAt}='')",
      maxRecords: 1,
      sort: [{ field: 'Name', direction: 'asc' }],
    },
    'replaces the phantom lastSeenIds diff: the filter itself excludes already-checked clients, so each poll takes exactly one unchecked client',
  );

  relabel(t, 'js_detect_newly_ready', 'Select Client to Check', 'now selects one client rather than diffing against state that never persisted');
  cfg(
    t,
    'js_detect_newly_ready',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, hasClient: false };',
        'const f = rec.fields || {};',
        'return {',
        '  ...input,',
        '  hasClient: true,',
        '  recordId: rec.id,',
        '  businessName: f.Name || "",',
        '  website: f.Website || "",',
        '  contactEmail: f.Email || ""',
        '};',
      ].join('\n'),
    },
    'lastSeenIds never persisted between scheduled runs, so every client looked new on every poll and was re-emailed every 15 minutes',
  );

  cfg(
    t,
    'ai_extract_details',
    {
      prompt:
        'Extract the business name, address and phone number as they appear on this website HTML: {{input.body}}. Then extract the same three fields from the client\'s uploaded documents. Reply ONLY with JSON in this exact shape: {"website":{"name":"","address":"","phone":""},"gst":{"name":"","address":"","phone":""},"pan":{"name":"","address":"","phone":""},"bank":{"name":"","address":"","phone":""}}. Use an empty string where a value is not present.',
    },
    'asked for labelled prose that was then regex-scanned for the word "mismatch" — now returns parseable JSON',
  );

  cfg(
    t,
    'js_compare_versions',
    {
      code: [
        'let parsed = {};',
        'try {',
        '  const text = input.response || input.text || input.content || "{}";',
        '  const m = text.match(/\\{[\\s\\S]*\\}/);',
        '  parsed = m ? JSON.parse(m[0]) : {};',
        '} catch (e) { parsed = {}; }',
        'const sources = Object.keys(parsed);',
        'const mismatches = [];',
        'for (const field of ["name", "address", "phone"]) {',
        '  const values = sources',
        '    .map(s => ({ source: s, value: (parsed[s] && parsed[s][field] || "").trim().toLowerCase() }))',
        '    .filter(v => v.value);',
        '  const distinct = [...new Set(values.map(v => v.value))];',
        '  if (distinct.length > 1) {',
        '    mismatches.push(field + ": " + values.map(v => v.source + "=" + v.value).join(" | "));',
        '  }',
        '}',
        'return { ...input, mismatches, isMatch: mismatches.length === 0 };',
      ].join('\n'),
    },
    'replaced the /mismatch|does not match|differ/i prose regex with a real field-by-field comparison',
  );

  cfg(t, 'airtable_write_match_results', { recordId: '{{input.recordId}}' }, 'record id now comes from the selected client, not a key that never existed');

  insertBetween(
    t,
    'airtable_write_match_results',
    'gmail_send_match_report',
    mkNode('airtable_mark_checked', 'airtable', 'Mark Client as Checked', 'database', {
      baseId: '',
      tableId: 'Clients',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { MatchCheckedAt: '{{input.checkedAt}}' },
    }),
    'without a marker the same client matched the filter forever and was re-emailed every 15 minutes',
  );

  // MatchCheckedAt needs a timestamp, and the resolver has no $now.
  insertBetween(
    t,
    'js_compare_versions',
    'airtable_write_match_results',
    mkNode('js_stamp_checked', 'javascript', 'Stamp Check Time', 'data', {
      code: 'return { ...input, checkedAt: new Date().toISOString() };',
      timeout: 5000,
    }),
    'supplies a real timestamp because the resolver does not implement {{$now}}',
  );

  addWorkGate(t, 'js_detect_newly_ready', 'hasClient', 'Any Client to Check?', 'most 15-minute polls find nothing; without this the workflow fetched a blank URL and emailed an empty report every run');

  t.description = t.description.replace(
    '(No instant Airtable-update trigger exists yet, so this polls on a schedule instead of firing immediately.)',
    '(No instant Airtable-update trigger exists yet, so this polls every 15 minutes and checks one client per run, marking each as checked so it is never re-reported.)',
  );
  log(t, 'FIX', 'description: now describes the one-per-run behaviour accurately');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Submission Package Builder
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Submission Package Builder');

  cfg(
    t,
    'airtable_read_ready_status',
    { filterByFormula: "AND({Status}='Ready', {PackageSentAt}='')", maxRecords: 1 },
    'one ready client per run; the filter excludes clients whose package has already been sent',
  );

  relabel(t, 'js_detect_newly_ready_status', 'Select Ready Client', 'selects one client rather than diffing against state that never persisted');
  cfg(
    t,
    'js_detect_newly_ready_status',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, hasClient: false };',
        'const f = rec.fields || {};',
        'return {',
        '  ...input,',
        '  hasClient: true,',
        '  recordId: rec.id,',
        '  businessName: f.Name || "",',
        '  website: f.Website || "",',
        '  contactEmail: f.Email || "",',
        '  sentAt: new Date().toISOString()',
        '};',
      ].join('\n'),
    },
    'lastSeenIds never persisted, so every ready client was re-packaged every 15 minutes',
  );

  cfg(
    t,
    'http_screenshot_pages',
    {
      url: 'https://api.screenshotone.com/take?url={{input.website}}&access_key=REPLACE_WITH_YOUR_SCREENSHOTONE_ACCESS_KEY',
    },
    '{{$credentials.screenshotone.apiKey}} is not a syntax the resolver implements, and screenshotone is not a registered credential provider — replaced with an explicit placeholder the user edits',
  );

  // The two HTTP branches both fed drive_list with no join, so their outputs
  // could never both be in scope at the email node.
  const merge = mkNode('merge_package', 'merge', 'Combine Package Pieces', 'logic', {});
  t.nodes.push(merge);
  for (const e of t.edges) {
    if (e.target === 'drive_list_existing_docs') e.target = 'merge_package';
  }
  t.edges.push({ id: 'e_merge_package_drive', source: 'merge_package', target: 'drive_list_existing_docs' });
  log(t, 'ADD', 'merge_package (merge) before drive_list_existing_docs: the screenshot and policy-text branches had no join, so the email could never see both');

  insertBetween(
    t,
    'drive_list_existing_docs',
    'gmail_send_package',
    mkNode('airtable_mark_package_sent', 'airtable', 'Mark Package as Sent', 'database', {
      baseId: '',
      tableId: 'Clients',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { PackageSentAt: '{{input.sentAt}}' },
    }),
    'without a marker the same client was re-packaged and re-emailed every 15 minutes',
  );

  addWorkGate(t, 'js_detect_newly_ready_status', 'hasClient', 'Any Ready Client?', 'most polls find nothing; without this the workflow screenshotted a blank URL and emailed an empty package every 15 minutes');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. License Renewal Reminder — one licence per run, milestone-gated
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('License Renewal Reminder');

  cfg(
    t,
    'schedule_daily_check',
    { cron: '*/10 * * * *' },
    'was daily; now every 10 minutes because each run handles one licence (144/day drains any realistic queue)',
  );
  relabel(t, 'schedule_daily_check', 'Check Every 10 Minutes', 'reflects the one-per-run design');

  cfg(
    t,
    'airtable_read_expiry_dates',
    {
      filterByFormula:
        "AND({ExpiryDate} <= DATEADD(TODAY(), 90, 'days'), OR({LastRemindedMilestone} = '', {LastRemindedMilestone} != CONCATENATE('', DATETIME_DIFF({ExpiryDate}, TODAY(), 'days'))))",
      maxRecords: 1,
      sort: [{ field: 'ExpiryDate', direction: 'asc' }],
    },
    'reads one licence at a time and skips any already reminded at its current milestone — the old version re-sent every single day for 90 days',
  );

  relabel(t, 'js_flag_expiring', 'Select Licence & Milestone', 'selects one licence instead of returning an array nothing could iterate');
  cfg(
    t,
    'js_flag_expiring',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, shouldRemind: false };',
        'const f = rec.fields || {};',
        'const DAY = 86400000;',
        'const daysLeft = Math.round((new Date(f.ExpiryDate).getTime() - Date.now()) / DAY);',
        '// Only the three milestones the template promises — not every day in between.',
        'let milestone = null;',
        'if (daysLeft <= 7) milestone = 7;',
        'else if (daysLeft <= 30) milestone = 30;',
        'else if (daysLeft <= 90) milestone = 90;',
        'const urgency = milestone === 7 ? "urgent" : milestone === 30 ? "soon" : "upcoming";',
        'return {',
        '  ...input,',
        '  shouldRemind: milestone !== null,',
        '  recordId: rec.id,',
        '  milestone,',
        '  urgency,',
        '  daysLeft,',
        '  licenseName: f.LicenseName || f.Name || "your licence",',
        '  expiryDate: f.ExpiryDate || "",',
        '  whatsappNumber: f.WhatsApp || "",',
        '  contactEmail: f.Email || ""',
        '};',
      ].join('\n'),
    },
    'returned a flagged[] array that both output nodes then read as scalars, so every placeholder was blank and no usable reminder was ever sent',
  );

  insertBetween(
    t,
    'js_flag_expiring',
    'whatsapp_send_reminder',
    mkNode('airtable_mark_reminded', 'airtable', 'Record Reminder Sent', 'database', {
      baseId: '',
      tableId: 'Licenses',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { LastRemindedMilestone: '{{input.milestone}}' },
    }),
    'records which milestone was sent so the same licence is not reminded again until the next milestone',
  );
  // gmail was a second child of js_flag_expiring; move it behind the marker too.
  reparent(t, 'gmail_send_backup_reminder', 'airtable_mark_reminded', 'sourced after the marker so the reminder fields are in scope');

  addWorkGate(t, 'js_flag_expiring', 'shouldRemind', 'Any Licence at a Milestone?', 'runs every 10 minutes and usually finds nothing; without this it WhatsApped and emailed blank reminders on every empty poll');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. FAQ Answering Assistant — escalated 100% of questions
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('FAQ Answering Assistant');

  cfg(t, 'airtable_read_faq', { maxRecords: 50 }, 'the entire FAQ table was being pushed into every prompt');

  insertBetween(
    t,
    'ai_answer_from_faq',
    'if_confidence_check',
    mkNode('js_parse_faq_answer', 'javascript', 'Parse AI Answer', 'data', {
      code: [
        'let parsed = {};',
        'try {',
        '  const text = input.response || input.text || input.content || "{}";',
        '  const m = text.match(/\\{[\\s\\S]*\\}/);',
        '  parsed = m ? JSON.parse(m[0]) : {};',
        '} catch (e) { parsed = {}; }',
        'return {',
        '  ...input,',
        '  answer: parsed.answer || input.response || input.text || "",',
        '  confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0',
        '};',
      ].join('\n'),
      timeout: 5000,
    }),
    'the AI was told to return JSON but nothing parsed it, so $json.confidence never existed, the gate was always false, and every client question escalated to Slack instead of being answered',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. New Client Risk Checker
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('New Client Risk Checker');

  cfg(
    t,
    'http_domain_age_lookup',
    {
      url: 'https://www.whoisxmlapi.com/whoisserver/WhoisService?domainName={{input.website}}&apiKey=REPLACE_WITH_YOUR_WHOISXML_API_KEY&outputFormat=JSON',
    },
    '{{$credentials.whoisxml.apiKey}} is not a syntax the resolver implements, and whoisxml is not a registered credential provider — replaced with an explicit placeholder',
  );

  canonicalCondition(
    t,
    'if_high_risk',
    [{ field: '$json.isHighRisk', operator: 'equals', value: true }],
    'already canonical; normalised for consistency across the library',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. Overdue Task Tracker
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Overdue Task Tracker');

  cfg(t, 'schedule_hourly_check', { cron: '*/5 * * * *' }, 'was hourly; now every 5 minutes because each run handles one overdue request');
  relabel(t, 'schedule_hourly_check', 'Check Every 5 Minutes', 'reflects the one-per-run design');

  cfg(
    t,
    'airtable_read_open_requests',
    {
      filterByFormula:
        "AND({Status}!='Closed', OR({LastAlertedAt}='', DATETIME_DIFF(NOW(), {LastAlertedAt}, 'hours') >= 4))",
      maxRecords: 1,
      sort: [{ field: 'OpenedAt', direction: 'asc' }],
    },
    'one request per run, and re-alerts are rate-limited to once every 4 hours instead of firing every single hour forever',
  );

  relabel(t, 'js_flag_overdue', 'Select Overdue Request', 'selects one request instead of returning an array nothing could iterate');
  cfg(
    t,
    'js_flag_overdue',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, isOverdue: false };',
        'const f = rec.fields || {};',
        'const HOUR = 3600000;',
        'const hoursOpen = Math.round((Date.now() - new Date(f.OpenedAt).getTime()) / HOUR);',
        'const slaHours = f.SlaHours || 24;',
        'return {',
        '  ...input,',
        '  recordId: rec.id,',
        '  title: f.Title || f.Name || "Untitled request",',
        '  hoursOpen,',
        '  slaHours,',
        '  isOverdue: hoursOpen > slaHours,',
        '  isVeryOverdue: hoursOpen > slaHours * 2,',
        '  ownerSlackChannel: f.OwnerSlackChannel || "#operations",',
        '  managerSlackChannel: f.ManagerSlackChannel || "#operations-escalations",',
        '  alertedAt: new Date().toISOString()',
        '};',
      ].join('\n'),
    },
    'returned flagged[] read downstream as scalars; the owner/manager Slack channels were referenced but produced by nothing — they now come from the Airtable row with a safe default',
  );

  canonicalCondition(
    t,
    'if_very_overdue',
    [{ field: '$json.isVeryOverdue', operator: 'equals', value: true }],
    'normalised to the canonical conditions[] form',
  );
  reparent(t, 'if_very_overdue', 'js_flag_overdue', 'branched off the Slack node\'s output, where isVeryOverdue no longer exists — now reads from the node that computes it');
  t.edges.push({ id: 'e_if_very_overdue_escalate', source: 'if_very_overdue', target: 'slack_escalate_manager', sourceHandle: 'true' });
  t.edges = t.edges.filter((e, i, arr) => arr.findIndex((x) => x.source === e.source && x.target === e.target) === i);

  insertAfter(
    t,
    'slack_alert_owner',
    mkNode('airtable_mark_alerted', 'airtable', 'Record Alert Sent', 'database', {
      baseId: '',
      tableId: 'Requests',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { LastAlertedAt: '{{input.alertedAt}}' },
    }),
    'stamps the alert time so the 4-hour re-alert window in the read filter works',
  );

  addWorkGate(t, 'js_flag_overdue', 'isOverdue', 'Anything Actually Overdue?', 'runs every 5 minutes and usually finds nothing; without this it posted a blank Slack alert on every empty poll');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. Client Priority Ranker
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Client Priority Ranker');

  cfg(t, 'airtable_read_client_history', { maxRecords: 200 }, 'bounded so a large client table cannot blow the prompt context');

  cfg(
    t,
    'js_sort_by_priority',
    {
      code: [
        'const text = input.response || input.text || input.content || "";',
        'const ranked = text.split("\\n")',
        '  .filter(l => l.includes("|"))',
        '  .map(l => {',
        '    const parts = l.split("|").map(p => p.trim());',
        '    const priorityPart = parts.find(p => p.toLowerCase().startsWith("priority"));',
        '    const priority = priorityPart ? parseInt(priorityPart.split(":")[1], 10) : 5;',
        '    return { client: parts[0], line: l, priority: isNaN(priority) ? 5 : priority };',
        '  })',
        '  .sort((a, b) => b.priority - a.priority);',
        '// Slack renders a string, not an object array.',
        'const rankedText = ranked.map((r, i) => (i + 1) + ". " + r.client + "  (priority " + r.priority + ")").join("\\n");',
        'return { ...input, ranked, rankedText, rankedCount: ranked.length };',
      ].join('\n'),
    },
    'emitted an object array that Slack rendered as a raw JSON blob',
  );

  cfg(
    t,
    'slack_send_ranked_list',
    { message: ":clipboard: This week's client priority ranking ({{input.rankedCount}} clients, highest first):\n{{input.rankedText}}" },
    'renders the formatted list instead of a JSON blob',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. Verification Co-Pilot Chat
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Verification Co-Pilot Chat');

  cfg(
    t,
    'js_parse_query',
    {
      code: [
        CHAT_MESSAGE,
        'const match = raw.match(/for ([A-Z][\\w& ]+)/) || raw.match(/\'([^\']+)\'/);',
        'const clientName = match ? match[1].trim() : raw;',
        'return { ...(typeof input === "object" && input ? input : {}), clientName, originalQuestion: raw };',
      ].join('\n'),
    },
    'read input.message directly; now reads correctly whether chat_trigger emits a string or an object',
  );

  cfg(
    t,
    'airtable_lookup_client_record',
    { filterByFormula: "SEARCH(LOWER('{{input.clientName}}'), LOWER({Name}))", maxRecords: 5 },
    'the whole client table was being handed to the AI on every question',
  );

  delNode(
    t,
    'http_status_api_optional',
    'labelled "(Optional)" but sat inline with url {{input.statusApiUrl}}, which nothing defines — a failure here killed the whole run',
  );

  const agent = N(t, 'ai_agent_answer');
  agent.data.config.userInput = 'Question: {{input.originalQuestion}}\nClient record: {{input.records}}\n\nWrite a clear, human answer to the question using only this data.';
  log(t, 'FIX', 'ai_agent_answer: dropped the reference to the deleted status-API node');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 12. Document Vault — split into two templates (two triggers, no shared edge)
// ═════════════════════════════════════════════════════════════════════════════
{
  const original = T('Document Vault with Smart Search');

  const intakeIds = ['form_vault_upload', 'ai_tag_document', 'airtable_store_tagged_doc'];
  const searchIds = ['chat_trigger_search', 'js_parse_search_query', 'airtable_search_vault', 'ai_agent_find_match', 'whatsapp_reply_search'];

  const intake = {
    ...JSON.parse(JSON.stringify(original)),
    id: original.id, // keeps the existing row/URL
    name: 'Document Vault — Intake & Auto-Tagging',
    description:
      'Client documents scattered across email, WhatsApp and Drive make "find that PAN card from March" take forever. This workflow tags every document the moment it arrives through a simple upload form, so it can be found later. Pairs with "Document Vault — Smart Search". (No native Drive file-watch trigger exists yet, so intake happens via the upload form rather than a watched folder.)',
    tags: ['document-management', 'airtable', 'ai', 'intake', 'tagging'],
    estimated_setup_time: 12,
    nodes: original.nodes.filter((n) => intakeIds.includes(n.id)),
    edges: original.edges.filter((e) => intakeIds.includes(e.source) && intakeIds.includes(e.target)),
  };

  const search = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'b7f3c1d2-4e58-4a91-9c06-2d8e5f0a7b34', // new row
    name: 'Document Vault — Smart Search',
    description:
      'Ask for any stored client document in plain English over chat and get the file link back. Reads the tagged vault built by "Document Vault — Intake & Auto-Tagging".',
    tags: ['ai-agent', 'document-management', 'search', 'airtable', 'chatbot'],
    estimated_setup_time: 12,
    nodes: original.nodes.filter((n) => searchIds.includes(n.id)),
    edges: original.edges.filter((e) => searchIds.includes(e.source) && searchIds.includes(e.target)),
  };

  byName.set(intake.name, intake);
  byName.set(search.name, search);
  byName.delete(original.name);
  templates.splice(templates.indexOf(original), 1, intake, search);

  log(intake, 'SPLIT', 'the original template held two triggers and two fully disconnected subgraphs in one graph, which violates the DAG rule (one trigger, no orphans) and would fail save-validation');

  // ── intake fixes
  insertBetween(
    intake,
    'ai_tag_document',
    'airtable_store_tagged_doc',
    mkNode('js_parse_doc_tags', 'javascript', 'Parse Document Tags', 'data', {
      code: [
        'let parsed = {};',
        'try {',
        '  const text = input.response || input.text || input.content || "{}";',
        '  const m = text.match(/\\{[\\s\\S]*\\}/);',
        '  parsed = m ? JSON.parse(m[0]) : {};',
        '} catch (e) { parsed = {}; }',
        'return {',
        '  ...input,',
        '  documentType: parsed.documentType || "Other",',
        '  documentDate: parsed.documentDate || ""',
        '};',
      ].join('\n'),
      timeout: 5000,
    }),
    'Gemini was told to return JSON but nothing parsed it, so DocumentType and DocumentDate were written blank',
  );

  cfg(
    intake,
    'airtable_store_tagged_doc',
    {
      fields: {
        Client: '{{input.clientName}}',
        FileLink: '{{input.document}}',
        DocumentDate: '{{input.documentDate}}',
        DocumentType: '{{input.documentType}}',
      },
    },
    'FileLink read {{input.fileUrl}}, which the form node never produces — the file field is keyed "document"',
  );
  relayout(intake);

  // ── search fixes
  cfg(
    search,
    'js_parse_search_query',
    {
      code: [
        CHAT_MESSAGE,
        'return { ...(typeof input === "object" && input ? input : {}), searchQuery: raw };',
      ].join('\n'),
    },
    'read input.message directly; now reads correctly whether chat_trigger emits a string or an object',
  );
  cfg(
    search,
    'airtable_search_vault',
    { maxRecords: 200 },
    'bounded so a large vault cannot blow the agent prompt context',
  );
  relayout(search);
}

// ═════════════════════════════════════════════════════════════════════════════
// 13. Live Status Lookup Bot
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Live Status Lookup Bot');

  cfg(
    t,
    'js_parse_lookup',
    {
      code: [
        CHAT_MESSAGE,
        'return { ...(typeof input === "object" && input ? input : {}), lookupValue: raw.trim() };',
      ].join('\n'),
    },
    'read input.message directly; now reads correctly whether chat_trigger emits a string or an object',
  );

  cfg(
    t,
    'airtable_lookup_status',
    { filterByFormula: "SEARCH(LOWER('{{input.lookupValue}}'), LOWER({Name}))", maxRecords: 1 },
    'the read was unfiltered and js_format_reply always took records[0], so the bot returned the same client no matter what was asked',
  );

  cfg(
    t,
    'js_format_reply',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) {',
        '  return { ...input, reply: "I could not find a client matching \\"" + input.lookupValue + "\\". Check the spelling, or try part of the name." };',
        '}',
        'const f = rec.fields || {};',
        'const reply = "Status for " + (f.Name || input.lookupValue) + ": " + (f.Status || "unknown") +',
        '  ". Score: " + (f.Score != null ? f.Score : "n/a") +',
        '  ". Missing docs: " + (f.Missing || "none on file") + ".";',
        'return { ...input, reply };',
      ].join('\n'),
    },
    'added an explicit not-found reply instead of rendering "not found" inside an otherwise normal-looking status line',
  );

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 14. Cross-Platform Sync Engine — highest blast radius
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Cross-Platform Sync Engine');

  cfg(
    t,
    'airtable_read_all_clients',
    {
      filterByFormula: "OR({LastSyncedAt}='', IS_AFTER(LAST_MODIFIED_TIME(), {LastSyncedAt}))",
      maxRecords: 1,
    },
    'the phantom lastSnapshot made every record look changed on every poll, so the whole table was re-pushed to HubSpot and Sheets every 15 minutes forever. Now only genuinely-modified rows match, one per run.',
  );

  relabel(t, 'js_diff_changed_fields', 'Select Record to Sync', 'selects one modified record instead of diffing against state that never persisted');
  cfg(
    t,
    'js_diff_changed_fields',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, hasRecord: false };',
        'const f = rec.fields || {};',
        '// HubSpot needs its own contact id; store it on the Airtable row as HubSpotId.',
        'return {',
        '  ...input,',
        '  hasRecord: true,',
        '  recordId: rec.id,',
        '  hubspotContactId: f.HubSpotId || "",',
        '  diffFields: { firstname: f.Name || "", email: f.Email || "", website: f.Website || "" },',
        '  sheetRow: [[f.Name || "", f.Email || "", f.Website || "", f.Status || ""]],',
        '  syncedAt: new Date().toISOString()',
        '};',
      ].join('\n'),
    },
    'hubspotContactId and diffFields lived inside changed[i] and were read as top-level scalars, so both were always blank',
  );

  cfg(
    t,
    'sheets_update_shared_copy',
    {
      spreadsheetId: 'REPLACE_WITH_YOUR_GOOGLE_SHEET_ID',
      range: 'Clients!A:D',
      values: '{{input.sheetRow}}',
    },
    'spreadsheetId and range were both blank required fields, and values pointed at an array of objects Sheets cannot write',
  );

  insertBetween(
    t,
    'sheets_update_shared_copy',
    'slack_log_sync',
    mkNode('airtable_mark_synced', 'airtable', 'Record Sync Time', 'database', {
      baseId: '',
      tableId: 'Clients',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { LastSyncedAt: '{{input.syncedAt}}' },
    }),
    'stamps the sync time so the read filter stops re-selecting the same row — this is what ends the re-push storm',
  );

  cfg(
    t,
    'slack_log_sync',
    { message: ':white_check_mark: Synced client record {{input.recordId}} to HubSpot and Google Sheets.' },
    'referenced {{input.changed.length}}, which no longer exists in the one-per-run design',
  );

  addWorkGate(t, 'js_diff_changed_fields', 'hasRecord', 'Anything Changed?', 'without this an empty poll still pushed a blank contact to HubSpot and a blank row to Sheets — every 15 minutes');

  t.description =
    'Keep client data in Airtable, your CRM and a shared spreadsheet from drifting apart. Every 15 minutes this workflow picks up one client record that has changed since it was last synced, pushes it to HubSpot and Google Sheets, then stamps it as synced so it is never pushed twice. Requires a HubSpotId column on your Airtable table. (No instant Airtable-update trigger exists yet, so this polls.)';
  log(t, 'FIX', 'description: documents the one-per-run behaviour and the HubSpotId prerequisite');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 15. Smart Alert Co-Pilot — its own premise was not implemented
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Smart Alert Co-Pilot');

  delNode(
    t,
    'airtable_read_related_context',
    'read the same table with the same (empty) filter as the node before it, returning identical rows — a redundant Airtable call per poll',
  );

  cfg(
    t,
    'airtable_read_all_records',
    {
      filterByFormula: "OR({AlertCheckedAt}='', IS_AFTER(LAST_MODIFIED_TIME(), {AlertCheckedAt}))",
      maxRecords: 1,
    },
    'the phantom lastSnapshot made every record look changed on every poll; now only genuinely-modified rows match, one per run',
  );

  relabel(t, 'js_diff_for_alerts', 'Select Changed Record', 'selects one modified record instead of diffing against state that never persisted');
  cfg(
    t,
    'js_diff_for_alerts',
    {
      code: [
        'const rec = (input.records || [])[0];',
        'if (!rec) return { ...input, hasRecord: false };',
        'return {',
        '  ...input,',
        '  hasRecord: true,',
        '  recordId: rec.id,',
        '  changed: rec.fields || {},',
        '  checkedAt: new Date().toISOString()',
        '};',
      ].join('\n'),
    },
    'lastSnapshot never persisted between runs',
  );

  insertAfter(
    t,
    'ai_agent_judge_alert',
    mkNode('js_parse_alert_decision', 'javascript', 'Parse Alert Decision', 'data', {
      code: [
        'let decision = {};',
        'try {',
        '  const text = input.response || input.text || input.content || "{}";',
        '  const m = text.match(/\\{[\\s\\S]*\\}/);',
        '  decision = m ? JSON.parse(m[0]) : {};',
        '} catch (e) { decision = {}; }',
        'return {',
        '  ...input,',
        '  alertWorthy: decision.alertWorthy === true,',
        '  reason: decision.reason || "",',
        '  severity: decision.severity || "low"',
        '};',
      ].join('\n'),
      timeout: 5000,
    }),
    'js_route_notification did input.response.severity on what the agent returns as text, so severity was always "low"',
  );

  insertBetween(
    t,
    'js_parse_alert_decision',
    'js_route_notification',
    mkNode('if_alert_worthy', 'if_else', 'Is This Worth Interrupting Someone?', 'logic', {
      conditions: [{ field: '$json.alertWorthy', operator: 'equals', value: true }],
      combineOperation: 'AND',
    }),
    'THE core fix: WhatsApp fired on every polled change regardless of the AI\'s verdict, so the template was a noisier dumb alert. The gate is what the whole template is for.',
  );
  const gate = t.edges.find((e) => e.source === 'if_alert_worthy' && e.target === 'js_route_notification');
  if (gate) gate.sourceHandle = 'true';

  cfg(
    t,
    'js_route_notification',
    {
      code: [
        '// Set these two numbers when you set up the template.',
        'const complianceLeadPhone = input.complianceLeadPhone || "REPLACE_WITH_COMPLIANCE_LEAD_NUMBER";',
        'const accountManagerPhone = input.accountManagerPhone || "REPLACE_WITH_ACCOUNT_MANAGER_NUMBER";',
        'const recipient = input.severity === "high" ? complianceLeadPhone : accountManagerPhone;',
        'return { ...input, recipient };',
      ].join('\n'),
    },
    'complianceLeadPhone and accountManagerPhone were referenced but produced by nothing — now explicit placeholders',
  );

  // The marker must be stamped BEFORE the alert-worthy gate. Behind it, a record
  // the AI judges "not worth alerting" would never be stamped, so it would stay in
  // the read filter and be re-judged — at the cost of one agent call — every 10
  // minutes, forever. Stamping first means every record the AI has looked at is
  // recorded as looked-at, whatever the verdict.
  insertBetween(
    t,
    'js_parse_alert_decision',
    'if_alert_worthy',
    mkNode('airtable_mark_alert_checked', 'airtable', 'Record Alert Check', 'database', {
      baseId: '',
      tableId: 'Clients',
      operation: 'update',
      recordId: '{{input.recordId}}',
      fields: { AlertCheckedAt: '{{input.checkedAt}}' },
    }),
    'stamps every judged record before the gate, so records judged not-alert-worthy are not re-judged (and re-billed) on every subsequent poll',
  );

  addWorkGate(t, 'js_diff_for_alerts', 'hasRecord', 'Any Record Changed?', 'without this an empty 10-minute poll still burned an AI agent call and sent a blank WhatsApp alert');

  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 16. Customer Support Agent
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Customer Support Agent');

  cfg(
    t,
    'switch_intent_1',
    {
      value: undefined,
      expression: '{{input.intent}}',
      cases: [
        { value: 'order', label: 'Order' },
        { value: 'complaint', label: 'Complaint' },
        { value: 'faq', label: 'FAQ' },
      ],
    },
    'the registry requires `expression` (not `value`) and object cases — both were off-schema',
  );

  cfg(
    t,
    'slack_escalate',
    { webhookUrl: 'REPLACE_WITH_YOUR_SLACK_INCOMING_WEBHOOK_URL' },
    'blank required field with no indication anything was needed',
  );

  canonicalCondition(
    t,
    'if_confidence_check',
    [{ field: '$json.confidence', operator: 'greater_than_or_equal', value: 0.75 }],
    'converted from the legacy condition string to the canonical conditions[] form',
  );

  const intent = N(t, 'js_intent_1');
  intent.data.config.code = intent.data.config.code.replace(
    "const query = (input.message || input.query || '').toLowerCase();",
    `${CHAT_MESSAGE}\nconst query = raw.toLowerCase();`,
  ).replace('originalQuery: input.message || input.query', 'originalQuery: raw');
  log(t, 'FIX', 'js_intent_1: reads correctly whether chat_trigger emits a string or an object');

  untag(t, 'production-ready');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 17. Sales & Lead Qualification Agent — two dead nodes, one blind scorer
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Sales & Lead Qualification Agent');

  delNode(t, 'ai_qualify_questions', 'generated three qualifying questions that nothing downstream ever read — one wasted LLM call per lead');
  delNode(t, 'js_parse_questions', 'parsed the questions from the deleted node into a field nothing referenced');

  cfg(
    t,
    'ai_score_lead',
    {
      prompt:
        'Score this lead from 0-100 on fit and intent.\n\nLead:\n- Name: {{input.name}}\n- Company: {{input.company}}\n- Email: {{input.email}}\n- Phone: {{input.phone}}\n- Source: {{input.source}}\n- Message: {{input.message}}\n\nWeigh company signal, how specific and serious the message is, and how complete the contact details are. Return ONLY JSON: { "score": number (0-100), "qualified": boolean (score >= 60), "reasoning": string }.',
    },
    'the prompt contained no {{input.*}} at all — the model never saw the lead, so every score was invented',
  );

  cfg(
    t,
    'js_generate_booking',
    {
      code: [
        '// Set this to your own scheduling link when you set up the template.',
        'const baseUrl = input.bookingBaseUrl || "REPLACE_WITH_YOUR_BOOKING_LINK";',
        'const params = new URLSearchParams({ name: input.name || "", email: input.email || "", company: input.company || "" });',
        'return { ...input, bookingLink: baseUrl + "?" + params.toString(), email: input.email, name: input.name };',
      ].join('\n'),
    },
    'hardcoded https://calendly.com/your-team/meeting — a literal placeholder that 404s for every customer',
  );

  canonicalCondition(
    t,
    'if_qualified_check',
    [{ field: '$json.qualified', operator: 'equals', value: true }],
    'converted from the legacy condition string to the canonical conditions[] form',
  );

  untag(t, 'production-ready');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 18. HR / Hiring Workflow Agent
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('HR / Hiring Workflow Agent');

  cfg(
    t,
    'email_rejection',
    {
      to: 'REPLACE_WITH_YOUR_RECRUITER_EMAIL',
      subject: '[REVIEW BEFORE SENDING] Draft rejection — {{input.candidateData.name}} ({{input.candidateData.job_role}})',
      body:
        'A candidate scored below the shortlist threshold. Review and send this yourself if you agree.\n\nCandidate: {{input.candidateData.name}} <{{input.candidateData.email}}>\nRole: {{input.candidateData.job_role}}\nMatch score: {{input.match_score}}\nAI reasoning: {{input.recommendation}}\n\n--- Draft message ---\nHi {{input.candidateData.name}},\n\nThank you for your interest in the {{input.candidateData.job_role}} position. After careful consideration, we have decided to move forward with other candidates at this time.\n\nWe appreciate your interest and wish you the best in your job search.\n\nBest regards,\nHR Team',
    },
    'sent automated rejection emails straight to candidates with no human review — now routed to the recruiter as a draft. This is a legal and brand exposure, not a style preference.',
  );
  relabel(t, 'email_rejection', 'Send Rejection Draft to Recruiter', 'reflects that a human now sends the rejection');

  cfg(
    t,
    'js_generate_calendar',
    {
      code: [
        '// Set this to your own interview scheduling link when you set up the template.',
        'const baseUrl = input.interviewBookingUrl || "REPLACE_WITH_YOUR_INTERVIEW_BOOKING_LINK";',
        'const params = new URLSearchParams({ name: input.candidateData.name || "", email: input.candidateData.email || "", job: input.candidateData.job_role || "" });',
        'return {',
        '  ...input,',
        '  calendarLink: baseUrl + "?" + params.toString(),',
        '  email: input.candidateData.email,',
        '  name: input.candidateData.name,',
        '  jobRole: input.candidateData.job_role',
        '};',
      ].join('\n'),
    },
    'hardcoded https://calendly.com/hr-team/interview',
  );

  canonicalCondition(
    t,
    'if_shortlist_check',
    [{ field: '$json.shortlisted', operator: 'equals', value: true }],
    'converted from the legacy condition string to the canonical conditions[] form',
  );

  untag(t, 'production-ready');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 19. Finance / Compliance Agent
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Finance / Compliance Agent');

  const check = N(t, 'js_compliance_check');
  check.data.config.code = check.data.config.code
    .replace(
      'const amount = parseFloat(input.transaction.amount || 0);',
      '// Change this to your own approval threshold when you set up the template.\nconst approvalThreshold = Number(input.approvalThreshold || 10000);\nconst amount = parseFloat(input.transaction.amount || 0);',
    )
    .replace('if (amount > 10000) {', 'if (amount > approvalThreshold) {')
    .replace(
      "message: 'Transaction exceeds $10,000 - requires approval'",
      "message: 'Transaction exceeds $' + approvalThreshold + ' - requires approval'",
    );
  log(t, 'FIX', 'js_compliance_check: the $10,000 approval threshold was hardcoded in JS — the single most likely thing a customer changes. Now reads input.approvalThreshold with the same default.');

  const alert = N(t, 'js_format_alert');
  alert.data.config.code = alert.data.config.code.replace(
    'return { alert:',
    'const violationsJson = JSON.stringify(violations);\nreturn { violationsJson, alert:',
  );
  log(t, 'FIX', 'js_format_alert: now emits violationsJson, because the resolver cannot evaluate {{JSON.stringify(...)}}');

  const flag = N(t, 'db_save_flag');
  flag.data.config.dataTemplate = flag.data.config.dataTemplate.replace(
    '{{JSON.stringify(input.violations)}}',
    '{{input.violationsJson}}',
  );
  log(t, 'FIX', 'db_save_flag: {{JSON.stringify(input.violations)}} is not a syntax the resolver supports — it wrote the literal string into the violations column');

  cfg(
    t,
    'email_finance_alert',
    { to: 'REPLACE_WITH_YOUR_FINANCE_TEAM_EMAIL' },
    'hardcoded finance@company.com silently emailed a non-existent address',
  );

  cfg(
    t,
    'slack_finance_alert',
    { webhookUrl: 'REPLACE_WITH_YOUR_SLACK_INCOMING_WEBHOOK_URL' },
    'blank required field',
  );

  canonicalCondition(
    t,
    'if_compliant_check',
    [{ field: '$json.compliant', operator: 'equals', value: true }],
    'converted from the legacy condition string to the canonical conditions[] form',
  );

  defer(
    t.name,
    'webhook_finance_1 has no auth',
    'An open POST ingress for financial transactions needs a shared secret or signature check. That is a platform capability (webhook node auth), not a template config change.',
  );

  untag(t, 'production-ready');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// 20. Internal Knowledge / Ops Agent — never answered a single question
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = T('Internal Knowledge / Ops Agent');

  cfg(
    t,
    'js_prepare_query',
    {
      code: [
        CHAT_MESSAGE,
        'const obj = (typeof input === "object" && input) ? input : {};',
        'return {',
        '  ...obj,',
        '  query: raw,',
        '  user: obj.user || obj.user_id || "unknown",',
        '  timestamp: new Date().toISOString(),',
        '  context: obj.context || ""',
        '};',
      ].join('\n'),
    },
    'read input.message directly; now reads correctly whether chat_trigger emits a string or an object',
  );

  cfg(
    t,
    'db_search_kb',
    { orderBy: undefined, limit: 5 },
    'orderBy: "relevance" is not a column — it was silently ignored while the node returned 5 arbitrary rows regardless of the question',
  );

  cfg(
    t,
    'js_format_kb_results',
    {
      code: [
        'const results = input.data || [];',
        'if (results.length === 0) {',
        '  return { ...input, found: false, content: "", contentLength: 0, sources: [] };',
        '}',
        'const content = results.map((r, i) => (i + 1) + ". " + (r.title || "Untitled") + "\\n" + (r.content || r.body || "")).join("\\n\\n---\\n\\n");',
        'const sources = results.map(r => ({ title: r.title || "Untitled", url: r.url || "", updated_at: r.updated_at || "" }));',
        '// contentLength is emitted so the gate below can test it as its own condition —',
        '// the runtime evaluates one comparison per row and cannot parse "a && b".',
        'return { ...input, found: true, content, contentLength: content.length, sources, query: input.query };',
      ].join('\n'),
    },
    'now emits contentLength so the found/non-empty check can be expressed as two canonical conditions',
  );

  canonicalCondition(
    t,
    'if_kb_found',
    [
      { field: '$json.found', operator: 'equals', value: true },
      { field: '$json.contentLength', operator: 'greater_than', value: 0 },
    ],
    'THE core fix: "{{input.found}} === true && {{input.content}}.length > 0" parsed to field=input.found, operator=equals, value="true && {{input.content}}.length > 0" — a permanently false comparison. Every employee question took the fallback branch, so the knowledge base was never read from and the knowledge team was paged for every single question.',
  );

  cfg(
    t,
    'slack_escalate_kb',
    { webhookUrl: 'REPLACE_WITH_YOUR_SLACK_INCOMING_WEBHOOK_URL' },
    'blank required field',
  );

  untag(t, 'production-ready');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// Ghost nodes: database_read / database_write
//
// Both types are registered in the BACKEND (node-library.ts) but do not exist in
// the FRONTEND catalog (nodeTypes.ts NODE_TYPES). workflowValidation.ts builds its
// valid-type set from the frontend catalog, so on "Use Template" neither type is
// found and the node falls through to the last-resort branch — rewritten to
// `http_request`. That is why a copied Sales Agent shows "Create CRM Entry" as an
// HTTP & API node with a globe icon: the CRM step silently became a generic web
// request.
//
// All ten uses are replaced with nodes that exist in BOTH catalogs. The CRM step
// becomes a real HubSpot node; genuine table reads and writes become PostgreSQL.
// ═════════════════════════════════════════════════════════════════════════════

/** Swap a node's type/label/config in place, leaving its edges untouched. */
function swapNode(t, id, newType, newLabel, newConfig, why) {
  const n = N(t, id);
  const oldType = n.data.type;
  n.data.type = newType;
  n.data.label = newLabel;
  n.data.config = newConfig;
  n.data.icon = ICONS[newType] || (newType === 'hubspot' ? 'Zap' : 'Database');
  log(t, 'FIX', `${id}: ${oldType} -> ${newType}. ${why}`);
}

const PG_NOTE =
  'database_read/database_write are missing from the frontend catalog, so this node was silently rewritten to a generic http_request on every copy';

{
  // ── Sales & Lead Qualification Agent — the one in the screenshot ────────────
  const t = T('Sales & Lead Qualification Agent');
  swapNode(
    t,
    'db_create_crm',
    'hubspot',
    'Create HubSpot Contact',
    {
      resource: 'contact',
      operation: 'create',
      properties: {
        email: '{{input.email}}',
        firstname: '{{input.name}}',
        company: '{{input.company}}',
        phone: '{{input.phone}}',
        hs_lead_status: 'QUALIFIED',
      },
    },
    'A qualified lead belongs in your CRM, not in a generic "leads" table written through a raw database node. HubSpot is a real CRM node present in both catalogs.',
  );
  relayout(t);
}

{
  // ── Customer Support Agent ─────────────────────────────────────────────────
  const t = T('Customer Support Agent');
  swapNode(
    t,
    'db_order_lookup',
    'postgresql',
    'Look Up Order',
    { query: "SELECT * FROM orders WHERE order_id = '{{input.orderId}}' LIMIT 1" },
    PG_NOTE,
  );
  cfg(
    t,
    'js_format_order',
    {
      code: [
        '// The PostgreSQL node returns { rows, rowsAffected }.',
        'const order = (input.rows || [])[0];',
        "if (!order) { return { ...input, found: false, message: 'Order not found' }; }",
        'return {',
        '  ...input,',
        '  found: true,',
        "  orderStatus: order.status || 'Unknown',",
        "  orderDate: order.created_at || 'Unknown',",
        "  estimatedDelivery: order.estimated_delivery || 'Not available',",
        '  items: order.items || []',
        '};',
      ].join('\n'),
    },
    'read input.data[0]; the PostgreSQL node returns rows[]',
  );
  swapNode(
    t,
    'db_escalate',
    'postgresql',
    'Create Escalation Ticket',
    {
      query:
        "INSERT INTO support_tickets (query, intent, confidence, status, priority, created_at) VALUES ('{{input.originalQuery}}', '{{input.intent}}', {{input.confidence}}, 'pending', 'high', now())",
    },
    PG_NOTE,
  );
  relayout(t);
}

{
  // ── Finance / Compliance Agent ─────────────────────────────────────────────
  const t = T('Finance / Compliance Agent');
  swapNode(
    t,
    'db_save_transaction',
    'postgresql',
    'Save Transaction',
    {
      query:
        "INSERT INTO transactions (type, amount, vendor, description, category, date, invoice_number, employee_id, status, created_at) VALUES ('{{input.transaction.type}}', {{input.transaction.amount}}, '{{input.transaction.vendor}}', '{{input.transaction.description}}', '{{input.category}}', '{{input.transaction.date}}', '{{input.transaction.invoice_number}}', '{{input.transaction.employee_id}}', 'approved', now())",
    },
    PG_NOTE,
  );
  swapNode(
    t,
    'db_save_flag',
    'postgresql',
    'Flag Transaction for Review',
    {
      query:
        "INSERT INTO transactions (type, amount, vendor, description, category, date, invoice_number, employee_id, status, violations, created_at) VALUES ('{{input.transaction.type}}', {{input.transaction.amount}}, '{{input.transaction.vendor}}', '{{input.transaction.description}}', '{{input.category}}', '{{input.transaction.date}}', '{{input.transaction.invoice_number}}', '{{input.transaction.employee_id}}', 'flagged', '{{input.violationsJson}}', now())",
    },
    PG_NOTE,
  );
  relayout(t);
}

{
  // ── HR / Hiring Workflow Agent ─────────────────────────────────────────────
  const t = T('HR / Hiring Workflow Agent');
  swapNode(
    t,
    'db_shortlist',
    'postgresql',
    'Save to Shortlist',
    {
      query:
        "INSERT INTO candidates (name, email, job_role, match_score, status, skills, experience_years, created_at) VALUES ('{{input.candidateData.name}}', '{{input.candidateData.email}}', '{{input.candidateData.job_role}}', {{input.match_score}}, 'shortlisted', '{{input.candidateData.skills}}', {{input.candidateData.experience_years}}, now())",
    },
    PG_NOTE,
  );
  swapNode(
    t,
    'db_reject',
    'postgresql',
    'Record Rejection',
    {
      query:
        "INSERT INTO candidates (name, email, job_role, match_score, status, reason, created_at) VALUES ('{{input.candidateData.name}}', '{{input.candidateData.email}}', '{{input.candidateData.job_role}}', {{input.match_score}}, 'rejected', '{{input.recommendation}}', now())",
    },
    PG_NOTE,
  );
  relayout(t);
}

{
  // ── Internal Knowledge / Ops Agent ─────────────────────────────────────────
  const t = T('Internal Knowledge / Ops Agent');
  swapNode(
    t,
    'db_search_kb',
    'postgresql',
    'Search Knowledge Base',
    {
      query:
        "SELECT title, content, url, updated_at FROM knowledge_base WHERE title ILIKE '%{{input.query}}%' OR content ILIKE '%{{input.query}}%' ORDER BY updated_at DESC LIMIT 5",
    },
    `${PG_NOTE}. It also had no search term at all (filters "{}" and a non-existent "relevance" column), so it returned five arbitrary rows regardless of the question — the query now actually searches`,
  );
  cfg(
    t,
    'js_format_kb_results',
    {
      code: [
        '// The PostgreSQL node returns { rows, rowsAffected }.',
        'const results = input.rows || [];',
        'if (results.length === 0) {',
        '  return { ...input, found: false, content: "", contentLength: 0, sources: [] };',
        '}',
        'const content = results.map((r, i) => (i + 1) + ". " + (r.title || "Untitled") + "\\n" + (r.content || r.body || "")).join("\\n\\n---\\n\\n");',
        'const sources = results.map(r => ({ title: r.title || "Untitled", url: r.url || "", updated_at: r.updated_at || "" }));',
        '// contentLength is emitted so the gate below can test it as its own condition —',
        '// the runtime evaluates one comparison per row and cannot parse "a && b".',
        'return { ...input, found: true, content, contentLength: content.length, sources, query: input.query };',
      ].join('\n'),
    },
    'read input.data; the PostgreSQL node returns rows[]',
  );
  swapNode(
    t,
    'db_log_query',
    'postgresql',
    'Log Answered Question',
    {
      query:
        "INSERT INTO kb_queries (query, answer, sources_count, found, \"user\", created_at) VALUES ('{{input.query}}', '{{input.answer}}', {{input.sources.length}}, true, '{{input.user}}', now())",
    },
    PG_NOTE,
  );
  swapNode(
    t,
    'db_log_not_found',
    'postgresql',
    'Log Knowledge Gap',
    {
      query:
        "INSERT INTO kb_queries (query, answer, found, \"user\", created_at) VALUES ('{{input.query}}', '{{input.response}}', false, '{{input.user}}', now())",
    },
    PG_NOTE,
  );
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// Working-node alignment from docs/NODE_STATUS_INVESTOR_ANALYSIS.md
//
// The 2026-07 investor audit marks WhatsApp nodes as blocked by Meta Business
// verification/app review, so the shipped templates must not depend on them.
// Chat-native replies use chat_send, client notifications use Gmail, and internal
// operational alerts use Slack.
// ═════════════════════════════════════════════════════════════════════════════

{
  const t = T('Document Vault — Smart Search');
  swapNode(
    t,
    'whatsapp_reply_search',
    'chat_send',
    'Reply in Chat',
    { message: '{{input.response}}' },
    'WhatsApp is not currently verified working; this workflow starts from chat, so the answer should return to the chat session.',
  );
  retag(t, 'whatsapp', 'chat');
  relayout(t);
}

{
  const t = T('FAQ Answering Assistant');
  swapNode(
    t,
    'whatsapp_reply_client',
    'chat_send',
    'Reply in Chat',
    { message: '{{input.answer}}' },
    'WhatsApp is not currently verified working; confident FAQ answers should return to the active chat session.',
  );
  retag(t, 'whatsapp', 'chat');
  relayout(t);
}

{
  const t = T('Verification Co-Pilot Chat');
  swapNode(
    t,
    'whatsapp_reply_copilot',
    'chat_send',
    'Reply in Chat',
    { message: '{{input.response}}' },
    'WhatsApp is not currently verified working; this chat workflow should answer in the same chat channel.',
  );
  t.description = t.description.replace('over WhatsApp or Slack', 'over chat or Slack');
  log(t, 'FIX', 'description: removed WhatsApp dependency from the user-facing copy');
  retag(t, 'whatsapp', 'chat');
  relayout(t);
}

{
  const t = T('Missing Document Finder');
  cfg(
    t,
    'form_doc_upload',
    {
      fields: N(t, 'form_doc_upload').data.config.fields.map((f) =>
        f.key === 'whatsappNumber'
          ? { ...f, key: 'contactEmail', type: 'email', label: 'Contact Email' }
          : f,
      ),
    },
    'collects email instead of WhatsApp because Gmail is verified working and WhatsApp is not',
  );
  N(t, 'ai_write_missing_message').data.config.prompt = N(t, 'ai_write_missing_message').data.config.prompt.replace(
    /WhatsApp/gi,
    'email',
  );
  log(t, 'FIX', 'ai_write_missing_message: writes an email-friendly chase message instead of WhatsApp copy');
  swapNode(
    t,
    'whatsapp_send_missing',
    'google_gmail',
    'Email Missing Docs List',
    {
      operation: 'send',
      recipientSource: 'manual_entry',
      recipientEmails: '{{input.contactEmail}}',
      subject: 'Missing documents for {{input.clientName}}',
      body: '{{input.response}}',
    },
    'WhatsApp is not currently verified working; email is a verified client notification channel.',
  );
  t.description = t.description.replace('messages the client a specific checklist on WhatsApp', 'emails the client a specific checklist');
  log(t, 'FIX', 'description: changed the promised output from WhatsApp to email');
  retag(t, 'whatsapp', 'email');
  relayout(t);
}

{
  const t = T('License Renewal Reminder');
  const flag = N(t, 'js_flag_expiring');
  flag.data.config.code = String(flag.data.config.code).replace('  whatsappNumber: f.WhatsApp || "",\n', '');
  log(t, 'FIX', 'js_flag_expiring: removed unused WhatsApp number output');
  delNode(
    t,
    'whatsapp_send_reminder',
    'WhatsApp is not currently verified working; the verified Gmail node now carries the client reminder.',
  );
  relabel(t, 'gmail_send_backup_reminder', 'Send Email Reminder', 'this is now the primary verified reminder channel');
  cfg(
    t,
    'gmail_send_backup_reminder',
    {
      body: 'Your {{input.licenseName}} expires on {{input.expiryDate}} — {{input.daysLeft}} days from now. Please renew soon to avoid a lapse.',
    },
    'removed backup/WhatsApp wording because this email is now the primary reminder',
  );
  t.description = t.description.replace('sends escalating WhatsApp and email reminders', 'sends escalating email reminders');
  log(t, 'FIX', 'description: changed the promised output from WhatsApp plus email to verified email reminders');
  retag(t, 'whatsapp', 'email');
  relayout(t);
}

{
  const t = T('Smart Alert Co-Pilot');
  cfg(
    t,
    'js_route_notification',
    {
      code: [
        '// Set these two channels when you set up the template.',
        'const complianceLeadChannel = input.complianceLeadChannel || "#compliance-alerts";',
        'const accountManagerChannel = input.accountManagerChannel || "#account-management";',
        'const recipientChannel = input.severity === "high" ? complianceLeadChannel : accountManagerChannel;',
        'return { ...input, recipientChannel };',
      ].join('\n'),
    },
    'routes to Slack channels because Slack is verified working and WhatsApp is not',
  );
  swapNode(
    t,
    'whatsapp_send_smart_alert',
    'slack_message',
    'Send Targeted Slack Alert',
    {
      channel: '{{input.recipientChannel}}',
      message: ':rotating_light: {{input.severity}} priority alert: {{input.reason}}',
    },
    'WhatsApp is not currently verified working; Slack is a verified internal alert channel.',
  );
  retag(t, 'whatsapp', 'slack');
  relayout(t);
}

{
  const t = T('Verification Readiness Checker');
  cfg(
    t,
    'form_intake',
    {
      fields: N(t, 'form_intake').data.config.fields.filter((f) => f.key !== 'whatsappNumber'),
    },
    'removes the WhatsApp number field because no working output node now uses it',
  );
  const fields = { ...N(t, 'airtable_create_client').data.config.fields };
  delete fields.WhatsApp;
  cfg(t, 'airtable_create_client', { fields }, 'stops storing a WhatsApp field that the working-node template no longer collects');
  cfg(
    t,
    'js_compose_results',
    {
      code: [
        'const fixList = input.response || input.text || input.content || "";',
        'return {',
        '  ...input,',
        '  fixList,',
        '  score: input.score,',
        '  issueCount: input.issueCount,',
        '  businessName: input.businessName,',
        '  contactEmail: input.contactEmail',
        '};',
      ].join('\n'),
    },
    'assembles only fields consumed by the remaining verified Gmail output',
  );
  delNode(
    t,
    'whatsapp_send_results',
    'WhatsApp is not currently verified working; the full readiness result is already delivered by Gmail.',
  );
  t.description = t.description.replace('then emails and WhatsApps you a fix list', 'then emails you a fix list');
  log(t, 'FIX', 'description: changed the promised output from email plus WhatsApp to email');
  retag(t, 'whatsapp', 'email');
  relayout(t);
}

// ═════════════════════════════════════════════════════════════════════════════
// Four-sector taxonomy
// ═════════════════════════════════════════════════════════════════════════════

[
  'Approval Chance Predictor',
  'Business Details Matcher',
  'Document Vault — Intake & Auto-Tagging',
  'Document Vault — Smart Search',
  'License Renewal Reminder',
  'Live Status Lookup Bot',
  'Missing Document Finder',
  'New Client Risk Checker',
  'Smart Alert Co-Pilot',
  'Submission Package Builder',
  'Verification Co-Pilot Chat',
  'Verification Readiness Checker',
].forEach((name) => setSector(name, SECTORS.verification));

['Finance / Compliance Agent'].forEach((name) => setSector(name, SECTORS.finance));

[
  'Client Priority Ranker',
  'Cross-Platform Sync Engine',
  'Customer Support Agent',
  'FAQ Answering Assistant',
  'HR / Hiring Workflow Agent',
  'Internal Knowledge / Ops Agent',
  'Overdue Task Tracker',
  'Sales & Lead Qualification Agent',
].forEach((name) => setSector(name, SECTORS.operations));

// ═════════════════════════════════════════════════════════════════════════════
// New sector templates built only from verified-working node types
// ═════════════════════════════════════════════════════════════════════════════

addTemplate({
  id: '91000000-0000-4000-8000-000000000001',
  name: 'Patient Intake Triage',
  description: 'Collect symptoms, urgency and contact details from a patient intake form, classify the case, then route urgent cases to staff and routine cases to email follow-up.',
  category: SECTORS.healthcare,
  difficulty: 'Beginner',
  estimated_setup_time: 18,
  tags: ['healthcare', 'triage', 'intake', 'email', 'slack'],
  nodes: [
    { id: 'form_patient_intake', type: 'form', label: 'Patient Intake Form', category: 'triggers', config: { fields: [{ key: 'patientName', type: 'text', label: 'Patient Name', required: true }, { key: 'contactEmail', type: 'email', label: 'Contact Email', required: true }, { key: 'symptoms', type: 'textarea', label: 'Symptoms', required: true }, { key: 'duration', type: 'text', label: 'How Long Has This Been Happening?', required: false }], formTitle: 'Patient Intake', formDescription: 'Share the details needed for a first triage.', submitButtonText: 'Submit Intake' }, why: 'Collects the minimum structured details a clinic needs before deciding who should respond.' },
    { id: 'ai_classify_triage', type: 'openai_gpt', label: 'Classify Triage Need', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Review this patient intake. Symptoms: {{input.symptoms}}. Duration: {{input.duration}}. Return ONLY JSON: {"urgency":"urgent|routine","summary":"short clinical admin summary","nextStep":"what staff should do next"}.', temperature: 0.2 }, why: 'Turns free-text symptoms into a simple urgency decision that downstream routing can use.' },
    { id: 'js_parse_triage', type: 'javascript', label: 'Parse Triage Decision', category: 'data', config: { code: 'let parsed = {};\ntry {\n  const text = input.response || input.text || input.content || "{}";\n  const m = text.match(/\\{[\\s\\S]*\\}/);\n  parsed = m ? JSON.parse(m[0]) : {};\n} catch (e) { parsed = {}; }\nreturn { ...input, urgency: parsed.urgency || "routine", summary: parsed.summary || "", nextStep: parsed.nextStep || "" };', timeout: 5000 }, why: 'Converts the AI response into real fields so the branch below is deterministic.' },
    { id: 'if_urgent_triage', type: 'if_else', label: 'Urgent Case?', category: 'logic', config: { conditions: [{ field: '$json.urgency', operator: 'equals', value: 'urgent' }], combineOperation: 'AND' }, why: 'Separates patients needing staff attention now from those safe for normal follow-up.' },
    { id: 'slack_alert_clinic', type: 'slack_message', label: 'Alert Clinic Team', category: 'output', config: { channel: '#clinic-triage', message: ':rotating_light: Urgent intake for {{input.patientName}}\n{{input.summary}}\nNext: {{input.nextStep}}' }, why: 'Puts urgent cases where staff see them immediately.' },
    { id: 'gmail_confirm_patient', type: 'google_gmail', label: 'Email Patient Confirmation', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.contactEmail}}', subject: 'We received your intake', body: 'Hi {{input.patientName}},\n\nWe received your intake. Summary: {{input.summary}}\n\nNext step: {{input.nextStep}}' }, why: 'Gives routine patients a clear acknowledgment and next step without waiting for a phone call.' },
  ],
  edges: [['form_patient_intake', 'ai_classify_triage'], ['ai_classify_triage', 'js_parse_triage'], ['js_parse_triage', 'if_urgent_triage'], ['if_urgent_triage', 'slack_alert_clinic', 'true'], ['if_urgent_triage', 'gmail_confirm_patient', 'false']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000002',
  name: 'Clinic Appointment Reminder',
  description: 'Check the next upcoming appointment, send an email reminder, and mark the reminder so the same patient is not contacted repeatedly.',
  category: SECTORS.healthcare,
  difficulty: 'Beginner',
  estimated_setup_time: 16,
  tags: ['healthcare', 'appointments', 'reminders', 'airtable', 'email'],
  nodes: [
    { id: 'schedule_appointment_check', type: 'schedule', label: 'Check Upcoming Appointments', category: 'triggers', config: { cron: '0 9 * * *', timezone: 'Asia/Kolkata' }, why: 'Runs daily because appointment reminders are time-based, not manually triggered.' },
    { id: 'airtable_read_appointment', type: 'airtable', label: 'Read Next Unreminded Appointment', category: 'database', config: { baseId: '', tableId: 'Appointments', operation: 'read', filterByFormula: "AND({AppointmentDate}!='', {ReminderSent}='')", maxRecords: 1 }, why: 'Selects one appointment that still needs a reminder so each run is safe and repeatable.' },
    { id: 'js_prepare_appointment', type: 'javascript', label: 'Prepare Reminder', category: 'data', config: { code: 'const rec = (input.records || [])[0];\nif (!rec) return { ...input, hasAppointment: false };\nconst f = rec.fields || {};\nreturn { ...input, hasAppointment: true, recordId: rec.id, patientName: f.PatientName || "there", contactEmail: f.Email || "", appointmentDate: f.AppointmentDate || "", doctorName: f.Doctor || "your clinician" };', timeout: 5000 }, why: 'Lifts the appointment row into fields used by the email and marker nodes.' },
    { id: 'if_has_appointment', type: 'if_else', label: 'Appointment Found?', category: 'logic', config: { conditions: [{ field: '$json.hasAppointment', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Stops empty daily checks from sending blank reminders.' },
    { id: 'gmail_send_appointment', type: 'google_gmail', label: 'Send Appointment Reminder', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.contactEmail}}', subject: 'Appointment reminder: {{input.appointmentDate}}', body: 'Hi {{input.patientName}},\n\nThis is a reminder for your appointment with {{input.doctorName}} on {{input.appointmentDate}}.' }, why: 'Delivers the reminder through Gmail, a verified working channel.' },
    { id: 'airtable_mark_appointment', type: 'airtable', label: 'Mark Reminder Sent', category: 'database', config: { baseId: '', tableId: 'Appointments', operation: 'update', recordId: '{{input.recordId}}', fields: { ReminderSent: 'Yes' } }, why: 'Prevents the same appointment reminder being sent again on the next scheduled run.' },
  ],
  edges: [['schedule_appointment_check', 'airtable_read_appointment'], ['airtable_read_appointment', 'js_prepare_appointment'], ['js_prepare_appointment', 'if_has_appointment'], ['if_has_appointment', 'gmail_send_appointment', 'true'], ['gmail_send_appointment', 'airtable_mark_appointment']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000003',
  name: 'Lab Report Follow-up',
  description: 'Review uploaded lab-report context, decide whether it needs a clinician follow-up, then email the patient or alert the care team.',
  category: SECTORS.healthcare,
  difficulty: 'Intermediate',
  estimated_setup_time: 20,
  tags: ['healthcare', 'labs', 'follow-up', 'ai', 'email'],
  nodes: [
    { id: 'form_lab_report', type: 'form', label: 'Lab Report Form', category: 'triggers', config: { fields: [{ key: 'patientName', type: 'text', label: 'Patient Name', required: true }, { key: 'contactEmail', type: 'email', label: 'Contact Email', required: true }, { key: 'reportSummary', type: 'textarea', label: 'Report Summary', required: true }], formTitle: 'Lab Report Follow-up', submitButtonText: 'Submit Report' }, why: 'Collects the report summary and patient contact in one controlled intake.' },
    { id: 'ai_review_lab', type: 'openai_gpt', label: 'Review Follow-up Need', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Review this lab report summary for administrative follow-up routing only: {{input.reportSummary}}. Return ONLY JSON: {"needsClinician":true|false,"patientMessage":"plain language message","staffSummary":"short staff note"}.', temperature: 0.2 }, why: 'Classifies whether the clinic team should review before a patient message goes out.' },
    { id: 'js_parse_lab', type: 'javascript', label: 'Parse Lab Review', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, needsClinician: parsed.needsClinician === true, patientMessage: parsed.patientMessage || "", staffSummary: parsed.staffSummary || "" };', timeout: 5000 }, why: 'Makes the clinician-review flag available to the branch.' },
    { id: 'if_lab_needs_review', type: 'if_else', label: 'Needs Clinician Review?', category: 'logic', config: { conditions: [{ field: '$json.needsClinician', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Keeps sensitive or unclear report follow-ups with staff instead of auto-emailing them.' },
    { id: 'slack_lab_review', type: 'slack_message', label: 'Ask Care Team to Review', category: 'output', config: { channel: '#care-team', message: 'Lab report for {{input.patientName}} needs review:\n{{input.staffSummary}}' }, why: 'Routes clinician-needed cases to the care team for human review.' },
    { id: 'gmail_lab_followup', type: 'google_gmail', label: 'Email Patient Follow-up', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.contactEmail}}', subject: 'Your lab report follow-up', body: 'Hi {{input.patientName}},\n\n{{input.patientMessage}}' }, why: 'Sends clear next-step communication when staff review is not required.' },
  ],
  edges: [['form_lab_report', 'ai_review_lab'], ['ai_review_lab', 'js_parse_lab'], ['js_parse_lab', 'if_lab_needs_review'], ['if_lab_needs_review', 'slack_lab_review', 'true'], ['if_lab_needs_review', 'gmail_lab_followup', 'false']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000004',
  name: 'Insurance Pre-Authorization Tracker',
  description: 'Poll pre-authorization requests, notify staff or patients based on status, and stamp the request as checked.',
  category: SECTORS.healthcare,
  difficulty: 'Intermediate',
  estimated_setup_time: 22,
  tags: ['healthcare', 'insurance', 'airtable', 'slack', 'email'],
  nodes: [
    { id: 'schedule_preauth_check', type: 'schedule', label: 'Check Pre-Authorizations', category: 'triggers', config: { cron: '*/30 * * * *', timezone: 'Asia/Kolkata' }, why: 'Pre-authorization status changes are periodic, so polling is safer than manual checking.' },
    { id: 'airtable_read_preauth', type: 'airtable', label: 'Read One Pending Request', category: 'database', config: { baseId: '', tableId: 'PreAuthorizations', operation: 'read', filterByFormula: "AND({Status}!='Closed', {LastCheckedAt}='')", maxRecords: 1 }, why: 'Handles one pending request per run to avoid duplicate notifications.' },
    { id: 'js_prepare_preauth', type: 'javascript', label: 'Prepare Status Message', category: 'data', config: { code: 'const rec = (input.records || [])[0];\nif (!rec) return { ...input, hasRequest: false };\nconst f = rec.fields || {};\nconst status = f.Status || "Pending";\nreturn { ...input, hasRequest: true, recordId: rec.id, patientName: f.PatientName || "patient", contactEmail: f.Email || "", status, needsStaff: status === "Denied" || status === "More Info Needed" };', timeout: 5000 }, why: 'Normalises the pre-authorization row into the status and routing fields used below.' },
    { id: 'if_has_preauth', type: 'if_else', label: 'Request Found?', category: 'logic', config: { conditions: [{ field: '$json.hasRequest', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Stops empty polls from creating noise.' },
    { id: 'if_preauth_staff', type: 'if_else', label: 'Needs Staff Action?', category: 'logic', config: { conditions: [{ field: '$json.needsStaff', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Separates requests that need staff intervention from simple patient updates.' },
    { id: 'slack_preauth_staff', type: 'slack_message', label: 'Notify Insurance Desk', category: 'output', config: { channel: '#insurance-desk', message: 'Pre-authorization needs action for {{input.patientName}}. Status: {{input.status}}' }, why: 'Gets denied or information-needed cases in front of the insurance desk.' },
    { id: 'gmail_preauth_patient', type: 'google_gmail', label: 'Email Patient Status', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.contactEmail}}', subject: 'Insurance pre-authorization status', body: 'Hi {{input.patientName}},\n\nYour current pre-authorization status is: {{input.status}}.' }, why: 'Keeps patients informed when the request does not need immediate staff action.' },
    { id: 'airtable_mark_preauth', type: 'airtable', label: 'Stamp Checked', category: 'database', config: { baseId: '', tableId: 'PreAuthorizations', operation: 'update', recordId: '{{input.recordId}}', fields: { LastCheckedAt: 'Checked' } }, why: 'Marks the request so it is not processed repeatedly.' },
  ],
  edges: [['schedule_preauth_check', 'airtable_read_preauth'], ['airtable_read_preauth', 'js_prepare_preauth'], ['js_prepare_preauth', 'if_has_preauth'], ['if_has_preauth', 'if_preauth_staff', 'true'], ['if_preauth_staff', 'slack_preauth_staff', 'true'], ['if_preauth_staff', 'gmail_preauth_patient', 'false'], ['slack_preauth_staff', 'airtable_mark_preauth'], ['gmail_preauth_patient', 'airtable_mark_preauth']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000005',
  name: 'Patient Feedback Classifier',
  description: 'Classify patient feedback, store the category, and alert staff when sentiment or safety concerns require attention.',
  category: SECTORS.healthcare,
  difficulty: 'Beginner',
  estimated_setup_time: 17,
  tags: ['healthcare', 'feedback', 'sentiment', 'airtable', 'slack'],
  nodes: [
    { id: 'form_patient_feedback', type: 'form', label: 'Feedback Form', category: 'triggers', config: { fields: [{ key: 'patientName', type: 'text', label: 'Patient Name', required: false }, { key: 'contactEmail', type: 'email', label: 'Contact Email', required: false }, { key: 'feedback', type: 'textarea', label: 'Feedback', required: true }], formTitle: 'Patient Feedback', submitButtonText: 'Send Feedback' }, why: 'Provides a simple channel for structured patient feedback.' },
    { id: 'ai_classify_feedback', type: 'openai_gpt', label: 'Classify Feedback', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Classify this patient feedback: {{input.feedback}}. Return ONLY JSON: {"category":"compliment|complaint|billing|safety|other","sentiment":"positive|neutral|negative","summary":"short summary","needsReview":true|false}.', temperature: 0.2 }, why: 'Turns free-text feedback into category and review fields.' },
    { id: 'js_parse_feedback', type: 'javascript', label: 'Parse Classification', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, category: parsed.category || "other", sentiment: parsed.sentiment || "neutral", summary: parsed.summary || input.feedback || "", needsReview: parsed.needsReview === true };', timeout: 5000 }, why: 'Creates stable fields for storage and review routing.' },
    { id: 'airtable_log_feedback', type: 'airtable', label: 'Log Feedback', category: 'database', config: { baseId: '', tableId: 'PatientFeedback', operation: 'create', fields: { Patient: '{{input.patientName}}', Email: '{{input.contactEmail}}', Category: '{{input.category}}', Sentiment: '{{input.sentiment}}', Summary: '{{input.summary}}' } }, why: 'Keeps a searchable record of feedback themes and sentiment.' },
    { id: 'if_feedback_review', type: 'if_else', label: 'Needs Staff Review?', category: 'logic', config: { conditions: [{ field: '$json.needsReview', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Only interrupts staff when the classification says review is needed.' },
    { id: 'slack_feedback_review', type: 'slack_message', label: 'Alert Patient Experience Team', category: 'output', config: { channel: '#patient-experience', message: 'Feedback needs review: {{input.category}} / {{input.sentiment}}\n{{input.summary}}' }, why: 'Sends important feedback to the team that can respond.' },
  ],
  edges: [['form_patient_feedback', 'ai_classify_feedback'], ['ai_classify_feedback', 'js_parse_feedback'], ['js_parse_feedback', 'airtable_log_feedback'], ['airtable_log_feedback', 'if_feedback_review'], ['if_feedback_review', 'slack_feedback_review', 'true']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000006',
  name: 'Invoice Approval Triage',
  description: 'Accept invoice submissions, classify policy risk, route high-value or suspicious invoices to finance, and store the decision.',
  category: SECTORS.finance,
  difficulty: 'Intermediate',
  estimated_setup_time: 21,
  tags: ['finance', 'invoice', 'approval', 'postgresql', 'slack'],
  nodes: [
    { id: 'form_invoice_submission', type: 'form', label: 'Invoice Submission Form', category: 'triggers', config: { fields: [{ key: 'vendor', type: 'text', label: 'Vendor', required: true }, { key: 'amount', type: 'number', label: 'Amount', required: true }, { key: 'description', type: 'textarea', label: 'Description', required: true }, { key: 'submitterEmail', type: 'email', label: 'Submitter Email', required: true }], formTitle: 'Invoice Approval', submitButtonText: 'Submit Invoice' }, why: 'Collects the vendor, amount and context needed for an approval decision.' },
    { id: 'ai_invoice_risk', type: 'openai_gpt', label: 'Assess Invoice Risk', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Assess this invoice. Vendor: {{input.vendor}}. Amount: {{input.amount}}. Description: {{input.description}}. Return ONLY JSON: {"requiresApproval":true|false,"risk":"low|medium|high","reason":"short reason"}.', temperature: 0.2 }, why: 'Adds policy/risk judgment beyond a simple amount threshold.' },
    { id: 'js_parse_invoice', type: 'javascript', label: 'Parse Approval Decision', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nconst amount = Number(input.amount || 0);\nreturn { ...input, amount, requiresApproval: parsed.requiresApproval === true || amount >= 5000, risk: parsed.risk || "medium", reason: parsed.reason || "" };', timeout: 5000 }, why: 'Combines AI judgment with a hard approval threshold into a reliable flag.' },
    { id: 'if_invoice_approval', type: 'if_else', label: 'Approval Required?', category: 'logic', config: { conditions: [{ field: '$json.requiresApproval', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Separates invoices finance must review from those that can be filed.' },
    { id: 'postgres_log_invoice', type: 'postgresql', label: 'Log Invoice Decision', category: 'database', config: { query: "INSERT INTO invoice_reviews (vendor, amount, risk, requires_approval, reason, submitter_email, created_at) VALUES ('{{input.vendor}}', {{input.amount}}, '{{input.risk}}', '{{input.requiresApproval}}', '{{input.reason}}', '{{input.submitterEmail}}', now())" }, why: 'Creates an audit record for every invoice decision.' },
    { id: 'slack_invoice_approval', type: 'slack_message', label: 'Alert Finance Approver', category: 'output', config: { channel: '#finance-approvals', message: 'Invoice needs approval: {{input.vendor}} - {{input.amount}}\nRisk: {{input.risk}}\nReason: {{input.reason}}' }, why: 'Puts approval-required invoices in the finance queue immediately.' },
    { id: 'gmail_invoice_received', type: 'google_gmail', label: 'Email Submitter', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.submitterEmail}}', subject: 'Invoice received: {{input.vendor}}', body: 'Your invoice submission was received. Approval required: {{input.requiresApproval}}. Reason: {{input.reason}}' }, why: 'Confirms receipt so the submitter knows the invoice is in process.' },
  ],
  edges: [['form_invoice_submission', 'ai_invoice_risk'], ['ai_invoice_risk', 'js_parse_invoice'], ['js_parse_invoice', 'if_invoice_approval'], ['if_invoice_approval', 'slack_invoice_approval', 'true'], ['if_invoice_approval', 'postgres_log_invoice', 'false'], ['slack_invoice_approval', 'postgres_log_invoice'], ['postgres_log_invoice', 'gmail_invoice_received']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000007',
  name: 'Expense Policy Checker',
  description: 'Check submitted expenses against policy, save the result, and notify finance only when an expense needs review.',
  category: SECTORS.finance,
  difficulty: 'Beginner',
  estimated_setup_time: 18,
  tags: ['finance', 'expenses', 'policy', 'ai', 'slack'],
  nodes: [
    { id: 'form_expense', type: 'form', label: 'Expense Form', category: 'triggers', config: { fields: [{ key: 'employeeEmail', type: 'email', label: 'Employee Email', required: true }, { key: 'amount', type: 'number', label: 'Amount', required: true }, { key: 'category', type: 'text', label: 'Category', required: true }, { key: 'description', type: 'textarea', label: 'Description', required: true }], formTitle: 'Expense Check', submitButtonText: 'Submit Expense' }, why: 'Captures the expense data needed for policy review.' },
    { id: 'ai_policy_check', type: 'openai_gpt', label: 'Check Policy Fit', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Check this expense against a normal business expense policy. Amount: {{input.amount}}. Category: {{input.category}}. Description: {{input.description}}. Return ONLY JSON: {"approved":true|false,"reason":"short reason","risk":"low|medium|high"}.', temperature: 0.2 }, why: 'Flags unusual expenses while allowing normal ones through.' },
    { id: 'js_parse_expense', type: 'javascript', label: 'Parse Policy Result', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, approved: parsed.approved === true, reason: parsed.reason || "", risk: parsed.risk || "medium" };', timeout: 5000 }, why: 'Turns the AI result into fields that can be stored and branched on.' },
    { id: 'postgres_save_expense', type: 'postgresql', label: 'Save Expense Review', category: 'database', config: { query: "INSERT INTO expense_reviews (employee_email, amount, category, approved, risk, reason, created_at) VALUES ('{{input.employeeEmail}}', {{input.amount}}, '{{input.category}}', '{{input.approved}}', '{{input.risk}}', '{{input.reason}}', now())" }, why: 'Keeps every policy decision auditable.' },
    { id: 'if_expense_review', type: 'if_else', label: 'Needs Finance Review?', category: 'logic', config: { conditions: [{ field: '$json.approved', operator: 'equals', value: false }], combineOperation: 'AND' }, why: 'Only sends exceptions to finance; approved expenses are simply recorded.' },
    { id: 'slack_expense_review', type: 'slack_message', label: 'Alert Finance', category: 'output', config: { channel: '#finance-review', message: 'Expense needs review: {{input.employeeEmail}} / {{input.amount}}\nRisk: {{input.risk}}\nReason: {{input.reason}}' }, why: 'Notifies finance when the policy result is not approved.' },
  ],
  edges: [['form_expense', 'ai_policy_check'], ['ai_policy_check', 'js_parse_expense'], ['js_parse_expense', 'postgres_save_expense'], ['postgres_save_expense', 'if_expense_review'], ['if_expense_review', 'slack_expense_review', 'true']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000008',
  name: 'Vendor Due Diligence',
  description: 'Collect vendor details, fetch the live website, summarize risk, save the review, and alert procurement for high-risk vendors.',
  category: SECTORS.finance,
  difficulty: 'Intermediate',
  estimated_setup_time: 24,
  tags: ['finance', 'vendor', 'risk', 'http', 'airtable'],
  nodes: [
    { id: 'form_vendor', type: 'form', label: 'Vendor Intake Form', category: 'triggers', config: { fields: [{ key: 'vendorName', type: 'text', label: 'Vendor Name', required: true }, { key: 'website', type: 'url', label: 'Website', required: true }, { key: 'ownerEmail', type: 'email', label: 'Owner Email', required: true }], formTitle: 'Vendor Due Diligence', submitButtonText: 'Review Vendor' }, why: 'Collects the vendor identity and internal owner before any review starts.' },
    { id: 'http_fetch_vendor_site', type: 'http_request', label: 'Fetch Vendor Website', category: 'http_api', config: { url: '{{input.website}}', method: 'GET', headers: {}, timeout: 10000 }, why: 'Reads the live vendor website so the review uses current public information.' },
    { id: 'ai_vendor_risk', type: 'openai_gpt', label: 'Assess Vendor Risk', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Assess vendor risk from this website HTML and owner data. Vendor: {{input.vendorName}}. Website HTML: {{input.body}}. Return ONLY JSON: {"risk":"low|medium|high","summary":"short summary","requiresReview":true|false}.', temperature: 0.2 }, why: 'Summarizes vendor risk using the live website rather than only the submitted name.' },
    { id: 'js_parse_vendor', type: 'javascript', label: 'Parse Vendor Risk', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, risk: parsed.risk || "medium", summary: parsed.summary || "", requiresReview: parsed.requiresReview === true || parsed.risk === "high" };', timeout: 5000 }, why: 'Creates fields for storage and the procurement review branch.' },
    { id: 'airtable_log_vendor', type: 'airtable', label: 'Log Vendor Review', category: 'database', config: { baseId: '', tableId: 'VendorReviews', operation: 'create', fields: { Vendor: '{{input.vendorName}}', Website: '{{input.website}}', Risk: '{{input.risk}}', Summary: '{{input.summary}}', OwnerEmail: '{{input.ownerEmail}}' } }, why: 'Stores the review so procurement has an audit trail.' },
    { id: 'if_vendor_review', type: 'if_else', label: 'Procurement Review Needed?', category: 'logic', config: { conditions: [{ field: '$json.requiresReview', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Only interrupts procurement for vendors that need a closer look.' },
    { id: 'slack_vendor_review', type: 'slack_message', label: 'Alert Procurement', category: 'output', config: { channel: '#procurement', message: 'Vendor review needed: {{input.vendorName}}\nRisk: {{input.risk}}\n{{input.summary}}' }, why: 'Routes high-risk vendor reviews to procurement immediately.' },
  ],
  edges: [['form_vendor', 'http_fetch_vendor_site'], ['http_fetch_vendor_site', 'ai_vendor_risk'], ['ai_vendor_risk', 'js_parse_vendor'], ['js_parse_vendor', 'airtable_log_vendor'], ['airtable_log_vendor', 'if_vendor_review'], ['if_vendor_review', 'slack_vendor_review', 'true']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000009',
  name: 'Payment Failure Recovery',
  description: 'Capture payment-failure events from a billing system, classify the failure, notify the customer, and alert finance when manual recovery is needed.',
  category: SECTORS.finance,
  difficulty: 'Intermediate',
  estimated_setup_time: 20,
  tags: ['finance', 'billing', 'webhook', 'email', 'slack'],
  nodes: [
    { id: 'webhook_payment_failed', type: 'webhook', label: 'Payment Failure Webhook', category: 'triggers', config: { method: 'POST' }, why: 'Receives payment-failure payloads from whichever billing tool the customer uses.' },
    { id: 'js_extract_payment', type: 'javascript', label: 'Extract Failure Details', category: 'data', config: { code: 'const payload = input.body || input;\nreturn { ...input, customerEmail: payload.customerEmail || payload.email || "", customerName: payload.customerName || payload.name || "there", amount: payload.amount || 0, failureReason: payload.failureReason || payload.reason || "payment failed" };', timeout: 5000 }, why: 'Normalises common billing payload shapes into fields used by the recovery steps.' },
    { id: 'ai_recovery_message', type: 'openai_gpt', label: 'Draft Recovery Message', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Write a short, helpful payment recovery email for {{input.customerName}}. Amount: {{input.amount}}. Failure reason: {{input.failureReason}}. Do not blame the customer.', temperature: 0.4 }, why: 'Produces customer-friendly recovery copy instead of a cold system error.' },
    { id: 'gmail_payment_recovery', type: 'google_gmail', label: 'Email Customer', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.customerEmail}}', subject: 'Action needed: payment issue', body: '{{input.response}}' }, why: 'Sends the recovery message through a verified working email channel.' },
    { id: 'if_high_value_payment', type: 'if_else', label: 'High Value Failure?', category: 'logic', config: { conditions: [{ field: '$json.amount', operator: 'greaterThan', value: 1000 }], combineOperation: 'AND' }, why: 'Separates failures worth manual finance follow-up from normal automated recovery.' },
    { id: 'slack_payment_followup', type: 'slack_message', label: 'Alert Finance', category: 'output', config: { channel: '#finance-recovery', message: 'High-value payment failure: {{input.customerEmail}} / {{input.amount}}\nReason: {{input.failureReason}}' }, why: 'Gets large failed payments into a human recovery queue.' },
  ],
  edges: [['webhook_payment_failed', 'js_extract_payment'], ['js_extract_payment', 'ai_recovery_message'], ['ai_recovery_message', 'gmail_payment_recovery'], ['gmail_payment_recovery', 'if_high_value_payment'], ['if_high_value_payment', 'slack_payment_followup', 'true']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000010',
  name: 'Support Ticket Triage',
  description: 'Classify new support requests, save the ticket, route urgent cases to Slack, and email the customer with next steps.',
  category: SECTORS.operations,
  difficulty: 'Beginner',
  estimated_setup_time: 18,
  tags: ['support', 'triage', 'ai', 'postgresql', 'email'],
  nodes: [
    { id: 'form_support_request', type: 'form', label: 'Support Request Form', category: 'triggers', config: { fields: [{ key: 'customerEmail', type: 'email', label: 'Customer Email', required: true }, { key: 'subject', type: 'text', label: 'Subject', required: true }, { key: 'message', type: 'textarea', label: 'Message', required: true }], formTitle: 'Support Request', submitButtonText: 'Send Request' }, why: 'Collects the customer issue in a structured form instead of an untracked inbox.' },
    { id: 'ai_classify_ticket', type: 'openai_gpt', label: 'Classify Ticket', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Classify this support request. Subject: {{input.subject}}. Message: {{input.message}}. Return ONLY JSON: {"priority":"low|normal|urgent","category":"billing|technical|account|other","summary":"short summary"}.', temperature: 0.2 }, why: 'Turns the request into priority and category fields.' },
    { id: 'js_parse_ticket', type: 'javascript', label: 'Parse Ticket Fields', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, priority: parsed.priority || "normal", category: parsed.category || "other", summary: parsed.summary || input.message || "" };', timeout: 5000 }, why: 'Creates stable fields for database storage and priority routing.' },
    { id: 'postgres_create_ticket', type: 'postgresql', label: 'Create Support Ticket', category: 'database', config: { query: "INSERT INTO support_tickets (customer_email, subject, category, priority, summary, status, created_at) VALUES ('{{input.customerEmail}}', '{{input.subject}}', '{{input.category}}', '{{input.priority}}', '{{input.summary}}', 'open', now())" }, why: 'Creates a durable ticket instead of leaving support requests only in email or Slack.' },
    { id: 'if_urgent_ticket', type: 'if_else', label: 'Urgent Ticket?', category: 'logic', config: { conditions: [{ field: '$json.priority', operator: 'equals', value: 'urgent' }], combineOperation: 'AND' }, why: 'Only urgent tickets interrupt the team immediately.' },
    { id: 'slack_urgent_ticket', type: 'slack_message', label: 'Alert Support Team', category: 'output', config: { channel: '#support-urgent', message: 'Urgent support ticket: {{input.subject}}\n{{input.summary}}' }, why: 'Puts urgent requests in front of support staff fast.' },
    { id: 'gmail_ticket_ack', type: 'google_gmail', label: 'Email Customer', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.customerEmail}}', subject: 'We received your request', body: 'We received your request about "{{input.subject}}". Priority: {{input.priority}}. Our team will follow up.' }, why: 'Confirms the ticket was received and sets customer expectations.' },
  ],
  edges: [['form_support_request', 'ai_classify_ticket'], ['ai_classify_ticket', 'js_parse_ticket'], ['js_parse_ticket', 'postgres_create_ticket'], ['postgres_create_ticket', 'if_urgent_ticket'], ['if_urgent_ticket', 'slack_urgent_ticket', 'true'], ['postgres_create_ticket', 'gmail_ticket_ack']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000011',
  name: 'Meeting Notes to Action Items',
  description: 'Turn meeting notes into owners and action items, store the summary, and post the task list to the team.',
  category: SECTORS.operations,
  difficulty: 'Beginner',
  estimated_setup_time: 15,
  tags: ['operations', 'meetings', 'actions', 'ai', 'slack'],
  nodes: [
    { id: 'form_meeting_notes', type: 'form', label: 'Meeting Notes Form', category: 'triggers', config: { fields: [{ key: 'meetingTitle', type: 'text', label: 'Meeting Title', required: true }, { key: 'notes', type: 'textarea', label: 'Notes', required: true }, { key: 'teamChannel', type: 'text', label: 'Team Slack Channel', required: false }], formTitle: 'Meeting Notes', submitButtonText: 'Create Actions' }, why: 'Gives the team a simple way to turn raw notes into follow-up work.' },
    { id: 'ai_extract_actions', type: 'openai_gpt', label: 'Extract Action Items', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Extract action items from these meeting notes: {{input.notes}}. Return ONLY JSON: {"summary":"short summary","actionsText":"numbered action list with owner and due date when present"}.', temperature: 0.2 }, why: 'Finds action items and owners in unstructured notes.' },
    { id: 'js_parse_actions', type: 'javascript', label: 'Parse Action Items', category: 'data', config: { code: 'let parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nreturn { ...input, summary: parsed.summary || "", actionsText: parsed.actionsText || "No action items found.", channel: input.teamChannel || "#team-updates" };', timeout: 5000 }, why: 'Formats the AI result for storage and Slack posting.' },
    { id: 'postgres_save_meeting', type: 'postgresql', label: 'Save Meeting Summary', category: 'database', config: { query: "INSERT INTO meeting_summaries (title, summary, actions, created_at) VALUES ('{{input.meetingTitle}}', '{{input.summary}}', '{{input.actionsText}}', now())" }, why: 'Keeps a searchable record of meeting decisions and tasks.' },
    { id: 'slack_post_actions', type: 'slack_message', label: 'Post Actions to Team', category: 'output', config: { channel: '{{input.channel}}', message: '*{{input.meetingTitle}} actions*\n{{input.actionsText}}' }, why: 'Puts the follow-up list where the team already coordinates.' },
  ],
  edges: [['form_meeting_notes', 'ai_extract_actions'], ['ai_extract_actions', 'js_parse_actions'], ['js_parse_actions', 'postgres_save_meeting'], ['postgres_save_meeting', 'slack_post_actions']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000012',
  name: 'Employee Onboarding Checklist',
  description: 'Track one new hire at a time, send their onboarding email, notify the hiring team, and mark onboarding as started.',
  category: SECTORS.operations,
  difficulty: 'Beginner',
  estimated_setup_time: 17,
  tags: ['hr', 'onboarding', 'airtable', 'email', 'slack'],
  nodes: [
    { id: 'schedule_onboarding', type: 'schedule', label: 'Check New Hires', category: 'triggers', config: { cron: '0 10 * * *', timezone: 'Asia/Kolkata' }, why: 'Runs daily to pick up new hires without manual HR checks.' },
    { id: 'airtable_read_new_hire', type: 'airtable', label: 'Read One New Hire', category: 'database', config: { baseId: '', tableId: 'NewHires', operation: 'read', filterByFormula: "AND({Status}='Ready', {OnboardingStarted}='')", maxRecords: 1 }, why: 'Selects one ready new hire that has not started onboarding.' },
    { id: 'js_prepare_onboarding', type: 'javascript', label: 'Prepare Onboarding Payload', category: 'data', config: { code: 'const rec = (input.records || [])[0];\nif (!rec) return { ...input, hasHire: false };\nconst f = rec.fields || {};\nreturn { ...input, hasHire: true, recordId: rec.id, employeeName: f.Name || "there", employeeEmail: f.Email || "", manager: f.Manager || "your manager", startDate: f.StartDate || "" };', timeout: 5000 }, why: 'Lifts new-hire fields into a clean payload for email, Slack and marking.' },
    { id: 'if_has_hire', type: 'if_else', label: 'New Hire Found?', category: 'logic', config: { conditions: [{ field: '$json.hasHire', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Stops empty daily checks from sending blank onboarding messages.' },
    { id: 'gmail_onboarding', type: 'google_gmail', label: 'Email New Hire', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: '{{input.employeeEmail}}', subject: 'Welcome to the team', body: 'Hi {{input.employeeName}},\n\nWelcome. Your start date is {{input.startDate}}. Your manager is {{input.manager}}. We will share your onboarding tasks shortly.' }, why: 'Sends a consistent welcome email to the new hire.' },
    { id: 'slack_onboarding', type: 'slack_message', label: 'Notify Hiring Team', category: 'output', config: { channel: '#people-ops', message: 'Onboarding started for {{input.employeeName}}. Manager: {{input.manager}}. Start: {{input.startDate}}' }, why: 'Tells People Ops and the manager that onboarding has started.' },
    { id: 'airtable_mark_onboarding', type: 'airtable', label: 'Mark Started', category: 'database', config: { baseId: '', tableId: 'NewHires', operation: 'update', recordId: '{{input.recordId}}', fields: { OnboardingStarted: 'Yes' } }, why: 'Prevents duplicate onboarding starts for the same employee.' },
  ],
  edges: [['schedule_onboarding', 'airtable_read_new_hire'], ['airtable_read_new_hire', 'js_prepare_onboarding'], ['js_prepare_onboarding', 'if_has_hire'], ['if_has_hire', 'gmail_onboarding', 'true'], ['gmail_onboarding', 'slack_onboarding'], ['slack_onboarding', 'airtable_mark_onboarding']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000013',
  name: 'Weekly Pipeline Report',
  description: 'Read current pipeline rows, summarize risk and next actions, then email leadership and post the summary to Slack.',
  category: SECTORS.operations,
  difficulty: 'Intermediate',
  estimated_setup_time: 19,
  tags: ['sales', 'pipeline', 'reporting', 'airtable', 'slack'],
  nodes: [
    { id: 'schedule_pipeline_report', type: 'schedule', label: 'Weekly Report Schedule', category: 'triggers', config: { cron: '0 9 * * 1', timezone: 'Asia/Kolkata' }, why: 'Runs weekly so leadership receives a consistent pipeline view.' },
    { id: 'airtable_read_pipeline', type: 'airtable', label: 'Read Pipeline Deals', category: 'database', config: { baseId: '', tableId: 'Deals', operation: 'read', filterByFormula: "{Stage}!='Closed Lost'", maxRecords: 100 }, why: 'Loads active deals that belong in the weekly report.' },
    { id: 'ai_summarize_pipeline', type: 'openai_gpt', label: 'Summarize Pipeline', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Summarize this sales pipeline for leadership: {{input.records}}. Include total themes, risks, and next actions. Keep it concise.', temperature: 0.3 }, why: 'Turns raw deal rows into an executive-readable summary.' },
    { id: 'gmail_pipeline_report', type: 'google_gmail', label: 'Email Leadership', category: 'output', config: { operation: 'send', recipientSource: 'manual_entry', recipientEmails: 'REPLACE_WITH_LEADERSHIP_EMAIL', subject: 'Weekly pipeline report', body: '{{input.response}}' }, why: 'Sends the report to leadership without requiring them to open the CRM.' },
    { id: 'slack_pipeline_report', type: 'slack_message', label: 'Post Sales Summary', category: 'output', config: { channel: '#sales', message: '*Weekly pipeline report*\n{{input.response}}' }, why: 'Shares the same summary in the sales team channel for follow-up.' },
  ],
  edges: [['schedule_pipeline_report', 'airtable_read_pipeline'], ['airtable_read_pipeline', 'ai_summarize_pipeline'], ['ai_summarize_pipeline', 'gmail_pipeline_report'], ['ai_summarize_pipeline', 'slack_pipeline_report']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000014',
  name: 'CRM Data Cleanup Assistant',
  description: 'Find one CRM contact needing cleanup, detect missing fields, update the CRM, and notify ops when human research is needed.',
  category: SECTORS.operations,
  difficulty: 'Intermediate',
  estimated_setup_time: 23,
  tags: ['crm', 'hubspot', 'cleanup', 'operations', 'slack'],
  nodes: [
    { id: 'schedule_crm_cleanup', type: 'schedule', label: 'Check CRM Records', category: 'triggers', config: { cron: '*/20 * * * *', timezone: 'Asia/Kolkata' }, why: 'Runs continuously but lightly, cleaning one record per pass.' },
    { id: 'hubspot_read_contact', type: 'hubspot', label: 'Find Contact to Clean', category: 'crm', config: { resource: 'contact', operation: 'list', properties: { limit: 1 } }, why: 'Uses the real CRM node so the template works against the system sales teams use.' },
    { id: 'js_detect_missing_crm', type: 'javascript', label: 'Detect Missing Fields', category: 'data', config: { code: 'const contact = (input.results || input.contacts || [])[0] || input;\nconst missing = ["email", "firstname", "company"].filter((field) => !contact[field]);\nreturn { ...input, contactId: contact.id || "", missing, needsResearch: missing.length > 0, missingText: missing.join(", ") || "None" };', timeout: 5000 }, why: 'Finds the exact fields missing from the contact record.' },
    { id: 'if_crm_missing', type: 'if_else', label: 'Needs Cleanup?', category: 'logic', config: { conditions: [{ field: '$json.needsResearch', operator: 'equals', value: true }], combineOperation: 'AND' }, why: 'Only records with missing required fields create work for ops.' },
    { id: 'slack_crm_research', type: 'slack_message', label: 'Ask Ops to Research', category: 'output', config: { channel: '#revops', message: 'CRM contact needs cleanup. Missing: {{input.missingText}}. Contact ID: {{input.contactId}}' }, why: 'Routes incomplete records to RevOps for human research.' },
    { id: 'hubspot_mark_reviewed', type: 'hubspot', label: 'Mark Reviewed', category: 'crm', config: { resource: 'contact', operation: 'update', id: '{{input.contactId}}', properties: { ctrlchecks_reviewed: 'true' } }, why: 'Marks the contact as reviewed so it can be excluded from future cleanup passes.' },
  ],
  edges: [['schedule_crm_cleanup', 'hubspot_read_contact'], ['hubspot_read_contact', 'js_detect_missing_crm'], ['js_detect_missing_crm', 'if_crm_missing'], ['if_crm_missing', 'slack_crm_research', 'true'], ['if_crm_missing', 'hubspot_mark_reviewed', 'false'], ['slack_crm_research', 'hubspot_mark_reviewed']],
});

addTemplate({
  id: '91000000-0000-4000-8000-000000000015',
  name: 'Customer Churn Risk Alert',
  description: 'Poll one customer account, score churn risk from usage and notes, alert account managers, and mark the record checked.',
  category: SECTORS.operations,
  difficulty: 'Intermediate',
  estimated_setup_time: 22,
  tags: ['customer-success', 'churn', 'airtable', 'ai', 'slack'],
  nodes: [
    { id: 'schedule_churn_check', type: 'schedule', label: 'Check Customer Risk', category: 'triggers', config: { cron: '*/30 * * * *', timezone: 'Asia/Kolkata' }, why: 'Runs on a timer because churn signals appear in account data over time.' },
    { id: 'airtable_read_customer', type: 'airtable', label: 'Read One Customer', category: 'database', config: { baseId: '', tableId: 'Customers', operation: 'read', filterByFormula: "AND({Status}='Active', {ChurnCheckedAt}='')", maxRecords: 1 }, why: 'Selects one active customer that has not been checked yet.' },
    { id: 'ai_churn_score', type: 'openai_gpt', label: 'Score Churn Risk', category: 'ai', config: { model: 'gpt-4o-mini', prompt: 'Score churn risk for this customer record: {{input.records}}. Return ONLY JSON: {"risk":"low|medium|high","reason":"short reason","nextAction":"specific action"}.', temperature: 0.2 }, why: 'Uses account context to judge risk and recommend the next action.' },
    { id: 'js_parse_churn', type: 'javascript', label: 'Parse Risk Score', category: 'data', config: { code: 'const rec = (input.records || [])[0];\nlet parsed = {};\ntry { const text = input.response || "{}"; const m = text.match(/\\{[\\s\\S]*\\}/); parsed = m ? JSON.parse(m[0]) : {}; } catch (e) { parsed = {}; }\nconst f = rec?.fields || {};\nreturn { ...input, recordId: rec?.id || "", customerName: f.Name || "customer", ownerChannel: f.OwnerChannel || "#customer-success", risk: parsed.risk || "medium", reason: parsed.reason || "", nextAction: parsed.nextAction || "" };', timeout: 5000 }, why: 'Combines the Airtable record ID with the parsed AI risk fields.' },
    { id: 'if_high_churn', type: 'if_else', label: 'High Churn Risk?', category: 'logic', config: { conditions: [{ field: '$json.risk', operator: 'equals', value: 'high' }], combineOperation: 'AND' }, why: 'Only high-risk accounts interrupt the account team.' },
    { id: 'slack_churn_alert', type: 'slack_message', label: 'Alert Account Manager', category: 'output', config: { channel: '{{input.ownerChannel}}', message: 'High churn risk: {{input.customerName}}\nReason: {{input.reason}}\nNext action: {{input.nextAction}}' }, why: 'Routes the alert to the owner responsible for saving the account.' },
    { id: 'airtable_mark_churn_checked', type: 'airtable', label: 'Mark Checked', category: 'database', config: { baseId: '', tableId: 'Customers', operation: 'update', recordId: '{{input.recordId}}', fields: { ChurnCheckedAt: 'Checked' } }, why: 'Prevents the same customer from being rescored on every poll.' },
  ],
  edges: [['schedule_churn_check', 'airtable_read_customer'], ['airtable_read_customer', 'ai_churn_score'], ['ai_churn_score', 'js_parse_churn'], ['js_parse_churn', 'if_high_churn'], ['if_high_churn', 'slack_churn_alert', 'true'], ['if_high_churn', 'airtable_mark_churn_checked', 'false'], ['slack_churn_alert', 'airtable_mark_churn_checked']],
});

// ═════════════════════════════════════════════════════════════════════════════
// Emit
// ═════════════════════════════════════════════════════════════════════════════

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Give every node its family and its notes.
 *
 * Family (`data.category`) comes from the note registry, so the label and colour a
 * user sees on the canvas always matches the family the node's help page sits
 * under. The templates previously invented their own: HubSpot — the only CRM node
 * in the library — was filed as `database`, Airtable/Sheets/Drive likewise, and
 * Gmail was `output` in 15 templates but `google` in the other 5.
 *
 * Notes are layered: the registry supplies what the node type does in general
 * (already written, 176 pages of it), and node-notes.json supplies why this
 * particular node is in this particular workflow. Neither is duplicated.
 */
function applyCategoriesAndNotes(t) {
  const s = slug(t.name);
  const instance = INSTANCE_NOTES[s] || {};
  const missing = [];

  for (const n of t.nodes) {
    const reg = REGISTRY[n.data.type];
    const family = reg?.nodeCategory || CATEGORY_FALLBACK[n.data.type] || null;

    if (family && n.data.category !== family) {
      log(t, 'FIX', `${n.id}: family "${n.data.category}" -> "${family}" (per the note registry, where ${n.data.type} is filed under "${reg?.docsCategory || family}")`);
      n.data.category = family;
    }

    const why = instance[n.id] || generatedNodeNotes.get(`${s}.${n.id}`);
    if (!why) missing.push(`${s}.${n.id}`);

    n.data.notes = {
      // ── from the note registry (not authored here) ──
      family: reg?.docsCategory || 'Database',
      what: reg?.what || '',
      overview: reg?.overview || '',
      tips: reg?.tips || [],
      docsHref: reg?.docsHref || null,
      // ── specific to this workflow ──
      why: why || '',
    };
  }
  if (missing.length) noteGaps.push(...missing);
}

fs.rmSync(SRC_DIR, { recursive: true, force: true });
fs.mkdirSync(SRC_DIR, { recursive: true });
fs.mkdirSync(SQL_DIR, { recursive: true });

const out = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
for (const t of out) {
  applyCategoriesAndNotes(t);
  t.version = (Number(t.version) || 1) + 1;
  fs.writeFileSync(path.join(SRC_DIR, `${slug(t.name)}.json`), JSON.stringify(t, null, 2) + '\n');
}

if (noteGaps.length) {
  console.error(`\n✖ ${noteGaps.length} node(s) have no per-instance note in node-notes.json:`);
  noteGaps.forEach((g) => console.error(`    ${g}`));
  console.error('\nAdd them before regenerating — a node shipping with a blank note is the\nexact problem this work exists to fix.');
  process.exit(1);
}

// ── SQL ──────────────────────────────────────────────────────────────────────
const q = (s) => `$tpl$${s}$tpl$`;
const jsonb = (v) => `$tpl$${JSON.stringify(v)}$tpl$::jsonb`;
const textArr = (a) => `ARRAY[${a.map((x) => q(x)).join(',')}]::text[]`;

const NEW_IDS = new Set(['b7f3c1d2-4e58-4a91-9c06-2d8e5f0a7b34', ...newTemplateIds]);

fs.writeFileSync(
  path.join(SQL_DIR, '00_backup_current_templates.sql'),
  `-- Template Library v2 — step 0: backup.
-- 15 of the 20 live templates exist ONLY in this database (no repo file), so
-- this runs before anything else. Nothing below is destructive.

BEGIN;

DROP TABLE IF EXISTS templates_backup_20260731;
CREATE TABLE templates_backup_20260731 AS SELECT * FROM templates;

-- Expect: 550
SELECT count(*) AS backed_up FROM templates_backup_20260731;

COMMIT;

-- To restore everything:
--   BEGIN;
--   DELETE FROM templates;
--   INSERT INTO templates SELECT * FROM templates_backup_20260731;
--   COMMIT;
`,
);

fs.writeFileSync(
  path.join(SQL_DIR, '01_deactivate_unsafe_templates.sql'),
  `-- Template Library v2 — step 1: take the two dangerous templates out of the
-- gallery immediately, before the rest of the work lands.
--
--  * Cross-Platform Sync Engine    — its snapshot state never persisted, so every
--                                    poll re-pushed every client record to HubSpot
--                                    and Google Sheets. Every 15 minutes. Forever.
--  * Internal Knowledge / Ops Agent — its if_else condition parses to a permanent
--                                    false, so it never reads the knowledge base
--                                    and Slack-pages the knowledge team for every
--                                    question. Tagged "production-ready".
--
-- Reversible: set is_active = true again after step 2 is applied and verified.

BEGIN;

SELECT 0 AS deactivated;

COMMIT;
`,
);

fs.writeFileSync(
  path.join(SQL_DIR, '01_deactivate_unsafe_templates.sql'),
  `-- Template Library v2 - step 1: historical safety step.
-- Earlier drafts used this step to temporarily hide unsafe templates before the
-- corrected graphs were applied. The current migration inserts/updates the full
-- corrected 36-template library directly, so this step intentionally does not
-- change live data.

BEGIN;

SELECT 0 AS deactivated;

COMMIT;
`,
);

const statements = out.map((t) => {
  const common = `
    name                 = ${q(t.name)},
    description          = ${q(t.description)},
    category             = ${q(t.category)},
    nodes                = ${jsonb(t.nodes)},
    edges                = ${jsonb(t.edges)},
    difficulty           = ${q(t.difficulty)},
    estimated_setup_time = ${t.estimated_setup_time},
    tags                 = ${textArr(t.tags || [])},
    version              = ${t.version},
    updated_at           = now()`;

  if (NEW_IDS.has(t.id)) {
    return `-- ${t.name} (NEW — split out of "Document Vault with Smart Search")
INSERT INTO templates (
  id, name, description, category, nodes, edges, difficulty,
  estimated_setup_time, tags, is_featured, is_active, use_count, version,
  created_at, updated_at
) VALUES (
  ${q(t.id)}, ${q(t.name)}, ${q(t.description)}, ${q(t.category)},
  ${jsonb(t.nodes)}, ${jsonb(t.edges)}, ${q(t.difficulty)},
  ${t.estimated_setup_time}, ${textArr(t.tags || [])},
  ${t.is_featured}, true, 0, ${t.version}, now(), now()
)
ON CONFLICT (id) DO UPDATE SET${common};`;
  }

  return `-- ${t.name}
UPDATE templates SET${common}
WHERE id = ${q(t.id)};`;
});

fs.writeFileSync(
  path.join(SQL_DIR, '02_apply_templates_v2.sql'),
  `-- Template Library v2 — step 2: apply the corrected graphs.
--
-- Generated by ctrl_checks/templates/apply-fixes.cjs from
-- ctrl_checks/templates/snapshot/live-2026-07-31.json.
-- DO NOT hand-edit: change the patch script and regenerate.
--
-- Every change is documented in ctrl_checks/templates/CHANGELOG.md and
-- justified in docs/TEMPLATE_LIBRARY_FIX_SPEC.md.
--
-- Templates: ${out.length} (${out.length - NEW_IDS.size} updated, ${NEW_IDS.size} inserted)
-- Run 00_backup_current_templates.sql first.

BEGIN;

${statements.join('\n\n')}

-- Expect: ${out.length}
SELECT count(*) AS active_templates FROM templates WHERE is_active = true;

COMMIT;
`,
);

fs.writeFileSync(
  path.join(SQL_DIR, 'RUN_ORDER.txt'),
  `Template Library v2 — run order
================================

ONE COMMAND (recommended — runs all three steps with safety checks):

    cd worker && node scripts/apply-templates-v2.cjs

  Add --dry-run first to see what it would do without writing anything.
  It refuses to touch the live table unless a complete backup exists, runs each
  step in its own transaction, and prints verification counts plus the rollback
  statement when it finishes.

Or run the files by hand, in this order:

  00_backup_current_templates.sql    REQUIRED FIRST. Preserves the current live
                                     template table before replacing the active
                                     library with the corrected ${out.length}.
  01_deactivate_unsafe_templates.sql Historical no-op kept for runbook safety.
  02_apply_templates_v2.sql          Applies the corrected graphs to all ${out.length}.

Still outstanding after this migration — see DEFERRED.md:
${deferred.map((d) => `  - ${d.template}: ${d.item}`).join('\n')}
`,
);

// ── changelog + deferred ─────────────────────────────────────────────────────
const grouped = new Map();
for (const c of changelog) {
  if (!grouped.has(c.template)) grouped.set(c.template, []);
  grouped.get(c.template).push(c);
}
fs.writeFileSync(
  path.join(HERE, 'CHANGELOG.md'),
  `# Template Library v2 — what changed and why

Generated by \`apply-fixes.cjs\`. Baseline: \`snapshot/live-2026-07-31.json\`
(what was live in production on 2026-07-31).

**${changelog.length} changes across ${grouped.size} templates.**

${[...grouped.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([name, items]) =>
      `## ${name}\n\n${items.map((i) => `- **${i.kind}** — ${i.detail}`).join('\n')}`,
  )
  .join('\n\n')}
`,
);

fs.writeFileSync(
  path.join(HERE, 'DEFERRED.md'),
  `# Deliberately NOT fixed

These are known defects that were left alone because fixing them would mean
guessing at a contract that is currently ambiguous, or because the fix belongs
in the platform rather than in a template.

${deferred.map((d) => `## ${d.template}\n\n**${d.item}**\n\n${d.reason}`).join('\n\n')}
`,
);

console.log(`✔ ${out.length} templates written to src/`);
console.log(`✔ ${changelog.length} changes across ${grouped.size} templates`);
console.log(`✔ ${deferred.length} fixes deferred (see DEFERRED.md)`);
console.log(`✔ SQL written to sql_migrations/templates_v2/`);
