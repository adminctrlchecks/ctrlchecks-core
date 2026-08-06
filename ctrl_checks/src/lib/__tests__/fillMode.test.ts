import { describe, expect, it } from 'vitest';
import {
  resolveEffectiveFieldFillMode,
  resolveWizardEffectiveFieldFillMode,
  shouldAskWizardManualQuestion,
  wizardBulkAIModeForQuestion,
} from '../fillMode';

describe('editor fill mode resolver', () => {
  it('defaults to manual_static even when schema default is runtime_ai', () => {
    const out = resolveEffectiveFieldFillMode(
      'productId',
      {
        productId: {
          fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
        },
      },
      {}
    );

    expect(out).toBe('manual_static');
  });

  it('honors explicit saved runtime_ai ownership', () => {
    const out = resolveEffectiveFieldFillMode(
      'productId',
      {
        productId: {
          fillMode: { default: 'manual_static', supportsRuntimeAI: true },
        },
      },
      { _fillMode: { productId: 'runtime_ai' } }
    );

    expect(out).toBe('runtime_ai');
  });

  it('honors explicit saved buildtime_ai_once ownership', () => {
    const out = resolveEffectiveFieldFillMode(
      'data',
      {
        data: {
          fillMode: { default: 'runtime_ai', supportsBuildtimeAI: true },
        },
      },
      { _fillMode: { data: 'buildtime_ai_once' } }
    );

    expect(out).toBe('buildtime_ai_once');
  });
});

describe('wizard fill mode policy helpers', () => {
  it('coerces runtime_ai to manual_static when runtime is unsupported', () => {
    const out = resolveWizardEffectiveFieldFillMode('runtime_ai', 'manual_static', false);
    expect(out.mode).toBe('manual_static');
    expect(out.coerced).toBe(true);
  });

  it('coerces runtime_ai to buildtime when runtime unsupported and default is buildtime', () => {
    const out = resolveWizardEffectiveFieldFillMode('runtime_ai', 'buildtime_ai_once', false, true);
    expect(out.mode).toBe('buildtime_ai_once');
    expect(out.coerced).toBe(true);
    expect(out.reason).toBe('runtime_not_supported');
  });

  it('coerces buildtime_ai_once when buildtime unsupported (worker parity)', () => {
    const out = resolveWizardEffectiveFieldFillMode(
      'buildtime_ai_once',
      'manual_static',
      true,
      false
    );
    expect(out.mode).toBe('manual_static');
    expect(out.coerced).toBe(true);
    expect(out.reason).toBe('buildtime_not_supported');
  });

  it('keeps runtime_ai when supportsRuntimeAI is undefined (not explicitly false)', () => {
    const out = resolveWizardEffectiveFieldFillMode('runtime_ai', 'manual_static', undefined);
    expect(out.mode).toBe('runtime_ai');
    expect(out.coerced).toBe(false);
  });

  it('keeps runtime_ai when runtime is supported', () => {
    const out = resolveWizardEffectiveFieldFillMode('runtime_ai', 'manual_static', true);
    expect(out.mode).toBe('runtime_ai');
    expect(out.coerced).toBe(false);
  });

  it('wizardBulkAIModeForQuestion prefers runtime, then build, then manual', () => {
    expect(wizardBulkAIModeForQuestion(true, true)).toBe('runtime_ai');
    expect(wizardBulkAIModeForQuestion(false, true)).toBe('buildtime_ai_once');
    expect(wizardBulkAIModeForQuestion(false, false)).toBe('manual_static');
    expect(wizardBulkAIModeForQuestion(undefined, undefined)).toBe('runtime_ai');
  });

  it('reset-style resolution stays manual when explicit undefined', () => {
    const out = resolveWizardEffectiveFieldFillMode(undefined, 'buildtime_ai_once', false, true);
    expect(out.mode).toBe('manual_static');
    expect(out.coerced).toBe(false);
  });

  it('asks only user-owned fields in a 5-user-fields scenario', () => {
    const effectiveModes = [
      'manual_static',
      'manual_static',
      'manual_static',
      'manual_static',
      'manual_static',
      'runtime_ai',
      'runtime_ai',
      'runtime_ai',
    ] as const;

    const askedCount = effectiveModes.filter((mode) => shouldAskWizardManualQuestion(mode, 'selectable')).length;
    expect(askedCount).toBe(5);
  });
});
