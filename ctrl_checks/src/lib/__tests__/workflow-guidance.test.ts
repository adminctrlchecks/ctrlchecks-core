import { describe, it, expect } from 'vitest';
import { mapWorkflowIssueToGuidance } from '../workflow-guidance';

// ─── helpers ────────────────────────────────────────────────────────────────

function readiness(result: ReturnType<typeof mapWorkflowIssueToGuidance>) {
  expect(result.title).toBe('Finish setup before running');
}

// ─── structural drift (post-freeze) ──────────────────────────────────────────

describe('mapWorkflowIssueToGuidance — post-freeze structural drift', () => {
  it('names the exact node/field instead of falling through to the generic fallback', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS',
      message: 'Post-freeze structural config drift detected. Structure cannot be rewritten in this phase.',
      details: {
        drifts: [
          { nodeId: 'node-1', nodeLabel: 'Route by Status', nodeType: 'switch', field: 'cases', changedKeys: ['value'] },
        ],
      },
    });

    expect(result.title).toBe('This structure is locked');
    expect(result.description).toContain('Route by Status');
    expect(result.description).toContain('Cases');
    expect(result.nextSteps?.join(' ')).toContain('Route by Status');
  });
});

// ─── string input ────────────────────────────────────────────────────────────

describe('mapWorkflowIssueToGuidance — string input', () => {
  it('returns configuration tone with the string as description', () => {
    const result = mapWorkflowIssueToGuidance('Something went wrong');
    expect(result.title).toBe('Configuration needs one more step');
    expect(result.description).toBe('Something went wrong');
    expect(result.tone).toBe('configuration');
    expect(result.resolution).toBeTruthy();
  });

  it('handles empty string gracefully', () => {
    const result = mapWorkflowIssueToGuidance('');
    expect(result.title).toBe('Configuration needs one more step');
    expect(result.description).toBe('');
    expect(result.tone).toBe('configuration');
  });
});

// ─── readiness branch — code detection ────────────────────────────────────

describe('mapWorkflowIssueToGuidance — readiness via error code', () => {
  const READINESS_CODES = [
    'EXECUTION_NOT_READY',
    'EXECUTION_MISSING_INPUTS',
    'EXECUTION_MISSING_CREDENTIALS',
  ];

  for (const code of READINESS_CODES) {
    it(`triggers readiness guidance for code=${code}`, () => {
      readiness(mapWorkflowIssueToGuidance({ code, message: 'not ready' }));
    });
  }
});

// ─── readiness branch — message detection ────────────────────────────────

describe('mapWorkflowIssueToGuidance — readiness via message keyword', () => {
  const KEYWORDS = [
    'not ready for execution',
    'requires inputs',
    'requires credentials',
  ];

  for (const keyword of KEYWORDS) {
    it(`triggers readiness guidance for message containing "${keyword}"`, () => {
      readiness(mapWorkflowIssueToGuidance({ code: 'UNKNOWN', message: `Workflow ${keyword}` }));
    });
  }
});

// ─── readiness branch — safety-net details ────────────────────────────────

describe('mapWorkflowIssueToGuidance — safety-net details trigger readiness', () => {
  it('triggers when details.missingCredentials has items', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { missingCredentials: [{ displayName: 'Google' }] },
      })
    );
  });

  it('triggers when details.missingInputs has items', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { missingInputs: ['email'] },
      })
    );
  });

  it('triggers when details.executionValidationIssues has items', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { executionValidationIssues: [{ issue: 'edge missing' }] },
      })
    );
  });

  it('triggers when details.executionValidationErrors has items', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { executionValidationErrors: ['bad node'] },
      })
    );
  });

  it('triggers when details.missingCredentialsCount > 0', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { missingCredentialsCount: 2 },
      })
    );
  });

  it('triggers when details.missingInputsCount > 0', () => {
    readiness(
      mapWorkflowIssueToGuidance({
        code: 'OTHER',
        details: { missingInputsCount: 1 },
      })
    );
  });

  it('does NOT trigger when details arrays are empty', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'OTHER',
      details: { missingCredentials: [], missingInputs: [] },
    });
    expect(result.title).not.toBe('Finish setup before running');
  });
});

