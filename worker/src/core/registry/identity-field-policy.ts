/**
 * Which fields hold an identifier, and what the AI may do with them.
 *
 * The principle (plan §0): a made-up **sentence** is fine — it conveys intent and a human
 * spots it instantly. A made-up **identifier** is worse than an empty field: it looks valid,
 * passes every check, and then either fails at runtime or silently targets the wrong
 * resource. A generated workflow shipped with Google's own documentation sample spreadsheet
 * ID written into a trigger payload, disagreeing with a different invented ID on the Sheets
 * node one hop away.
 *
 * Before this module, protection was hand-written per field: of 197 fields carrying
 * `role: 'id'`, only 72 were blocked and 125 were still fabricatable, with no principle
 * separating them. This applies one rule to every node — including nodes added next year.
 *
 * **Scope is build-time GENERATION only.** `supportsRuntimeAI` is deliberately untouched: a
 * value arriving from an upstream node or a form submission at run time is *mapped*, not
 * invented. Whether users may also permit AI Runtime on an identifier is an open product
 * question (plan §5.3) and this module must not silently answer it.
 *
 * Matching strategy (settled with the user, plan §5.1): a curated **suffix + exact** list,
 * NOT the raw `field.includes('id')` substring test the dead rule at
 * `unified-node-registry.ts:739` used. A substring test also catches `valid`, `paid`,
 * `hidden`, `width` and `candidate`, which would lock the AI out of fields it should be
 * filling — the same reasoning that made the operation selector use exact names.
 */

import type { NodeInputField, NodeInputSchema, UnifiedNodeDefinition } from '../types/unified-node-contract';

/**
 * A field whose LAST WORD is one of these is an identifier: `spreadsheetId`, `api_key`,
 * `accessToken`, `secretAccessKey`, `credentialId`.
 *
 * Matched on word boundaries, not raw suffixes. A raw `endsWith('id')` would still catch
 * `valid` and `paid` — the §5.1 hazard in a subtler form than `includes('id')`, and it is
 * what the first version of this file got wrong until the contract test caught it.
 */
const IDENTITY_LAST_WORDS = new Set([
  'id', 'ids', 'key', 'keys', 'token', 'tokens', 'secret', 'secrets', 'credential', 'credentials',
]);

/** `spreadsheetId` → ['spreadsheet','id'];  `location_id` → ['location','id'];  `valid` → ['valid']. */
function words(fieldName: string): string[] {
  return String(fieldName ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Whole names that address a specific resource without ending in a suffix above. `range` and
 * `sheetName` are here because they select WHICH cells of WHICH tab are read — inventing them
 * targets the wrong data just as surely as inventing the spreadsheet ID does, and both were
 * fabricated in the incident this work came from.
 */
const IDENTITY_EXACT = new Set(['spreadsheetid', 'sheetname', 'range', 'endpoint', 'url']);

/**
 * Documented exceptions — each is a field the suffix/role rule catches but that the AI SHOULD
 * still fill. Every entry needs a reason; an unexplained divergence is what this module exists
 * to replace.
 *
 *   `key`      — on `cache_get` / `cache_set` / `redis` / `aws_s3` this is a cache or object
 *                key the AI *composes* from upstream data (`user:{{$json.id}}:profile`), not
 *                a resource identifier issued by a provider. Compound names (`apiKey`,
 *                `privateKey`, `secretAccessKey`) stay blocked.
 *   `provider` — carries `role: 'id'` only because the registry's role inference tests for the
 *                substring "id", and "prov·id·er" contains one. It is an enum choice
 *                (openai / anthropic / …) on `chat_model` and `langchain`, and the AI picking
 *                it from user intent is the whole point.
 */
const IDENTITY_EXCEPTIONS = new Set(['key', 'provider']);

/**
 * True when a field holds an identifier the AI must not invent at build time.
 *
 * Order matters. The operation selector wins first (plan §2.2): `operation` / `action` /
 * `method` decide which action a node performs and therefore which of its other fields are
 * required at all, and they landed as AI-fillable on 79/79 nodes on 2026-07-30. The dead rule
 * this replaces also matched `method`; letting it through here would re-break Gmail.
 */
export function isIdentityField(fieldName: string, field?: Partial<NodeInputField>): boolean {
  const name = String(fieldName ?? '').toLowerCase().trim();
  if (!name) return false;

  if (field?.role === 'operation_selector') return false;
  if (IDENTITY_EXCEPTIONS.has(name)) return false;

  if (IDENTITY_EXACT.has(name)) return true;
  // The registry's own semantic role is authoritative where it is set — it catches
  // identifiers no name rule would (`externalIdField`, `threadTs`, `owner`, `repo`).
  if (field?.role === 'id') return true;

  // Split the ORIGINAL name: lowercasing first would destroy the camelCase boundary that
  // separates `api|Key` from `monkey`.
  const parts = words(fieldName);
  return IDENTITY_LAST_WORDS.has(parts[parts.length - 1] ?? '');
}

/**
 * Returns the definition with build-time AI withdrawn from every identity field.
 *
 * Applied at `register()` — the one choke point all 178 definitions pass through — so the
 * guarantee holds for every node, however its schema was authored, and for every node added
 * later with no further work. Non-identity fields are returned untouched.
 */
export function applyIdentityFieldPolicy(definition: UnifiedNodeDefinition): UnifiedNodeDefinition {
  const schema = definition?.inputSchema;
  if (!schema || typeof schema !== 'object') return definition;

  let changed = false;
  const inputSchema: NodeInputSchema = {};

  for (const [fieldName, field] of Object.entries(schema)) {
    if (!isIdentityField(fieldName, field)) {
      inputSchema[fieldName] = field;
      continue;
    }

    const fillMode = field.fillMode;
    const alreadyBlocked =
      fillMode?.supportsBuildtimeAI !== true && fillMode?.default !== 'buildtime_ai_once';
    if (alreadyBlocked) {
      inputSchema[fieldName] = field;
      continue;
    }

    changed = true;
    inputSchema[fieldName] = {
      ...field,
      fillMode: {
        ...fillMode,
        // A field whose only reason to be AI-owned was build-time generation falls back to
        // the user, which is what the UI already explains for google_sheets.spreadsheetId:
        // "AI Build is not available because this field cannot be safely generated once
        // during setup."
        default: fillMode?.default === 'buildtime_ai_once' ? 'manual_static' : (fillMode?.default ?? 'manual_static'),
        supportsBuildtimeAI: false,
      },
    };
  }

  return changed ? { ...definition, inputSchema } : definition;
}
