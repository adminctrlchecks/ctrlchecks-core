/**
 * CapabilityReviewStep layout and content.
 *
 * The review order is intentional:
 * selected workflow nodes -> workflow summary.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CapabilityReviewStep } from '../CapabilityReviewStep';

vi.mock('framer-motion', () => ({
    motion: new Proxy(
        {},
        {
            get:
                () =>
                ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) => (
                    <div {...(rest as Record<string, never>)}>{children}</div>
                ),
        },
    ),
}));

const STRUCTURED_PROMPT = [
    'WORKFLOW: Retrieve spreadsheet data on demand',
    '',
    'TRIGGER:',
    'The workflow starts when an operator manually runs it.',
    '',
    'FLOW:',
    'Manual Trigger sends metadata to Google Sheets.',
    '',
    'CONNECTIONS:',
    'The manual trigger passes execution metadata downstream.',
].join('\n');

function node(id: string, label: string, description = `${label} description`) {
    return { id, type: id, data: { type: id, label, description } };
}

function renderStep(nodes: ReturnType<typeof node>[]) {
    const utils = render(
        <CapabilityReviewStep
            structuralPrompt={STRUCTURED_PROMPT}
            workflow={{ nodes }}
            selections={{ 'c-1': 'manual_trigger', 'c-2': 'google_sheets' }}
            onConfirm={vi.fn()}
            onBack={vi.fn()}
        />,
    );
    return { ...utils, root: utils.container.firstElementChild as HTMLElement };
}

function reviewCard(title: string) {
    return screen.getByText(title).closest('div[class*="border-border/80"]') as HTMLElement;
}

describe('CapabilityReviewStep space usage', () => {
    it('does not cap itself to a narrow centred column', () => {
        const { root } = renderStep([node('manual_trigger', 'Manual Trigger')]);
        expect(root.className).not.toMatch(/max-w-3xl/);
        expect(root.className).toContain('w-full');
    });

    it('stacks selected nodes before the summary without a duplicate execution section', () => {
        const { root } = renderStep([
            node('manual_trigger', 'Manual Trigger'),
            node('google_sheets', 'Google Sheets'),
        ]);
        expect(root.innerHTML).not.toMatch(/lg:grid-cols-\[/);

        const selected = reviewCard('Selected workflow nodes');
        const summary = reviewCard('Workflow summary');

        expect(selected.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.queryByText('Execution steps')).toBeNull();
    });

    it('does not trap the summary in its own scrollbox', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        const summary = reviewCard('Workflow summary');
        expect(summary.className).not.toMatch(/overflow-y-auto/);
        expect(summary.className).not.toMatch(/max-h-/);
    });

    it('keeps every selected node visible as the node count grows', () => {
        const many = Array.from({ length: 14 }, (_, i) => node(`n${i}`, `Node ${i + 1}`));
        renderStep(many);
        for (const n of many) {
            expect(screen.getAllByText(n.data.label).length).toBeGreaterThan(0);
        }
    });

    it('shows the selected node count so a long list is legible at a glance', () => {
        renderStep(Array.from({ length: 9 }, (_, i) => node(`n${i}`, `Node ${i + 1}`)));
        expect(screen.getByText('9 nodes selected')).toBeTruthy();
    });

    it('uses the singular form for a one-step workflow', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        expect(screen.getByText('1 node selected')).toBeTruthy();
    });
});

describe('CapabilityReviewStep content', () => {
    it('renders the parsed summary sections as points', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        expect(screen.getByText('Goal')).toBeTruthy();
        expect(screen.getByText('Trigger')).toBeTruthy();
        expect(screen.getByText('Flow')).toBeTruthy();
        expect(screen.getByText('Connections')).toBeTruthy();
        expect(screen.getAllByText(/Retrieve spreadsheet data on demand/).length).toBeGreaterThan(0);
    });

    it('renders selected workflow nodes from selected containers', () => {
        render(
            <CapabilityReviewStep
                structuralPrompt={STRUCTURED_PROMPT}
                workflow={{ nodes: [node('manual_trigger', 'Manual Trigger')] }}
                selections={{ c1: 'manual_trigger' }}
                containers={[
                    {
                        containerId: 'c1',
                        label: 'Collect payment form',
                        useCaseUnit: {
                            unitId: 'u1',
                            label: 'Collect payment details',
                            description: 'Capture the payment status and amount before routing.',
                            semanticRole: 'trigger',
                            orderIndex: 0,
                        },
                        candidates: [
                            {
                                nodeType: 'manual_trigger',
                                label: 'Form Trigger',
                                description: 'Starts when a form is submitted.',
                                credentialRequirements: [],
                                credentialRequired: false,
                                hasCredentials: true,
                            },
                        ],
                    },
                ]}
                onConfirm={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        expect(screen.getByText('Form Trigger')).toBeTruthy();
        expect(screen.getByText('Collect payment details')).toBeTruthy();
        expect(screen.getByText('Capture the payment status and amount before routing.')).toBeTruthy();
    });

    it('numbers the selected nodes in execution order', () => {
        const { container } = renderStep([
            node('manual_trigger', 'Manual Trigger'),
            node('google_sheets', 'Google Sheets'),
        ]);
        const selectedCard = reviewCard('Selected workflow nodes');
        expect(within(selectedCard).getByText('1')).toBeTruthy();
        expect(within(selectedCard).getByText('2')).toBeTruthy();
        expect(container.textContent).toContain('Manual Trigger');
    });

    it('falls back to raw text when the prompt is not structured', () => {
        render(
            <CapabilityReviewStep
                structuralPrompt="Just a plain sentence about the workflow."
                workflow={{ nodes: [] }}
                selections={{}}
                onConfirm={vi.fn()}
                onBack={vi.fn()}
            />,
        );
        expect(screen.getByText(/Just a plain sentence about the workflow./)).toBeTruthy();
    });
});
