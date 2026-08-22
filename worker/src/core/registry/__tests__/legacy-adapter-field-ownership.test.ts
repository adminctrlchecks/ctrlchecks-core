import { mergeLegacyResolvedInputs } from '../unified-node-registry-legacy-adapter';

/**
 * Regression: this is the SECOND, previously-unfixed resolution pipeline behind the same
 * "disabled field's stale value still reaches execution" bug. Nodes with a registry override
 * (ai_agent, chat_send, …) run through dynamic-node-executor.ts's resolveInputsFromConfig /
 * runtime-input-handoff.ts's buildFinalProviderConfig (fixed earlier). Nodes WITHOUT an
 * override — google_calendar among them — run through this file's own, separate merge
 * (executeViaLegacyExecutor), which had the identical unguarded fallback and was still live
 * on the exact case that surfaced it: Google Calendar's description/timeMin/timeMax/q fields
 * kept sending the literal text "event" even after being disabled in the UI, because THIS
 * merge — not the one already fixed — is what actually builds a legacy node's config.
 */
describe('mergeLegacyResolvedInputs — respects the Field Ownership disabled flag', () => {
  it('never applies a resolved value to a field the user disabled, even via the empty-fallback branch', () => {
    const mergedConfig: Record<string, any> = {
      description: undefined,
      timeMin: undefined,
      _fieldEnabled: { description: false, timeMin: false },
    };
    const finalResolvedInputs = { description: 'event', timeMin: 'event' };
    const inputSources = { description: 'static_config', timeMin: 'static_config' };

    mergeLegacyResolvedInputs(mergedConfig, finalResolvedInputs, inputSources);

    expect(mergedConfig.description).toBeUndefined();
    expect(mergedConfig.timeMin).toBeUndefined();
  });

  it('never applies a resolved value to a disabled field even when its source claims runtime authority', () => {
    // Belt-and-suspenders: a disabled field must be excluded regardless of source, not only
    // for the "currently blank" fallback branch.
    const mergedConfig: Record<string, any> = {
      q: undefined,
      _fieldEnabled: { q: false },
    };
    const finalResolvedInputs = { q: 'event' };
    const inputSources = { q: 'runtime_ai' };

    mergeLegacyResolvedInputs(mergedConfig, finalResolvedInputs, inputSources);

    expect(mergedConfig.q).toBeUndefined();
  });

  it('still applies a runtime_ai value normally for an enabled field (no regression)', () => {
    const mergedConfig: Record<string, any> = {
      summary: undefined,
      _fieldEnabled: { summary: true },
    };
    const finalResolvedInputs = { summary: 'Real title' };
    const inputSources = { summary: 'runtime_ai' };

    mergeLegacyResolvedInputs(mergedConfig, finalResolvedInputs, inputSources);

    expect(mergedConfig.summary).toBe('Real title');
  });

  it('still fills a genuinely blank field for a node that never used the toggle (no regression)', () => {
    const mergedConfig: Record<string, any> = { calendarId: '' };
    const finalResolvedInputs = { calendarId: 'primary' };
    const inputSources = { calendarId: 'static_config' };

    mergeLegacyResolvedInputs(mergedConfig, finalResolvedInputs, inputSources);

    expect(mergedConfig.calendarId).toBe('primary');
  });
});
