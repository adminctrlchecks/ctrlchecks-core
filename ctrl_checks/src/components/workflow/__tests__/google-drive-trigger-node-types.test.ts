import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Google Drive trigger node catalog', () => {
  it('includes Google Drive Trigger with watch channel fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'google_drive_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'folderId',
      'eventTypes',
      'query',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('webViewLink');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('mimeType');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('google_drive_trigger')).toBe(true);
    expect(getIntegrationLogo('google_drive_trigger')).toBe('/integrations-logos/Google-Drive.svg');
  });

  it('keeps the Google Drive action node available for file operations', () => {
    const drive = NODE_TYPES.find((node) => node.type === 'google_drive');
    expect(drive).toBeTruthy();
    expect(drive?.category).toBe('google');
  });
});
