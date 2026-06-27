import { generateComprehensiveNodeQuestions } from '../comprehensive-node-questions-generator';
import type { Workflow } from '../../../core/types/ai-types';

describe('generateComprehensiveNodeQuestions + registry helpCategory', () => {
  it('does not synthesize an apiKey when openai_gpt registry has no apiKey input', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n1',
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
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { categories: ['credential'] });
    const apiKeyQ = questions.find((q) => q.fieldName.toLowerCase() === 'apikey' || q.fieldName === 'apiKey');
    expect(apiKeyQ).toBeUndefined();
  });

  it('does not treat spreadsheetId on google_sheets as a credential question (spreadsheet_id is value ownership)', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n1',
          type: 'google_sheets',
          data: {
            label: 'Sheets',
            type: 'google_sheets',
            category: 'data',
            config: {},
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { categories: ['credential'] });
    const spreadsheetQ = questions.find(
      (q) => q.fieldName.toLowerCase().includes('spreadsheet') || q.fieldName === 'spreadsheetId'
    );
    expect(spreadsheetQ).toBeUndefined();
  });

  it('does not let connector vault metadata override slack_webhook value ownership', () => {
    const wf: Workflow = {
      nodes: [
        {
          id: 'n1',
          type: 'slack_webhook',
          data: {
            label: 'Slack',
            type: 'slack_webhook',
            category: 'output',
            config: {},
          },
        },
      ],
      edges: [],
    };
    const { questions } = generateComprehensiveNodeQuestions(wf, {}, { categories: ['credential'] });
    const webhookQ = questions.find((q) => q.fieldName === 'webhookUrl');
    expect(webhookQ).toBeUndefined();
  });
});
