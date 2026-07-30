import { unifiedNodeRegistry } from '../unified-node-registry';

/**
 * The operation selector contract.
 *
 * A node's operation decides which action it performs and therefore which of its other
 * fields are required at all. Two things must hold for every node that has one:
 *
 *  1. **Build-time AI may choose it.** It has to be inferred from the user's intent, not
 *     left on a schema default nobody picked. The field-ownership step then shows the
 *     choice for the user to revalidate.
 *  2. **It carries the `operation_selector` role**, which is how the AI prompt and the UI
 *     recognise it without knowing anything about the node type.
 *
 * Measured before this landed: of 178 nodes, 79 expose an operation field and 77 already
 * satisfied (1). The two that did not — `google_gmail` and `youtube` — each disabled it
 * with a hand-written override, and Gmail's did so while its own metadata declared
 * `dependsOnUseCase: true` and `dangerousIfWrong: true`. Every generated Gmail node
 * therefore ran on an operation nobody had chosen.
 *
 * This test exists so that gap cannot reopen. A node added next year gets the behaviour
 * from the registry's name-driven default; if someone overrides it back off, this fails.
 */

const OPERATION_SELECTOR_NAMES = ['operation', 'action', 'method'];

interface OperationField {
  nodeType: string;
  fieldName: string;
  field: any;
}

function collectOperationFields(): OperationField[] {
  const found: OperationField[] = [];
  for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
    const inputSchema = unifiedNodeRegistry.get(nodeType)?.inputSchema;
    if (!inputSchema) continue;
    for (const fieldName of OPERATION_SELECTOR_NAMES) {
      const field = (inputSchema as Record<string, any>)[fieldName];
      if (field) found.push({ nodeType, fieldName, field });
    }
  }
  return found;
}

describe('operation selector contract', () => {
  const operationFields = collectOperationFields();

  it('finds operation selectors across the registry', () => {
    // Guards the test itself: a refactor that stopped exposing operation fields would
    // otherwise make every assertion below vacuously pass.
    expect(operationFields.length).toBeGreaterThan(50);
  });

  it('lets build-time AI choose the operation on every node that has one', () => {
    const offenders = operationFields
      .filter(({ field }) => field.fillMode?.supportsBuildtimeAI !== true)
      .map(({ nodeType, fieldName }) => `${nodeType}.${fieldName}`);

    expect(offenders).toEqual([]);
  });

  it('tags every operation selector with the operation_selector role', () => {
    const offenders = operationFields
      .filter(({ field }) => field.role !== 'operation_selector')
      .map(({ nodeType, fieldName, field }) => `${nodeType}.${fieldName}=${field?.role ?? 'unset'}`);

    expect(offenders).toEqual([]);
  });

  it('does not hand the AI fields that merely mention the word', () => {
    // `operationMode`, `actionUrl` and friends are ordinary config. The rule matches exact
    // names precisely so it cannot spread to them.
    for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
      const inputSchema = unifiedNodeRegistry.get(nodeType)?.inputSchema as
        | Record<string, any>
        | undefined;
      if (!inputSchema) continue;
      for (const [fieldName, field] of Object.entries(inputSchema)) {
        const lower = fieldName.toLowerCase();
        const mentionsButIsNot =
          !OPERATION_SELECTOR_NAMES.includes(lower) &&
          (lower.includes('operation') || lower.includes('action') || lower.includes('method'));
        if (mentionsButIsNot) {
          expect(field.role).not.toBe('operation_selector');
        }
      }
    }
  });
});
