#!/usr/bin/env node
/**
 * Template Library v2 — apply to the database.
 *
 * Run from the worker directory so it picks up worker/.env.
 * PowerShell 5.1 has no `&&`, so use two lines or `;`:
 *
 *     cd worker
 *     node scripts/apply-templates-v2.cjs
 *
 * Modes:
 *   --dry-run      show what would happen, write nothing
 *   (no flag)      apply: backup, deactivate the two unsafe templates, apply all 21
 *   --reactivate   turn the two held-back templates back on, after you have run
 *                  each of them end to end
 *   --rollback     restore every template from the backup table
 *
 * Safety: refuses to write unless a complete backup table exists. Step 00 creates
 * it and is safe to re-run (it drops and recreates). Steps 01 and 02 each run in
 * their own transaction, so a failure rolls that step back rather than leaving the
 * table half-updated.
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const HERE = path.resolve(__dirname, '../../ctrl_checks/sql_migrations/templates_v2');
const DRY = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const REACTIVATE = process.argv.includes('--reactivate');
const ROLLBACK = process.argv.includes('--rollback');
const BACKUP = 'templates_backup_20260731';
const HELD_BACK = ['Cross-Platform Sync Engine', 'Internal Knowledge / Ops Agent'];

const STEPS = [
  ['00_backup_current_templates.sql', 'back up all templates'],
  ['01_deactivate_unsafe_templates.sql', 'deactivate the two unsafe templates'],
  ['02_apply_templates_v2.sql', 'apply the 21 corrected templates'],
];

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('✖ DATABASE_URL is not set. Run this from the worker directory.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const one = async (sql, params) => (await pool.query(sql, params)).rows[0];

  const before = await one(
    'SELECT count(*)::int AS total, count(*) FILTER (WHERE is_active)::int AS active FROM templates',
  );
  console.log(`Before:  ${before.total} templates, ${before.active} active\n`);

  if (DRY) {
    console.log('--dry-run: nothing will be written. Steps that would run:');
    STEPS.forEach(([f, what], i) => console.log(`  ${i + 1}. ${f.padEnd(38)} ${what}`));
    await pool.end();
    return;
  }

  if (VERIFY) {
    const rows = (
      await pool.query(
        `SELECT name, version, is_active, jsonb_array_length(nodes) AS nodes
           FROM templates WHERE version >= 2 ORDER BY name`,
      )
    ).rows;
    console.log(`Templates at version >= 2: ${rows.length} (expect 21)\n`);
    rows.forEach((r) =>
      console.log(`  ${r.is_active ? '●' : '○'} ${String(r.name).padEnd(42)} v${r.version}  ${r.nodes} nodes`),
    );

    // The three things most likely to be wrong, checked directly in the data.
    const ghosts = await one(
      `SELECT count(*)::int AS n FROM templates t, jsonb_array_elements(t.nodes) e
        WHERE t.version >= 2 AND e->'data'->>'type' IN ('database_read','database_write')`,
    );
    const noNotes = await one(
      `SELECT count(*)::int AS n FROM templates t, jsonb_array_elements(t.nodes) e
        WHERE t.version >= 2 AND (e->'data'->'notes' IS NULL OR e->'data'->'notes'->>'why' IS NULL)`,
    );
    const crm = (
      await pool.query(
        `SELECT t.name, e->'data'->>'label' AS label, e->'data'->>'type' AS type,
                e->'data'->>'category' AS family
           FROM templates t, jsonb_array_elements(t.nodes) e
          WHERE t.version >= 2 AND e->'data'->>'type' = 'hubspot' ORDER BY t.name`,
      )
    ).rows;

    console.log(`\nNodes still using the frontend-missing db types: ${ghosts.n} (expect 0)`);
    console.log(`Nodes missing a note: ${noNotes.n} (expect 0)`);
    console.log(`\nCRM nodes now in place:`);
    crm.forEach((r) => console.log(`  ${r.name} → "${r.label}" (${r.type}, family ${r.family})`));

    const ok = ghosts.n === 0 && noNotes.n === 0 && rows.length === 21;
    console.log(`\n${ok ? '✔ everything checks out' : '✖ something is off — see above'}`);
    await pool.end();
    process.exit(ok ? 0 : 1);
  }

  if (ROLLBACK) {
    const n = await one(`SELECT count(*)::int AS n FROM ${BACKUP}`).catch(() => null);
    if (!n || !n.n) {
      console.error(`✖ ${BACKUP} is missing or empty — nothing to roll back to.`);
      process.exit(1);
    }
    await pool.query(
      `BEGIN; DELETE FROM templates; INSERT INTO templates SELECT * FROM ${BACKUP}; COMMIT;`,
    );
    const now = await one(
      'SELECT count(*)::int AS total, count(*) FILTER (WHERE is_active)::int AS active FROM templates',
    );
    console.log(`✔ rolled back from ${BACKUP}`);
    console.log(`After:   ${now.total} templates, ${now.active} active`);
    await pool.end();
    return;
  }

  if (REACTIVATE) {
    const r = await pool.query(
      `UPDATE templates SET is_active = true, updated_at = now()
        WHERE name = ANY($1::text[]) RETURNING name`,
      [HELD_BACK],
    );
    console.log(`✔ reactivated ${r.rowCount}: ${r.rows.map((x) => x.name).join(', ') || 'none'}`);
    const now = await one(
      'SELECT count(*)::int AS active FROM templates WHERE is_active',
    );
    console.log(`Active templates: ${now.active}`);
    await pool.end();
    return;
  }

  for (const [file, what] of STEPS) {
    // Never modify the live table unless a complete backup is sitting there.
    if (file.startsWith('01') || file.startsWith('02')) {
      const chk = await one(
        `SELECT (to_regclass('public.${BACKUP}') IS NOT NULL) AS present`,
      );
      if (!chk.present) {
        console.error(`✖ ${BACKUP} is missing — refusing to write. Run step 00 first.`);
        process.exit(1);
      }
      const n = await one(`SELECT count(*)::int AS n FROM ${BACKUP}`);
      if (n.n < before.total) {
        console.error(
          `✖ ${BACKUP} holds ${n.n} rows but the live table has ${before.total} — refusing to write.`,
        );
        process.exit(1);
      }
    }

    const sql = fs.readFileSync(path.join(HERE, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`✔ ${file.padEnd(38)} ${what}`);
    } catch (err) {
      console.error(`\n✖ ${file} failed: ${err.message}`);
      console.error('  That step rolled back. Earlier steps are still applied.');
      console.error(`  To undo everything:  ${rollback()}`);
      process.exit(1);
    }
  }

  const after = await one(
    'SELECT count(*)::int AS total, count(*) FILTER (WHERE is_active)::int AS active FROM templates',
  );
  const v2 = await one('SELECT count(*)::int AS n FROM templates WHERE version >= 2');
  const inactive = await pool.query(
    `SELECT name FROM templates WHERE name = ANY($1::text[]) AND is_active = false ORDER BY name`,
    [HELD_BACK],
  );

  console.log(`\nAfter:   ${after.total} templates, ${after.active} active`);
  console.log(`         ${v2.n} at version >= 2 (expect 21)`);
  console.log(`         held back pending an end-to-end run: ${inactive.rows.map((r) => r.name).join(', ') || 'none'}`);

  console.log(`\nNext: open /templates, copy one template and run it once. Then:`);
  console.log(`  node scripts/apply-templates-v2.cjs --reactivate`);
  console.log(`\nIf anything looks wrong:`);
  console.log(`  node scripts/apply-templates-v2.cjs --rollback`);

  await pool.end();
})().catch((err) => {
  console.error('✖', err.message);
  process.exit(1);
});
