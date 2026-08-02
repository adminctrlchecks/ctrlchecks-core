import { describe, expect, it } from 'vitest';
import {
  collectConnectionOptions,
  connectionMatchesToken,
  parseConnectionFilterTokens,
  suggestConnectionOptions,
  templateMatchesConnectionFilter,
} from '../templateConnectionFilter';
import type { TemplateConnection } from '../templateConnections';

const conn = (
  provider: string,
  label: string,
  fullName = label,
  nodeTypes: string[] = [],
): TemplateConnection => ({ provider, label, fullName, nodeTypes });

const AIRTABLE = conn('airtable', 'Airtable', 'Airtable API Key', ['airtable']);
const WHATSAPP = conn('whatsapp', 'WhatsApp', 'WhatsApp Business', ['whatsapp']);
// The gallery collapses Gmail/Sheets/Drive into one "Google" chip.
const GOOGLE = conn('google', 'Google', 'Google OAuth2', [
  'google_gmail',
  'google_sheets',
  'google_drive',
]);
const OPENAI = conn('openai', 'OpenAI', 'OpenAI API Key', ['openai']);

describe('parseConnectionFilterTokens', () => {
  it('splits on commas and trims', () => {
    expect(parseConnectionFilterTokens('airtable, whatsapp')).toEqual(['airtable', 'whatsapp']);
  });

  it('drops empties from trailing commas and double commas', () => {
    expect(parseConnectionFilterTokens('airtable,,whatsapp,')).toEqual(['airtable', 'whatsapp']);
  });

  it('de-duplicates ignoring case, spacing and punctuation', () => {
    // "air table" normalises to the same key as "Airtable", so it is the same service
    // typed twice — the first spelling the user used is the one kept.
    expect(parseConnectionFilterTokens('Airtable, air table, AIRTABLE')).toEqual(['Airtable']);
    expect(parseConnectionFilterTokens('google-sheets, Google Sheets')).toEqual(['google-sheets']);
  });

  it('keeps genuinely different services', () => {
    expect(parseConnectionFilterTokens('airtable, whatsapp, google')).toEqual([
      'airtable',
      'whatsapp',
      'google',
    ]);
  });

  it('returns nothing for blank input', () => {
    expect(parseConnectionFilterTokens('')).toEqual([]);
    expect(parseConnectionFilterTokens('   ,  , ')).toEqual([]);
  });
});

describe('connectionMatchesToken', () => {
  it('matches the visible label, case-insensitively', () => {
    expect(connectionMatchesToken(AIRTABLE, 'airtable')).toBe(true);
    expect(connectionMatchesToken(AIRTABLE, 'AirTable')).toBe(true);
  });

  it('matches the provider id and the full catalog name', () => {
    expect(connectionMatchesToken(WHATSAPP, 'whatsapp')).toBe(true);
    expect(connectionMatchesToken(AIRTABLE, 'api key')).toBe(true);
  });

  it('matches a collapsed sub-service through its node types', () => {
    // The whole point: "Google" is the only visible label, but users think in Gmail.
    expect(connectionMatchesToken(GOOGLE, 'gmail')).toBe(true);
    expect(connectionMatchesToken(GOOGLE, 'sheets')).toBe(true);
    expect(connectionMatchesToken(GOOGLE, 'google sheets')).toBe(true);
    expect(connectionMatchesToken(GOOGLE, 'drive')).toBe(true);
  });

  it('does not match an unrelated service', () => {
    expect(connectionMatchesToken(AIRTABLE, 'slack')).toBe(false);
    expect(connectionMatchesToken(GOOGLE, 'openai')).toBe(false);
  });

  it('never matches on empty or punctuation-only tokens', () => {
    expect(connectionMatchesToken(AIRTABLE, '')).toBe(false);
    expect(connectionMatchesToken(AIRTABLE, '  ')).toBe(false);
    expect(connectionMatchesToken(AIRTABLE, '---')).toBe(false);
  });
});

describe('templateMatchesConnectionFilter — subset semantics', () => {
  const tokens = ['airtable', 'whatsapp'];

  it('shows a template needing a strict subset of what was typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE], tokens)).toBe(true);
    expect(templateMatchesConnectionFilter([WHATSAPP], tokens)).toBe(true);
  });

  it('shows a template needing exactly what was typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP], tokens)).toBe(true);
  });

  it('hides a template needing anything extra', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP, GOOGLE], tokens)).toBe(false);
    expect(templateMatchesConnectionFilter([OPENAI], tokens)).toBe(false);
  });

  it('always shows templates that need no connections at all', () => {
    expect(templateMatchesConnectionFilter([], tokens)).toBe(true);
    expect(templateMatchesConnectionFilter([], ['anything'])).toBe(true);
  });

  it('does no filtering when nothing is typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP, GOOGLE, OPENAI], [])).toBe(true);
  });

  it('lets a sub-service token satisfy its collapsed parent', () => {
    // Typing "gmail" should make a Google-only template runnable.
    expect(templateMatchesConnectionFilter([GOOGLE], ['gmail'])).toBe(true);
    expect(templateMatchesConnectionFilter([GOOGLE, AIRTABLE], ['gmail'])).toBe(false);
    expect(templateMatchesConnectionFilter([GOOGLE, AIRTABLE], ['gmail', 'airtable'])).toBe(true);
  });
});

describe('collectConnectionOptions', () => {
  it('de-duplicates across templates and sorts by label', () => {
    const options = collectConnectionOptions([
      [WHATSAPP, AIRTABLE],
      [AIRTABLE, GOOGLE],
      [],
    ]);
    expect(options.map((o) => o.label)).toEqual(['Airtable', 'Google', 'WhatsApp']);
  });

  it('handles an empty gallery', () => {
    expect(collectConnectionOptions([])).toEqual([]);
  });
});

describe('suggestConnectionOptions', () => {
  const options = collectConnectionOptions([[AIRTABLE, WHATSAPP, GOOGLE, OPENAI]]);

  it('offers everything unchosen when the draft is empty', () => {
    expect(suggestConnectionOptions(options, '', []).map((o) => o.label)).toEqual([
      'Airtable',
      'Google',
      'OpenAI',
      'WhatsApp',
    ]);
  });

  it('narrows by the draft', () => {
    expect(suggestConnectionOptions(options, 'goo', []).map((o) => o.label)).toEqual(['Google']);
  });

  it('excludes what is already chosen', () => {
    const result = suggestConnectionOptions(options, '', ['Airtable', 'openai']);
    expect(result.map((o) => o.label)).toEqual(['Google', 'WhatsApp']);
  });

  it('respects the limit', () => {
    expect(suggestConnectionOptions(options, '', [], 2)).toHaveLength(2);
  });
});
