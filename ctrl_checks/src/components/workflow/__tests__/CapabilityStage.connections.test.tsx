/**
 * CapabilityStage — connection chip, in-wizard connect panel, and Continue gating.
 *
 * Locks in the contract: the chip distinguishes "nothing to connect" from "connected", it is
 * actionable whenever a credential is missing (including when no provider resolved), and
 * Continue is gated on every *selected* node — never on candidates the user did not pick.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CapabilityStage } from '../CapabilityStage';
import { fetchCapabilityConnectionReadiness } from '@/lib/api/capabilityConnectionReadiness';
import { fetchCapabilityConnectionStatus } from '@/lib/api/capabilityConnectionStatus';
import type { CapabilityContainer } from '@/types/capability-selection';

vi.mock('@/lib/api/capabilityConnectionReadiness', () => ({
    fetchCapabilityConnectionReadiness: vi.fn(),
}));

vi.mock('@/lib/api/capabilityConnectionStatus', () => ({
    fetchCapabilityConnectionStatus: vi.fn(),
}));

// OAuth + credential-type plumbing has its own tests; here we only care which path the chip
// takes. `outcome` is what useNodeConnect would report for the next connect() call.
const connectMock = vi.fn();

vi.mock('@/hooks/useNodeConnect', () => ({
    useNodeConnect: () => ({
        connect: connectMock,
        credentialTypesLoading: false,
    }),
}));

// The API-key form composes components/connections/*; we only assert that it opens.
vi.mock('../NodeConnectFormDialog', () => ({
    NodeConnectFormDialog: ({
        open,
        serviceLabel,
        provider,
        credentialType,
        onConnected,
    }: {
        open: boolean;
        serviceLabel: string;
        provider: string;
        credentialType: unknown;
        onConnected: () => void;
    }) =>
        open ? (
            <div
                data-testid="connect-form"
                data-provider={provider}
                data-has-credential-type={String(credentialType !== null)}
            >
                <span>Connect {serviceLabel}</span>
                <button type="button" onClick={onConnected}>
                    simulate-connected
                </button>
            </div>
        ) : null,
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
}));

const mockedReadiness = vi.mocked(fetchCapabilityConnectionReadiness);
const mockedStatus = vi.mocked(fetchCapabilityConnectionStatus);

interface CandidateSpec {
    nodeType: string;
    label: string;
    /** Does this node need a credential at all? Independent of whether one exists. */
    requiresCredential: boolean;
    /** Cheap provider-level vault check from the grouper. */
    hasCredentials: boolean;
    providers?: string[];
    /** Simulates a worker that predates `credentialRequired`. */
    omitCredentialRequired?: boolean;
}

function container(
    id: string,
    label: string,
    candidates: CandidateSpec[],
    semanticRole: 'trigger' | 'output' = 'output',
    orderIndex = 0,
): CapabilityContainer {
    return {
        containerId: id,
        label,
        useCaseUnit: {
            unitId: `${id}-unit`,
            label,
            semanticRole,
            description: `${label} description`,
            orderIndex,
        },
        candidates: candidates.map((c) => ({
            nodeType: c.nodeType,
            label: c.label,
            description: `${c.label} description`,
            // Deliberately ALWAYS empty — this mirrors production, where google_sheets,
            // airtable and slack_message all report `[]` despite needing a credential.
            // Nothing may derive "needs a credential" from this array.
            credentialRequirements: [],
            ...(c.omitCredentialRequired ? {} : { credentialRequired: c.requiresCredential }),
            credentialProviders: c.providers,
            hasCredentials: c.hasCredentials,
        })),
    };
}

const TRIGGER = container(
    'c-trigger',
    'Start the workflow',
    [{ nodeType: 'manual_trigger', label: 'Manual Trigger', requiresCredential: false, hasCredentials: true }],
    'trigger',
    0,
);

const SLACK = container(
    'c-post',
    'Post a message',
    [
        { nodeType: 'slack', label: 'Slack', requiresCredential: true, hasCredentials: false, providers: ['slack'] },
        { nodeType: 'discord', label: 'Discord', requiresCredential: true, hasCredentials: false, providers: ['discord'] },
    ],
    'output',
    1,
);

function chips() {
    return screen.getAllByTestId('node-connection-chip');
}

