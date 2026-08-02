import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

export type EditorMode = 'prompt' | 'expert';

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
 * Stored preference wins. With no stored preference, workflows arriving straight
 * from the AI wizard open in Prompt mode; everything else opens in Expert mode.
 */
export function resolveInitialEditorMode(
  stored: EditorMode | null,
  cameFromAiWizard: boolean,
): EditorMode {
  if (stored) return stored;
  return cameFromAiWizard ? 'prompt' : 'expert';
}

export function useEditorMode(): { mode: EditorMode; setMode: (next: EditorMode) => void } {
  const location = useLocation();
  const cameFromAiWizard =
    (location.state as { origin?: string } | null)?.origin === AI_WIZARD_ORIGIN;

  const [mode, setModeState] = useState<EditorMode>(() =>
    resolveInitialEditorMode(readStoredEditorMode(), cameFromAiWizard),
  );

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
