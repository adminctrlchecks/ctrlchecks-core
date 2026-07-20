/**
 * ✅ FORM TRIGGER NODE - Migrated to Registry
 * 
 * Form submission trigger.
 * Returns form data.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

/** Meta keys that carry submission envelope metadata, not user field values. */
const FORM_META_KEYS = new Set([
  '_form', '_chat', 'nodeId', 'submitted_at', 'form', 'data', 'files', 'meta', 'trigger',
]);

/**
 * Normalize a form submission input into a clean field-value map.
 *
 * Handles two input shapes:
 *  - trigger-service: { _form: true, nodeId, email, data: { email } }
 *  - local form-trigger resume: { submitted_at, form: {...}, data: { email } }
 *
 * Returns the `data` sub-object when non-empty, otherwise extracts
 * top-level keys excluding meta/envelope keys.
 */
export function normalizeFormTriggerOutput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) return {};
  const obj = input as Record<string, unknown>;

  // Prefer explicit data sub-object when non-empty
  if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
    const dataObj = obj.data as Record<string, unknown>;
    if (Object.keys(dataObj).length > 0) return dataObj;
  }

  // Fall back: extract top-level user fields, excluding meta keys and _-prefixed keys
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!FORM_META_KEYS.has(k) && !k.startsWith('_')) {
      result[k] = v;
    }
  }
  return result;
}

export function overrideFormTrigger(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  const inputSchema = {
    ...def.inputSchema,
    formTitle: def.inputSchema.formTitle
      ? {
          ...def.inputSchema.formTitle,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          ownership: 'structural' as const,
        }
      : def.inputSchema.formTitle,
    fields: def.inputSchema.fields
      ? {
          ...def.inputSchema.fields,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          ownership: 'structural' as const,
          role: 'raw_json' as const,
          // Renaming a field's key or changing its type breaks downstream {{$json.x}}
          // refs; label/placeholder/options/required/defaultValue are safe to edit post-freeze.
          structuralShapeKeys: ['key', 'name', 'type'],
        }
      : def.inputSchema.fields,
    formDescription: def.inputSchema.formDescription
      ? {
          ...def.inputSchema.formDescription,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          ownership: 'value' as const,
        }
      : def.inputSchema.formDescription,
    submitButtonText: def.inputSchema.submitButtonText
      ? {
          ...def.inputSchema.submitButtonText,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          ownership: 'value' as const,
        }
      : def.inputSchema.submitButtonText,
    successMessage: def.inputSchema.successMessage
      ? {
          ...def.inputSchema.successMessage,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
          ownership: 'value' as const,
        }
      : def.inputSchema.successMessage,
    allowMultipleSubmissions: def.inputSchema.allowMultipleSubmissions
      ? {
          ...def.inputSchema.allowMultipleSubmissions,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: false,
          },
          ownership: 'structural' as const,
        }
      : def.inputSchema.allowMultipleSubmissions,
    requireAuthentication: def.inputSchema.requireAuthentication
      ? {
          ...def.inputSchema.requireAuthentication,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: false,
          },
          ownership: 'structural' as const,
        }
      : def.inputSchema.requireAuthentication,
    captcha: def.inputSchema.captcha
      ? {
          ...def.inputSchema.captcha,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: false,
          },
          ownership: 'structural' as const,
        }
      : def.inputSchema.captcha,
  };

  return {
    ...def,
    inputSchema,
    execute: async (context) => {
      // context.input does not exist on NodeExecutionContext; the correct field is rawInput.
      const sourceInput = context.rawInput ?? context.inputs ?? {};

      // Extract input object
      const inputObj = typeof sourceInput === 'object' && sourceInput !== null && !Array.isArray(sourceInput)
        ? sourceInput as Record<string, unknown>
        : {};
      
      return {
        success: true,
        output: normalizeFormTriggerOutput(inputObj),
      };
    },
  };
}
