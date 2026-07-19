import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Discord trigger node catalog', () => {
  it('includes Discord Trigger with real-time Discord webhook fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'discord_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'guildIds',
      'channelIds',
      'allowedUserIds',
      'commandFilter',
      'applicationId',
      'publicKey',
      'validateSignature',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('interactionToken');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('channelId');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('discord_trigger')).toBe(true);
    expect(getIntegrationLogo('discord_trigger')).toBe('/integrations-logos/Discord.svg');
  });

  it('keeps Discord action fields available for same-channel and interaction replies', () => {
    const discord = NODE_TYPES.find((node) => node.type === 'discord');
    expect(discord).toBeTruthy();
    expect(discord?.defaultConfig.channelId).toBe('{{$json.channelId}}');
    expect(discord?.defaultConfig.interactionToken).toBe('{{$json.interactionToken}}');
    expect(discord?.defaultConfig.applicationId).toBe('{{$json.applicationId}}');
    expect(discord?.configFields.some((field) => field.key === 'replyToMessageId')).toBe(true);
    expect(discord?.configFields.find((field) => field.key === 'channelId')?.placeholder).toBe('{{$json.channelId}}');
  });
});
