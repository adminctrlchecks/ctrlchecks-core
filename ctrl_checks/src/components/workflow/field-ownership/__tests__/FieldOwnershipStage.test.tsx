/**
 * Characterization tests for the extracted field-ownership components (Phase 0c).
 *
 * These lock in the behaviour the Phase 0b extraction preserved, so later phases
 * (1, 3, 4) change the step deliberately rather than accidentally.
 *
 * Why these matter: per plan §3.7 the two `AutonomousAgentWizard.*.test.ts` files
 * re-implement wizard logic locally instead of importing it, so they stay green through
 * any refactor and prove nothing. These render the real components.
 *
 * No `setupFiles` exists in vite.config.ts and jest-dom is not installed, so assertions
 * use plain truthiness rather than jest-dom matchers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FieldOwnershipStage } from '../FieldOwnershipStage';
import type { FieldOwnershipContext, NodeQuestionGroup, OwnershipQuestion } from '../types';

// `field-doc-resolver` pulls in the whole @/docs-content bundle; the copy builder only
// needs it to return "no doc found".
vi.mock('@/lib/field-doc-resolver', () => ({
    findFieldDocField: () => null,
}));

vi.mock('framer-motion', () => ({
    motion: new Proxy(
        {},
        {
            get:
                () =>
                ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) => (
                    <div {...(rest as Record<string, never>)}>{children}</div>
                ),
        }
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// The help panel has its own test (FieldOwnershipHelpPanel.test.tsx). Here it is stubbed
// so we can assert on the props the row hands it, which is the extraction's real contract.
const helpPanelProps: Record<string, unknown>[] = [];
vi.mock('../../FieldOwnershipHelpPanel', () => ({
    FieldOwnershipHelpPanel: (props: Record<string, unknown>) => {
        helpPanelProps.push(props);
        return props.fieldHelpOpen ? <div data-testid="help-panel" /> : null;
    },
}));

// The connect affordance pulls in TanStack Query and the OAuth flow; it has its own
// coverage in CapabilityStage.connections.test.tsx. Here we only assert it is offered.
vi.mock('../../NodeConnectPopover', () => ({
    NodeConnectPopover: ({ serviceLabel }: { serviceLabel: string }) => (
        <button type="button" data-testid="connect-affordance">
            {serviceLabel} — connect
        </button>
    ),
}));

// Radix components reach for ResizeObserver, which jsdom does not provide.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver || ResizeObserverStub;

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function makeQuestion(overrides: Partial<Record<string, unknown>> = {}): OwnershipQuestion {
    return {
        id: 'config_node1_spreadsheetId',
        nodeId: 'node1',
        nodeLabel: 'Google Sheets',
        nodeType: 'google_sheets',
        fieldName: 'spreadsheetId',
        text: 'Spreadsheet ID',
        ownershipClass: 'structural',
        ownershipUiMode: 'editable',
        required: true,
        supportsBuildtimeAI: true,
        supportsRuntimeAI: true,
        fillModeDefault: 'manual_static',
        ...overrides,
    };
}

function makeGroup(overrides: Partial<NodeQuestionGroup> = {}): NodeQuestionGroup {
    return {
        nodeId: 'node1',
        nodeLabel: 'Google Sheets',
        nodeType: 'google_sheets',
        fields: [makeQuestion()],
        ...overrides,
    };
}

/**
 * A valid FieldOwnershipContext with every callback spied.
 *
 * Extending this factory — rather than 20 object literals — is what keeps these tests
 * cheap to maintain as later phases add fields to the interface.
 */
