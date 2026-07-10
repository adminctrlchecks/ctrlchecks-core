// Quick debug test
const { unifiedGraphOrchestrator } = require('./worker/src/core/orchestration/unified-graph-orchestrator');

function makeNode(id, type, config = {}) {
  return {
    id,
    type,
    data: { type, config },
    position: { x: 0, y: 0 }
  };
}

// Build the same workflow as the failing test
const nodes = [
  makeNode('trigger_1', 'form'),
  makeNode('switch_1', 'switch', { 
    cases: [
      { value: 'case_val_1', label: 'case_val_1' },
      { value: 'case_val_2', label: 'case_val_2' }
    ], 
    expression: '{{$json.status}}' 
  }),
  makeNode('http_1', 'http_request'),
  makeNode('log_1', 'log_output'),
  makeNode('http_2', 'http_request'),
  makeNode('log_2', 'log_output'),
];

const caseNodeMapping = {
  'case_val_1': 'http_request',
  'case_val_2': 'http_request'
};

const result = unifiedGraphOrchestrator.initializeWorkflow(
  nodes,
  undefined,
  undefined,
  { switchNodeId: 'switch_1', caseNodeMapping }
);

console.log('Nodes:', result.workflow.nodes.map(n => `${n.data?.type}(${n.id})`));
console.log('Edges:');
result.workflow.edges.forEach(e => {
  const sourceNode = result.workflow.nodes.find(n => n.id === e.source);
  const targetNode = result.workflow.nodes.find(n => n.id === e.target);
  console.log(`  ${sourceNode?.data?.type}(${e.source}) --${e.type || 'main'}--> ${targetNode?.data?.type}(${e.target})`);
});

// Check log_output in-degrees
const logNodes = result.workflow.nodes.filter(n => n.data?.type === 'log_output');
logNodes.forEach(logNode => {
  const inDegree = result.workflow.edges.filter(e => e.target === logNode.id).length;
  console.log(`log_output(${logNode.id}) in-degree: ${inDegree}`);
});