// ─── readiness — missingInputs formatting ─────────────────────────────────

describe('mapWorkflowIssueToGuidance — readiness missingInputs formatting', () => {
  it('formats string missingInput using humanizeKey', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: ['apiKey'] },
    });
    expect(result.missingItems).toContain('Input: Api Key');
  });

  it('formats object missingInput with fieldName + nodeLabel + description', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: {
        missingInputs: [{ fieldName: 'apiKey', nodeLabel: 'HTTP Request', description: 'Auth key' }],
      },
    });
    expect(result.missingItems).toContain('Input: Api Key for HTTP Request — Auth key');
  });

  it('omits description when it matches fieldLabel or fieldName', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: {
        missingInputs: [{ fieldName: 'apiKey', nodeLabel: 'HTTP Request', description: 'Api Key' }],
      },
    });
    // description equals humanized fieldName, so it should NOT append " — description"
    expect(result.missingItems?.some((i) => i.includes('—'))).toBe(false);
    expect(result.missingItems).toContain('Input: Api Key for HTTP Request');
  });

  it('formats object using field alias when fieldName missing', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: {
        missingInputs: [{ field: 'subject', nodeLabel: 'Email' }],
      },
    });
    expect(result.missingItems?.some((i) => i.includes('Subject'))).toBe(true);
  });

  it('shows fallback count when missingInputs is empty but missingInputsCount > 0', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: [], missingInputsCount: 3 },
    });
    expect(result.missingItems?.some((i) => i.includes('3 required input'))).toBe(true);
  });

  it('uses singular "input" when count is 1', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputsCount: 1 },
    });
    expect(result.missingItems?.some((i) => i.includes('1 required input still need'))).toBe(true);
  });

  it('deduplicates identical missingItems entries', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: ['email', 'email', 'email'] },
    });
    const inputItems = (result.missingItems ?? []).filter((i) => i.startsWith('Input:'));
    expect(inputItems).toHaveLength(1);
  });
});

// ─── readiness — missingCredentials formatting ────────────────────────────

describe('mapWorkflowIssueToGuidance — readiness missingCredentials formatting', () => {
  it('formats credential by displayName', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: { missingCredentials: [{ displayName: 'GoogleSheets' }] },
    });
    expect(result.missingItems?.some((i) => i.includes('Google Sheets'))).toBe(true);
  });

  it('formats credential with nodeLabel suffix', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: {
        missingCredentials: [{ displayName: 'Slack', nodeLabel: 'Send Message' }],
      },
    });
    expect(result.missingItems).toContain('Connection: Slack for Send Message');
  });

  it('falls back to executionValidationMissingCredentials source', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: {
        executionValidationMissingCredentials: [{ displayName: 'Slack' }],
      },
    });
    // verifies the fallback array is picked up; displayName 'Slack' has no camelCase so humanizeKey preserves it
    expect(result.missingItems?.some((i) => i.includes('Slack'))).toBe(true);
  });

  it('shows count fallback when credentials list is empty but count > 0', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: { missingCredentials: [], missingCredentialsCount: 2 },
    });
    expect(result.missingItems?.some((i) => i.includes('2 required connection'))).toBe(true);
  });

  it('uses singular "connection" when count is 1', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: { missingCredentialsCount: 1 },
    });
    expect(result.missingItems?.some((i) => i.includes('1 required connection must be'))).toBe(true);
  });

  it('sets tone to "connection" when missingCredentials present', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_CREDENTIALS',
      details: { missingCredentials: [{ displayName: 'Slack' }] },
    });
    expect(result.tone).toBe('connection');
  });

  it('sets tone to "configuration" when only missingInputs present (no credentials)', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_MISSING_INPUTS',
      details: { missingInputs: ['email'] },
    });
    expect(result.tone).toBe('configuration');
  });
});