function buildCtx(overrides: Partial<FieldOwnershipContext> = {}): FieldOwnershipContext {
    return {
        pendingWorkflowData: { nodes: [], discoveredCredentials: [] },
        sectionStyles: { cardClass: 'card-class', titleClass: 'title-class' },
        globalWalkActive: null,
        structuralByNode: [makeGroup()],
        secretsByNode: [],
        ownershipEffectiveModes: { byModeKey: {} },
        fillModeValues: {},
        fieldPlaneRows: [],
        fieldEnabledOverrides: {},
        nodeDescriptions: {},
        fieldDescriptions: {},
        appliedExampleKeys: {},
        fieldHelpExpanded: {},
        credHelpExpanded: {},
        credHelpViewMode: {},
        fieldDescFetchedRef: { current: new Set<string>() },
        isCredentialUnlocked: vi.fn(() => false),
        startGlobalWalkThrough: vi.fn(),
        fetchNodeDescription: vi.fn(),
        fetchFieldDescriptions: vi.fn(),
        proceedFromOwnershipStage: vi.fn(),
        setFieldEnabledOverrides: vi.fn(),
        setCredentialUnlockOverrides: vi.fn(),
        setFieldHelpExpanded: vi.fn(),
        setAppliedExampleKeys: vi.fn(),
        setGuideSelectedField: vi.fn(),
        setCredHelpExpanded: vi.fn(),
        setCredHelpViewMode: vi.fn(),
        setFillModeValues: vi.fn(),
        setInputValues: vi.fn(),
        setCredentialValues: vi.fn(),
        setAppliedFieldGuidanceExamples: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    helpPanelProps.length = 0;
    vi.clearAllMocks();
});

/* -------------------------------------------------------------------------- */

