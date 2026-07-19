import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Google Calendar trigger node catalog', () => {
  it('includes Google Calendar Trigger with watch channel fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'google_calendar_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'calendarId',
      'eventTypes',
      'query',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('attendees');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('organizer');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('google_calendar_trigger')).toBe(true);
    expect(getIntegrationLogo('google_calendar_trigger')).toBe('/integrations-logos/Google-Calender.svg');
  });

  it('keeps the Google Calendar action node available for CRUD operations', () => {
    const calendar = NODE_TYPES.find((node) => node.type === 'google_calendar');
    expect(calendar).toBeTruthy();
    expect(calendar?.category).toBe('google');
  });
});
