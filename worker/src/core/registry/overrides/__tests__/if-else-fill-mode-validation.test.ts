import { describe, expect, it } from '@jest/globals';
import { overrideIfElse } from '../if-else';

function definition() {
  return overrideIfElse(
    {
      inputSchema: {
        conditions: {
          type: 'array',
          description: 'Conditions',
          required: true,
          ownership: 'structural',
          fillMode: {
            default: 'buildtime_ai_once',
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        },
      },
      requiredInputs: ['conditions'],
      tags: [],
      validateConfig: () => ({ valid: true, errors: [], warnings: [] }),
    } as any,
    {} as any,
  );
}

describe('if_else AI-owned validation', () => {
  it('allows an empty field while build-time AI ownership is pending', () => {
    const result = definition().validateConfig({
      conditions: [],
      _fillMode: { conditions: 'buildtime_ai_once' },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects an empty field when the user selected manual ownership', () => {
    const result = definition().validateConfig({
      conditions: [],
      _fillMode: { conditions: 'manual_static' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("If/Else: 'conditions' must be set unless fill mode is AI-owned");
  });
});