describe('FieldOwnershipStage — structure', () => {
    it('renders both section headings', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.getByText('Workflow structure')).toBeTruthy();
        expect(screen.getByText('Secrets & fill mode')).toBeTruthy();
    });

    it('renders the step heading', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.getByText('Field Ownership Required')).toBeTruthy();
    });

    it('shows the empty state for a section with no groups', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ structuralByNode: [], secretsByNode: [] })} />);
        expect(screen.getAllByText('No fields in this category for this workflow.').length).toBe(2);
    });

    it('renders one card per node, with each field under its own node', () => {
        const ctx = buildCtx({
            structuralByNode: [
                makeGroup({
                    nodeId: 'node1',
                    nodeLabel: 'Google Sheets',
                    fields: [makeQuestion({ id: 'q1', text: 'Spreadsheet ID' })],
                }),
                makeGroup({
                    nodeId: 'node2',
                    nodeLabel: 'Slack',
                    nodeType: 'slack',
                    fields: [
                        makeQuestion({
                            id: 'q2',
                            nodeId: 'node2',
                            nodeLabel: 'Slack',
                            nodeType: 'slack',
                            fieldName: 'channel',
                            text: 'Channel',
                        }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.getByText('Channel')).toBeTruthy();
        // node type subtitle appears on each card
        expect(screen.getByText('google_sheets')).toBeTruthy();
        expect(screen.getByText('slack')).toBeTruthy();
    });

    it('keeps structural and secret questions in their own sections', () => {
        const ctx = buildCtx({
            structuralByNode: [makeGroup({ fields: [makeQuestion({ id: 'q1', text: 'Structural Field' })] })],
            secretsByNode: [
                makeGroup({
                    nodeId: 'node9',
                    nodeLabel: 'Api Node',
                    fields: [
                        makeQuestion({
                            id: 'q9',
                            nodeId: 'node9',
                            text: 'Secret Field',
                            ownershipClass: 'credential',
                        }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Structural Field')).toBeTruthy();
        expect(screen.getByText('Secret Field')).toBeTruthy();
    });
});

describe('FieldOwnershipStage — proceed action', () => {
    it('invokes proceedFromOwnershipStage when the proceed button is clicked', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('Proceed To Credentials'));
        expect(ctx.proceedFromOwnershipStage).toHaveBeenCalledTimes(1);
    });
});

describe('FieldOwnershipStage — walk-through control', () => {
    it('passes both section groupings to startGlobalWalkThrough', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('Walk me through all fields'));
        expect(ctx.startGlobalWalkThrough).toHaveBeenCalledWith(ctx.structuralByNode, ctx.secretsByNode);
    });

    it('shows walk progress instead of the idle label while a walk is active', () => {
        const ctx = buildCtx({
            globalWalkActive: {
                currentNodeLabel: 'Google Sheets',
                currentFieldLabel: 'Spreadsheet ID',
                currentFieldIdx: 1,
                totalFields: 4,
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('Walk me through all fields')).toBeNull();
        expect(screen.getByText(/Google Sheets · Spreadsheet ID \(2\/4\)/)).toBeTruthy();
    });
});

describe('NodeOwnershipCard — node description', () => {
    it('requests the node description with a section-namespaced key', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('What does this node do?'));
        expect(ctx.fetchNodeDescription).toHaveBeenCalledWith(
            'desc_structural_node1',
            'google_sheets',
            'Google Sheets',
            'node1'
        );
    });

    it('renders the description text once it is open', () => {
        const ctx = buildCtx({
            nodeDescriptions: {
                desc_structural_node1: { loading: false, open: true, text: 'Reads rows from a sheet.' },
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Reads rows from a sheet.')).toBeTruthy();
        expect(screen.getByText('Hide description')).toBeTruthy();
    });
});

describe('FieldOwnershipRow — enable toggle', () => {
    it('defaults to off for a plain field and on for an AI-prefilled one', () => {
        const ctx = buildCtx({
            structuralByNode: [
                makeGroup({
                    fields: [
                        makeQuestion({ id: 'q1', text: 'Plain Field' }),
                        makeQuestion({
                            id: 'q2',
                            fieldName: 'sheetName',
                            text: 'Prefilled Field',
                            aiFilledAtBuildTime: true,
                        }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const plain = screen.getByLabelText('Enable Plain Field');
        const prefilled = screen.getByLabelText('Enable Prefilled Field');
        expect(plain.getAttribute('data-state')).toBe('unchecked');
        expect(prefilled.getAttribute('data-state')).toBe('checked');
    });

    it('writes the override under the fieldEnabled_<nodeId>_<fieldName> key', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByLabelText('Enable Spreadsheet ID'));
        expect(ctx.setFieldEnabledOverrides).toHaveBeenCalledTimes(1);
        const updater = (ctx.setFieldEnabledOverrides as unknown as { mock: { calls: unknown[][] } })
            .mock.calls[0][0] as (prev: Record<string, boolean>) => Record<string, boolean>;
        expect(updater({})).toEqual({ fieldEnabled_node1_spreadsheetId: true });
    });

    it('honours an explicit override over the AI-prefilled default', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByLabelText('Enable Spreadsheet ID').getAttribute('data-state')).toBe('checked');
    });
});

describe('FieldOwnershipRow — ownership label', () => {
    const cases: Array<[string, string]> = [
        ['manual_static', 'You'],
        ['buildtime_ai_once', 'AI Build'],
        ['runtime_ai', 'AI Runtime'],
    ];

    it.each(cases)('shows %s as "%s" when the row is on', (mode, label) => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            ownershipEffectiveModes: {
                byModeKey: { mode_node1_spreadsheetId: mode as 'manual_static' },
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const owner = screen.getByText('Owner:').parentElement as HTMLElement;
        expect(within(owner).getByText(label)).toBeTruthy();
    });

    it('does not show the ownership hint while the row is off', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.queryByText('Owner:')).toBeNull();
    });
});

describe('FieldOwnershipRow — locked rows', () => {
    it('hides the ownership hint on a locked row', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            structuralByNode: [
                makeGroup({ fields: [makeQuestion({ ownershipUiMode: 'locked' })] }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('Owner:')).toBeNull();
        expect(screen.queryByText('Change ownership')).toBeNull();
    });

    it('treats an unlocked unlockable credential as not locked', () => {
        const ctx = buildCtx({
            isCredentialUnlocked: vi.fn(() => true),
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            structuralByNode: [
                makeGroup({
                    fields: [
                        makeQuestion({ ownershipUiMode: 'locked', isUnlockableCredential: true }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Owner:')).toBeTruthy();
    });

    it('offers the unlock switch on a locked unlockable credential row', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            structuralByNode: [
                makeGroup({
                    fields: [
                        makeQuestion({ ownershipUiMode: 'locked', isUnlockableCredential: true }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Unlock ownership (User vs AI)')).toBeTruthy();
    });
});

describe('FieldOwnershipRow — field help', () => {
    it('opens help and requests field descriptions on first open', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('What does this input field do?'));

        expect(ctx.setFieldHelpExpanded).toHaveBeenCalledTimes(1);
        const updater = (ctx.setFieldHelpExpanded as unknown as { mock: { calls: unknown[][] } })
            .mock.calls[0][0] as (prev: Record<string, boolean>) => Record<string, boolean>;
        expect(updater({})).toEqual({ fieldhelp_node1_spreadsheetId: true });

        expect(ctx.fetchFieldDescriptions).toHaveBeenCalledTimes(1);
        const args = (ctx.fetchFieldDescriptions as unknown as { mock: { calls: unknown[][] } })
            .mock.calls[0];
        expect(args[0]).toBe('node1');
        expect(args[4]).toBe('node1:spreadsheetId');
    });

    it('does not re-request a description already fetched in this session', () => {
        const ctx = buildCtx({
            fieldDescFetchedRef: { current: new Set(['node1:spreadsheetId']) },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('What does this input field do?'));
        expect(ctx.fetchFieldDescriptions).not.toHaveBeenCalled();
    });

    it('hands the help panel its open state and mode', () => {
        const ctx = buildCtx({
            fieldHelpExpanded: { fieldhelp_node1_spreadsheetId: true },
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            ownershipEffectiveModes: { byModeKey: { mode_node1_spreadsheetId: 'runtime_ai' } },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const props = helpPanelProps.at(-1)!;
        expect(props.fieldHelpOpen).toBe(true);
        expect(props.selectedMode).toBe('runtime_ai');
        expect(props.fieldEnabled).toBe(true);
        expect(props.locked).toBe(false);
    });

    it('routes a mode change to the mode_<nodeId>_<fieldName> key', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        const onModeChange = helpPanelProps.at(-1)!.onModeChange as (m: string) => void;
        onModeChange('buildtime_ai_once');
        const updater = (ctx.setFillModeValues as unknown as { mock: { calls: unknown[][] } })
            .mock.calls[0][0] as (prev: Record<string, string>) => Record<string, string>;
        expect(updater({})).toEqual({ mode_node1_spreadsheetId: 'buildtime_ai_once' });
    });
});

describe('FieldOwnershipRow — selection', () => {
    it('reports the clicked field to the guide', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('Spreadsheet ID'));
        expect(ctx.setGuideSelectedField).toHaveBeenCalledWith({
            nodeId: 'node1',
            fieldName: 'spreadsheetId',
        });
    });
});

describe('CredentialHelpDisclosure', () => {
    const credentialCtx = (overrides: Partial<FieldOwnershipContext> = {}) =>
        buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_apiKey: true },
            structuralByNode: [
                makeGroup({
                    fields: [
                        makeQuestion({
                            id: 'cred_node1_apiKey',
                            fieldName: 'apiKey',
                            text: 'API Key',
                            ownershipClass: 'credential',
                        }),
                    ],
                }),
            ],
            ...overrides,
        });

    it('renders the disclosure for a credential field', () => {
        render(<FieldOwnershipStage ctx={credentialCtx()} />);
        expect(screen.getByText('Why do I need this? How do I get it?')).toBeTruthy();
    });

    it('is absent for a non-credential field', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.queryByText('Why do I need this? How do I get it?')).toBeNull();
    });

    it('shows the simple description by default when expanded', () => {
        const ctx = credentialCtx({ credHelpExpanded: { credhelp_node1_apiKey: true } });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText(/authorizes Google Sheets to act on your behalf/)).toBeTruthy();
    });

    it('switches to the technical description', () => {
        const ctx = credentialCtx({
            credHelpExpanded: { credhelp_node1_apiKey: true },
            credHelpViewMode: { credhelp_node1_apiKey: 'technical' },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText(/Injected at execution time from the secure vault/)).toBeTruthy();
    });

    it('prefers AI guidance from discoveredCredentials when it matches the node', () => {
        const ctx = credentialCtx({
            credHelpExpanded: { credhelp_node1_apiKey: true },
            pendingWorkflowData: {
                discoveredCredentials: [
                    { nodeIds: ['node1'], simpleDescription: 'Custom simple copy.' },
                ],
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Custom simple copy.')).toBeTruthy();
    });
});

describe('NodeChecklistRail (Phase 1)', () => {
    it('lists every node from both sections, in order', () => {
        const ctx = buildCtx({
            structuralByNode: [makeGroup({ nodeId: 'node1', nodeLabel: 'Google Sheets' })],
            secretsByNode: [
                makeGroup({
                    nodeId: 'node2',
                    nodeLabel: 'Slack',
                    fields: [makeQuestion({ id: 'q2', nodeId: 'node2' })],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const rail = screen.getByLabelText('Workflow steps');
        const items = within(rail).getAllByRole('listitem');
        expect(items.length).toBe(2);
        expect(within(items[0]).getByText('Google Sheets')).toBeTruthy();
        expect(within(items[1]).getByText('Slack')).toBeTruthy();
    });

    it('renders nothing when there are no nodes', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ structuralByNode: [], secretsByNode: [] })} />);
        expect(screen.queryByLabelText('Workflow steps')).toBeNull();
    });

    it('reports a node with an enabled but empty required field as needing input', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getByText(/Needs input/)).toBeTruthy();
        expect(within(rail).getByText('0 of 1 ready')).toBeTruthy();
    });

    it('counts a node as ready once its enabled field has a value', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            structuralByNode: [
                makeGroup({ fields: [makeQuestion({ defaultValue: 'sheet-abc' })] }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getByText('Ready')).toBeTruthy();
        expect(within(rail).getByText('1 of 1 ready')).toBeTruthy();
    });

    it('treats an AI-owned field as satisfied without a value', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            ownershipEffectiveModes: { byModeKey: { mode_node1_spreadsheetId: 'runtime_ai' } },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(within(screen.getByLabelText('Workflow steps')).getByText('Ready')).toBeTruthy();
    });

    it('treats a locked row as satisfied', () => {
        const ctx = buildCtx({
            fieldEnabledOverrides: { fieldEnabled_node1_spreadsheetId: true },
            structuralByNode: [
                makeGroup({ fields: [makeQuestion({ ownershipUiMode: 'locked' })] }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(within(screen.getByLabelText('Workflow steps')).getByText('Ready')).toBeTruthy();
    });

    it('shows a node with everything switched off as waiting, not ready', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getByText('Waiting')).toBeTruthy();
        expect(within(rail).getByText('0 of 1 ready')).toBeTruthy();
    });

    it('carries no group counts yet (deferred to Phase 3 per G9)', () => {
        const ctx = buildCtx({
            structuralByNode: [
                makeGroup({
                    fields: [
                        makeQuestion({ id: 'q1' }),
                        makeQuestion({ id: 'q2', fieldName: 'sheetName' }),
                        makeQuestion({ id: 'q3', fieldName: 'range' }),
                    ],
                }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const rail = screen.getByLabelText('Workflow steps');
        // Only the node name and its status appear -- no required/optional breakdown.
        expect(within(rail).queryByText(/required/i)).toBeNull();
        expect(within(rail).queryByText(/optional/i)).toBeNull();
    });

    it('gives each node card the id its rail entry scrolls to', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(container.querySelector('#fo-card-structural_node1')).toBeTruthy();
    });
});

describe('Field grouping (Phase 3)', () => {
    const threeFieldGroup = makeGroup({
        fields: [
            makeQuestion({ id: 'q1', fieldName: 'spreadsheetId', text: 'Spreadsheet ID' }),
            makeQuestion({ id: 'q2', fieldName: 'range', text: 'Range' }),
            makeQuestion({ id: 'q3', fieldName: 'apiKey', text: 'API Key' }),
        ],
    });

    const planWith = (groups: Record<string, Array<Record<string, unknown>>>) => ({
        nodes: [
            {
                nodeId: 'node1',
                nodeType: 'google_sheets',
                nodeLabel: 'Google Sheets',
                firstRunClass: null,
                diagnostics: [],
                groups: {
                    required: [],
                    aiFilled: [],
                    aiRuntime: [],
                    optional: [],
                    credential: [],
                    ...groups,
                },
            },
        ],
        summary: { nodeCount: 1, requiredCount: 0, unresolvedReferenceCount: 0 },
    });

    const field = (fieldName: string, label: string) => ({
        fieldName,
        label,
        required: true,
        hasValue: false,
        fillMode: 'manual_static',
    });

    it('renders rows flat when no plan has loaded', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ structuralByNode: [threeFieldGroup] })} />);
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.queryByText('You provide')).toBeNull();
    });

    it('renders accordions once the plan partitions the fields', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID'), field('range', 'Range')],
                credential: [field('apiKey', 'API Key')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('You provide')).toBeTruthy();
        expect(screen.getByText('Connection')).toBeTruthy();
    });

    it('expands exactly one group by default and collapses the rest', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID'), field('range', 'Range')],
                credential: [field('apiKey', 'API Key')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        // 'required' -> "You provide" is first in priority order, so it opens.
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.queryByText('API Key')).toBeNull();
    });

    it('opens a collapsed group when its header is clicked', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID')],
                credential: [field('apiKey', 'API Key')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('API Key')).toBeNull();
        fireEvent.click(screen.getByText('Connection'));
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    it('skips accordion chrome when every field lands in one group', () => {
        // Measured failure mode: http_request / code put everything in `required`,
        // where an accordion is a click with no clarity.
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [
                    field('spreadsheetId', 'Spreadsheet ID'),
                    field('range', 'Range'),
                    field('apiKey', 'API Key'),
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('You provide')).toBeNull();
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    it('still renders a question the plan did not classify', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID')],
                optional: [field('range', 'Range')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        // apiKey is absent from every group but must not vanish from the UI.
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    it('explains where a templated value comes from', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            fieldPlan: planWith({
                required: [
                    {
                        ...field('spreadsheetId', 'Spreadsheet ID'),
                        producedBy: [
                            {
                                fieldName: 'sheetId',
                                nodeId: 'trigger1',
                                nodeLabel: 'Manual Trigger',
                                nodeType: 'manual_trigger',
                            },
                        ],
                    },
                ],
                optional: [field('range', 'Range')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText(/uses/)).toBeTruthy();
        expect(screen.getByText('Manual Trigger')).toBeTruthy();
    });

    it('offers a connect action for a pipeline-injected node that is unconnected', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            nodeConnections: [
                {
                    nodeType: 'google_sheets',
                    nodeLabel: 'Google Sheets',
                    connected: false,
                    provider: 'google',
                    providerLabel: 'Google',
                },
            ] as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText(/Google — connect/)).toBeTruthy();
    });

    it('shows no connect action when the injected node is connected', () => {
        const ctx = buildCtx({
            structuralByNode: [threeFieldGroup],
            nodeConnections: [
                { nodeType: 'google_sheets', nodeLabel: 'Google Sheets', connected: true },
            ] as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText(/— connect/)).toBeNull();
    });
});

describe('BlueprintPanel', () => {
    it('renders nothing without blueprint or diagnostics', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.queryByText('Workflow Blueprint')).toBeNull();
    });

    it('renders the overview and node narratives when present', () => {
        const ctx = buildCtx({
            pendingWorkflowData: {
                discoveredCredentials: [],
                update: {
                    structuralBlueprint: {
                        overviewText: 'Reads a sheet, then posts to Slack.',
                        nodeNarratives: [{ nodeId: 'node1', text: 'Sheets reads rows.' }],
                    },
                },
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Workflow Blueprint')).toBeTruthy();
        expect(screen.getByText('Reads a sheet, then posts to Slack.')).toBeTruthy();
        expect(screen.getByText(/Sheets reads rows\./)).toBeTruthy();
    });

    it('renders structural errors and warnings', () => {
        const ctx = buildCtx({
            pendingWorkflowData: {
                discoveredCredentials: [],
                update: {
                    structuralDiagnostics: {
                        errors: ['Trigger is missing.'],
                        warnings: ['Terminal node has no logging.'],
                    },
                },
            },
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByText('Structural issues')).toBeTruthy();
        expect(screen.getByText(/Trigger is missing\./)).toBeTruthy();
        expect(screen.getByText(/Terminal node has no logging\./)).toBeTruthy();
    });
});
