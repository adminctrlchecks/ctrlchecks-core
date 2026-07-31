#!/usr/bin/env node
/**
 * Pull node notes out of the existing note registry.
 *
 * The point of this file: template notes are NOT authored from scratch. The repo
 * already holds 176 written node doc pages, 184 field guides and a full set of
 * plain-English descriptions. This reads them and emits one lookup keyed by node
 * type, so every template node can be given the notes that already belong to it.
 *
 * Sources (all existing, none created here):
 *   docs-content/manifest.ts        → family (category), display name, one-line summary
 *   nodeLaymanDescriptions.ts       → the plain-English "what this does" line
 *   nodeUsageGuides.ts              → overview, inputs, outputs, tips
 *
 * Output: registry-notes.json
 *
 * Run: node ctrl_checks/templates/extract-registry-notes.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.join(HERE, '..', 'src');
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

/**
 * The note registry files its pages under 16 family names. The canvas renders
 * families from `NODE_CATEGORIES` in nodeTypes.ts, which uses ids. This is the
 * agreed mapping between the two — the note registry is the authority (decided
 * 2026-07-31), so a node's family on the canvas now always matches the family
 * its help page sits under.
 */
const DOCS_CATEGORY_TO_NODE_CATEGORY = {
  AI: 'ai',
  CMS: 'cms',
  CRM: 'crm',
  Communication: 'output', // NODE_CATEGORIES id 'output' is labelled "Communication"
  Data: 'data',
  DevOps: 'devops',
  Ecommerce: 'ecommerce',
  File: 'storage',
  Flow: 'logic',
  'HTTP & API': 'http_api',
  Logic: 'logic',
  Payment: 'payment',
  Productivity: 'productivity',
  Triggers: 'triggers',
  Utility: 'utility',
  Workflow: 'logic',
};

// ── manifest: slug → { displayName, docsCategory, description } ──────────────
const manifest = {};
{
  const s = read('docs-content/manifest.ts');
  const re =
    /"slug":\s*"([a-z0-9_]+)",\s*"displayName":\s*"([^"]*)",\s*"category":\s*"([^"]*)",\s*"description":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    manifest[m[1]] = {
      displayName: m[2],
      docsCategory: m[3],
      description: m[4].replace(/\\"/g, '"').replace(/\\n/g, ' '),
    };
  }
}

// ── layman descriptions: type → plain-English line ───────────────────────────
const layman = {};
{
  const s = read('components/workflow/nodeLaymanDescriptions.ts');
  const re = /^\s*([a-z0-9_]+):\s*"((?:[^"\\]|\\.)*)"/gm;
  let m;
  while ((m = re.exec(s)) !== null) layman[m[1]] = m[2].replace(/\\"/g, '"');
}

// ── usage guides: type → { overview, tips } ──────────────────────────────────
const guides = {};
{
  const s = read('components/workflow/nodeUsageGuides.ts');
  // Each entry starts `  <type>: {` and holds an `overview: '...'` and `tips: [...]`.
  const entry = /^ {2}([a-z0-9_]+):\s*\{/gm;
  let m;
  const marks = [];
  while ((m = entry.exec(s)) !== null) marks.push({ type: m[1], at: m.index });
  marks.forEach((mark, i) => {
    const block = s.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : s.length);
    const ov = block.match(/overview:\s*'((?:[^'\\]|\\.)*)'/);
    const tipsRaw = block.match(/tips:\s*\[([\s\S]*?)\]/);
    const tips = tipsRaw
      ? [...tipsRaw[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((t) => t[1].replace(/\\'/g, "'"))
      : [];
    guides[mark.type] = {
      overview: ov ? ov[1].replace(/\\'/g, "'") : '',
      tips,
    };
  });
}

// ── merge ────────────────────────────────────────────────────────────────────
const types = new Set([...Object.keys(manifest), ...Object.keys(layman), ...Object.keys(guides)]);
const out = {};
for (const type of [...types].sort()) {
  const man = manifest[type];
  const docsCategory = man?.docsCategory;
  out[type] = {
    displayName: man?.displayName ?? type,
    docsCategory: docsCategory ?? null,
    nodeCategory: docsCategory ? DOCS_CATEGORY_TO_NODE_CATEGORY[docsCategory] ?? null : null,
    // The plain-English line is the best "what" we have; the manifest summary is
    // the fallback for nodes with no layman entry.
    what: layman[type] || man?.description || '',
    overview: guides[type]?.overview || man?.description || '',
    tips: guides[type]?.tips ?? [],
    docsHref: man ? `/docs/nodes/${type}` : null,
  };
}

fs.writeFileSync(path.join(HERE, 'registry-notes.json'), JSON.stringify(out, null, 2) + '\n');

const withCat = Object.values(out).filter((v) => v.nodeCategory).length;
const withWhat = Object.values(out).filter((v) => v.what).length;
const withGuide = Object.values(out).filter((v) => v.overview).length;
console.log(`✔ ${Object.keys(out).length} node types extracted from the note registry`);
console.log(`  family (category): ${withCat}`);
console.log(`  plain-English "what": ${withWhat}`);
console.log(`  usage overview: ${withGuide}`);
