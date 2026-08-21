import { toGeminiFunctionParameters } from '../chat-model-adapter';

describe('AI Agent chat model adapter', () => {
  it('strips JSON Schema fields Gemini function declarations do not accept', () => {
    const sanitized = toGeminiFunctionParameters({
      type: 'object',
      additionalProperties: false,
      properties: {
        operation: {
          type: 'string',
          description: 'Math operation',
          enum: ['add', 'subtract'],
          examples: ['add'],
          default: 'add',
        },
      },
      required: ['operation'],
      examples: [{ operation: 'add' }],
    });

    expect(sanitized).toEqual({
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Math operation',
          enum: ['add', 'subtract'],
        },
      },
      required: ['operation'],
    });
  });
});
