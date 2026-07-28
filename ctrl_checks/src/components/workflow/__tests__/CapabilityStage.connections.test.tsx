/**
 * CapabilityStage — inline connect + Continue gating (Phase 2).
 *
 * Locks in §2.4's contract: the badge is actionable when a service is not connected,
 * and Continue is gated on every *selected* node being connected — never on candidates
 * the user did not pick.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CapabilityStage } from '../CapabilityStage';
import { fetchCapabilityConnectionReadiness } from '@/lib/api/capabilityConnectionReadiness';
import type { CapabilityContainer } from '@/types/capability-selection';

vi.mock('@/lib/api/capabilityConnectionReadiness', () => ({
    fetchCapabilityConnectionReadiness: vi.fn(),
}));

// The connect affordance composes components/connections/* and pulls in OAuth + query
// plumbing; those have their own tests. Here we only care that it is offered.
vi.mock('../NodeConnectPopover', () => ({
    NodeConnectPopover: ({ serviceLabel }: { serviceLabel: string }) => (
        <button type="button" data-testid="connect-affordance">
            {serviceLabel} — connect
        </button>
    ),
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

function container(
    id: string,
    label: string,
    candidates: Array<{ nodeType: string; label: string; hasCredentials: boolean; providers?: string[] }>,
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
            credentialRequirements: c.hasCredentials ? [] : ['api_key'],
            credentialProviders: c.providers,
            hasCredentials: c.hasCredentials,
        })),
    };
}

const TRIGGER = container(
    'c-trigger',
    'Start the workflow',
    [{ nodeType: 'manual_trigger', label: 'Manual Trigger', hasCredentials: true }],
    'trigger',
    0,
);

const SLACK = container(
    'c-post',
    'Post a message',
    [
        { nodeType: 'slack', label: 'Slack', hasCredentials: false, providers: ['slack'] },
        { nodeType: 'discord', label: 'Discord', hasCredentials: false, providers: ['discord'] },
    ],
    'output',
    1,
);

beforeEach(() => {
    vi.clearAllMocks();
    mockedReadiness.mockResolvedValue({ ready: true, nodes: [], blocking: [] });
});

describe('CapabilityStage — connect affordance', () => {
    it('offers a connect action on an unconnected candidate', () => {
        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        const affordances = screen.getAllByTestId('connect-affordance');
        expect(affordances.length).toBe(2);
        expect(affordances.some((el) => el.textContent?.includes('Slack'))).toBe(true);
    });

    it('shows an inert Connected badge when the candidate needs nothing', () => {
        render(<CapabilityStage containers={[TRIGGER]} onComplete={vi.fn()} />);
        expect(screen.getByText('Connected')).toBeTruthy();
        expect(screen.queryByTestId('connect-affordance')).toBeNull();
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
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true },
                {
                    nodeType: 'slack',
                    nodeLabel: 'Slack',
                    connected: false,
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
        expect(within(notice).getByText(/Slack/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled')).toBe(true);
    });

    it('enables Continue once every selected node is connected', async () => {
        mockedReadiness.mockResolvedValue({
            ready: true,
            nodes: [
                { nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true },
                { nodeType: 'slack', nodeLabel: 'Slack', connected: true, provider: 'slack' },
            ],
            blocking: [],
        });

        render(<CapabilityStage containers={[TRIGGER, SLACK]} onComplete={vi.fn()} />);
        fireEvent.click(screen.getByText('Manual Trigger'));
        fireEvent.click(screen.getByText('Slack'));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled')).toBe(false)
        );
        expect(screen.queryByTestId('connection-gate-notice')).toBeNull();
    });

    it('does not block on an unconnected candidate the user did not select', async () => {
        // Slack is offered and unconnected, but only the trigger is chosen.
        mockedReadiness.mockResolvedValue({
            ready: true,
            nodes: [{ nodeType: 'manual_trigger', nodeLabel: 'Manual Trigger', connected: true }],
            blocking: [],
        });

        const onComplete = vi.fn();
        render(<CapabilityStage containers={[TRIGGER]} onComplete={onComplete} />);
        fireEvent.click(screen.getByText('Manual Trigger'));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled')).toBe(false)
        );
        fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
        expect(onComplete).toHaveBeenCalledWith({ 'c-trigger': 'manual_trigger' });
    });

    it('prefers the authoritative readiness answer over the candidate badge', async () => {
        // Candidate claims connected; scope-aware readiness disagrees. Readiness wins.
        const optimistic = container(
            'c-sheets',
            'Read a sheet',
            [{ nodeType: 'google_sheets', label: 'Google Sheets', hasCredentials: true, providers: ['google'] }],
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
                    provider: 'google',
                    providerLabel: 'Google',
                    status: 'missing_scope',
                },
            ],
            blocking: ['google_sheets'],
        });

        render(<CapabilityStage containers={[optimistic]} onComplete={vi.fn()} />);
        expect(screen.getByText('Connected')).toBeTruthy();

        fireEvent.click(screen.getByText('Google Sheets'));

        await screen.findByTestId('connection-gate-notice');
        expect(screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled')).toBe(true);
        expect(screen.getAllByTestId('connect-affordance').length).toBeGreaterThan(0);
    });
});
