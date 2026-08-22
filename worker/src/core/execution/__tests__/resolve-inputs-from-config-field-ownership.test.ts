import { resolveInputsFromConfig } from '../dynamic-node-executor';
import { LRUNodeOutputsCache } from '../../cache/lru-node-outputs-cache';

/**
 * Regression: turning a field "off" in the Properties Panel (Field Ownership toggle) only
 * ever wrote `config._fieldEnabled[field] = false` — it never cleared the field's stored
 * value. `resolveInputsFromConfig` (the very first step of every node's input resolution)
 * read `config[fieldName]` unconditionally, with no awareness of `_fieldEnabled` at all, so a
 * value left over from an earlier state (AI generation, a template import, a prior edit)
 * silently survived under a UI that showed the field as blank — and execution used it. This
 * was the root cause behind the Google Calendar `description`/`timeMin`/`timeMax`/`q` fields
 * still sending the literal text "event" after the user disabled them in the UI.
 *
 * This fix is universal — resolveInputsFromConfig is the shared entry point for every node's
 * config resolution, not specific to Google Calendar or any other provider.
 */
describe('resolveInputsFromConfig — respects the Field Ownership disabled flag', () => {
  const nodeOutputs = new LRUNodeOutputsCache(10);

  it('treats a disabled field as absent, ignoring its stale stored value', () => {
    const inputSchema = {
      description: { type: 'string', description: 'desc', required: false },
      timeMin: { type: 'string', description: 'lower bound', required: false },
    };
    const config = {
      description: 'event',
      timeMin: 'event',
      _fieldEnabled: { description: false, timeMin: false },
    };

    const resolved = resolveInputsFromConfig(inputSchema, config, nodeOutputs);

    expect(resolved.description).toBeUndefined();
    expect(resolved.timeMin).toBeUndefined();
  });

  it('falls back to the schema default for a disabled field, exactly like an absent field', () => {
    const inputSchema = {
      maxResults: { type: 'number', description: 'limit', required: false, default: 250 },
    };
    const config = {
      maxResults: 9999,
      _fieldEnabled: { maxResults: false },
    };

    const resolved = resolveInputsFromConfig(inputSchema, config, nodeOutputs);

    expect(resolved.maxResults).toBe(250);
  });

  it('still resolves an enabled field normally (no regression for the common case)', () => {
    const inputSchema = {
      summary: { type: 'string', description: 'title', required: false },
    };
    const config = {
      summary: 'Real title',
      _fieldEnabled: { summary: true },
    };

    const resolved = resolveInputsFromConfig(inputSchema, config, nodeOutputs);

    expect(resolved.summary).toBe('Real title');
  });

  it('still resolves a field normally when _fieldEnabled is absent entirely (no regression for nodes that never used the toggle)', () => {
    const inputSchema = {
      calendarId: { type: 'string', description: 'calendar', required: false },
    };
    const config = { calendarId: 'primary' };

    const resolved = resolveInputsFromConfig(inputSchema, config, nodeOutputs);

    expect(resolved.calendarId).toBe('primary');
  });
});
