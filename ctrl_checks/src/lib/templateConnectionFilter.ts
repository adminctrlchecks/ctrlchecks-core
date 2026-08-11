import type { TemplateConnection } from './templateConnections';

/**
 * Connection-fit helpers for the Templates gallery.
 *
 * Search and sector are hard filters. Connection chips are a relevance filter plus
 * a "fewest extra connections first" sort signal, so useful templates stay visible
 * even when the user needs one or two more services before running them.
 */

/** Lowercase and drop punctuation so "Google Sheets" reaches "google_sheets". */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Split the raw comma-separated input into de-duplicated, non-empty tokens. */
export function parseConnectionFilterTokens(input: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of input.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tokens.push(trimmed);
  }
  return tokens;
}

/**
 * Does one typed token cover this connection?
 *
 * Matches the visible label, the catalog provider id, the full catalog name AND the
 * underlying node types. The node types matter: the gallery collapses Gmail, Sheets and
 * Drive into a single "Google" chip, so without them a user typing "gmail" would get
 * zero results despite Gmail templates existing.
 */
export function connectionMatchesToken(connection: TemplateConnection, token: string): boolean {
  const needle = normalize(token);
  if (!needle) return false;

  const haystacks = [
    connection.label,
    connection.provider,
    connection.fullName,
    ...(connection.nodeTypes ?? []),
  ];

  return haystacks.some((value) => value && normalize(value).includes(needle));
}

export interface TemplateConnectionMatchSummary {
  hasTokens: boolean;
  matchedConnections: TemplateConnection[];
  missingConnections: TemplateConnection[];
  matchedCount: number;
  missingCount: number;
  totalCount: number;
  hasSelectedConnectionMatch: boolean;
  isReadyWithListedConnections: boolean;
}

export function getTemplateConnectionMatchSummary(
  connections: TemplateConnection[],
  tokens: string[],
): TemplateConnectionMatchSummary {
  const activeTokens = tokens.filter((token) => normalize(token).length > 0);
  const hasTokens = activeTokens.length > 0;

  if (!hasTokens) {
    return {
      hasTokens: false,
      matchedConnections: [],
      missingConnections: [],
      matchedCount: 0,
      missingCount: 0,
      totalCount: connections.length,
      hasSelectedConnectionMatch: false,
      isReadyWithListedConnections: false,
    };
  }

  const matchedConnections = connections.filter((connection) =>
    activeTokens.some((token) => connectionMatchesToken(connection, token)),
  );
  const missingConnections = connections.filter(
    (connection) => !matchedConnections.includes(connection),
  );

  return {
    hasTokens,
    matchedConnections,
    missingConnections,
    matchedCount: matchedConnections.length,
    missingCount: missingConnections.length,
    totalCount: connections.length,
    hasSelectedConnectionMatch: matchedConnections.length > 0,
    isReadyWithListedConnections: connections.length > 0 && missingConnections.length === 0,
  };
}

/**
 * Relevance test: with no tokens, do not filter. With tokens, show templates that use
 * at least one listed service even when they need more setup.
 */
export function templateMatchesConnectionFilter(
  connections: TemplateConnection[],
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  return getTemplateConnectionMatchSummary(connections, tokens).hasSelectedConnectionMatch;
}

export function compareTemplateConnectionFit(
  a: TemplateConnectionMatchSummary,
  b: TemplateConnectionMatchSummary,
): number {
  if (!a.hasTokens || !b.hasTokens) return 0;

  const missingDelta = a.missingCount - b.missingCount;
  if (missingDelta !== 0) return missingDelta;

  const matchedDelta = b.matchedCount - a.matchedCount;
  if (matchedDelta !== 0) return matchedDelta;

  return a.totalCount - b.totalCount;
}

export interface ConnectionOption {
  provider: string;
  label: string;
}

/**
 * Every distinct connection across the gallery, for the autocomplete list. Sorted by
 * label so the suggestions read predictably.
 */
export function collectConnectionOptions(
  perTemplateConnections: TemplateConnection[][],
): ConnectionOption[] {
  const byLabel = new Map<string, ConnectionOption>();
  for (const connections of perTemplateConnections) {
    for (const connection of connections) {
      if (!byLabel.has(connection.label)) {
        byLabel.set(connection.label, {
          provider: connection.provider,
          label: connection.label,
        });
      }
    }
  }
  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Suggestions still worth offering: match the draft, excluding ones already chosen. */
export function suggestConnectionOptions(
  options: ConnectionOption[],
  draft: string,
  chosen: string[],
  limit = 6,
): ConnectionOption[] {
  const needle = normalize(draft);
  const taken = new Set(chosen.map(normalize));
  return options
    .filter((option) => !taken.has(normalize(option.label)))
    .filter((option) => !needle || normalize(option.label).includes(needle))
    .slice(0, limit);
}
