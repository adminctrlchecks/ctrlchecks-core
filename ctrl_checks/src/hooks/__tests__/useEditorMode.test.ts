import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AI_WIZARD_ORIGIN,
  EDITOR_MODE_STORAGE_KEY,
  readStoredEditorMode,
  resolveEditorEntrySource,
  resolveInitialEditorMode,
} from '../useEditorMode';

describe('resolveInitialEditorMode', () => {
  it('opens AI-wizard handoffs in prompt mode regardless of stored preference', () => {
    expect(resolveInitialEditorMode('expert', 'ai-wizard')).toBe('prompt');
    expect(resolveInitialEditorMode(null, 'ai-wizard')).toBe('prompt');
  });

  it('opens manual-new workflows in expert mode regardless of stored preference', () => {
    expect(resolveInitialEditorMode('prompt', 'manual-new')).toBe('expert');
    expect(resolveInitialEditorMode(null, 'manual-new')).toBe('expert');
  });

  it('uses stored preference only for ordinary workflow opens', () => {
    expect(resolveInitialEditorMode('prompt', 'standard')).toBe('prompt');
    expect(resolveInitialEditorMode('expert', 'standard')).toBe('expert');
    expect(resolveInitialEditorMode(null, 'standard')).toBe('expert');
  });
});

describe('resolveEditorEntrySource', () => {
  it('detects the AI wizard navigation origin', () => {
    expect(resolveEditorEntrySource('/workflow/abc', AI_WIZARD_ORIGIN)).toBe('ai-wizard');
  });

  it('detects manual workflow creation by route', () => {
    expect(resolveEditorEntrySource('/workflow/new')).toBe('manual-new');
    expect(resolveEditorEntrySource('/workflow/new/')).toBe('manual-new');
  });

  it('treats ordinary workflow pages as standard opens', () => {
    expect(resolveEditorEntrySource('/workflow/abc')).toBe('standard');
    expect(resolveEditorEntrySource('/workflows')).toBe('standard');
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
