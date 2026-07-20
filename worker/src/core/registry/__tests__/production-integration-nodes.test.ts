import {
  getNodeTypesWithExecuteOverrides,
  hasRegistryExecuteOverride,
} from '../unified-node-registry-overrides';
import { GENERATED_NODE_OPERATION_VALUES } from '../generated-node-operation-contracts';

describe('production integration nodes', () => {
  const expectedOperations: Record<string, string[]> = {
    calendly: ['get_user', 'get_event_types', 'get_scheduled_events'],
    linear: ['get_teams', 'create_issue', 'update_issue', 'get_issue', 'list_issues'],
    notion: ['create', 'query', 'update'],
    trello: ['get_boards', 'get_lists', 'create_card', 'update_card', 'move_card', 'delete_card'],
    typeform: ['get_forms', 'get_form', 'get_responses', 'create_form'],
  };

  it('routes every target node through a registry execute override', () => {
    const overriddenTypes = getNodeTypesWithExecuteOverrides();

    for (const nodeType of Object.keys(expectedOperations)) {
      expect(hasRegistryExecuteOverride(nodeType)).toBe(true);
      expect(overriddenTypes).toContain(nodeType);
    }
  });

  it('publishes backend operation contracts for AI and frontend parity', () => {
    for (const [nodeType, operations] of Object.entries(expectedOperations)) {
      expect(GENERATED_NODE_OPERATION_VALUES[nodeType]).toEqual(expect.arrayContaining(operations));
    }
  });
});
