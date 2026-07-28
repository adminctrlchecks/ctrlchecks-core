#!/usr/bin/env node
/**
 * Structural baseline generator for the field-ownership redesign (Phase 0a / 0b).
 *
 * Why this exists: the field-ownership block is inline JSX inside AutonomousAgentWizard
 * and cannot be mounted behind a debug route without first extracting it -- which is the
 * very refactor the baseline is supposed to check. So instead of a screenshot we capture
 * the *structure* of the rendered tree straight from the AST, and diff that after the
 * extraction.
 *
 * A structural inventory catches things a screenshot cannot: a dropped onClick, a flipped
 * conditional, a lost className. It cannot catch visual drift from CSS resolution order.
 *
 * Usage:
 *   node scripts/field-ownership-baseline.mjs --label 0a \
 *     --source src/components/workflow/AutonomousAgentWizard.tsx --start 6584 --end 7217 \
 *     --block docs/field-ownership-baseline/0a-block.tsx.txt \
 *     --out   docs/field-ownership-baseline/0a-structure.md
 *
 *   node scripts/field-ownership-baseline.mjs --label 0b \
 *     --source src/components/workflow/field-ownership/FieldOwnershipStage.tsx \
 *     --source src/components/workflow/field-ownership/NodeOwnershipCard.tsx \
 *     --out   docs/field-ownership-baseline/0b-structure.md
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

function parseArgs(argv) {
  const out = { sources: [], label: 'baseline' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--source') out.sources.push(next());
    else if (a === '--start') out.start = Number(next());
    else if (a === '--end') out.end = Number(next());
    else if (a === '--out') out.out = next();
    else if (a === '--block') out.block = next();
    else if (a === '--label') out.label = next();
    else if (a === '--compare') out.compare = [next(), next()];
  }
  if (out.compare) return out;
  if (out.sources.length === 0 || !out.out) {
    throw new Error('Required: at least one --source, and --out');
  }
  if (out.sources.length > 1 && (out.start || out.end)) {
    throw new Error('--start/--end only apply to a single --source');
  }
  return out;
}

/**
 * Compare two generated inventories.
 *
 * Compares by *name* with counts alongside, never by the rendered "name ×N" line -- an
 * earlier version did the latter and reported every count change as both a loss and an
 * addition, which buries a real removal in noise. A dropped name is the finding that
 * matters; a changed count is usually just a helper being reused more often.
 */
function compareInventories(pathA, pathB) {
  const parse = (p) => {
    const txt = readFileSync(p, 'utf8');
    const sections = {};
    const re = /^## (.+?)\n[\s\S]*?```\n([\s\S]*?)```/gm;
    let m;
    while ((m = re.exec(txt))) {
      const counts = new Map();
      for (const line of m[2].split('\n')) {
        if (!line.trim()) continue;
        const hit = /^(.*?)\s+×(\d+)$/.exec(line);
        if (hit) counts.set(hit[1].trim(), Number(hit[2]));
        else counts.set(line.trim(), 1);
      }
      sections[m[1]] = counts;
    }
    return sections;
  };

  const A = parse(pathA);
  const B = parse(pathB);
  let removals = 0;

  for (const name of Object.keys(A)) {
    if (name.startsWith('How to compare')) continue;
    const a = A[name];
    const b = B[name] ?? new Map();
    const removed = [...a.keys()].filter((k) => !b.has(k));
    const added = [...b.keys()].filter((k) => !a.has(k));
    const changed = [...a.keys()].filter((k) => b.has(k) && b.get(k) !== a.get(k));

    console.log(`\n### ${name}  (${a.size} → ${b.size} distinct)`);
    if (removed.length) {
      removals += removed.length;
      console.log(`  ❌ REMOVED (${removed.length}) — investigate each:`);
      removed.forEach((k) => console.log(`     - ${k}  (was ×${a.get(k)})`));
    }
    if (added.length) {
      console.log(`  + added (${added.length}):`);
      added.forEach((k) => console.log(`     + ${k}${b.get(k) > 1 ? `  ×${b.get(k)}` : ''}`));
    }
    if (changed.length) {
      console.log(`  ~ count changed (${changed.length}, not a loss):`);
      changed.forEach((k) => console.log(`     ~ ${k}  ×${a.get(k)} → ×${b.get(k)}`));
    }
    if (!removed.length && !added.length && !changed.length) console.log('  ✓ identical');
  }

  console.log(
    removals === 0
      ? '\n==> No names removed in any category.'
      : `\n==> ${removals} name(s) removed — each must be accounted for.`
  );
}

/** Attribute names treated as event handlers. */
const isHandlerName = (name) => /^on[A-Z]/.test(name);

/**
 * Render a JSX attribute's value to a stable string for diffing.
 * String literals keep their text; expressions are reduced to their source text with
 * whitespace collapsed, so formatting changes during extraction do not show as drift.
 */
function attrValueText(attr, sourceFile) {
  if (!attr.initializer) return 'true';
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    return attr.initializer.expression.getText(sourceFile).replace(/\s+/g, ' ').trim();
  }
  return attr.initializer.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function tagNameOf(node, sourceFile) {
  const tag = node.tagName;
  return tag ? tag.getText(sourceFile) : '<unknown>';
}

