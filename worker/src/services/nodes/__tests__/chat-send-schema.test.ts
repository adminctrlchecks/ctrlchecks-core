import { nodeLibrary } from '../node-library';

describe('chat_send schema', () => {
  it('defaults to runtime-safe chat reply expressions', () => {
    const schema = nodeLibrary.getSchema('chat_send');

    expect(schema?.configSchema.optional.message.default).toBe('{{$json.response_text || $json.output || $json.message}}');
    expect(schema?.configSchema.optional.sessionId.default).toBe('{{$json.sessionId}}');
  });
});
