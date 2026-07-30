/**
 * CapabilityReviewStep — layout and content.
 *
 * The screen must use the full width the wizard gives it, and must put the summary above
 * the step list rather than beside it. Side by side, the summary got half the width, which
 * turned a few sentences of prose into a tall narrow ribbon that needed its own inner
 * scrollbar to read; the step list is short rows and loses nothing by moving below.
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
        }
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

describe('CapabilityReviewStep — space usage', () => {
    it('does not cap itself to a narrow centred column', () => {
        const { root } = renderStep([node('manual_trigger', 'Manual Trigger')]);
        // The wizard controls the outer width; this component must not re-clamp inside it.
        expect(root.className).not.toMatch(/max-w-3xl/);
        expect(root.className).toContain('w-full');
    });

    it('stacks the summary above the step list instead of splitting the width', () => {
        const { root } = renderStep([
            node('manual_trigger', 'Manual Trigger'),
            node('google_sheets', 'Google Sheets'),
        ]);
        // No two-track grid anywhere: the summary must span the whole width.
        expect(root.innerHTML).not.toMatch(/lg:grid-cols-\[/);

        const summary = screen.getByText('Workflow summary').closest('div[class*="rounded"]')!;
        const steps = screen.getByText('Execution steps').closest('div[class*="rounded"]')!;
        // DOCUMENT_POSITION_FOLLOWING — the steps card comes after the summary in the DOM,
        // which with a plain block stack is also the visual order.
        expect(summary.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not trap the summary in its own scrollbox', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        const summary = screen.getByText('Workflow summary').closest('div[class*="rounded"]')!;
        // The height cap existed only to keep a sticky half-width column inside the viewport.
        expect(summary.className).not.toMatch(/overflow-y-auto/);
        expect(summary.className).not.toMatch(/max-h-/);
    });

    it('keeps every step visible as the node count grows', () => {
        const many = Array.from({ length: 14 }, (_, i) => node(`n${i}`, `Node ${i + 1}`));
        renderStep(many);
        for (const n of many) {
            expect(screen.getByText(n.data.label)).toBeTruthy();
        }
    });

    it('shows the step count so a long list is legible at a glance', () => {
        renderStep(Array.from({ length: 9 }, (_, i) => node(`n${i}`, `Node ${i + 1}`)));
        expect(screen.getByText('9 steps')).toBeTruthy();
    });

    it('uses the singular form for a one-step workflow', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        expect(screen.getByText('1 step')).toBeTruthy();
    });
});

describe('CapabilityReviewStep — content', () => {
    it('renders the parsed summary sections', () => {
        renderStep([node('manual_trigger', 'Manual Trigger')]);
        expect(screen.getByText('Trigger')).toBeTruthy();
        expect(screen.getByText('Flow')).toBeTruthy();
        expect(screen.getByText('Connections')).toBeTruthy();
        // getAllByText: the string also matches the containing card, not just the <p>.
        expect(screen.getAllByText(/Retrieve spreadsheet data on demand/).length).toBeGreaterThan(0);
    });

    it('numbers the steps in execution order', () => {
        const { container } = renderStep([
            node('manual_trigger', 'Manual Trigger'),
            node('google_sheets', 'Google Sheets'),
        ]);
        const stepsCard = screen.getByText('Execution steps').closest('div[class*="rounded"]');
        expect(stepsCard).not.toBeNull();
        expect(within(stepsCard as HTMLElement).getByText('1')).toBeTruthy();
        expect(within(stepsCard as HTMLElement).getByText('2')).toBeTruthy();
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