function collect(sourceFile, filePath, range, acc) {
  const inRange = (node) => {
    if (!range) return true;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    return start >= range.start && start <= range.end;
  };

  const visit = (node) => {
    const opening =
      ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node : null;

    if (opening && inRange(node)) {
      const tag = tagNameOf(opening, sourceFile);
      acc.elements.push(tag);

      for (const attr of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText(sourceFile);
        const value = attrValueText(attr, sourceFile);
        if (name === 'className') acc.classNames.push(value);
        else if (isHandlerName(name)) acc.handlers.push(`${tag}.${name}=${value}`);
      }
    }

    if (ts.isJsxText(node) && inRange(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text) acc.texts.push(text);
    }

    // String literals inside JSX expressions are user-visible copy too
    // (e.g. ternaries choosing between two labels).
    if (ts.isStringLiteral(node) && inRange(node)) {
      const parent = node.parent;
      const isAttrValue = parent && ts.isJsxAttribute(parent);
      if (!isAttrValue) {
        const text = node.text.trim();
        if (text && /[a-zA-Z]{2,}/.test(text) && text.length > 1) acc.jsxStrings.push(text);
      }
    }

    if (ts.isIdentifier(node) && inRange(node)) {
      acc.identifiers.push(node.text);
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  acc.files.push(filePath);
}

function multiset(list) {
  const map = new Map();
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function section(title, note, entries) {
  const lines = [`## ${title}`, ''];
  if (note) lines.push(`> ${note}`, '');
  lines.push(`Distinct: **${entries.length}**, total: **${entries.reduce((n, [, c]) => n + c, 0)}**`, '');
  lines.push('```');
  for (const [value, count] of entries) lines.push(count === 1 ? value : `${value}    ×${count}`);
  lines.push('```', '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(process.cwd());

  if (args.compare) {
    compareInventories(resolve(root, args.compare[0]), resolve(root, args.compare[1]));
    return;
  }
  const acc = {
    files: [],
    elements: [],
    classNames: [],
    texts: [],
    jsxStrings: [],
    handlers: [],
    identifiers: [],
  };

  const range = args.start && args.end ? { start: args.start, end: args.end } : null;

  for (const src of args.sources) {
    const abs = resolve(root, src);
    const content = readFileSync(abs, 'utf8');
    const sourceFile = ts.createSourceFile(abs, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    collect(sourceFile, relative(root, abs).replace(/\\/g, '/'), range, acc);

    if (args.block && range) {
      const lines = content.split(/\r?\n/);
      const block = lines.slice(range.start - 1, range.end).join('\n');
      mkdirSync(dirname(resolve(root, args.block)), { recursive: true });
      writeFileSync(resolve(root, args.block), block, 'utf8');
    }
  }

  // Identifiers are noisy (every local, every import). Keep only those that look like
  // state/derived/handler bindings the block reads, which is what 0b must re-supply as props.
  const identifierCounts = multiset(acc.identifiers).filter(
    ([name]) => name.length > 2 && !/^[A-Z_]+$/.test(name)
  );

  const body = [
    `# Field-ownership structural inventory — \`${args.label}\``,
    '',
    `Generated by \`scripts/field-ownership-baseline.mjs\`. Do not hand-edit.`,
    '',
    `Sources:`,
    ...acc.files.map((f) => `- \`${f}\`${range ? ` (lines ${range.start}-${range.end})` : ''}`),
    '',
    '## How to compare 0a against a later label',
    '',
    'The **multisets** below are the comparison, not the raw ordering: after extraction the',
    'same elements live in several files, so a single linear sequence cannot match by',
    'construction. What must hold is that nothing was **lost**.',
    '',
    '- **Text literals** and **JSX string copy** — must be identical sets. Losing one means',
    '  user-visible copy disappeared.',
    '- **classNames** — must be a superset (extraction may add a wrapper). Any *missing*',
    '  className is drift.',
    '- **Handler bindings** — must be identical in count and expression. A dropped `onClick`',
    '  is exactly the failure a screenshot cannot see.',
    '- **Element tags** — expected to *gain* the new component tags. Any missing host element',
    '  (`div`, `span`, `Button`, …) is drift.',
    '',
    section('Element tags', 'Ordered by name. New component tags are expected additions after 0b.', multiset(acc.elements)),
    section('classNames', 'Literal and expression values, whitespace-collapsed.', multiset(acc.classNames)),
    section('JSX text literals', 'User-visible copy appearing as raw JSX text.', multiset(acc.texts)),
    section('JSX string copy', 'User-visible copy appearing as string literals inside expressions.', multiset(acc.jsxStrings)),
    section('Handler bindings', 'tag.attribute=expression — the binding set that must survive extraction.', multiset(acc.handlers)),
    section('Referenced identifiers', 'The read-set. This is the authoritative input list for the FieldOwnershipContext prop object.', identifierCounts),
  ].join('\n');

  mkdirSync(dirname(resolve(root, args.out)), { recursive: true });
  writeFileSync(resolve(root, args.out), body, 'utf8');

  console.log(`[${args.label}] elements=${acc.elements.length} classNames=${acc.classNames.length} texts=${acc.texts.length} strings=${acc.jsxStrings.length} handlers=${acc.handlers.length}`);
  console.log(`[${args.label}] wrote ${args.out}${args.block ? ` and ${args.block}` : ''}`);
}

main();
