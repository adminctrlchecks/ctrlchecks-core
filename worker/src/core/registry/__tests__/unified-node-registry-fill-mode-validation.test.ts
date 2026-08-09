import { describe, expect, it } from '@jest/globals';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('unified node registry fill-mode-aware validation', () => {
  it('does not fail required runtime_ai field during config-phase validation', () => {
    const result = unifiedNodeRegistry.validateConfig('text_summarizer', {
      text: '',
      _fillMode: {
        text: 'runtime_ai',
      },
    } as any);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('migrates switch rules to cases and validates expression + cases', () => {
    const migrated = unifiedNodeRegistry.migrateConfig('switch', {
      rules: [{ value: 'active', label: 'Active' }],
      expression: '{{$json.s}}',
    });
    expect(migrated.cases).toEqual([{ value: 'active', label: 'Active' }]);

    const ok = unifiedNodeRegistry.validateConfig('switch', migrated);
    expect(ok.valid).toBe(true);
  });

  it('if_else requires conditions unless runtime_ai', () => {
    const bad = unifiedNodeRegistry.validateConfig('if_else', { conditions: [] } as any);
    expect(bad.valid).toBe(false);

    const deferred = unifiedNodeRegistry.validateConfig('if_else', {
      conditions: [],
      _fillMode: { conditions: 'runtime_ai' },
    } as any);
    expect(deferred.valid).toBe(true);
  });

  describe('universal runtime-AI reconciliation (aiGeneratable ⇒ supportsRuntimeAI)', () => {
    // The reported bug: google_sheets `values` declared aiGeneratable but greyed out the
    // AI Runtime ownership option because supportsRuntimeAI was false, contradicting its
    // interchangeable twin `data`. The fix is universal, so assert the invariant directly.
    it('grants supportsRuntimeAI to the google_sheets `values` field and matches its twin `data`', () => {
      const schema = unifiedNodeRegistry.get('google_sheets')?.inputSchema;
      expect(schema?.values?.runtimeContract?.aiGeneratable).toBe(true);
      expect(schema?.values?.fillMode?.supportsRuntimeAI).toBe(true);
      expect(schema?.data?.fillMode?.supportsRuntimeAI).toBe(true);
    });

    it('holds for EVERY node: any aiGeneratable, non-protected, non-credential field supports runtime AI', () => {
      const offenders: string[] = [];
      for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
        const schema = unifiedNodeRegistry.get(nodeType)?.inputSchema || {};
        for (const [fieldName, field] of Object.entries(schema)) {
          const rc = (field as any).runtimeContract;
          if (rc?.aiGeneratable === true && rc?.protected !== true && (field as any).ownership !== 'credential') {
            if ((field as any).fillMode?.supportsRuntimeAI !== true) {
              offenders.push(`${nodeType}.${fieldName}`);
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});
