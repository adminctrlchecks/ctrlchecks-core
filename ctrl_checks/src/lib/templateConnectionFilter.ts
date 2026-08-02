import type { TemplateConnection } from './templateConnections';

/**
 * "Only what I can run" filtering for the Templates gallery.
 *
 * The user names the services they have (comma separated) and the gallery narrows to
 * templates whose *entire* connection list fits inside that set. A template needing
 * Airtable + WhatsApp + Google is hidden when the user only named Airtable and WhatsApp,
 * because they still could not run it.
 *
 * A template that needs nothing connected always passes — the empty set is a subset of
 * everything, and "runnable with no accounts at all" is exactly what the user is after.
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

/**
 * Subset test: every connection the template needs must be covered by something the
 * user typed. No tokens means no filtering at all.
 */
export function templateMatchesConnectionFilter(
  connections: TemplateConnection[],
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  return connections.every((connection) =>
    tokens.some((token) => connectionMatchesToken(connection, token)),
  );
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