function chipFor(label: string) {
    // The chip sits in the same row as the candidate label.
    const row = screen.getByText(label).closest('[role="button"]');
    if (!row) throw new Error(`no candidate row for ${label}`);
    return within(row as HTMLElement).getByTestId('node-connection-chip');
}

function continueButton() {
    return screen.getByRole('button', { name: /Continue/ });
}

/**
 * Wait for the up-front connection check to land, then return the chip.
 *
 * Credential-requiring chips render a brief "Checking…" on first paint rather than flashing
 * "Connect" and correcting themselves a moment later, so assertions about the settled state
 * have to wait for it.
 */
async function settledChip(label: string) {
    await waitFor(() =>
        expect(chipFor(label).getAttribute('data-status')).not.toBe('checking'),
    );
    return chipFor(label);
}

beforeEach(() => {
    vi.clearAllMocks();
    connectMock.mockResolvedValue({ kind: 'connected' });
    mockedReadiness.mockResolvedValue({ ready: true, nodes: [], blocking: [] });
    // Default: the live check knows nothing, so chips fall through to the candidate payload.
    // Tests that care about the live layer override this.
    mockedStatus.mockResolvedValue({ nodes: [] });
});

describe('CapabilityStage — connection chip states', () => {
    it('shows "No setup needed" for a node that requires no credential', () => {
        render(<CapabilityStage containers={[TRIGGER]} onComplete={vi.fn()} />);
        const chip = chipFor('Manual Trigger');
        expect(chip.getAttribute('data-status')).toBe('not-required');
        expect(chip.textContent).toContain('No setup needed');
        // It must not claim a connection that does not exist.
        expect(chip.textContent).not.toContain('Connected');
    });

    it('offers an actionable Connect chip on an unconnected candidate', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        const chip = await settledChip('Slack');
        expect(chip.getAttribute('data-status')).toBe('needs-connection');
        expect(chip.tagName).toBe('BUTTON');
        expect(chip.textContent).toContain('Connect');
    });

    it('shows a connected chip when the cheap check reports a credential', async () => {
        const connected = container(
            'c-sheets',
            'Read a sheet',
            [{ nodeType: 'google_sheets', label: 'Google Sheets', requiresCredential: true, hasCredentials: true, providers: ['google'] }],
            'trigger',
            0,
        );
        render(<CapabilityStage containers={[connected]} onComplete={vi.fn()} />);
        const chip = await settledChip('Google Sheets');
        expect(chip.getAttribute('data-status')).toBe('connected');
        expect(chip.textContent).toContain('Connected');
    });

    it('never reports a credential-requiring node as "No setup needed"', async () => {
        // Regression: `credentialRequirements` is empty for google_sheets/airtable in
        // production, so deriving the state from its length rendered them as needing no
        // setup — the screen offered no way to connect Google at all.
        const sheets = container(
            'c-sheets',
            'Fetch data',
            [
                { nodeType: 'google_sheets', label: 'Google Sheets', requiresCredential: true, hasCredentials: false, providers: ['google'] },
                { nodeType: 'airtable', label: 'Airtable', requiresCredential: true, hasCredentials: false, providers: ['airtable'] },
            ],
            'trigger',
            0,
        );
        render(<CapabilityStage containers={[sheets]} onComplete={vi.fn()} />);

        for (const label of ['Google Sheets', 'Airtable']) {
            const chip = await settledChip(label);
            expect(chip.textContent).not.toContain('No setup needed');
            expect(chip.getAttribute('data-status')).toBe('needs-connection');
            expect(chip.textContent).toContain('Connect');
        }
    });

    it('falls back to provider presence when the worker omits credentialRequired', async () => {
        const legacy = container(
            'c-legacy',
            'Fetch data',
            [{ nodeType: 'google_sheets', label: 'Google Sheets', requiresCredential: true, hasCredentials: false, providers: ['google'], omitCredentialRequired: true }],
            'trigger',
            0,
        );
        render(<CapabilityStage containers={[legacy]} onComplete={vi.fn()} />);
        expect((await settledChip('Google Sheets')).getAttribute('data-status')).toBe('needs-connection');
    });

    it('shows a connecting state while an OAuth popup is open', async () => {
        // Never resolves — the popup is still open.
        connectMock.mockImplementation(() => new Promise(() => {}));
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        fireEvent.click(await settledChip('Slack'));

        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('connecting'),
        );
    });
});

