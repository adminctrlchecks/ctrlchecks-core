/**
 * NodeTestAction (Phase 7b) — the UI half of the consent gate.
 *
 * ⚠️ The button behind this really sends emails and posts messages. These tests pin that
 * the first click never claims consent, and that failures render as guidance rather than
 * as errors.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeTestAction } from '../NodeTestAction';
import type { RunNodeResult } from '@/lib/api/workflowBuildRunNode';

function result(overrides: Partial<RunNodeResult> = {}): RunNodeResult {
    return {
        buildId: 'b1',
        nodeId: 'n1',
        status: 'passed',
        firstRunClass: 'read',
        executionCount: 1,
        ...overrides,
    };
}

describe('consent — the first click asks, it does not send', () => {
    it('calls onRun with consented=false when nothing has run yet', () => {
        const onRun = vi.fn();
        render(<NodeTestAction nodeType="slack" running={false} onRun={onRun} />);
        fireEvent.click(screen.getByTestId('test-step-button'));
        expect(onRun).toHaveBeenCalledWith(false);
    });

    it('shows the consent copy naming the real effect', () => {
        render(
            <NodeTestAction
                nodeType="slack"
                running={false}
                onRun={vi.fn()}
                result={result({
                    status: 'awaiting_consent',
                    firstRunClass: 'write',
                    consentPrompt: 'Runs Post to Slack for real to #alerts. This is not a rehearsal.',
                })}
            />
        );
        const prompt = screen.getByTestId('consent-prompt');
        expect(prompt.textContent).toContain('#alerts');
        expect(prompt.textContent).toMatch(/not a rehearsal/i);
    });

    it('only sends consented=true after the user agrees', () => {
        const onRun = vi.fn();
        render(
            <NodeTestAction
                nodeType="slack"
                running={false}
                onRun={onRun}
                result={result({
                    status: 'awaiting_consent',
                    firstRunClass: 'write',
                    consentPrompt: 'Runs it for real.',
                })}
            />
        );
        expect(screen.getByTestId('test-step-button').textContent).toMatch(/run it for real/i);
        fireEvent.click(screen.getByTestId('test-step-button'));
        expect(onRun).toHaveBeenCalledWith(true);
    });

    it('styles a destructive confirmation more strongly', () => {
        render(
            <NodeTestAction
                nodeType="db"
                running={false}
                onRun={vi.fn()}
                result={result({
                    status: 'awaiting_consent',
                    firstRunClass: 'destructive',
                    requiresStrongConfirmation: true,
                    consentPrompt: 'This cannot be undone.',
                })}
            />
        );
        expect(screen.getByTestId('consent-prompt').className).toContain('red');
    });

    it('disables the button while running, blocking a double-click', () => {
        const onRun = vi.fn();
        render(<NodeTestAction nodeType="slack" running onRun={onRun} />);
        const button = screen.getByTestId('test-step-button');
        expect(button.hasAttribute('disabled')).toBe(true);
        fireEvent.click(button);
        expect(onRun).not.toHaveBeenCalled();
    });
});

describe('badges — honest per trigger (G8)', () => {
    it('says Verified for a normal node', () => {
        render(
            <NodeTestAction nodeType="slack" running={false} onRun={vi.fn()} result={result()} />
        );
        expect(screen.getByTestId('run-badge').textContent).toContain('Verified');
    });

    it('never claims a schedule trigger is Verified', () => {
        render(
            <NodeTestAction nodeType="schedule" running={false} onRun={vi.fn()} result={result()} />
        );
        const badge = screen.getByTestId('run-badge').textContent ?? '';
        expect(badge).toContain('Configured — fires on schedule');
        expect(badge).not.toContain('Verified');
    });
});

describe('guidance rendering (§2.2)', () => {
    const failed = result({
        status: 'needs_attention',
        firstRunClass: 'write',
        guidance: {
            headline: "That Slack channel couldn't be found.",
            why: 'Slack does not recognise this channel.',
            nextSteps: ['Check the channel name.', 'Invite the app to private channels.'],
            field: { nodeId: 'n1', fieldName: 'channel' },
            technicalDetail: 'SlackAPIError: channel_not_found at Object.<anonymous>',
            severity: 'needs_attention',
            source: 'provider',
        },
    });

    it('renders what happened, why, and what to do next', () => {
        render(<NodeTestAction nodeType="slack" running={false} onRun={vi.fn()} result={failed} />);
        expect(screen.getByText("That Slack channel couldn't be found.")).toBeTruthy();
        expect(screen.getByText('Slack does not recognise this channel.')).toBeTruthy();
        expect(screen.getByText('Check the channel name.')).toBeTruthy();
    });

    it('hides raw provider text behind a collapsed disclosure', () => {
        render(<NodeTestAction nodeType="slack" running={false} onRun={vi.fn()} result={failed} />);
        expect(screen.queryByText(/SlackAPIError/)).toBeNull();
        fireEvent.click(screen.getByText('Technical detail'));
        expect(screen.getByText(/SlackAPIError/)).toBeTruthy();
    });

    it('never shows the word "failed" to the user', () => {
        const { container } = render(
            <NodeTestAction nodeType="slack" running={false} onRun={vi.fn()} result={failed} />
        );
        expect(container.textContent?.toLowerCase()).not.toContain('failed');
    });
});

describe('fan-out note', () => {
    it('reports that only one record was used', () => {
        render(
            <NodeTestAction
                nodeType="google_sheets"
                running={false}
                onRun={vi.fn()}
                result={result({
                    samplingNote: 'Ran with 1 of 500 — the full set runs when you execute the workflow.',
                })}
            />
        );
        expect(screen.getByTestId('sampling-note').textContent).toContain('1 of 500');
    });

    it('shows nothing when nothing was capped', () => {
        render(
            <NodeTestAction nodeType="google_sheets" running={false} onRun={vi.fn()} result={result()} />
        );
        expect(screen.queryByTestId('sampling-note')).toBeNull();
    });
});
