/**
 * Registry-driven post-freeze structural drift detection.
 *
 * Run:
 *   cd worker && npx jest src/core/utils/__tests__/structural-drift.test.ts --runInBand
 */

import { describe, it, expect } from '@jest/globals';
import { detectStructuralDrift } from '../structural-drift';

describe('detectStructuralDrift — form node (fields)', () => {
  const before = {
    formTitle: 'Payment Status and Amount Submission Form',
    fields: [
      { id: 'f1', key: 'payment_status', name: 'payment_status', type: 'select', label: 'Payment Status', required: true, options: [] },
    ],
  };

  it('does not report drift when only a value-level sub-key changes (options filled in)', () => {
    const after = {
      ...before,
      fields: [
        {
          ...before.fields[0],
          options: [
            { label: 'Success', value: 'success' },
            { label: 'Pending', value: 'pending' },
            { label: 'Failed', value: 'failed' },
          ],
        },
      ],
    };

    const drifts = detectStructuralDrift('form', before, after);
    expect(drifts.find((d) => d.field === 'fields')).toBeUndefined();
  });

  it('does not report drift when label/placeholder/required change', () => {
    const after = {
      ...before,
      fields: [{ ...before.fields[0], label: 'Status', placeholder: 'Choose one', required: false }],
    };

    const drifts = detectStructuralDrift('form', before, after);
    expect(drifts.find((d) => d.field === 'fields')).toBeUndefined();
  });

  it('reports drift when a field key is renamed (shape key changed)', () => {
    const after = {
      ...before,
      fields: [{ ...before.fields[0], key: 'status', name: 'status' }],
    };

    const drifts = detectStructuralDrift('form', before, after);
    const drift = drifts.find((d) => d.field === 'fields');
    expect(drift).toBeDefined();
    expect(drift?.changedKeys).toEqual(expect.arrayContaining(['key']));
  });

  it('reports drift when a field is added (count change)', () => {
    const after = {
      ...before,
      fields: [
        ...before.fields,
        { id: 'f2', key: 'email', name: 'email', type: 'email', label: 'Email', required: true, options: [] },
      ],
    };

    const drifts = detectStructuralDrift('form', before, after);
    expect(drifts.find((d) => d.field === 'fields')).toBeDefined();
  });
});

describe('detectStructuralDrift — switch node (cases)', () => {
  const before = {
    expression: '{{$json.status}}',
    cases: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
    ],
  };

  it('does not report drift when only case labels change', () => {
    const after = {
      ...before,
      cases: [
        { value: 'active', label: 'Currently Active' },
        { value: 'pending', label: 'Awaiting Review' },
      ],
    };

    const drifts = detectStructuralDrift('switch', before, after);
    expect(drifts.find((d) => d.field === 'cases')).toBeUndefined();
  });

  it('reports drift when a case is added (branch identity/count change)', () => {
    const after = { ...before, cases: [...before.cases, { value: 'archived', label: 'Archived' }] };

    const drifts = detectStructuralDrift('switch', before, after);
    expect(drifts.find((d) => d.field === 'cases')).toBeDefined();
  });

  it('does not report drift for expression (ownership: value, not structural)', () => {
    const after = { ...before, expression: '{{$json.category}}' };

    const drifts = detectStructuralDrift('switch', before, after);
    expect(drifts.find((d) => d.field === 'expression')).toBeUndefined();
  });
});

describe('detectStructuralDrift — universality: node types without a hardcoded entry', () => {
  it('protects if_else conditions (ownership: structural, no declared shape keys) via whole-value fallback', () => {
    const before = { conditions: [{ field: 'status', operator: 'equals', value: 'active' }] };
    const after = { conditions: [{ field: 'status', operator: 'equals', value: 'inactive' }] };

    const drifts = detectStructuralDrift('if_else', before, after);
    const drift = drifts.find((d) => d.field === 'conditions');
    expect(drift).toBeDefined();
    expect(drift?.changedKeys).toBeUndefined();
  });

  it('does not report drift for if_else conditions when nothing changed', () => {
    const config = { conditions: [{ field: 'status', operator: 'equals', value: 'active' }] };

    const drifts = detectStructuralDrift('if_else', config, { conditions: [...config.conditions] });
    expect(drifts.find((d) => d.field === 'conditions')).toBeUndefined();
  });
});

describe('detectStructuralDrift — unknown node type', () => {
  it('returns no drifts when the node type is not registered', () => {
    const drifts = detectStructuralDrift('not_a_real_node_type', { a: 1 }, { a: 2 });
    expect(drifts).toEqual([]);
  });
});