describe('CapabilityStage — up-front connection status', () => {
    it('checks every candidate on screen, not just the selected ones', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        await waitFor(() => expect(mockedStatus).toHaveBeenCalled());
        expect(mockedStatus).toHaveBeenCalledWith(['discord', 'manual_trigger', 'slack']);
        // The scope-aware endpoint must still be untouched — it can refresh OAuth tokens.
        expect(mockedReadiness).not.toHaveBeenCalled();
    });

    it('shows an already-connected service as connected on first paint', async () => {
        // The whole point: the user connected Slack weeks ago, so the screen must not ask
        // them to connect it again. `hasCredentials: false` here is the stale generation-time
        // value that this check exists to override.
        mockedStatus.mockResolvedValue({
            nodes: [
                { nodeType: 'slack', nodeLabel: 'Slack', credentialRequired: true, connected: true, provider: 'slack' },
                { nodeType: 'discord', nodeLabel: 'Discord', credentialRequired: true, connected: false, provider: 'discord' },
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', credentialRequired: false, connected: true },
            ],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('connected'),
        );
        expect(chipFor('Discord').getAttribute('data-status')).toBe('needs-connection');
        expect(chipFor('Manual Trigger').getAttribute('data-status')).toBe('not-required');
    });

    it('lets the scope-aware readiness answer override the live check', async () => {
        // Presence says connected; scope-aware readiness disagrees. Readiness must win, or
        // Continue would enable on a credential the gate will reject.
        mockedStatus.mockResolvedValue({
            nodes: [
                { nodeType: 'slack', nodeLabel: 'Slack', credentialRequired: true, connected: true, provider: 'slack' },
            ],
        });
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                { nodeType: 'slack', nodeLabel: 'Slack', connected: false, credentialRequired: true, provider: 'slack', status: 'missing_scope' },
            ],
            blocking: ['slack'],
        });

        render(<CapabilityStage containers={[SLACK]} onComplete={vi.fn()} />);
        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('connected'),
        );

        fireEvent.click(screen.getByText('Slack'));

        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('needs-connection'),
        );
        expect(continueButton().hasAttribute('disabled')).toBe(true);
    });

    it('does not block Continue on a node the live check says is connected', async () => {
        mockedStatus.mockResolvedValue({
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', credentialRequired: false, connected: true },
            ],
        });
        // Readiness has not answered yet — the gate must use the live check, not the stale
        // `hasCredentials`, or Continue would stay disabled on an already-connected node.
        mockedReadiness.mockImplementation(() => new Promise(() => {}));

        render(<CapabilityStage containers={[TRIGGER]} onComplete={vi.fn()} />);
        await waitFor(() => expect(mockedStatus).toHaveBeenCalled());

        expect(
            screen.queryByTestId('connection-gate-notice'),
        ).toBeNull();
    });

    it('re-checks every candidate after a connection is made', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(1));

        fireEvent.click(await settledChip('Slack'));

        await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(2));
    });
});

