import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../components/workflow/nodeTypes';
import { BACKEND_SUPPORTED_NODE_OPERATIONS } from '../components/workflow/backendSupportedNodeOperations';
import { getIntegrationLogo } from '../lib/integrationLogos';

describe('production integration node catalog', () => {
  const targetNodes = ['calendly', 'linear', 'notion', 'trello', 'typeform'] as const;

  it('exposes all target nodes in the picker with logos and backend operations', () => {
    for (const nodeType of targetNodes) {
      const definition = NODE_TYPES.find((node) => node.type === nodeType);

      expect(definition, `${nodeType} should be registered`).toBeDefined();
      expect(definition?.category).toBe('productivity');
      expect(getIntegrationLogo(nodeType)).toMatch(/^\/integrations-logos\/.+\.svg$/);
      expect(BACKEND_SUPPORTED_NODE_OPERATIONS[nodeType]?.length).toBeGreaterThan(0);
    }
  });

  it('does not duplicate settings fields for the target nodes', () => {
    for (const nodeType of targetNodes) {
      const definition = NODE_TYPES.find((node) => node.type === nodeType);
      const keys = definition?.configFields.map((field) => field.key) ?? [];

      expect(new Set(keys).size, `${nodeType} has duplicate field keys`).toBe(keys.length);
    }
  });

  it('keeps Linear and Trello operation names aligned with backend contracts', () => {
    expect(BACKEND_SUPPORTED_NODE_OPERATIONS.linear).toEqual(
      expect.arrayContaining(['get_teams', 'create_issue', 'update_issue', 'get_issue', 'list_issues']),
    );
    expect(BACKEND_SUPPORTED_NODE_OPERATIONS.trello).toEqual(
      expect.arrayContaining(['get_boards', 'get_lists', 'create_card', 'update_card', 'move_card', 'delete_card']),
    );
  });
});
