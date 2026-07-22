/**
 * Day 33 — Frontend Registry Metadata Shape Contract
 *
 * Ensures every NODE_TYPES entry maintains required UI metadata shape and
 * that all BACKEND_SUPPORTED_NODE_TYPES are represented in NODE_TYPES.
 *
 * Run:
 *   cd ctrl_checks && npx vitest run src/__tests__/registry-metadata-contract.test.ts
 */

import { describe, it, expect } from 'vitest';
import { NODE_TYPES, type NodeTypeDefinition, type ConfigField } from '../components/workflow/nodeTypes';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../components/workflow/backendSupportedNodeTypes';

// ─── Valid config field types from the ConfigField union ──────────────────────
const VALID_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'select',
  'boolean',
  'json',
  'date',
  'cron',
  'time',
  'keyValue',
  'hubspotProperties',
  'hubspotRecords',
  'variableList',
  'caseList',
  'conditionList',
  'formFieldList',
  // 'conditions': legacy custom type used by if_else. PropertiesPanel renders it via
  // key-name routing (selectedNode.data.type==='if_else' && field.key==='conditions'),
  // not via the standard field.type switch. Kept as 'as any' cast in nodeTypes.ts
  // because it predates the 'conditionList' union member. Safe to add here.
  'conditions',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ─── Shape contract: every NODE_TYPES entry ───────────────────────────────────

describe('NODE_TYPES — metadata shape contract', () => {
  it('NODE_TYPES is a non-empty array', () => {
    expect(Array.isArray(NODE_TYPES)).toBe(true);
    expect(NODE_TYPES.length).toBeGreaterThan(0);
  });

  it('all type values are unique (no duplicate node types)', () => {
    const types = NODE_TYPES.map((n) => n.type);
    const unique = new Set(types);
    const duplicates = types.filter((t, i) => types.indexOf(t) !== i);
    expect(
      duplicates,
      `Duplicate node types found in NODE_TYPES: ${duplicates.join(', ')}`
    ).toHaveLength(0);
    expect(unique.size).toBe(types.length);
  });

  for (const nodeDef of NODE_TYPES) {
    describe(`node: ${nodeDef.type}`, () => {
      it('type is a non-empty string', () => {
        expect(typeof nodeDef.type).toBe('string');
        expect(nodeDef.type.trim().length).toBeGreaterThan(0);
      });

      it('label is a non-empty string', () => {
        expect(typeof nodeDef.label).toBe('string');
        expect(nodeDef.label.trim().length).toBeGreaterThan(0);
      });

      it('category is a non-empty string', () => {
        expect(typeof nodeDef.category).toBe('string');
        expect((nodeDef.category as string).trim().length).toBeGreaterThan(0);
      });

      it('icon is a non-empty string', () => {
        expect(typeof nodeDef.icon).toBe('string');
        expect(nodeDef.icon.trim().length).toBeGreaterThan(0);
      });

      it('description is a non-empty string', () => {
        expect(typeof nodeDef.description).toBe('string');
        expect(nodeDef.description.trim().length).toBeGreaterThan(0);
      });

      it('defaultConfig is a plain object', () => {
        expect(isPlainObject(nodeDef.defaultConfig)).toBe(true);
      });

      it('configFields is an array', () => {
        expect(Array.isArray(nodeDef.configFields)).toBe(true);
      });

      it('every configField has key, label, and a valid type', () => {
        for (const field of nodeDef.configFields) {
          expect(
            typeof field.key === 'string' && field.key.trim().length > 0,
            `configField in "${nodeDef.type}" is missing a non-empty key`
          ).toBe(true);
          expect(
            typeof field.label === 'string' && field.label.trim().length > 0,
            `configField "${field.key}" in "${nodeDef.type}" is missing a non-empty label`
          ).toBe(true);
          expect(
            VALID_FIELD_TYPES.has(field.type),
            `configField "${field.key}" in "${nodeDef.type}" has invalid type "${field.type}". ` +
              `Valid types: ${[...VALID_FIELD_TYPES].join(', ')}`
          ).toBe(true);
        }
      });
    });
  }
});

// ─── Backend parity: every BACKEND_SUPPORTED_NODE_TYPE is in NODE_TYPES ───────

/**
 * Pre-existing NODE_TYPES gaps discovered by Day 33 contract tests.
 * These types are in BACKEND_SUPPORTED_NODE_TYPES but lack frontend UI metadata.
 * Each entry here is a TODO — remove from this list once the NODE_TYPES entry is added.
 * Do NOT add new types here without registering a tracking item.
 */
const KNOWN_NODE_TYPES_GAPS = new Set([
  'cache_get',         // caching node — needs UI metadata
  'cache_set',         // caching node — needs UI metadata
  // 'delay'            — closed Task 6
  // 'email'            — closed Task 6
  // 'execute_workflow' — closed Task 6
  // 'instagram_trigger'— closed Task 6
  'lightricks',        // media AI — needs UI metadata
  'outlook',           // email provider — needs UI metadata
  // 'parallel'         — closed Task 6
  'queue_consume',     // messaging — needs UI metadata
  'queue_push',        // messaging — needs UI metadata
  // 'retry'            — closed Task 6
  // 'return'           — closed Task 6
  'sql_server',        // database — needs UI metadata
  // 'timeout'          — closed Task 6
  'tool',              // AI tool node — needs UI metadata
  // 'try_catch'        — closed Task 6
  // 'webhook_response' — closed Task 6
  // 'whatsapp'         — closed Task 6
  // 'whatsapp_trigger' — closed Task 6
]);

describe('BACKEND_SUPPORTED_NODE_TYPES ↔ NODE_TYPES parity', () => {
  it('every BACKEND_SUPPORTED_NODE_TYPES entry exists in NODE_TYPES (excluding known gaps)', () => {
    const frontendTypes = new Set(NODE_TYPES.map((n) => n.type));
    const missing: string[] = [];

    for (const type of BACKEND_SUPPORTED_NODE_TYPES) {
      if (KNOWN_NODE_TYPES_GAPS.has(type)) continue; // pre-existing gap, tracked above
      if (!frontendTypes.has(type)) {
        missing.push(type);
      }
    }

    expect(
      missing,
      `These BACKEND_SUPPORTED_NODE_TYPES have no entry in NODE_TYPES:\n` +
        missing.map((t) => `  - ${t}`).join('\n') +
        `\n\nFix: add UI metadata for these types to nodeTypes.ts`
    ).toHaveLength(0);
  });

  it('KNOWN_NODE_TYPES_GAPS is not growing (no new undocumented gaps)', () => {
    // This test fails if someone adds a type to BACKEND_SUPPORTED_NODE_TYPES
    // without adding it to NODE_TYPES AND without documenting it in KNOWN_NODE_TYPES_GAPS.
    const frontendTypes = new Set(NODE_TYPES.map((n) => n.type));
    const newUndocumentedGaps: string[] = [];

    for (const type of BACKEND_SUPPORTED_NODE_TYPES) {
      if (!frontendTypes.has(type) && !KNOWN_NODE_TYPES_GAPS.has(type)) {
        newUndocumentedGaps.push(type);
      }
    }

    expect(
      newUndocumentedGaps,
      `New undocumented NODE_TYPES gaps found:\n` +
        newUndocumentedGaps.map((t) => `  - ${t}`).join('\n') +
        `\n\nFix: add UI metadata in nodeTypes.ts OR add to KNOWN_NODE_TYPES_GAPS with a tracking comment.`
    ).toHaveLength(0);
  });
});