describe('CapabilityStage — connecting from the chip', () => {
    it('starts OAuth directly from the chip with no intermediate panel', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        fireEvent.click(await settledChip('Slack'));

        await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));
        expect(connectMock.mock.calls[0][0]).toMatchObject({
            nodeType: 'slack',
            provider: 'slack',
        });
        // The whole point: nothing opens for an OAuth provider.
        expect(screen.queryByTestId('connect-form')).toBeNull();
    });

    it('never narrows the OAuth grant by requesting per-node scopes', async () => {
        // The backend treats `scopes` as a REPLACEMENT for the credential type's registered
        // defaults, not an addition. Sending google_sheets' single `.../auth/spreadsheets`
        // scope dropped every default the OAuth client is registered for, and Google rejected
        // the whole request with a generic "Something went wrong" page.
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        fireEvent.click(await settledChip('Slack'));

        await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));
        expect(connectMock.mock.calls[0][0]).not.toHaveProperty('requiredScopes');
        expect(connectMock.mock.calls[0][0]).not.toHaveProperty('scopes');
    });

    it('re-runs readiness once OAuth completes', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Slack'));
        await waitFor(() => expect(mockedReadiness).toHaveBeenCalledTimes(1));

        fireEvent.click(await settledChip('Slack'));

        await waitFor(() => expect(mockedReadiness).toHaveBeenCalledTimes(2));
    });

    it('turns the chip green after connecting a node that is not selected', async () => {
        // Regression: readiness was only queried for *selected* nodes, so connecting before
        // selecting left the chip on the stale server-side `hasCredentials: false` — showing
        // "Connect" forever even though the connection had saved successfully.
        mockedReadiness.mockResolvedValue({
            ready: true,
            nodes: [
                { nodeType: 'slack', nodeLabel: 'Slack', connected: true, credentialRequired: true, provider: 'slack' },
            ],
            blocking: [],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        expect((await settledChip('Slack')).getAttribute('data-status')).toBe('needs-connection');
        expect(mockedReadiness).not.toHaveBeenCalled();

        // Connect without selecting anything — "0 of 2 selected".
        fireEvent.click(await settledChip('Slack'));

        await waitFor(() => expect(mockedReadiness).toHaveBeenCalledWith(['slack']));
        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('connected'),
        );
    });

    it('keeps asking about a connected node after the user then selects others', async () => {
        mockedReadiness.mockResolvedValue({ ready: true, nodes: [], blocking: [] });
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        fireEvent.click(await settledChip('Slack'));
        await waitFor(() => expect(mockedReadiness).toHaveBeenCalledWith(['slack']));

        fireEvent.click(screen.getByText('Manual Trigger'));

        await waitFor(() =>
            expect(mockedReadiness).toHaveBeenLastCalledWith(['manual_trigger', 'slack']),
        );
    });

    it('opens the form dialog only for a provider that needs typed input', async () => {
        connectMock.mockResolvedValue({
            kind: 'needs-form',
            credentialType: { id: 'ct-1', provider: 'slack', authType: 'api_key', displayName: 'Slack API Key' },
        });
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);

        fireEvent.click(await settledChip('Slack'));

        const form = await screen.findByTestId('connect-form');
        expect(form.getAttribute('data-provider')).toBe('slack');
        expect(form.getAttribute('data-has-credential-type')).toBe('true');
    });

    it('offers the Connections fallback when no credential type maps to the provider', async () => {
        // Previously an inert "Not connected" badge — a dead end with nothing to click.
        connectMock.mockResolvedValue({ kind: 'unsupported' });
        const providerless = container(
            'c-mystery',
            'Do the thing',
            [{ nodeType: 'mystery_node', label: 'Mystery Node', requiresCredential: true, hasCredentials: false }],
            'trigger',
            0,
        );
        render(<CapabilityStage containers={[providerless]} onComplete={vi.fn()} />);

        const chip = await settledChip('Mystery Node');
        expect(chip.tagName).toBe('BUTTON');
        fireEvent.click(chip);

        const form = await screen.findByTestId('connect-form');
        expect(form.getAttribute('data-has-credential-type')).toBe('false');
    });

    it('turns green when the popup could not confirm but the connection did save', async () => {
        // The success message travels on a same-origin channel, so it is lost whenever the
        // OAuth callback completes on another origin — which is the case for every provider
        // whose redirect URI points at a different deployment. The connection saves anyway,
        // so the screen must verify rather than report a failure.
        connectMock.mockResolvedValue({ kind: 'unverified', message: 'Connection cancelled' });
        mockedStatus
            .mockResolvedValueOnce({ nodes: [] }) // initial paint
            .mockResolvedValue({
                nodes: [
                    { nodeType: 'slack', nodeLabel: 'Slack', credentialRequired: true, connected: true, provider: 'slack' },
                ],
            });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(await settledChip('Slack'));

        await waitFor(
            () => expect(chipFor('Slack').getAttribute('data-status')).toBe('connected'),
            { timeout: 8000 },
        );
        // Reporting a failure for a connection that actually succeeded is the bug being fixed.
        expect(screen.queryByTestId('connect-error')).toBeNull();
    });

    it('reports a failure only once verification agrees it did not connect', async () => {
        vi.useFakeTimers();
        try {
            connectMock.mockResolvedValue({ kind: 'unverified', message: 'Connection cancelled' });
            mockedStatus.mockResolvedValue({
                nodes: [
                    { nodeType: 'slack', nodeLabel: 'Slack', credentialRequired: true, connected: false, provider: 'slack' },
                ],
            });

            render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
            await vi.advanceTimersByTimeAsync(50);
            fireEvent.click(chipFor('Slack'));
            await vi.advanceTimersByTimeAsync(50);

            // Still verifying — nothing claimed yet.
            expect(screen.queryByTestId('connect-error')).toBeNull();

            // Past the verification window, the failure is finally fair to report.
            await vi.advanceTimersByTimeAsync(125_000);
            expect(screen.queryByTestId('connect-error')?.textContent).toContain(
                'Connection cancelled',
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it('stops polling once the connection is verified', async () => {
        vi.useFakeTimers();
        try {
            connectMock.mockResolvedValue({ kind: 'unverified', message: 'Connection cancelled' });
            mockedStatus.mockResolvedValue({
                nodes: [
                    { nodeType: 'slack', nodeLabel: 'Slack', credentialRequired: true, connected: true, provider: 'slack' },
                ],
            });

            render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
            await vi.advanceTimersByTimeAsync(50);
            fireEvent.click(chipFor('Slack'));
            await vi.advanceTimersByTimeAsync(5_000);

            const callsOnceVerified = mockedStatus.mock.calls.length;
            await vi.advanceTimersByTimeAsync(30_000);
            // A poll that never stops would keep hitting the endpoint for the whole session.
            // Allow the focus/nonce-driven refetches, but no further polling growth.
            expect(mockedStatus.mock.calls.length).toBe(callsOnceVerified);
        } finally {
            vi.useRealTimers();
        }
    });

    it('re-checks connections when the user returns to the tab', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        await waitFor(() => expect(mockedStatus).toHaveBeenCalledTimes(1));

        // Connecting on the /connections page in another tab must be picked up on return.
        fireEvent.focus(window);

        await waitFor(() => expect(mockedStatus.mock.calls.length).toBeGreaterThan(1));
    });

    it('does not select the candidate when the connect chip is clicked', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        expect(screen.getByText('0 of 2 selected')).toBeTruthy();

        fireEvent.click(await settledChip('Slack'));
        await waitFor(() => expect(connectMock).toHaveBeenCalled());

        // Connecting is not choosing: the row must stay unselected.
        expect(screen.getByText('Slack').closest('[role="button"]')?.getAttribute('aria-pressed')).toBe('false');
        expect(screen.getByText('0 of 2 selected')).toBeTruthy();
    });
});

