import type { ConnectionCatalogEntry } from './connections-catalog';

/**
 * Work out which services a template needs connected, so the Templates gallery can
 * show that BEFORE someone clicks "Use Template".
 *
 * Until now the only way to find out was to copy the template and let the readiness
 * gate tell you what was missing — i.e. commit first, discover second. Someone
 * browsing the gallery could not see that the Sales agent needs HubSpot.
 *
 * The connection catalog (/api/connections/catalog) is the source of truth: each
 * entry lists the node types it covers. That answers the awkward cases for us
 * rather than by guesswork:
 *
 *   • http_request and webhook appear in no catalog entry, because there is nothing
 *     to connect — they are excluded automatically.
 *   • google_gmail, google_sheets and google_drive all belong to one "Google" entry,
 *     so a template using all three asks for Google once, not three times.
 *   • google_gemini and ai_agent are absent because the platform supplies the Gemini
 *     key; the user connects nothing.
 *
 * This is display only. It never looks at what the user has already connected —
 * every visitor sees the same list.
 */

export interface TemplateConnection {
  /** Catalog provider id, e.g. "airtable", "google". Stable; use as the React key. */
  provider: string;
  /** Short name for the card, e.g. "Airtable", "Slack". */
  label: string;
  /** Catalog's own name, e.g. "Slack Incoming Webhook". Useful for a tooltip. */
  fullName: string;
  /** Node types in this template that need it — drives the tooltip. */
  nodeTypes: string[];
}

interface TemplateNodeLike {
  data?: { type?: string } | null;
  type?: string;
}

/**
 * Catalog display names are written for the Connections page, where precision
 * matters ("Slack Incoming Webhook" vs "Slack OAuth2"). On a gallery card that
 * detail is noise — the reader wants to know they need Slack. Which kind of Slack
 * credential is settled later, in the setup flow.
 */
const NAME_SUFFIXES =
  /\s+(API Key|API Token|OAuth2|OAuth|Connection String|Incoming Webhook|Connection|Credentials?)$/i;

export function shortConnectionLabel(displayName: string): string {
  return displayName.replace(NAME_SUFFIXES, '').trim() || displayName;
}

/** node type → catalog entry. First entry claiming a node type wins. */
export function buildNodeTypeIndex(
  catalog: ConnectionCatalogEntry[],
): Map<string, ConnectionCatalogEntry> {
  const index = new Map<string, ConnectionCatalogEntry>();
  for (const entry of catalog) {
    for (const nodeType of entry.nodeTypes ?? []) {
      if (!index.has(nodeType)) index.set(nodeType, entry);
    }
  }
  return index;
}

/**
 * Connections a template needs, in the order they first appear in the workflow —
 * so the list reads in the order the steps run.
 *
 * Deduplicated by short label, which is what collapses Gmail + Sheets + Drive into
 * one "Google", and Slack OAuth + Slack webhook into one "Slack".
 */
export function getTemplateConnections(
  nodes: TemplateNodeLike[] | null | undefined,
  catalog: ConnectionCatalogEntry[] | null | undefined,
): TemplateConnection[] {
  if (!nodes?.length || !catalog?.length) return [];

  const index = buildNodeTypeIndex(catalog);
  const byLabel = new Map<string, TemplateConnection>();

  for (const node of nodes) {
    const nodeType = node?.data?.type ?? node?.type;
    if (!nodeType) continue;

    const entry = index.get(nodeType);
    if (!entry) continue; // nothing to connect for this step

    const label = shortConnectionLabel(entry.displayName || entry.provider);
    const existing = byLabel.get(label);

    if (existing) {
      if (!existing.nodeTypes.includes(nodeType)) existing.nodeTypes.push(nodeType);
      continue;
    }

    byLabel.set(label, {
      provider: entry.provider,
      label,
      fullName: entry.displayName || entry.provider,
      nodeTypes: [nodeType],
    });
  }

  return [...byLabel.values()];
}
