import { resolveAgentMemoryScope, resolveAgentMemoryWindow } from '../agent-memory';

describe('agent memory wiring', () => {
  describe('resolveAgentMemoryScope', () => {
    it('turns memory ON (conversation) when a Memory node is attached and no scope was chosen', () => {
      expect(resolveAgentMemoryScope(true, 'none')).toBe('conversation');
    });

    it('leaves memory OFF when no Memory node is attached', () => {
      expect(resolveAgentMemoryScope(false, 'none')).toBe('none');
    });

    it('respects an explicit scope on the agent even when a Memory node is attached', () => {
      expect(resolveAgentMemoryScope(true, 'user')).toBe('user');
      expect(resolveAgentMemoryScope(true, 'conversation')).toBe('conversation');
      expect(resolveAgentMemoryScope(false, 'user')).toBe('user');
    });
  });

  describe('resolveAgentMemoryWindow', () => {
    it('reads the context window from the Memory node config', () => {
      expect(resolveAgentMemoryWindow({ maxMessages: 30 })).toBe(30);
      expect(resolveAgentMemoryWindow({ contextWindowLength: 20 })).toBe(20);
      expect(resolveAgentMemoryWindow({ contextWindow: 15 })).toBe(15);
      expect(resolveAgentMemoryWindow({ maxMessages: '25' })).toBe(25);
    });

    it('defaults to 10 and clamps to [1, 50]', () => {
      expect(resolveAgentMemoryWindow({})).toBe(10);
      expect(resolveAgentMemoryWindow({ maxMessages: 0 })).toBe(1);
      expect(resolveAgentMemoryWindow({ maxMessages: 500 })).toBe(50);
      expect(resolveAgentMemoryWindow({ maxMessages: 'abc' })).toBe(10);
    });
  });
});
