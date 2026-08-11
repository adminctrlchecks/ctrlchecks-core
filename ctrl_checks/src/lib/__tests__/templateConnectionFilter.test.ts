import { describe, expect, it } from 'vitest';
import {
  collectConnectionOptions,
  compareTemplateConnectionFit,
  connectionMatchesToken,
  getTemplateConnectionMatchSummary,
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

describe('templateMatchesConnectionFilter - relevance semantics', () => {
  const tokens = ['airtable', 'whatsapp'];

  it('shows a template needing a strict subset of what was typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE], tokens)).toBe(true);
    expect(templateMatchesConnectionFilter([WHATSAPP], tokens)).toBe(true);
  });

  it('shows a template needing exactly what was typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP], tokens)).toBe(true);
  });

  it('keeps related templates visible even when they need extra services', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP, GOOGLE], tokens)).toBe(true);
    expect(templateMatchesConnectionFilter([GOOGLE, OPENAI], ['google'])).toBe(true);
  });

  it('hides templates that do not use any listed service', () => {
    expect(templateMatchesConnectionFilter([OPENAI], tokens)).toBe(false);
  });

  it('does not show no-connection templates when browsing by a specific service', () => {
    expect(templateMatchesConnectionFilter([], tokens)).toBe(false);
    expect(templateMatchesConnectionFilter([], ['anything'])).toBe(false);
  });

  it('does no filtering when nothing is typed', () => {
    expect(templateMatchesConnectionFilter([AIRTABLE, WHATSAPP, GOOGLE, OPENAI], [])).toBe(true);
  });

  it('lets a sub-service token satisfy its collapsed parent', () => {
    expect(templateMatchesConnectionFilter([GOOGLE], ['gmail'])).toBe(true);
    expect(templateMatchesConnectionFilter([GOOGLE, AIRTABLE], ['gmail'])).toBe(true);
    expect(templateMatchesConnectionFilter([GOOGLE, AIRTABLE], ['gmail', 'airtable'])).toBe(true);
  });
});

describe('getTemplateConnectionMatchSummary', () => {
  it('splits listed and still-needed connections', () => {
    const summary = getTemplateConnectionMatchSummary(
      [GOOGLE, AIRTABLE, OPENAI],
      ['gmail'],
    );

    expect(summary.matchedConnections.map((c) => c.label)).toEqual(['Google']);
    expect(summary.missingConnections.map((c) => c.label)).toEqual(['Airtable', 'OpenAI']);
    expect(summary.matchedCount).toBe(1);
    expect(summary.missingCount).toBe(2);
    expect(summary.hasSelectedConnectionMatch).toBe(true);
    expect(summary.isReadyWithListedConnections).toBe(false);
  });

  it('marks a template ready when all required services were listed', () => {
    const summary = getTemplateConnectionMatchSummary(
      [GOOGLE, AIRTABLE],
      ['Google', 'airtable'],
    );

    expect(summary.missingConnections).toEqual([]);
    expect(summary.isReadyWithListedConnections).toBe(true);
  });
});

describe('compareTemplateConnectionFit', () => {
  const summary = (connections: TemplateConnection[], tokens: string[]) =>
    getTemplateConnectionMatchSummary(connections, tokens);

  it('sorts related templates by fewest missing connections first', () => {
    const oneMore = summary([GOOGLE, OPENAI], ['google']);
    const twoMore = summary([GOOGLE, OPENAI, AIRTABLE], ['google']);

    expect(compareTemplateConnectionFit(oneMore, twoMore)).toBeLessThan(0);
  });

  it('breaks ties by templates that use more listed services', () => {
    const usesBoth = summary([GOOGLE, AIRTABLE, OPENAI], ['google', 'airtable']);
    const usesOne = summary([GOOGLE, OPENAI], ['google', 'airtable']);

    expect(compareTemplateConnectionFit(usesBoth, usesOne)).toBeLessThan(0);
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
