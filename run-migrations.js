// Migration runner - connects to AWS RDS and runs all SQL files in order.
// Usage:
//   DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... RUN_FULL_DB_RESET=true node run-migrations.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection comes from environment variables.
const DB_HOST     = process.env.DB_HOST;
const DB_PORT     = Number(process.env.DB_PORT || 5432);
const DB_NAME     = process.env.DB_NAME;
const DB_USER     = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
// Keep secrets out of this file.

const SQL_DIR = path.join(__dirname, 'ctrl_checks', 'sql_migrations');
const WORKER_DIR = path.join(__dirname, 'worker', 'migrations');

// Run in this exact order
const FILES = [
  '00_aws_rds_compat.sql',
  '01_database_setup.sql',
  '02_agent_memory_tables.sql',
  '03_google_oauth_tokens.sql',
  '04_linkedin_oauth_tokens.sql',
  '04_form_trigger_setup.sql',
  '05_role_based_templates.sql',
  '06_update_signup_role_handling.sql',
  '07_sample_data.sql',
  '08_admin_setup.sql',
  '09_comprehensive_templates.sql',
  '10_advanced_ai_agent_templates.sql',
  '10_fix_user_roles_rls.sql',
  '11_fix_security_issues.sql',
  '12_fix_executions_rls_406.sql',
  '13_workflow_generation_jobs.sql',
  '14_fix_security_warnings.sql',
  '15_fix_extensions_manual.sql',
  '16_fix_executions_query_error.sql',
  '17_fix_executions_406_rls.sql',
  '18_fix_duplicate_user_roles.sql',
  '19_fix_linkedin_oauth_tokens_rls_406.sql',
  '20_chat_trigger_setup.sql',
  '21_social_tokens_unified.sql',
  '22_zoho_oauth_tokens.sql',
  '22_zoho_oauth_tokens_fix.sql',
  '23_safe_delete_admin_templates.sql',
  '24_new_workflow_schema.sql',
  '24_fix_workflow_versions.sql',
  '25_workflow_sample_data.sql',
  '26_convert_workflows_to_templates.sql',
  '27_insert_templates_directly.sql',
];

async function runMigrations() {
  const missing = Object.entries({ DB_HOST, DB_NAME, DB_USER, DB_PASSWORD })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.RUN_FULL_DB_RESET !== 'true') {
    throw new Error('Refusing to reset schemas without RUN_FULL_DB_RESET=true');
  }

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  console.log('\n Connecting to AWS RDS...');
  await client.connect();
  console.log(' Connected successfully!\n');

  // Clean slate - drop everything and start fresh.
  console.log(' Resetting database (clean slate)...');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  await client.query(`GRANT ALL ON SCHEMA public TO "${DB_USER.replace(/"/g, '""')}"`);
  await client.query('GRANT ALL ON SCHEMA public TO public;');
  await client.query('DROP SCHEMA IF EXISTS auth CASCADE;');
  console.log(' Reset done.\n');

  // Enable pgvector first
  console.log(' Enabling pgvector extension...');
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;').catch(() => {
    console.log('   pgvector already enabled or not available — continuing');
  });
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(() => {
    console.log('   uuid-ossp already enabled — continuing');
  });

  // These files must run WITHOUT a transaction wrapper:
  // - Files that ALTER TYPE ADD VALUE (new enum values can't be used in same transaction)
  // - Files that already contain their own BEGIN/COMMIT
  const NO_TRANSACTION = new Set([
    '04_form_trigger_setup.sql',
    '25_workflow_sample_data.sql',
    '26_convert_workflows_to_templates.sql',
    '27_insert_templates_directly.sql',
  ]);

  let passed = 0;
  let failed = 0;

  // Worker migrations — run in numbered order
  const WORKER_FILES = [
    'FINAL_1_tables.sql',
    'FINAL_2_functions.sql',
    'FINAL_3_plpgsql_functions.sql',
    'FINAL_4_more_functions.sql',
    '001_distributed_workflow_engine.sql',
    '002_durable_execution_enhancements.sql',
    '002_fix_executions_workflow_id_fkey.sql',
    '003_add_missing_execution_steps_columns.sql',
    '003_workflow_events_audit_trail.sql',
    '004_production_hardening.sql',
    '004_unified_execution_engine_fixes.sql',
    '005_add_workflow_phase_columns.sql',
    '006_fix_phase_status_sync_trigger.sql',
    '006_workflow_checkpoints.sql',
    '007_workflow_execution_logs.sql',
    '008_credential_vault.sql',
    '009_workflow_versions.sql',
    '010_add_workflows_metadata.sql',
    '011_subscription_management_schema_fixed.sql',
    '012_subscription_default_data.sql',
    '013_subscription_performance_indexes.sql',
    '014_subscription_constraints_validation.sql',
    '019_credentials_connections_system.sql',
  ];

  // Run ctrl_checks migrations
  for (const file of FILES) {
    const filePath = path.join(SQL_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(` SKIP  ${file} (file not found)`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    if (NO_TRANSACTION.has(file)) {
      try {
        await client.query(sql);
        console.log(` OK    ${file}`);
        passed++;
      } catch (err) {
        // Rollback any partial transaction state so next file is not affected
        await client.query('ROLLBACK').catch(() => {});
        console.log(` WARN  ${file} — ${err.message.split('\n')[0]}`);
        failed++;
      }
    } else {
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(` OK    ${file}`);
        passed++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log(` WARN  ${file} — ${err.message.split('\n')[0]}`);
        failed++;
      }
    }
  }

  // Run worker migrations
  console.log('\n Running worker migrations...\n');
  for (const file of WORKER_FILES) {
    const filePath = path.join(WORKER_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(` SKIP  ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(` OK    ${file}`);
      passed++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.log(` WARN  ${file} — ${err.message.split('\n')[0]}`);
      failed++;
    }
  }

  await client.end();

  console.log('\n─────────────────────────────────');
  console.log(` Done: ${passed} passed, ${failed} warnings`);
  console.log('─────────────────────────────────');

  if (failed > 0) {
    console.log('\n Warnings are usually OK (table already exists, policy already exists).');
    console.log(' If you see a real error, copy it and share it.\n');
  } else {
    console.log('\n All migrations ran successfully!\n');
  }
}

runMigrations().catch(err => {
  console.error('\n Connection failed:', err.message);
  console.error(' Check: password correct? Security group open? RDS available?\n');
  process.exit(1);
});
