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
        nodesInOrder: [makeGroup()],
        ownershipEffectiveModes: { byModeKey: {} },
        fillModeValues: {},
        outstandingCount: 0,
        inputValues: {},
        credentialValues: {},
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
    it('renders the step heading', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.getByText('Field Ownership Required')).toBeTruthy();
    });

    it('no longer splits the step into structural and secrets sections (Phase A)', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(screen.queryByText('Workflow structure')).toBeNull();
        expect(screen.queryByText('Secrets & fill mode')).toBeNull();
    });

    it('shows one empty state when there are no nodes', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ nodesInOrder: [] })} />);
        expect(screen.getAllByText('No fields to review for this workflow.').length).toBe(1);
    });

    /**
     * Phase B. Every node used to render at once, so reaching the last step meant scrolling
     * past every field of every earlier one. The detail pane shows the selected node only;
     * the rail keeps the whole workflow visible so nothing is hidden by the selection.
     */
    const twoNodeCtx = () =>
        buildCtx({
            nodesInOrder: [
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

    it('shows one node at a time, not every node at once', () => {
        const { container } = render(<FieldOwnershipStage ctx={twoNodeCtx()} />);
        expect(container.querySelectorAll('[id^="fo-card-"]').length).toBe(1);
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.queryByText('Channel')).toBeNull();
    });

    it('swaps the detail pane when another step is selected in the rail', () => {
        render(<FieldOwnershipStage ctx={twoNodeCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');
        fireEvent.click(within(rail).getByText('Slack'));

        expect(screen.getByText('Channel')).toBeTruthy();
        expect(screen.queryByText('Spreadsheet ID')).toBeNull();
    });

    it('lets the user reach any step directly, in any order', () => {
        // Free navigation, deliberately: forcing the sequence blocks someone who only wants
        // to correct a later step.
        render(<FieldOwnershipStage ctx={twoNodeCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');

        fireEvent.click(within(rail).getByText('Slack'));
        expect(screen.getByText('Channel')).toBeTruthy();
        fireEvent.click(within(rail).getByText('Google Sheets'));
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
    });

    it('marks the selected step in the rail for assistive tech', () => {
        render(<FieldOwnershipStage ctx={twoNodeCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');
        const [first, second] = within(rail).getAllByRole('button');
        expect(first.getAttribute('aria-current')).toBe('step');
        expect(second.getAttribute('aria-current')).toBeNull();
    });

    /**
     * Phase A acceptance (plan RC-1). Before the collapse, a node holding both a
     * structural field and a secret was filtered into `structuralByNode` AND
     * `secretsByNode`, so it rendered as two cards and two rail entries — the observed
     * "Form Trigger #1 … Form Trigger #6", 13 entries for 7 nodes. The whole point of
     * the phase is that this node now appears exactly once.
     */
    it('renders one card holding both the structural and the secret field of a node', () => {
        const ctx = buildCtx({
            nodesInOrder: [
                makeGroup({
                    fields: [
                        makeQuestion({ id: 'q1', text: 'Structural Field' }),
                        makeQuestion({
                            id: 'q2',
                            fieldName: 'apiKey',
                            text: 'Secret Field',
                            ownershipClass: 'credential',
                        }),
                    ],
                }),
            ],
        });
        const { container } = render(<FieldOwnershipStage ctx={ctx} />);

        // One card, carrying both fields.
        const cards = container.querySelectorAll('[id^="fo-card-"]');
        expect(cards.length).toBe(1);
        expect(within(cards[0] as HTMLElement).getByText('Structural Field')).toBeTruthy();
        expect(within(cards[0] as HTMLElement).getByText('Secret Field')).toBeTruthy();

        // ...and one rail entry for it. `getByText` throws on multiple matches, so this also
        // asserts the label is not listed twice.
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getAllByRole('listitem').length).toBe(1);
        expect(within(rail).getByText('Google Sheets')).toBeTruthy();
    });

    it('lists the rail in execution order, and opens on the first step', () => {
        const ctx = buildCtx({
            nodesInOrder: [
                makeGroup({ nodeId: 'trigger1', nodeLabel: 'Form Trigger', nodeType: 'form_trigger' }),
                makeGroup({ nodeId: 'switch1', nodeLabel: 'Switch', nodeType: 'switch' }),
                makeGroup({ nodeId: 'gmail1', nodeLabel: 'Gmail', nodeType: 'gmail' }),
            ],
        });
        const { container } = render(<FieldOwnershipStage ctx={ctx} />);

        const rail = screen.getByLabelText('Workflow steps');
        const railLabels = within(rail)
            .getAllByRole('listitem')
            .map((li) => within(li).getByText(/Form Trigger|Switch|Gmail/).textContent);
        expect(railLabels).toEqual(['Form Trigger', 'Switch', 'Gmail']);

        expect(container.querySelector('#fo-card-trigger1')).toBeTruthy();
        expect(container.querySelectorAll('[id^="fo-card-"]').length).toBe(1);
    });

    it('opens on the first step that is still missing something', () => {
        const ctx = buildCtx({
            nodesInOrder: [
                makeGroup({ nodeId: 'trigger1', nodeLabel: 'Form Trigger', nodeType: 'form_trigger' }),
                makeGroup({ nodeId: 'gmail1', nodeLabel: 'Gmail', nodeType: 'gmail' }),
            ],
            incompleteNodes: [
                { nodeId: 'gmail1', nodeLabel: 'Gmail', missingLabels: ['Recipient Emails'] },
            ],
        });
        const { container } = render(<FieldOwnershipStage ctx={ctx} />);
        // Opens on work, not on whatever happens to be first in the graph.
        expect(container.querySelector('#fo-card-gmail1')).toBeTruthy();
    });
});

/**
 * Phase E (plan RC-7). The reported symptom was the step heading being clipped by the
 * wizard's fixed header once the user scrolled down to reach a later node: the step was
 * ordinary paged content, so everything above the current node scrolled away with it.
 *
 * The fix hands the step a definite height and gives each pane its own scrollport, copying
 * `CapabilityStage`. These assert the class chain that produces that, because it is the
 * whole mechanism — jsdom computes no layout, so there is nothing else to measure here.
 */
describe('FieldOwnershipStage — layout (Phase E)', () => {
    const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;

    it('claims the full content height instead of scrolling as a page', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        const root = rootOf(container);
        expect(root.className).toContain('lg:h-full');
        expect(root.className).toContain('lg:min-h-0');
        // Reserves the pinned action bar's footprint so the last card never sits under it.
        expect(root.className).toContain('pb-20');
    });

    it('gives the rail and the card list each their own scrollport', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(rail.className).toContain('lg:overflow-y-auto');
        expect(rail.className).toContain('lg:min-h-0');
        // `lg:sticky` only works while the page itself scrolls — the wrong mechanism now.
        expect(rail.className).not.toContain('lg:sticky');

        const cardPane = screen.getByTestId('ownership-cards-pane');
        expect(cardPane.className).toContain('lg:overflow-y-auto');
        expect(cardPane.className).toContain('lg:min-h-0');
        expect(cardPane.contains(container.querySelector('[id^="fo-card-"]'))).toBe(true);
    });

    it('never sizes a pane from a viewport guess or a min-height floor', () => {
        // Both were tried on the node-selection screen and both failed; height must come
        // from the parent flex chain. A regression here reintroduces a second scrollbar.
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(container.innerHTML).not.toContain('calc(100vh');
        expect(container.querySelector('[class*="lg:min-h-["]')).toBeNull();
    });

    it('pins the build action to the viewport so it is reachable from either pane', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        const bar = container.querySelector('.fixed.bottom-0') as HTMLElement;
        expect(bar).toBeTruthy();
        expect(within(bar).getByRole('button', { name: 'Build Workflow' })).toBeTruthy();
    });

    /**
     * Reported regression: hovering the step made the action bar jump from the bottom of the
     * window into the middle of the card.
     *
     * Cause: `position: fixed` resolves against the viewport only while no ancestor is
     * transformed — a transformed ancestor becomes the containing block instead. The step was
     * wrapped in the shared `Card`, which carries `motion-safe:hover:scale-[1.02]`
     * (ui/card.tsx), so hovering anywhere in it re-anchored the nested bar to the card's own
     * bottom edge. The wrapper is gone; this guards the invariant that outlived it.
     */
    it('keeps the pinned bar clear of any ancestor that hover-transforms', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        const root = container.firstElementChild as HTMLElement;
        const bar = container.querySelector('.fixed.bottom-0') as HTMLElement;

        expect(bar.parentElement).toBe(root);
        for (let el = bar.parentElement; el && el !== container; el = el.parentElement) {
            expect(String(el.className)).not.toMatch(/hover:scale-/);
        }
    });

    /**
     * The step is a full-height working surface, so it is built from a plain flex column like
     * node selection. A `Card` wrapper costs a `p-6` header plus a `p-6` content box inside
     * the wizard's own `p-6` — roughly a third of the working height in chrome — and its
     * hover zoom is what re-anchored the pinned bar above.
     */
    it('uses no Card wrapper, matching the node-selection screen', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        expect(container.querySelector('.card-class')).toBeNull();

        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain('flex');
        expect(root.className).toContain('flex-col');
    });

    it('lays the panes out on the same grid track as node selection', () => {
        const { container } = render(<FieldOwnershipStage ctx={buildCtx()} />);
        const grid = screen.getByTestId('ownership-cards-pane').parentElement as HTMLElement;
        expect(grid.className).toContain('lg:grid-cols-[340px_1fr]');
        // The rail takes its width from that track, never from its own `w-[…]`.
        expect(String(screen.getByLabelText('Workflow steps').className)).not.toMatch(/w-\[/);
    });
});

describe('FieldOwnershipStage — build action (Phase 5)', () => {
    it('invokes proceedFromOwnershipStage when the build button is clicked', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        // Was "Proceed To Credentials" until Phase 5 deleted that step; the step now
        // builds directly because values are entered here.
        fireEvent.click(screen.getByText('Build Workflow'));
        expect(ctx.proceedFromOwnershipStage).toHaveBeenCalledTimes(1);
    });

    it('blocks the build while fields the user owns still have no value', () => {
        const ctx = buildCtx({ outstandingCount: 2 });
        render(<FieldOwnershipStage ctx={ctx} />);
        const button = screen.getByRole('button', { name: 'Build Workflow' });
        expect(button.hasAttribute('disabled')).toBe(true);
        expect(screen.getByTestId('ownership-outstanding-notice').textContent).toContain(
            '2 fields still need a value.'
        );
        fireEvent.click(button);
        expect(ctx.proceedFromOwnershipStage).not.toHaveBeenCalled();
    });

    it('singularises the outstanding notice', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ outstandingCount: 1 })} />);
        expect(screen.getByTestId('ownership-outstanding-notice').textContent).toContain(
            '1 field still needs a value.'
        );
    });

    it('shows no notice and enables the build when nothing is outstanding', () => {
        render(<FieldOwnershipStage ctx={buildCtx({ outstandingCount: 0 })} />);
        expect(screen.queryByTestId('ownership-outstanding-notice')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Build Workflow' }).hasAttribute('disabled')
        ).toBe(false);
    });
});