// ─── readiness — executionValidationIssues formatting ────────────────────

describe('mapWorkflowIssueToGuidance — readiness executionValidationIssues formatting', () => {
  it('formats issue string directly', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { executionValidationIssues: ['Node A disconnected'] },
    });
    expect(result.missingItems).toContain('Workflow: Node A disconnected');
  });

  it('formats structured issue with nodeLabel', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { executionValidationIssues: [{ issue: 'missing edge', nodeLabel: 'Filter' }] },
    });
    expect(result.missingItems).toContain('Workflow: Filter: missing edge');
  });

  it('formats structured issue with previousNodeLabel and nodeLabel', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: {
        executionValidationIssues: [
          { issue: 'no connection', nodeLabel: 'Email', previousNodeLabel: 'Trigger' },
        ],
      },
    });
    expect(result.missingItems).toContain('Workflow: Trigger -> Email: no connection');
  });

  it('falls back to executionValidationErrors when structured list is empty', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: {
        executionValidationIssues: [],
        executionValidationErrors: ['Invalid output shape'],
      },
    });
    expect(result.missingItems?.some((i) => i.includes('Invalid output shape'))).toBe(true);
  });
});

// ─── readiness — nextSteps population ─────────────────────────────────────

describe('mapWorkflowIssueToGuidance — readiness nextSteps', () => {
  it('includes input step when missingInputs present', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: ['email'] },
    });
    expect(result.nextSteps?.some((s) => s.includes('required field'))).toBe(true);
    expect(result.nextSteps?.at(-1)).toContain('Save the workflow');
  });

  it('includes connection step when missingCredentials present', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingCredentials: [{ displayName: 'Slack' }] },
    });
    expect(result.nextSteps?.some((s) => s.includes('Connections'))).toBe(true);
  });

  it('includes validation review step when executionValidationIssues present', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { executionValidationIssues: [{ issue: 'bad edge' }] },
    });
    expect(result.nextSteps?.some((s) => s.includes('Review'))).toBe(true);
  });

  it('always ends with save instruction', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'EXECUTION_NOT_READY' });
    expect(result.nextSteps?.at(-1)).toContain('Save the workflow, then run it again.');
  });
});

// ─── readiness — currentPhase in details field ───────────────────────────

describe('mapWorkflowIssueToGuidance — readiness phase humanization', () => {
  it('humanizes currentPhase snake_case in details', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      currentPhase: 'ready_for_ownership',
    });
    expect(result.details).toContain('Ready For Ownership');
  });

  it('reads phase from details.phase as fallback', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { phase: 'attach_inputs' },
    });
    expect(result.details).toContain('Attach Inputs');
  });

  it('humanizePhase on empty string falls back to "workflow setup"', () => {
    // no currentPhase provided — the internal helper returns "workflow setup" for empty string
    // but since we pass no currentPhase, it won't be shown; we verify via explicit phase=''
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      currentPhase: '',
    });
    // empty string currentPhase → humanizePhase('') = 'workflow setup', but getString('') = ''
    // so the condition `currentPhase ? ...` is falsy — details should not include the stage line
    expect(result.details).not.toContain('workflow setup');
  });
});

// ─── phase codes branch ────────────────────────────────────────────────────

