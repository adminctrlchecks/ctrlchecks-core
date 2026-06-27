import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

function normalizeMappings(mappingsRaw: unknown): Record<string, string> {
  if (Array.isArray(mappingsRaw)) {
    const mappingsObj: Record<string, string> = {};
    for (const mapping of mappingsRaw) {
      if (mapping?.name !== undefined && mapping.name !== '') {
        mappingsObj[String(mapping.name)] = String(mapping.value ?? '');
      }
    }
    return mappingsObj;
  }

  if (!mappingsRaw || typeof mappingsRaw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(mappingsRaw as Record<string, unknown>)
      .map(([from, to]) => [from, String(to ?? '')])
      .filter(([from, to]) => from !== '' && to !== ''),
  );
}

function objectInput(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function overrideRenameKeys(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  return {
    ...def,
    execute: async (context) => {
      const mappings = normalizeMappings(context.config?.mappings);
      const source = {
        ...objectInput(context.inputs),
        ...objectInput(context.rawInput),
      };
      const output: Record<string, unknown> = { ...source };

      for (const [from, to] of Object.entries(mappings)) {
        if (from in output) {
          output[to] = output[from];
          delete output[from];
        }
      }

      return { success: true, output };
    },
  };
}
