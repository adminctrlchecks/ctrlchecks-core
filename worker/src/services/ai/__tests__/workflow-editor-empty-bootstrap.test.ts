import { aiWorkflowEditor } from '../workflow-editor';
import type { Workflow } from '../../../core/types/ai-types';
import type { AiEditorMutationOperation } from '../../../core/types/ai-editor-contracts';

describe('AIWorkflowEditor empty workflow bootstrap', () => {
  it('creates the first node without requiring a reference node', async () => {
    const workflow: Workflow = { nodes: [], edges: [] };
    const operations: AiEditorMutationOperation[] = [
      { kind: 'add_node', nodeType: 'manual_trigger' },
    ];

    const result = await aiWorkflowEditor.applyOperations(workflow, operations);

    expect(result.errors).toEqual([]);
    expect(result.workflow.nodes).toHaveLength(1);
    expect(result.workflow.nodes[0].type).toBe('manual_trigger');
    expect(result.workflow.edges).toEqual([]);
  });

  it('chains later unreferenced add_node operations after the bootstrap node', async () => {
    const workflow: Workflow = { nodes: [], edges: [] };
    const operations: AiEditorMutationOperation[] = [
      { kind: 'add_node', nodeType: 'manual_trigger' },
      {
        kind: 'add_node',
        nodeType: 'log_output',
        configOverrides: { message: 'Manual run completed' },
      },
    ];

    const result = await aiWorkflowEditor.applyOperations(workflow, operations);
    const nodeTypes = result.workflow.nodes.map((node) => node.type);

    expect(result.errors).toEqual([]);
    expect(nodeTypes).toEqual(['manual_trigger', 'log_output']);
    expect(result.workflow.edges).toHaveLength(1);
    expect(result.workflow.edges[0]).toMatchObject({
      source: result.workflow.nodes[0].id,
      target: result.workflow.nodes[1].id,
    });
  });
});