describe('CapabilityStage — Continue gating', () => {
    it('does not query readiness before anything is selected', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        expect(mockedReadiness).not.toHaveBeenCalled();
    });

    it('queries readiness only for the node types actually selected', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        await waitFor(() => expect(mockedReadiness).toHaveBeenCalled());
        expect(mockedReadiness).toHaveBeenLastCalledWith(['manual_trigger']);
        // Unselected Slack/Discord must not be sent -- that path can refresh OAuth tokens.
        expect(mockedReadiness.mock.calls.flat().flat()).not.toContain('slack');
    });

    it('blocks Continue while a selected node is unconnected, naming the service', async () => {
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true, credentialRequired: false },
                {
                    nodeType: 'slack',
                    nodeLabel: 'Slack',
                    connected: false,
                    credentialRequired: true,
                    provider: 'slack',
                    providerLabel: 'Slack',
                },
            ],
            blocking: ['slack'],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        fireEvent.click(screen.getByText('Slack'));

        const notice = await screen.findByTestId('connection-gate-notice');
        expect(within(notice).getByText(/One service still needs connecting/)).toBeTruthy();
        expect(continueButton().hasAttribute('disabled')).toBe(true);
    });

    it('explains on the disabled Continue button why it is blocked', async () => {
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true, credentialRequired: false },
                {
                    nodeType: 'slack',
                    nodeLabel: 'Slack',
                    connected: false,
                    credentialRequired: true,
                    provider: 'slack',
                    providerLabel: 'Slack',
                },
            ],
            blocking: ['slack'],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        fireEvent.click(screen.getByText('Slack'));

        await waitFor(() => {
            expect(continueButton().getAttribute('title')).toBe(
                'Connect all selected nodes first — Slack',
            );
        });
        expect(continueButton().getAttribute('aria-disabled')).toBe('true');
    });

    it('enables Continue once every selected node is connected', async () => {
        mockedReadiness.mockResolvedValue({
            ready: true,
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true, credentialRequired: false },
                { nodeType: 'slack', nodeLabel: 'Slack', connected: true, credentialRequired: true, provider: 'slack' },
            ],
            blocking: [],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        fireEvent.click(screen.getByText('Slack'));

        await waitFor(() => expect(continueButton().hasAttribute('disabled')).toBe(false));
        expect(screen.queryByTestId('connection-gate-notice')).toBeNull();
        expect(continueButton().getAttribute('title')).toBeNull();
    });

    it('does not block on an unconnected candidate the user did not select', async () => {
        mockedReadiness.mockResolvedValue({
            ready: true,
            nodes: [{ nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true, credentialRequired: false }],
            blocking: [],
        });

        const onComplete = vi.fn();
        render(<CapabilityStage containers={[TRIGGER]} onComplete={onComplete} />);
        fireEvent.click(screen.getByText('Manual Trigger'));

        await waitFor(() => expect(continueButton().hasAttribute('disabled')).toBe(false));
        fireEvent.click(continueButton());
        expect(onComplete).toHaveBeenCalledWith({ 'c-trigger': 'manual_trigger' });
    });

    it('prefers the authoritative readiness answer over the cheap candidate check', async () => {
        // Candidate claims connected; scope-aware readiness disagrees. Readiness wins.
        const optimistic = container(
            'c-sheets',
            'Read a sheet',
            [{ nodeType: 'google_sheets', label: 'Google Sheets', requiresCredential: true, hasCredentials: true, providers: ['google'] }],
            'trigger',
            0,
        );
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                {
                    nodeType: 'google_sheets',
                    nodeLabel: 'Google Sheets',
                    connected: false,
                    credentialRequired: true,
                    provider: 'google',
                    providerLabel: 'Google',
                    status: 'missing_scope',
                },
            ],
            blocking: ['google_sheets'],
        });

        render(<CapabilityStage containers={[optimistic]} onComplete={vi.fn()} />);
        expect((await settledChip('Google Sheets')).getAttribute('data-status')).toBe('connected');

        fireEvent.click(screen.getByText('Google Sheets'));

        await screen.findByTestId('connection-gate-notice');
        expect(continueButton().hasAttribute('disabled')).toBe(true);
        expect(chipFor('Google Sheets').getAttribute('data-status')).toBe('needs-connection');
    });

    it('treats a readiness node without credentialRequired as gated when a provider is present', async () => {
        // Worker deployed behind the frontend: the field is absent, but the node is clearly
        // gated because readiness resolved a provider for it. Must not read as "no setup".
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                { nodeType: 'slack', nodeLabel: 'Slack', connected: false, provider: 'slack', providerLabel: 'Slack' },
            ],
            blocking: ['slack'],
        });

        render(<CapabilityStage containers={[SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Slack'));

        await waitFor(() =>
            expect(chipFor('Slack').getAttribute('data-status')).toBe('needs-connection'),
        );
    });
});

