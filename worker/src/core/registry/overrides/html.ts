import * as cheerio from 'cheerio';
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

export function overrideHtml(def: UnifiedNodeDefinition, _schema: NodeSchema): UnifiedNodeDefinition {
  const operationOptions = ['parse', 'extract', 'toText'].map((value) => ({
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
      selector: {
        type: 'string',
        description: 'CSS selector used by extract.',
        required: false,
        role: 'config',
        fillMode: { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true },
        ui: {
          visibleIf: { field: 'operation', equals: 'extract' },
          requiredIf: { field: 'operation', equals: 'extract' },
        },
      },
    },
    execute: async (context) => {
      const inputs = mergeInputs(context);
      const operation = String(inputs.operation || 'parse');
      const html = String(inputs.html || inputs.content || '');

      try {
        if (!html.trim()) throw new Error('html is required');
        const $ = cheerio.load(html);

        if (operation === 'toText' || operation === 'totext' || operation === 'to_text') {
          return { success: true, output: { text: $('body').text().trim(), success: true } };
        }

        if (operation === 'extract') {
          const selector = String(inputs.selector || '').trim();
          if (!selector) throw new Error('selector field is required');
          const results: string[] = [];
          $(selector).each((_: number, el: any) => {
            results.push($(el).text().trim());
          });
          return { success: true, output: { results, count: results.length, success: true } };
        }

        if (operation === 'parse') {
          const meta: Record<string, string> = {};
          $('meta').each((_: number, el: any) => {
            const name = $(el).attr('name') || $(el).attr('property') || '';
            const content = $(el).attr('content') || '';
            if (name) meta[name] = content;
          });
          return {
            success: true,
            output: {
              title: $('title').text(),
              meta,
              body: $('body').html() ?? '',
              success: true,
            },
          };
        }

        if (operation === 'clean') {
          $('script,style,noscript,iframe').remove();
          return {
            success: true,
            output: {
              html: $.html(),
              text: $.root().text().replace(/\s+/g, ' ').trim(),
              success: true,
            },
          };
        }

        throw new Error(`Unsupported HTML operation: ${operation}. Supported: parse, extract, toText`);
      } catch (error: any) {
        return { success: false, error: { code: 'HTML_OPERATION_FAILED', message: error?.message || 'HTML operation failed' } };
      }
    },
  };
}
