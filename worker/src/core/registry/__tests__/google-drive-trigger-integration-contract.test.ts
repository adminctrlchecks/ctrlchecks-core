import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Google Drive Trigger integration contracts', () => {
  it('registers Google Drive Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('google_drive_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('google_drive');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['google_drive.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('google_drive_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      fileId: { type: 'string' },
      name: { type: 'string' },
      mimeType: { type: 'string' },
      webViewLink: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Google OAuth connector available for the Drive trigger', () => {
    const connector = connectorRegistry.getConnector('google_drive');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['google_drive_trigger', 'google_drive']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['google_drive.receive', 'trigger.webhook']));
  });
});
