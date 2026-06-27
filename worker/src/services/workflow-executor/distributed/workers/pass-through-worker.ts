/**
 * Pass-Through Worker
 * 
 * Handles simple nodes that just pass input to output:
 * - manual_trigger
 * - set_variable
 * - text_formatter (basic)
 */

import { NodeWorker } from '../node-worker';

function resolveJsonTemplates(template: string, json: Record<string, unknown>): string {
  return template.replace(/\{\{\s*\$json\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    let value: unknown = json;
    for (const key of String(path).split('.')) {
      value = value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
    }
    return value !== undefined && value !== null ? String(value) : '';
  });
}

export class PassThroughWorker extends NodeWorker {
  private async getNodeConfig(executionId: string, nodeId: string): Promise<Record<string, unknown>> {
    const { data: step } = await this.db
      .from('execution_steps')
      .select('workflow_id')
      .eq('execution_id', executionId)
      .eq('node_id', nodeId)
      .single();

    const workflowId = (step as any)?.workflow_id;
    if (!workflowId) return {};

    const workflow = await this.orchestrator.getWorkflowDefinition(String(workflowId));
    const node = workflow?.definition?.nodes?.find((candidate: any) => candidate?.id === nodeId) as any;
    return (node?.data?.config || node?.config || {}) as Record<string, unknown>;
  }

  protected async executeNodeLogic(
    inputs: Record<string, unknown>,
    executionId: string,
    nodeId: string
  ): Promise<{
    outputs: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }> {
    if (this.nodeType === 'set_variable') {
      const config = await this.getNodeConfig(executionId, nodeId);
      const name = String(config.name ?? inputs.name ?? '').trim();
      if (!name) {
        throw new Error('set_variable: name is required');
      }

      const rawValue = config.value ?? inputs.value ?? '';
      const value = typeof rawValue === 'string'
        ? resolveJsonTemplates(rawValue, inputs)
        : rawValue;
      const keepSource = config.keepSource === true || config.keepSource === 'true';

      return {
        outputs: {
          ...(keepSource ? inputs : {}),
          [name]: value,
        },
        metadata: {
          node_type: this.nodeType,
          processed_at: new Date().toISOString(),
        },
      };
    }

    // For manual_trigger and other pass-through nodes, just pass input to output
    // The input data comes from the execution's input field
    return {
      outputs: inputs, // Pass all inputs as outputs
      metadata: {
        node_type: this.nodeType,
        processed_at: new Date().toISOString(),
      },
    };
  }
}
