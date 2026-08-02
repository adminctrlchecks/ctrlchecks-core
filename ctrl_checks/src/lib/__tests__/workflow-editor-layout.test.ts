import { describe, expect, it } from 'vitest';
import { resolveEditorLayout } from '../workflow-editor-layout';

describe('resolveEditorLayout', () => {
  it('Expert mode shows exactly the surfaces it shows today', () => {
    expect(resolveEditorLayout('expert')).toEqual({
      showNodeLibrary: true,
      showPropertiesPanel: true,
      showBottomConsole: true,
      showAssistantColumn: false,
    });
  });

  it('Prompt mode hides the node library and properties, and moves the console right', () => {
    expect(resolveEditorLayout('prompt')).toEqual({
      showNodeLibrary: false,
      showPropertiesPanel: false,
      showBottomConsole: false,
      showAssistantColumn: true,
    });
  });

  it('never shows the properties panel in Prompt mode — this is what makes a node click open nothing', () => {
    expect(resolveEditorLayout('prompt').showPropertiesPanel).toBe(false);
  });

  it('never shows two execution consoles at once', () => {
    for (const mode of ['prompt', 'expert'] as const) {
      const layout = resolveEditorLayout(mode);
      expect(layout.showBottomConsole && layout.showAssistantColumn).toBe(false);
    }
  });

  it('always shows the AI Editor somewhere: the assistant column in Prompt, the properties panel tab in Expert', () => {
    for (const mode of ['prompt', 'expert'] as const) {
      const layout = resolveEditorLayout(mode);
      expect(layout.showAssistantColumn || layout.showPropertiesPanel).toBe(true);
    }
  });
});
