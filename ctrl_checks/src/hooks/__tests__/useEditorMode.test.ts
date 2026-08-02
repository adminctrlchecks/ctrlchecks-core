import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EDITOR_MODE_STORAGE_KEY,
  readStoredEditorMode,
  resolveInitialEditorMode,
} from '../useEditorMode';

describe('resolveInitialEditorMode', () => {
  it('prefers the stored preference over the navigation origin', () => {
    expect(resolveInitialEditorMode('expert', true)).toBe('expert');
    expect(resolveInitialEditorMode('prompt', false)).toBe('prompt');
  });

  it('falls back to prompt only for AI-wizard arrivals with no stored preference', () => {
    expect(resolveInitialEditorMode(null, true)).toBe('prompt');
    expect(resolveInitialEditorMode(null, false)).toBe('expert');
  });
});

describe('readStoredEditorMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredEditorMode()).toBeNull();
  });

  it('reads back both valid modes', () => {
    window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, 'prompt');
    expect(readStoredEditorMode()).toBe('prompt');
    window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, 'expert');
    expect(readStoredEditorMode()).toBe('expert');
  });

  it('ignores a garbage stored value rather than trusting it', () => {
    window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, 'not-a-mode');
    expect(readStoredEditorMode()).toBeNull();
  });

  it('survives localStorage throwing (private browsing / blocked cookies)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(readStoredEditorMode()).toBeNull();
    spy.mockRestore();
  });
});
