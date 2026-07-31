import { describe, it, expect } from 'vitest';
import {
  getTemplateConnections,
  shortConnectionLabel,
  buildNodeTypeIndex,
} from '../templateConnections';
import type { ConnectionCatalogEntry } from '../connections-catalog';

/**
 * Shaped exactly like the live /api/connections/catalog response, including the
 * cases that make this non-trivial: Google covering three node types, Slack split
 * across two credential kinds, and http_request/webhook/google_gemini appearing in
 * no entry at all.
 */
const entry = (
  provider: string,
  displayName: string,
  nodeTypes: string[],
): ConnectionCatalogEntry =>
  ({ provider, displayName, nodeTypes } as unknown as ConnectionCatalogEntry);

const CATALOG: ConnectionCatalogEntry[] = [
  entry('airtable', 'Airtable API Key', ['airtable']),
  entry('hubspot', 'HubSpot API Key', ['hubspot']),
  entry('google', 'Google', ['google_gmail', 'google_sheets', 'google_drive']),
  entry('slack', 'Slack OAuth2', ['slack_message']),
  entry('slack_webhook', 'Slack Incoming Webhook', ['slack_webhook']),
  entry('whatsapp', 'WhatsApp', ['whatsapp']),
  entry('openai', 'OpenAI API Key', ['openai_gpt']),
  entry('postgresql', 'PostgreSQL Connection String', ['postgresql']),
];

const nodes = (...types: string[]) => types.map((type) => ({ data: { type } }));

describe('shortConnectionLabel', () => {
  it('strips the credential-kind suffix the Connections page needs but a card does not', () => {
    expect(shortConnectionLabel('Airtable API Key')).toBe('Airtable');
    expect(shortConnectionLabel('Slack OAuth2')).toBe('Slack');
    expect(shortConnectionLabel('Slack Incoming Webhook')).toBe('Slack');
    expect(shortConnectionLabel('PostgreSQL Connection String')).toBe('PostgreSQL');
  });

  it('leaves a name alone when there is no suffix to strip', () => {
    expect(shortConnectionLabel('Google')).toBe('Google');
    expect(shortConnectionLabel('WhatsApp')).toBe('WhatsApp');
  });

  it('never returns an empty label', () => {
    expect(shortConnectionLabel('API Key')).toBe('API Key');
  });
});

describe('buildNodeTypeIndex', () => {
  it('maps every node type a catalog entry claims', () => {
    const index = buildNodeTypeIndex(CATALOG);
    expect(index.get('google_sheets')?.provider).toBe('google');
    expect(index.get('slack_webhook')?.provider).toBe('slack_webhook');
    expect(index.get('http_request')).toBeUndefined();
  });
});

describe('getTemplateConnections', () => {
  it('ignores steps that need nothing connected', () => {
    // These are the workflow's plumbing — no account, no credential, nothing to
    // show a user who is deciding whether to use the template.
    const result = getTemplateConnections(
      nodes('javascript', 'if_else', 'merge', 'switch', 'schedule', 'form', 'log_output'),
      CATALOG,
    );
    expect(result).toEqual([]);
  });

  it('excludes http_request and webhook, which have no catalog entry', () => {
    // There is no "HTTP" to connect on the Connections page — listing it would send
    // the reader looking for something that does not exist.
    const result = getTemplateConnections(nodes('http_request', 'webhook'), CATALOG);
    expect(result).toEqual([]);
  });

  it('excludes google_gemini and ai_agent, whose key the platform supplies', () => {
    const result = getTemplateConnections(nodes('google_gemini', 'ai_agent'), CATALOG);
    expect(result).toEqual([]);
  });

  it('collapses Gmail, Sheets and Drive into a single Google connection', () => {
    const result = getTemplateConnections(
      nodes('google_gmail', 'google_sheets', 'google_drive'),
      CATALOG,
    );
    expect(result.map((c) => c.label)).toEqual(['Google']);
    expect(result[0].nodeTypes).toEqual(['google_gmail', 'google_sheets', 'google_drive']);
  });

  it('collapses the two Slack credential kinds into one Slack chip', () => {
    // They are genuinely separate credentials, but on a browse card "you need
    // Slack" is the useful statement; which kind is settled during setup.
    const result = getTemplateConnections(nodes('slack_message', 'slack_webhook'), CATALOG);
    expect(result.map((c) => c.label)).toEqual(['Slack']);
  });

  it('lists each connection once, in the order the steps run', () => {
    const result = getTemplateConnections(
      nodes('airtable', 'openai_gpt', 'airtable', 'whatsapp', 'openai_gpt'),
      CATALOG,
    );
    expect(result.map((c) => c.label)).toEqual(['Airtable', 'OpenAI', 'WhatsApp']);
  });

  it('keeps the full catalog name for the tooltip', () => {
    const result = getTemplateConnections(nodes('postgresql'), CATALOG);
    expect(result[0]).toMatchObject({
      provider: 'postgresql',
      label: 'PostgreSQL',
      fullName: 'PostgreSQL Connection String',
    });
  });

  it('returns nothing rather than throwing when data is missing', () => {
    expect(getTemplateConnections(null, CATALOG)).toEqual([]);
    expect(getTemplateConnections(nodes('airtable'), null)).toEqual([]);
    expect(getTemplateConnections([], [])).toEqual([]);
  });

  it('tolerates malformed nodes', () => {
    const malformed = [{ data: null }, {}, { data: { type: 'airtable' } }] as never;
    expect(getTemplateConnections(malformed, CATALOG).map((c) => c.label)).toEqual(['Airtable']);
  });

  describe('the real templates', () => {
    it('shows HubSpot for the Sales agent — the node that used to read as HTTP & API', () => {
      const result = getTemplateConnections(
        nodes('webhook', 'javascript', 'openai_gpt', 'if_else', 'hubspot', 'google_gmail'),
        CATALOG,
      );
      expect(result.map((c) => c.label)).toEqual(['OpenAI', 'HubSpot', 'Google']);
    });

    it('shows all four for the Verification Readiness Checker', () => {
      const result = getTemplateConnections(
        nodes('form', 'airtable', 'http_request', 'openai_gpt', 'javascript', 'google_gmail', 'whatsapp'),
        CATALOG,
      );
      expect(result.map((c) => c.label)).toEqual(['Airtable', 'OpenAI', 'Google', 'WhatsApp']);
    });
  });
});
