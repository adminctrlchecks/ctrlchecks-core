import { generateComprehensiveNodeQuestions } from '../comprehensive-node-questions-generator';
import type { Workflow } from '../../../core/types/ai-types';

describe('generateComprehensiveNodeQuestions Field Ownership annotations', () => {
  it('keeps runtime_ai fields selectable so user can switch to manual_static (Slack message)', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: {
              _fillMode: { message: 'runtime_ai', webhookUrl: 'manual_static' },
              webhookUrl: '',
              message: '',
            },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const messageQ = questions.find((q) => q.nodeId === 'n_slack' && q.fieldName === 'message');
    expect(messageQ).toBeDefined();
    expect(messageQ?.ownershipUiMode).toBe('selectable');
    expect(messageQ?.ownershipLockReason).toBeUndefined();
    expect(messageQ?.aiUsesRuntime).toBe(true);
    expect(messageQ?.aiFilledAtBuildTime).toBeUndefined();
  });

  it('keeps slack webhookUrl as a selectable registry value', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: {
              _fillMode: { webhookUrl: 'manual_static' },
              webhookUrl: '',
            },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const hookQ = questions.find((q) => q.nodeId === 'n_slack' && q.fieldName === 'webhookUrl');
    expect(hookQ).toBeDefined();
    expect(hookQ?.category).toBe('configuration');
    expect(hookQ?.ownershipClass).toBe('value');
    expect(hookQ?.ownershipUiMode).toBe('selectable');
    expect(hookQ?.isUnlockableCredential).toBeUndefined();
    expect(hookQ?.credential).toBeUndefined();
  });

  it('does not let connector unlock metadata change slack webhookUrl ownership', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: {
              _ownershipUnlock: { webhookUrl: true },
              _fillMode: { webhookUrl: 'manual_static' },
              webhookUrl: '',
            },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const hookQ = questions.find((q) => q.nodeId === 'n_slack' && q.fieldName === 'webhookUrl');
    expect(hookQ?.ownershipUiMode).toBe('selectable');
    expect(hookQ?.ownershipClass).toBe('value');
    expect(hookQ?.isUnlockableCredential).toBeUndefined();
  });

  it('merges all registry inputSchema fields for a node (slack_message)', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: {},
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const fields = new Set(questions.filter((q) => q.nodeId === 'n_slack').map((q) => q.fieldName));
    for (const expected of ['webhookUrl', 'channel', 'message', 'blocks', 'text', 'username', 'iconEmoji']) {
      expect(fields.has(expected)).toBe(true);
    }
  });

  it('does not create a slack webhookUrl credential question from connector metadata', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: { webhookUrl: '' },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { categories: ['credential'] });
    const cq = questions.find((q) => q.nodeId === 'n_slack' && q.fieldName === 'webhookUrl');
    expect(cq).toBeUndefined();
  });

  it('does not let connector API-key metadata override registry value ownership', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_gpt',
          type: 'openai_gpt',
          data: {
            label: 'GPT',
            type: 'openai_gpt',
            category: 'ai',
            config: {},
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const cred = questions.find((q) => q.category === 'credential' && q.fieldName.toLowerCase().includes('api'));
    expect(cred).toBeUndefined();
  });

  it('marks ai_filled metadata but keeps selectable when buildtime_ai_once and value present (runtime-capable field)', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_slack',
          type: 'slack_message',
          data: {
            label: 'Slack',
            type: 'slack_message',
            category: 'communication',
            config: {
              _fillMode: { message: 'buildtime_ai_once' },
              message: 'Hello from build-time AI',
            },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const mq = questions.find((q) => q.nodeId === 'n_slack' && q.fieldName === 'message');
    expect(mq).toBeDefined();
    expect(mq?.ownershipUiMode).toBe('selectable');
    expect(mq?.aiFilledAtBuildTime).toBe(true);
    expect(mq?.aiBuildTimePending).toBeUndefined();
    expect(mq?.defaultValue).toBe('Hello from build-time AI');
  });

  it('sets aiBuildTimePending when buildtime_ai_once and value is still empty ([])', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n_form',
          type: 'form_trigger',
          data: {
            label: 'Form',
            type: 'form_trigger',
            category: 'trigger',
            config: {
              _fillMode: { fields: 'buildtime_ai_once' },
              fields: [],
            },
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { mode: 'full_configuration' });
    const fq = questions.find((q) => q.nodeId === 'n_form' && q.fieldName === 'fields');
    expect(fq).toBeDefined();
    expect(fq?.aiBuildTimePending).toBe(true);
    expect(fq?.aiFilledAtBuildTime).toBeUndefined();
  });
});
