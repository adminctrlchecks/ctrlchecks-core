import { describe, expect, it } from 'vitest';
import { useWorkflowStore } from '../workflowStore';

/**
 * Regression: disabling a field via the Properties Panel's Field Ownership toggle
 * (handleFieldEnabledChange) previously only wrote `config._fieldEnabled[field] = false` and
 * never cleared the field's stored value — so a stale value from an earlier AI-generation
 * pass, a template import, or a prior edit survived underneath a UI that showed "Not
 * configured". The fix passes `{ [fieldKey]: undefined, _fieldEnabled: {...} }` through
 * updateNodeConfig; this test locks in that updateNodeConfig's plain-object merge correctly
 * drops the field when the patch value is `undefined`, so the persisted config is actually
 * cleared, not just hidden.
 */
describe('workflowStore updateNodeConfig — clearing a field via undefined', () => {
  it('drops a config key when the patch sets it to undefined (Field Ownership disable)', () => {
    const store = useWorkflowStore.getState();
    store.resetWorkflow();

    useWorkflowStore.setState({
      nodes: [
        {
          id: 'calendar_1',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'google_calendar',
            label: 'Google Calendar',
            category: 'google',
            icon: 'Calendar',
            config: {
              description: 'event',
              timeMin: 'event',
              _fieldEnabled: { description: true, timeMin: true },
            },
          },
        } as any,
      ],
      edges: [],
    });

    useWorkflowStore.getState().updateNodeConfig('calendar_1', {
      description: undefined,
      timeMin: undefined,
      _fieldEnabled: { description: false, timeMin: false },
    });

    const node = useWorkflowStore.getState().nodes.find((n) => n.id === 'calendar_1');
    expect(node?.data.config?.description).toBeUndefined();
    expect(node?.data.config?.timeMin).toBeUndefined();
    expect(node?.data.config?._fieldEnabled).toEqual({ description: false, timeMin: false });
  });

  it('re-enabling a field does not resurrect the cleared value on its own (clean slate)', () => {
    const store = useWorkflowStore.getState();
    store.resetWorkflow();

    useWorkflowStore.setState({
      nodes: [
        {
          id: 'calendar_2',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: 'google_calendar',
            label: 'Google Calendar',
            category: 'google',
            icon: 'Calendar',
            config: { summary: 'stale', _fieldEnabled: { summary: false } },
          },
        } as any,
      ],
      edges: [],
    });

    useWorkflowStore.getState().updateNodeConfig('calendar_2', {
      summary: undefined,
      _fieldEnabled: { summary: false },
    });

    let node = useWorkflowStore.getState().nodes.find((n) => n.id === 'calendar_2');
    expect(node?.data.config?.summary).toBeUndefined();

    // Re-enabling only flips the flag back on; the field stays genuinely empty until the
    // user (or the AI) actually supplies a new value — no stale resurrection.
    useWorkflowStore.getState().updateNodeConfig('calendar_2', {
      _fieldEnabled: { summary: true },
    });
    node = useWorkflowStore.getState().nodes.find((n) => n.id === 'calendar_2');
    expect(node?.data.config?.summary).toBeUndefined();
  });
});
