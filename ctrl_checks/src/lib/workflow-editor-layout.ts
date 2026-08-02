import type { EditorMode } from '@/hooks/useEditorMode';

export interface EditorLayout {
  /** Left panel. False in Prompt mode — not even the collapsed rail. */
  showNodeLibrary: boolean;
  /**
   * Right properties panel. False in Prompt mode, which is what makes clicking a node
   * open nothing: selection still highlights on the canvas, but there is no panel to show.
   * This must stay false regardless of the user's `propertiesPanelOpen` preference.
   */
  showPropertiesPanel: boolean;
  /** Full-width execution console at the bottom (Expert mode's bar). */
  showBottomConsole: boolean;
  /** Right column holding the AI Editor above the vertical execution console. */
  showAssistantColumn: boolean;
}

/**
 * Single source of truth for which editor surfaces a mode shows.
 *
 * Deliberately NOT covered here: the debug panel. It is a full-screen overlay driven by
 * `debugNodeId` and must behave identically in both modes, so it is never gated on mode.
 */
export function resolveEditorLayout(mode: EditorMode): EditorLayout {
  const isPrompt = mode === 'prompt';
  return {
    showNodeLibrary: !isPrompt,
    showPropertiesPanel: !isPrompt,
    showBottomConsole: !isPrompt,
    showAssistantColumn: isPrompt,
  };
}