describe('CapabilityStage — same node type in several containers', () => {
    // A workflow that posts to Slack on two branches offers the same node type twice.
    const BRANCH_A = container(
        'c-pending',
        'Send pending reminder',
        [{ nodeType: 'slack', label: 'Slack', requiresCredential: true, hasCredentials: false, providers: ['slack'] }],
        'output',
        1,
    );
    const BRANCH_B = container(
        'c-failed',
        'Send failure alert',
        [{ nodeType: 'slack', label: 'Slack', requiresCredential: true, hasCredentials: false, providers: ['slack'] }],
        'output',
        2,
    );

    it('names the service once, not once per container', async () => {
        mockedReadiness.mockResolvedValue({
            ready: false,
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true, credentialRequired: false },
                { nodeType: 'slack', nodeLabel: 'Slack', connected: false, credentialRequired: true, provider: 'slack', providerLabel: 'Slack' },
            ],
            blocking: ['slack'],
        });

        // A trigger is required for the gate notice to render at all — without a complete
        // selection the screen shows the "needs a trigger" message instead.
        render(<CapabilityStage containers={[TRIGGER, BRANCH_A, BRANCH_B]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        fireEvent.click(screen.getAllByText('Slack')[0]);
        fireEvent.click(screen.getAllByText('Slack')[1]);

        const notice = await screen.findByTestId('connection-gate-notice');
        // Previously rendered "2 services still need connecting — Slack, Slack".
        expect(within(notice).getByText(/One service still needs connecting/)).toBeTruthy();
    });

    it('spins only the chip that was clicked', async () => {
        connectMock.mockImplementation(() => new Promise(() => {}));
        render(<CapabilityStage containers={[BRANCH_A, BRANCH_B]} onComplete={vi.fn()} />);

        await waitFor(() =>
            expect(chips().every((c) => c.getAttribute('data-status') !== 'checking')).toBe(true),
        );
        fireEvent.click(chips()[0]);

        await waitFor(() =>
            expect(chips().filter((c) => c.getAttribute('data-status') === 'connecting').length).toBe(1),
        );
    });
});