/**
 * Completeness gate. "Ready" means every field required by the operation a node is actually
 * set to has a value — resolved server-side from the node's live config, so it follows the
 * operation and needs no per-node-type knowledge here.
 *
 * Deliberately NOT a test-run gate: the user asked for "is everything filled in?", and a
 * hard test-run requirement traps workflows containing nodes that cannot be safely run.
 */
describe('FieldOwnershipStage — completeness gate', () => {
    const incompleteCtx = () =>
        buildCtx({
            nodesInOrder: [
                makeGroup({ nodeId: 'gmail1', nodeLabel: 'Gmail', nodeType: 'gmail' }),
                makeGroup({ nodeId: 'slack1', nodeLabel: 'Slack', nodeType: 'slack' }),
            ],
            outstandingByNodeId: { gmail1: 2, slack1: 0 },
            incompleteNodes: [
                { nodeId: 'gmail1', nodeLabel: 'Gmail', missingLabels: ['Subject', 'Body'] },
            ],
        });

    it('blocks the build while any step is missing a required value', () => {
        render(<FieldOwnershipStage ctx={incompleteCtx()} />);
        const build = screen.getByRole('button', { name: 'Build Workflow' });
        expect(build.hasAttribute('disabled')).toBe(true);
        // Never a dead button — it names the step responsible.
        expect(build.getAttribute('title')).toContain('Gmail');
    });

    it('allows the build once every step has what its operation needs', () => {
        const ctx = buildCtx({
            nodesInOrder: [makeGroup({ nodeId: 'gmail1', nodeLabel: 'Gmail' })],
            outstandingByNodeId: { gmail1: 0 },
            incompleteNodes: [],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(
            screen.getByRole('button', { name: 'Build Workflow' }).hasAttribute('disabled')
        ).toBe(false);
        expect(screen.getByTestId('ownership-ready-notice')).toBeTruthy();
    });

    it('keeps the build blocked when the wizard still reports outstanding fields', () => {
        // Both signals gate. Claiming "every step has what it needs" beside a dead button
        // would be worse than saying nothing.
        const ctx = buildCtx({ incompleteNodes: [], outstandingCount: 2 });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(
            screen.getByRole('button', { name: 'Build Workflow' }).hasAttribute('disabled')
        ).toBe(true);
        expect(screen.queryByTestId('ownership-ready-notice')).toBeNull();
        expect(screen.getByTestId('ownership-outstanding-notice').textContent).toContain(
            '2 fields still need a value.'
        );
    });

    it('reports what is missing, per step, when the user checks', () => {
        render(<FieldOwnershipStage ctx={incompleteCtx()} />);
        fireEvent.click(screen.getByTestId('ownership-check-button'));

        const report = screen.getByTestId('check-report');
        expect(within(report).getByText(/2 values are still missing/)).toBeTruthy();
        expect(within(report).getByText(/Needs Subject, Body/)).toBeTruthy();
    });

    it('jumps to the step named in the check report', () => {
        const { container } = render(<FieldOwnershipStage ctx={incompleteCtx()} />);
        fireEvent.click(screen.getByTestId('ownership-check-button'));
        fireEvent.click(within(screen.getByTestId('check-report')).getByText('Gmail'));

        expect(screen.queryByTestId('check-report')).toBeNull();
        expect(container.querySelector('#fo-card-gmail1')).toBeTruthy();
    });

    it('confirms completeness when the user checks and nothing is missing', () => {
        const ctx = buildCtx({ incompleteNodes: [], outstandingCount: 0 });
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByTestId('ownership-check-button'));
        expect(
            within(screen.getByTestId('check-report')).getByText('Every step has what it needs')
        ).toBeTruthy();
    });

    it('counts a step ready from the plan, not from which rows are switched on', () => {
        // The old heuristic treated a switched-off row as satisfied, so a node could report
        // Ready with a required field off and empty. The plan is the authority now.
        const ctx = buildCtx({
            nodesInOrder: [makeGroup({ nodeId: 'node1', nodeLabel: 'Google Sheets' })],
            outstandingByNodeId: { node1: 1 },
            incompleteNodes: [
                { nodeId: 'node1', nodeLabel: 'Google Sheets', missingLabels: ['Spreadsheet ID'] },
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getByText(/Needs input/)).toBeTruthy();
        expect(within(rail).getByText(/1 to fill/)).toBeTruthy();
        expect(within(rail).getByText('0 of 1 ready')).toBeTruthy();
    });
});

describe('FieldOwnershipStage — walk-through control', () => {
    it('walks the one node-ordered list, so the walk order matches the cards', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('Walk me through all fields'));
        expect(ctx.startGlobalWalkThrough).toHaveBeenCalledWith(ctx.nodesInOrder);
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
    // Phase A dropped the section prefix: one card per node means the node id alone is
    // already unique, and `desc_structural_x` / `desc_secrets_x` were two cache entries
    // fetching the same description for the same node.
    it('requests the node description keyed by node id alone', () => {
        const ctx = buildCtx();
        render(<FieldOwnershipStage ctx={ctx} />);
        fireEvent.click(screen.getByText('What does this node do?'));
        expect(ctx.fetchNodeDescription).toHaveBeenCalledWith(
            'desc_node1',
            'google_sheets',
            'Google Sheets',
            'node1'
        );
    });

    it('renders the description text once it is open', () => {
        const ctx = buildCtx({
            nodeDescriptions: {
                desc_node1: { loading: false, open: true, text: 'Reads rows from a sheet.' },
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
            nodesInOrder: [
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
            nodesInOrder: [
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
            nodesInOrder: [
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
            nodesInOrder: [
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
            nodesInOrder: [
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
    it('lists every node once, in order', () => {
        const ctx = buildCtx({
            nodesInOrder: [
                makeGroup({ nodeId: 'node1', nodeLabel: 'Google Sheets' }),
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
        render(<FieldOwnershipStage ctx={buildCtx({ nodesInOrder: [] })} />);
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
            nodesInOrder: [
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
            nodesInOrder: [
                makeGroup({ fields: [makeQuestion({ ownershipUiMode: 'locked' })] }),
            ],
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(within(screen.getByLabelText('Workflow steps')).getByText('Ready')).toBeTruthy();
    });

    it('shows a node with everything switched off as waiting, not ready', () => {
        render(<FieldOwnershipStage ctx={buildCtx()} />);
        const rail = screen.getByLabelText('Workflow steps');
        expect(within(rail).getByText('Not started')).toBeTruthy();
        expect(within(rail).getByText('0 of 1 ready')).toBeTruthy();
    });

    it('carries no group counts yet (deferred to Phase 3 per G9)', () => {
        const ctx = buildCtx({
            nodesInOrder: [
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
        expect(container.querySelector('#fo-card-node1')).toBeTruthy();
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
        render(<FieldOwnershipStage ctx={buildCtx({ nodesInOrder: [threeFieldGroup] })} />);
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
        expect(screen.queryByText('You provide')).toBeNull();
    });

    /**
     * Three sections, always all three, in a fixed order.
     *
     * The server returns five buckets; five headings per node is more taxonomy than someone
     * reviewing a workflow needs. These three are the three questions actually being asked:
     * did the AI get this right, what must I provide, and what can I ignore.
     */
    const SECTIONS = ['AI built — review these', 'Recommended — you provide these', 'Optional'];

    it('renders the same three sections, in the same order, on every node', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID')],
                credential: [field('apiKey', 'API Key')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const headings = screen
            .getAllByText(new RegExp(SECTIONS.join('|')))
            .map((el) => el.textContent);
        expect(headings).toEqual(SECTIONS);
    });

    it('keeps all three sections even when one has nothing in it', () => {
        // A node card must be the same shape on every step, so the user learns one layout
        // instead of re-reading each node's structure.
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                required: [
                    field('spreadsheetId', 'Spreadsheet ID'),
                    field('range', 'Range'),
                    field('apiKey', 'API Key'),
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        for (const heading of SECTIONS) expect(screen.getByText(heading)).toBeTruthy();
    });

    it('folds connections into "You provide" rather than a section of their own', () => {
        // Connecting an account is something the user must do for the step to run — the same
        // question that section asks.
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                credential: [field('apiKey', 'API Key')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('Connection')).toBeNull();
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    /** Which section is open, read off the headers rather than guessed from content. */
    const openSection = () =>
        screen
            .getAllByRole('button')
            .filter((b) => b.getAttribute('aria-expanded') === 'true')
            .map((b) => b.textContent?.replace(/\d+$/, '').trim())
            .find((label) => SECTIONS.some((s) => label?.startsWith(s)));

    it('opens on what the user must provide when something is missing', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                aiFilled: [{ ...field('range', 'Range'), hasValue: true }],
                required: [field('spreadsheetId', 'Spreadsheet ID')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(openSection()).toBe('Recommended — you provide these');
    });

    it('opens on the AI’s work to review when nothing is missing', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                aiFilled: [{ ...field('range', 'Range'), hasValue: true }],
                required: [{ ...field('spreadsheetId', 'Spreadsheet ID'), hasValue: true }],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(openSection()).toBe('AI built — review these');
    });

    it('opens a collapsed section when its header is clicked', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID')],
                // `required: false` is what makes it genuinely optional — a field flagged
                // required is Recommended whichever bucket the server filed it under.
                optional: [{ ...field('apiKey', 'API Key'), required: false }],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText('API Key')).toBeNull();
        fireEvent.click(screen.getByText('Optional'));
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    /**
     * A question the plan did not classify is a field the node's chosen operation does not
     * use — the server returns `activeFields` only. Those belong in Optional: available, not
     * needed. They used to get a fourth section of their own, which made the card's shape
     * depend on the operation and, when a plan came back empty, became the bucket that
     * quietly swallowed every field on the node.
     */
    it('puts a field the operation does not use into Optional, not a section of its own', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                required: [field('spreadsheetId', 'Spreadsheet ID')],
                optional: [field('range', 'Range')],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);

        expect(screen.queryByText('Not used by this operation')).toBeNull();
        expect(screen.queryByText('API Key')).toBeNull();
        fireEvent.click(screen.getByText('Optional'));
        // apiKey is in no plan group at all, yet it is reachable under Optional.
        expect(screen.getByText('API Key')).toBeTruthy();
    });

    /**
     * The grouping rule, stated as a test.
     *
     * Sections follow whether a field HAS a value, not how it was meant to be filled. A field
     * build-time AI was supposed to fill but left empty is exactly the one a user would
     * otherwise miss, so it belongs under Recommended where they will act on it — not under
     * "AI built" beside values that really were produced.
     */
    it('files an AI field the AI actually filled under AI built', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                aiFilled: [
                    { ...field('range', 'Range'), hasValue: true, fillMode: 'buildtime_ai_once' },
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(openSection()).toBe('AI built — review these');
        expect(screen.getByText('Range')).toBeTruthy();
    });

    it('files an AI field the AI left empty under Recommended', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                aiFilled: [
                    { ...field('range', 'Range'), hasValue: false, fillMode: 'buildtime_ai_once' },
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        // Asserted via the open section: the label also appears in the card's
        // "still needed" banner, which is the same fact stated twice.
        expect(openSection()).toBe('Recommended — you provide these');
    });

    it('leaves a runtime-AI field under AI built even with no value yet', () => {
        // Empty by design — the value arrives at run time, so it is not the user's to supply.
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
            fieldPlan: planWith({
                aiRuntime: [
                    { ...field('range', 'Range'), hasValue: false, fillMode: 'runtime_ai' },
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(openSection()).toBe('AI built — review these');
    });

    /**
     * The defect that produced "0, 0, 0 plus a fourth bucket holding everything": the plan
     * could not resolve the node, returned empty groups, and the card said nothing about it
     * while the endpoint had returned a diagnostic naming the cause.
     */
    it('reports a node the plan could not analyse instead of showing empty sections', () => {
        const plan = planWith({}) as never as { nodes: Array<Record<string, unknown>> };
        plan.nodes[0].unresolvedNodeType = 'custom';
        plan.nodes[0].diagnostics = ['Unknown node type "custom" — not in the registry.'];

        const ctx = buildCtx({ nodesInOrder: [threeFieldGroup], fieldPlan: plan as never });
        render(<FieldOwnershipStage ctx={ctx} />);

        const notice = screen.getByTestId('node-plan-diagnostic');
        expect(notice.textContent).toContain('custom');
        // No confident empty headings above an error that contradicts them.
        expect(screen.queryByText('AI built — review these')).toBeNull();
        // The fields are still listed, so the step is not a dead end.
        expect(screen.getByText('Spreadsheet ID')).toBeTruthy();
    });

    /**
     * The regression that cost the three sections in the field.
     *
     * `diagnostics` also carries informational notes — `generated_runtime_contract` means the
     * node declared no explicit operation contract so one was derived, which describes a
     * perfectly healthy node. Gating the error state on `diagnostics.length` made those nodes
     * render as failures and fall back to a flat list, so a working Form Trigger showed
     * "This step could not be analysed" and lost its categories.
     */
    it('keeps the three sections for a healthy node that carries an informational diagnostic', () => {
        const plan = planWith({
            required: [field('spreadsheetId', 'Spreadsheet ID')],
        }) as never as { nodes: Array<Record<string, unknown>> };
        plan.nodes[0].diagnostics = ['generated_runtime_contract'];

        const ctx = buildCtx({ nodesInOrder: [threeFieldGroup], fieldPlan: plan as never });
        render(<FieldOwnershipStage ctx={ctx} />);

        expect(screen.queryByTestId('node-plan-diagnostic')).toBeNull();
        for (const heading of SECTIONS) expect(screen.getByText(heading)).toBeTruthy();
    });

    it('explains where a templated value comes from', () => {
        const ctx = buildCtx({
            nodesInOrder: [threeFieldGroup],
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
            nodesInOrder: [threeFieldGroup],
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
            nodesInOrder: [threeFieldGroup],
            nodeConnections: [
                { nodeType: 'google_sheets', nodeLabel: 'Google Sheets', connected: true },
            ] as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.queryByText(/— connect/)).toBeNull();
    });
});

describe('NodeOwnershipCard — operation-driven status', () => {
    const planFor = (
        groups: Record<string, Array<Record<string, unknown>>>,
        operation = 'send',
    ) => ({
        nodes: [
            {
                nodeId: 'node1',
                nodeType: 'google_sheets',
                nodeLabel: 'Google Sheets',
                operation,
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

    const req = (fieldName: string, label: string, hasValue: boolean) => ({
        fieldName,
        label,
        required: true,
        hasValue,
        fillMode: 'manual_static',
    });

    it('names the step and the operation it is set to', () => {
        const ctx = buildCtx({ fieldPlan: planFor({}, 'appendRow') as never });
        const { container } = render(<FieldOwnershipStage ctx={ctx} />);
        // The label also appears in the rail and as each row's node prefix, so this asserts
        // the card's heading specifically — with one node on screen it is the user's sole
        // "where am I".
        const card = container.querySelector('#fo-card-node1') as HTMLElement;
        expect(card.querySelector('p.text-base')?.textContent).toBe('Google Sheets');
        expect(within(card).getByText(/google_sheets · appendRow/)).toBeTruthy();
    });

    it('names the fields the chosen operation still needs', () => {
        const ctx = buildCtx({
            nodesInOrder: [
                makeGroup({
                    fields: [
                        makeQuestion({ id: 'q1', fieldName: 'spreadsheetId', text: 'Spreadsheet ID' }),
                        makeQuestion({ id: 'q2', fieldName: 'range', text: 'Range' }),
                    ],
                }),
            ],
            fieldPlan: planFor({
                required: [
                    req('spreadsheetId', 'Spreadsheet ID', false),
                    req('range', 'Range', true),
                ],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        const notice = screen.getByTestId('node-missing-required');
        expect(notice.textContent).toContain('Spreadsheet ID');
        expect(notice.textContent).not.toContain('Range');
    });

    it('confirms a step that has everything its operation needs', () => {
        const ctx = buildCtx({
            fieldPlan: planFor({
                required: [req('spreadsheetId', 'Spreadsheet ID', true)],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByTestId('node-ready-notice')).toBeTruthy();
        expect(screen.queryByTestId('node-missing-required')).toBeNull();
    });

    it('does not hold a step back for a credential or a runtime-AI field', () => {
        // Secrets are injected at execution time and never live in the workflow JSON, so a
        // credential's `hasValue` is false even when the account is connected. Runtime-AI
        // fields are empty by design. Counting either would make the node permanently unready.
        const ctx = buildCtx({
            fieldPlan: planFor({
                credential: [req('apiKey', 'API Key', false)],
                aiRuntime: [req('range', 'Range', false)],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByTestId('node-ready-notice')).toBeTruthy();
    });

    it('counts a required field the AI failed to fill as still missing', () => {
        // Routed to `aiFilled` by fill mode, but required and empty is required and empty.
        const ctx = buildCtx({
            fieldPlan: planFor({
                aiFilled: [{ ...req('spreadsheetId', 'Spreadsheet ID', false), fillMode: 'buildtime_ai_once' }],
            }) as never,
        });
        render(<FieldOwnershipStage ctx={ctx} />);
        expect(screen.getByTestId('node-missing-required').textContent).toContain('Spreadsheet ID');
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
