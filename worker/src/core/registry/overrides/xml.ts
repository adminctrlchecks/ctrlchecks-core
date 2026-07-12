import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { mergeAuthoritativeInputs } from '../../execution/runtime-input-handoff';

function mergeInputs(context: {
  config?: Record<string, any>;
  inputs?: Record<string, any>;
  finalResolvedInputs?: Record<string, any>;
}): Record<string, any> {
  return mergeAuthoritativeInputs(context);
}

function readPath(value: any, path: string): any {
  if (!path) return value;
  return path.split('.').filter(Boolean).reduce((current, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(part);
      return Number.isInteger(index) ? current[index] : current.map((item) => item?.[part]);
    }
    return current[part];
  }, value);
}

export function overrideXml(def: UnifiedNodeDefinition, _schema: NodeSchema): UnifiedNodeDefinition {
  const operationOptions = ['parse', 'extract', 'validate'].map((value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  }));

  return {
    ...def,
    inputSchema: {
      ...def.inputSchema,
      operation: {
        ...def.inputSchema.operation,
        ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
      },
    },
    execute: async (context) => {
      const inputs = mergeInputs(context);
      const operation = String(inputs.operation || 'parse');
      const xml = String(inputs.xml || inputs.content || '');

      try {
        if (!xml.trim()) throw new Error('xml is required');
        const maxSize = Number(inputs.maxSize || 5242880);
        if (Buffer.byteLength(xml) > maxSize) {
          throw new Error(`input exceeds maxSize (${maxSize} bytes)`);
        }

        if (operation === 'validate') {
          const validation = XMLValidator.validate(xml, { allowBooleanAttributes: true });
          if (validation === true) {
            return { success: true, output: { ...inputs, valid: true, errors: [] } };
          }
          return {
            success: true,
            output: {
              ...inputs,
              valid: false,
              errors: [{
                message: (validation as any)?.err?.msg ?? 'Invalid XML',
                line: (validation as any)?.err?.line,
              }],
            },
          };
        }

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          parseAttributeValue: true,
        });
        const parsed = parser.parse(xml);

        if (operation === 'parse') {
          return { success: true, output: { ...inputs, data: parsed, success: true } };
        }

        if (operation === 'extract') {
          const xpath = String(inputs.xpath || inputs.path || '').trim();
          if (!xpath) {
            return { success: true, output: { ...inputs, _error: 'XML extract: xpath field is required', data: parsed } };
          }
          const parts = xpath.replace(/^\//, '').split('/').filter(Boolean);
          const result = readPath(parsed, parts.join('.'));
          return { success: true, output: { ...inputs, result: result ?? null, xpath, data: parsed, success: result != null } };
        }

        throw new Error(`unsupported operation "${operation}". Supported: parse, extract, validate`);
      } catch (error: any) {
        return { success: false, error: { code: 'XML_OPERATION_FAILED', message: error?.message || 'XML operation failed' } };
      }
    },
  };
}