describe('CapabilityStage — independent column scrolling', () => {
    // Both columns used to share the wizard's page scroller, so scrolling the candidate list
    // dragged the checklist off-screen with it. jsdom does no layout, so the contract we can
    // hold onto here is that each column declares itself a scrollport of bounded height.
    const panes = () => [
        screen.getByTestId('capability-steps-pane'),
        screen.getByTestId('capability-candidates-pane'),
    ];

    it('gives each column its own scrollport', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        for (const pane of panes()) {
            expect(pane.className).toMatch(/lg:overflow-y-auto/);
        }
    });

    it('takes its height from the parent flex chain, not a viewport guess', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        for (const pane of panes()) {
            // A `calc(100vh - …)` cap cannot account for the wizard's Intent Context card,
            // whose height is the user's own prompt — guessing left the page a second
            // scrollbar and dead space below the fold.
            expect(pane.className).not.toMatch(/100vh/);
            expect(pane.className).toMatch(/lg:h-full/);
            // Without min-h-0 a flex child refuses to shrink below its content.
            expect(pane.className).toMatch(/lg:min-h-0/);
        }
    });

    it('takes exactly the leftover height so the stage cannot overflow', () => {
        const { container: dom } = render(
            <CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />,
        );
        const grid = dom.querySelector('.grid')!;
        // Grows into spare space...
        expect(grid.className).toMatch(/lg:flex-1/);
        // ...and shrinks to fit. A `min-h` floor here overflows the root when it binds, and
        // an overflowing child escapes the root's bottom padding — which put the last
        // candidate card underneath the fixed action bar.
        expect(grid.className).toMatch(/lg:min-h-0/);
        expect(grid.className).not.toMatch(/lg:min-h-\[/);
    });

    it('does not let a column scroll sideways', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        for (const pane of panes()) {
            // `overflow-y: auto` makes a `visible` x-axis compute to `auto`, so without this
            // each column grew a horizontal scrollbar of its own.
            expect(pane.className).toMatch(/lg:overflow-x-hidden/);
        }
    });

    it('lets a column that has hit its end carry the wheel on into the page', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        for (const pane of panes()) {
            // The page scroll is what slides the intent card away and hands the panes the
            // full window. Containing the scroll here left that height unreachable, because
            // by then the panes cover nearly everything the wheel could land on.
            expect(pane.className).not.toMatch(/overscroll-contain/);
        }
    });

    it('keeps Go Back and Continue pinned across the full viewport width', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        const bar = screen.getByRole('button', { name: /Continue/ }).closest('.fixed');
        expect(bar).not.toBeNull();
        // Full-bleed and pinned at every size — an in-flow bar scrolled out of reach as soon
        // as the intent card pushed the stage past the fold.
        expect(bar!.className).toMatch(/bottom-0/);
        expect(bar!.className).toMatch(/left-0/);
        expect(bar!.className).toMatch(/right-0/);
        expect(bar!.className).not.toMatch(/lg:static/);
    });

    it('reserves the pinned bar its own space so it never covers a card', () => {
        const { container: dom } = render(
            <CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />,
        );
        const root = dom.firstElementChild as HTMLElement;
        // Unconditional: the bar is fixed at every size, so the padding is needed at every
        // size. An `lg:pb-0` here put the last candidate card underneath it.
        expect(root.className).toMatch(/(^|\s)pb-20(\s|$)/);
        expect(root.className).not.toMatch(/lg:pb-0/);
    });

    it('does not pin the checklist with position:sticky any more', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        // Sticky was the workaround for the shared scroller; with its own scrollport the
        // checklist stays put on its own, and sticky would only fight the inner scroll.
        expect(screen.getByTestId('capability-steps-pane').className).not.toMatch(/sticky/);
    });
});

describe('CapabilityStage — chip layout stability', () => {
    it('renders one chip per candidate in every state', async () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        // 1 trigger + 2 messaging candidates.
        expect(chips().length).toBe(3);
        await settledChip('Slack');
        const statuses = chips().map((c) => c.getAttribute('data-status'));
        expect(statuses).toContain('not-required');
        expect(statuses).toContain('needs-connection');
    });
});
