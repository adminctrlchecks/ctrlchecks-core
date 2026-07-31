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

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

const ICONS = {
  javascript: 'Code',
  if_else: 'GitBranch',
  merge: 'GitMerge',
  airtable: 'Database',
  loop: 'Repeat',
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

  defer(
    t.name,
    'whatsapp_reply_client.to = {{input.senderPhone}}',
    'senderPhone has 0 matches anywhere in the codebase and the chat_trigger output contract is contested (execute-workflow.ts:3052 returns a string; the comment at :20086 claims an object). Needs one live chat execution to settle before a value can be written.',
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

  defer(
    t.name,
    'whatsapp_reply_copilot.to = {{input.senderPhone}}',
    'blocked on the chat_trigger output contract (see B4). senderPhone exists nowhere in the codebase.',
  );

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
  defer(
    search.name,
    'whatsapp_reply_search.to = {{input.senderPhone}}',
    'blocked on the chat_trigger output contract (see B4).',
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

    const why = instance[n.id];
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

const NEW_IDS = new Set(['b7f3c1d2-4e58-4a91-9c06-2d8e5f0a7b34']);

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

UPDATE templates
SET is_active = false, updated_at = now()
WHERE name IN ('Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent');

-- Expect: 2
SELECT count(*) AS deactivated
FROM templates
WHERE name IN ('Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent')
  AND is_active = false;

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
-- Templates: ${out.length} (${out.length - 1} updated, 1 inserted)
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

  00_backup_current_templates.sql    REQUIRED FIRST. 15 of the 20 live templates
                                     exist only in this database.
  01_deactivate_unsafe_templates.sql Pulls the two dangerous templates from the
                                     gallery. Safe to run on its own, immediately.
  02_apply_templates_v2.sql          Applies the corrected graphs to all ${out.length}.

After 02, reactivate the two from step 01 once you have run each end to end:

  UPDATE templates SET is_active = true
  WHERE name IN ('Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent');

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