describe('mapWorkflowIssueToGuidance — phase-locked codes', () => {
  const PHASE_CODES = ['PHASE_LOCKED', 'INVALID_PHASE', 'WORKFLOW_INVALID_PHASE'];

  for (const code of PHASE_CODES) {
    it(`returns "Configuration step needed" for code=${code}`, () => {
      const result = mapWorkflowIssueToGuidance({ code, message: 'Cannot proceed' });
      expect(result.title).toBe('Configuration step needed');
      expect(result.tone).toBe('configuration');
    });
  }

  it('triggers on message "valid phase"', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'OTHER', message: 'Requires valid phase to continue' });
    expect(result.title).toBe('Configuration step needed');
  });

  it('triggers on message "attach-inputs first"', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'OTHER', message: 'Must attach-inputs first before saving' });
    expect(result.title).toBe('Configuration step needed');
  });

  it('triggers on message containing must be "ready_for_ownership"', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'OTHER',
      message: 'Phase must be "ready_for_ownership" to continue',
    });
    expect(result.title).toBe('Configuration step needed');
  });

  it('includes currentPhase in resolution when present', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'PHASE_LOCKED',
      message: 'Cannot proceed',
      currentPhase: 'attach_inputs',
    });
    expect(result.resolution).toContain('Attach Inputs');
  });

  it('uses generic resolution when currentPhase absent', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'PHASE_LOCKED', message: 'Cannot proceed' });
    expect(result.resolution).toContain('Complete required inputs');
  });
});

// ─── auth branch ────────────────────────────────────────────────────────────

describe('mapWorkflowIssueToGuidance — auth / connection refresh', () => {
  const AUTH_CODES = ['UNAUTHORIZED', 'FORBIDDEN'];

  for (const code of AUTH_CODES) {
    it(`returns "Connection refresh needed" for code=${code}`, () => {
      const result = mapWorkflowIssueToGuidance({ code, message: 'Not allowed' });
      expect(result.title).toBe('Connection refresh needed');
      expect(result.tone).toBe('connection');
    });
  }

  const AUTH_KEYWORDS = ['unauthorized', 'invalid token', 'session expired'];

  for (const keyword of AUTH_KEYWORDS) {
    it(`triggers on message containing "${keyword}"`, () => {
      const result = mapWorkflowIssueToGuidance({ code: 'OTHER', message: keyword });
      expect(result.title).toBe('Connection refresh needed');
    });
  }
});

// ─── fallback branch ────────────────────────────────────────────────────────

describe('mapWorkflowIssueToGuidance — fallback', () => {
  it('returns fallback for unknown code and non-matching message', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'SOMETHING_ELSE', message: 'Internal server error' });
    expect(result.title).toBe('Let us finish this setup smoothly');
    expect(result.tone).toBe('attention');
    expect(result.resolution).toBeTruthy();
  });

  it('returns fallback for null-like input (empty object)', () => {
    const result = mapWorkflowIssueToGuidance({});
    expect(result.title).toBe('Let us finish this setup smoothly');
  });

  it('returns fallback for null input', () => {
    const result = mapWorkflowIssueToGuidance(null);
    expect(result.title).toBe('Let us finish this setup smoothly');
  });

  it('uses payload.error as message fallback', () => {
    const result = mapWorkflowIssueToGuidance({ error: 'Disk full' });
    const authOrReadiness = result.title === 'Connection refresh needed' || result.title === 'Finish setup before running';
    expect(authOrReadiness).toBe(false);
    expect(result.details).toBe('Disk full');
  });

  it('uses default message when all message sources are absent', () => {
    const result = mapWorkflowIssueToGuidance({ code: 'SOMETHING_ELSE' });
    expect(result.details).toBe('Configuration update is pending.');
  });
});

// ─── humanizeKey / humanizePhase edge cases (tested indirectly) ────────────

describe('mapWorkflowIssueToGuidance — humanizeKey / humanizePhase edge cases', () => {
  it('humanizes camelCase field name', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: ['camelCaseField'] },
    });
    expect(result.missingItems).toContain('Input: Camel Case Field');
  });

  it('humanizes hyphen-separated field name', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      details: { missingInputs: ['some-field-name'] },
    });
    expect(result.missingItems).toContain('Input: Some Field Name');
  });

  it('humanizes snake_case phase', () => {
    const result = mapWorkflowIssueToGuidance({
      code: 'EXECUTION_NOT_READY',
      currentPhase: 'config_phase_one',
    });
    expect(result.details).toContain('Config Phase One');
  });
});
