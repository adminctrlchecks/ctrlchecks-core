import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

export type EditorMode = 'prompt' | 'expert';
export type EditorEntrySource = 'ai-wizard' | 'manual-new' | 'standard';

export const EDITOR_MODE_STORAGE_KEY = 'ctrlchecks_workflow_editor_mode';

/** Navigation state set by AutonomousAgentWizard when it hands off to the builder. */
export const AI_WIZARD_ORIGIN = 'ai-wizard';

export function readStoredEditorMode(): EditorMode | null {
  try {
    const raw = window.localStorage.getItem(EDITOR_MODE_STORAGE_KEY);
    return raw === 'prompt' || raw === 'expert' ? raw : null;
  } catch {
    // localStorage can throw in private browsing / blocked-cookie contexts.
    return null;
  }
}

/**
 * Creation source wins for first impression:
 * - AI wizard handoff opens in Prompt mode so non-technical users see the assistant first.
 * - Manual creation opens in Expert mode because the user chose the node builder.
 * Stored preference applies only to ordinary workflow opens.
 */
export function resolveInitialEditorMode(
  stored: EditorMode | null,
  entrySource: EditorEntrySource,
): EditorMode {
  if (entrySource === 'ai-wizard') return 'prompt';
  if (entrySource === 'manual-new') return 'expert';
  return stored ?? 'expert';
}

export function resolveEditorEntrySource(pathname: string, origin?: unknown): EditorEntrySource {
  if (origin === AI_WIZARD_ORIGIN) return 'ai-wizard';
  return /^\/workflow\/new\/?$/.test(pathname) ? 'manual-new' : 'standard';
}

export function useEditorMode(): { mode: EditorMode; setMode: (next: EditorMode) => void } {
  const location = useLocation();
  const entrySource = useMemo(
    () =>
      resolveEditorEntrySource(
        location.pathname,
        (location.state as { origin?: string } | null)?.origin,
      ),
    [location.pathname, location.state],
  );

  const [mode, setModeState] = useState<EditorMode>(() =>
    resolveInitialEditorMode(readStoredEditorMode(), entrySource),
  );

  useEffect(() => {
    setModeState(resolveInitialEditorMode(readStoredEditorMode(), entrySource));
  }, [entrySource]);

  // Only ever called from an explicit user click on the mode switch, so the
  // origin-based default is never written back to storage on its own.
  const setMode = useCallback((next: EditorMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the mode still applies for this session.
    }
  }, []);

  return { mode, setMode };
}
