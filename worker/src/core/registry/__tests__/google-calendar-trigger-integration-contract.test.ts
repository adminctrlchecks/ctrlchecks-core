import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Google Calendar Trigger integration contracts', () => {
  it('registers Google Calendar Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('google_calendar_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('google_calendar');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['google_calendar.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('google_calendar_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      subject: { type: 'string' },
      organizer: { type: 'string' },
      start: { type: 'string' },
      end: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Google OAuth connector available for the Calendar trigger', () => {
    const connector = connectorRegistry.getConnector('google_calendar');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['google_calendar_trigger', 'google_calendar']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['google_calendar.receive', 'trigger.webhook']));
  });
});
