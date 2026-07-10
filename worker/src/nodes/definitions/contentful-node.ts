/**
 * Contentful Node Definition
 *
 * Contentful Content Management API integration.
 * Supports operations: get_entries, get_entry, create_entry, update_entry, delete_entry.
 *
 * Authentication: Bearer token sent as Authorization: Bearer <accessToken>.
 * The accessToken is NEVER logged — only operation and spaceId are logged.
 */

import { NodeDefinition } from '../../core/types/node-definition';

const VALID_OPERATIONS = ['get_entries', 'get_entry', 'create_entry', 'update_entry', 'delete_entry'] as const;

export const contentfulNodeDefinition: NodeDefinition = {
  type: 'contentful',
  label: 'Contentful',
  category: 'cms',
  description: 'Create, read, update, and delete content entries on any Contentful space via the Contentful Content Management API using a personal access token.',
  icon: 'FileText',
  version: 1,

  inputSchema: {
    // ── Operation ─────────────────────────────────────────────────────────────
    operation: {
      type: 'string',
      description: 'The Contentful CMA action to perform',
      required: true,
      default: 'get_entries',
      examples: ['get_entries', 'get_entry', 'create_entry', 'update_entry', 'delete_entry'],
      ui: {
        options: [
          { label: 'Get Entries', value: 'get_entries' },
          { label: 'Get Entry', value: 'get_entry' },
          { label: 'Create Entry', value: 'create_entry' },
          { label: 'Update Entry', value: 'update_entry' },
          { label: 'Delete Entry', value: 'delete_entry' },
        ],
      },
    },
    // ── Auth / Space ──────────────────────────────────────────────────────────
    spaceId: {
      type: 'string',
      description: 'Contentful space ID',
      required: true,
      default: '',
    },
    accessToken: {
      type: 'string',
      description: 'Contentful CMA personal access token; authorize it for the target organization/space. Sensitive, never logged',
      required: true,
      default: '',
    },
    environment: {
      type: 'string',
      description: 'Contentful environment name (defaults to master)',
      required: false,
      default: 'master',
      examples: ['master', 'staging'],
    },
    // ── Entry targeting ───────────────────────────────────────────────────────
    contentType: {
      type: 'string',
      description: 'Content type ID — required for create_entry; optional filter for get_entries',
      required: false,
      default: '',
      examples: ['blogPost', 'product'],
    },
    entryId: {
      type: 'string',
      description: 'Entry ID — required for get_entry, update_entry, delete_entry',
      required: false,
      default: '',
      examples: ['{{$json.sys.id}}'],
    },
    // ── Write payload ─────────────────────────────────────────────────────────
    fields: {
      type: 'string',
      description: 'JSON string of entry fields for create_entry or update_entry',
      required: false,
      default: '',
    },
  },

  outputSchema: {
    success: {
      type: 'boolean',
      description: 'true if the API returned a 2xx response',
    },
    data: {
      type: 'object',
      description: 'Response body on success, {} on failure',
    },
    error: {
      type: 'object',
      description: 'Error details on failure: { message: string, status: number }',
    },
  },

  requiredInputs: ['operation', 'spaceId', 'accessToken'],
  outgoingPorts: ['default'],
  incomingPorts: ['default'],
  isBranching: false,

  validateInputs: (inputs) => {
    const errors: string[] = [];

    if (!inputs.operation) {
      errors.push('operation is required');
    } else if (!VALID_OPERATIONS.includes(inputs.operation as typeof VALID_OPERATIONS[number])) {
      errors.push(`operation must be one of: ${VALID_OPERATIONS.join(', ')}`);
    }

    if (!inputs.spaceId?.trim()) errors.push('spaceId is required');
    if (!inputs.accessToken?.trim()) errors.push('accessToken is required');

    if (['get_entry', 'update_entry', 'delete_entry'].includes(inputs.operation) && !inputs.entryId?.trim()) {
      errors.push(`entryId is required for ${inputs.operation}`);
    }

    if (inputs.operation === 'create_entry' && !inputs.contentType?.trim()) {
      errors.push('contentType is required for create_entry');
    }

    return { valid: errors.length === 0, errors };
  },

  defaultInputs: () => ({
    operation: 'get_entries',
    spaceId: '',
    accessToken: '',
    environment: 'master',
    contentType: '',
    entryId: '',
    fields: '',
  }),

  run: async (context) => {
    const { operation, spaceId, accessToken, environment, contentType, entryId, fields } = context.inputs;

    const base = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`;
    const authHeader = `Bearer ${accessToken}`;

    // Only log non-sensitive fields
    console.log(`[contentful] operation=${operation} spaceId=${spaceId}`);

    try {
      const parseEntryPayload = (): { ok: true; payload: unknown } | { ok: false; error: unknown } => {
        try {
          const parsed = JSON.parse(fields);
          const payload =
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            Object.prototype.hasOwnProperty.call(parsed, 'fields')
              ? parsed
              : { fields: parsed };
          return { ok: true, payload };
        } catch {
          return { ok: false, error: { message: 'Invalid JSON in fields', status: 0 } };
        }
      };

      const getCurrentEntryVersion = async (): Promise<number | null> => {
        const current = await fetch(`${base}/${entryId}`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        if (!current.ok) return null;
        const currentData = await current.json().catch(() => null) as any;
        const version = currentData?.sys?.version;
        return typeof version === 'number' ? version : null;
      };

      let response: Response;

      if (operation === 'get_entries') {
        const url = contentType?.trim() ? `${base}?content_type=${contentType}` : base;
        response = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
      } else if (operation === 'get_entry') {
        response = await fetch(`${base}/${entryId}`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
      } else if (operation === 'create_entry') {
        const parsed = parseEntryPayload();
        if (!parsed.ok) return { success: false, data: {}, error: parsed.error };
        response = await fetch(base, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/vnd.contentful.management.v1+json',
            'X-Contentful-Content-Type': contentType,
          },
          body: JSON.stringify(parsed.payload),
        });
      } else if (operation === 'update_entry') {
        const parsed = parseEntryPayload();
        if (!parsed.ok) return { success: false, data: {}, error: parsed.error };
        const version = await getCurrentEntryVersion();
        if (!version) {
          return { success: false, data: {}, error: { message: 'Unable to load current Contentful entry version before update', status: 0 } };
        }
        response = await fetch(`${base}/${entryId}`, {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/vnd.contentful.management.v1+json',
            'X-Contentful-Version': String(version),
          },
          body: JSON.stringify(parsed.payload),
        });
      } else {
        // delete_entry
        const version = await getCurrentEntryVersion();
        if (!version) {
          return { success: false, data: {}, error: { message: 'Unable to load current Contentful entry version before delete', status: 0 } };
        }
        response = await fetch(`${base}/${entryId}`, {
          method: 'DELETE',
          headers: { 'Authorization': authHeader, 'X-Contentful-Version': String(version) },
        });
      }

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: true, data, error: {} };
      } else {
        const message = await response.text().catch(() => response.statusText);
        return { success: false, data: {}, error: { message, status: response.status } };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, data: {}, error: { message, status: 0 } };
    }
  },
};
