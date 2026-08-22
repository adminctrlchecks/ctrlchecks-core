import type { FieldHelpCategory } from './field-help-metadata';
import type { FieldOwnershipClass, NodeInputField } from '../types/unified-node-contract';

const STRICT_CREDENTIAL_CATEGORIES = new Set<FieldHelpCategory>([
  'api_key',
  'oauth_token',
  'refresh_token',
  'client_id',
  'client_secret',
  'generic_token',
  'credential_id',
  'bearer_token',
  'webhook_secret',
  // webhook_url is intentionally NOT here — incoming webhook URLs (Slack, Discord, etc.)
  // are configuration values the user provides, not secrets. They appear inline with
  // other node config fields on the unified configuration page.
  'smtp_password',
  'db_password',
  'private_key',
  'consumer_key',
  'consumer_secret',
  'connection_string',
  'username',
  'password',
  'generic_credential',
]);

export function classifyFieldOwnership(
  fieldName: string,
  field: Pick<NodeInputField, 'fillMode' | 'role' | 'helpCategory'> & { type?: string }
): FieldOwnershipClass {
  const helpCategory = field.helpCategory;

  // URL-type categories are config values, not secrets — always return 'value'
  // This guard takes priority over STRICT_CREDENTIAL_CATEGORIES to prevent future regressions
  const URL_CONFIG_CATEGORIES = new Set(['webhook_url', 'base_url', 'api_endpoint', 'callback_url', 'redirect_url']);
  if (helpCategory && URL_CONFIG_CATEGORIES.has(helpCategory)) return 'value';

  // A credential (API key, bearer token, secret, password) is always textual — never a
  // number or boolean. This structurally rules out the whole class of "field name happens
  // to contain a credential-ish substring" false positives (e.g. `maxTokens`, a numeric
  // response-length limit, was being misclassified as a `generic_token` credential purely
  // because its name contains "token"). Takes priority over STRICT_CREDENTIAL_CATEGORIES so
  // no future name-based helpCategory rule can misfire on a non-string field again.
  if (field.type === 'number' || field.type === 'boolean') return 'value';

  if (helpCategory && STRICT_CREDENTIAL_CATEGORIES.has(helpCategory)) {
    return 'credential';
  }

  const role = field.role;
  if (role === 'operation_selector' || role === 'type_selector' || role === 'field_name') {
    return 'structural';
  }

  const f = (fieldName || '').toLowerCase();
  if (
    f === 'operation' ||
    f === 'resource' ||
    f === 'event' ||
    f === 'servicetype' ||
    f === 'fields' ||
    f === 'expression' ||
    f.includes('condition') ||
    f.includes('case') ||
    f.includes('schema') ||
    f.includes('layout') ||
    f.includes('template')
  ) {
    return 'structural';
  }

  return 'value';
}

export function isStructuralOwnership(
  fieldName: string,
  field: Pick<NodeInputField, 'ownership' | 'fillMode' | 'role' | 'helpCategory'>
): boolean {
  return (field.ownership ?? classifyFieldOwnership(fieldName, field)) === 'structural';
}

export function isCredentialOwnership(
  fieldName: string,
  field: Pick<NodeInputField, 'ownership' | 'fillMode' | 'role' | 'helpCategory'>
): boolean {
  return (field.ownership ?? classifyFieldOwnership(fieldName, field)) === 'credential';
}

// Internal fill-mode / ownership-class vocabulary words. These describe HOW a field
// is filled (who owns it), never WHAT it contains, so they must never end up stored
// as a field's actual value.
const RESERVED_CONTROL_VOCABULARY = new Set<string>([
  'manual_static',
  'runtime_ai',
  'buildtime_ai_once',
  'structural',
  'credential',
  'manual',
  'ai',
  'system',
]);

/**
 * True when `value` is exactly one of the reserved fill-mode/ownership-class words
 * (or a common short form of one) rather than real field content.
 *
 * Guards against a UI/pipeline bug writing a mode/ownership LABEL into a field's
 * actual value (e.g. `replyTo: "manual"`) instead of into fill-mode metadata —
 * this has happened historically and permanently corrupts persisted workflow
 * config, since nothing else ever clears it and the field silently fails
 * validation on every future run. Any write path that sets a field's content
 * from user/AI input should reject a value that matches this list, unless the
 * field's own declared options legitimately include it as a real choice.
 */
export function isReservedControlVocabularyValue(
  field: Pick<NodeInputField, 'ui'> | undefined,
  value: unknown
): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !RESERVED_CONTROL_VOCABULARY.has(trimmed)) return false;
  const declaredOptions = field?.ui?.options;
  if (Array.isArray(declaredOptions)) {
    const isDeclaredChoice = declaredOptions.some((opt) => String(opt?.value ?? '').toLowerCase() === trimmed);
    if (isDeclaredChoice) return false;
  }
  return true;
}
