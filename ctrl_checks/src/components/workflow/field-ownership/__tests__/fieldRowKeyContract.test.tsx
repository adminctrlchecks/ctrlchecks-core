/**
 * THE KEY CONTRACT (plan §6a-2) — the single highest-risk detail in this project.
 *
 * Inline editing must write into `inputValues` / `credentialValues` under the SAME
 * question-ID keys the configuration step used, because `handleBuild` forwards those
 * maps verbatim to /attach-inputs and /attach-credentials.
 *
 * A different scheme (e.g. `nodeId::fieldName`) still type-checks, and the UI still
 * looks correct — but the workflow saves with NONE of the user's values. These tests
 * are the guard, and they assert the negative as well as the positive.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldValueControl } from '../FieldValueControl';
import {
    resolveFieldControlKind,
    resolveFieldValueKey,
    resolveFieldValueTarget,
} from '@/lib/wizard-field-ownership';
import type { FieldOwnershipContext, OwnershipQuestion } from '../types';

class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver || ResizeObserverStub;

function question(overrides: Record<string, unknown> = {}): OwnershipQuestion {
    return {
        id: 'config_node1_spreadsheetId',
        nodeId: 'node1',
        nodeLabel: 'Google Sheets',
        nodeType: 'google_sheets',
        fieldName: 'spreadsheetId',
        text: 'Spreadsheet ID',
        category: 'input',
        type: 'text',
        ...overrides,
    };
}

/** Captures what the control writes, so the resulting key can be asserted exactly. */
function harness() {
    const inputWrites: Record<string, string>[] = [];
    const credentialWrites: Record<string, string>[] = [];
    const ctx = {
        inputValues: {},
        credentialValues: {},
        setInputValues: vi.fn((updater: (prev: Record<string, string>) => Record<string, string>) => {
            inputWrites.push(updater({}));
        }),
        setCredentialValues: vi.fn(
            (updater: (prev: Record<string, string>) => Record<string, string>) => {
                credentialWrites.push(updater({}));
            }
        ),
    } as unknown as FieldOwnershipContext;
    return { ctx, inputWrites, credentialWrites };
}

describe('key format — resolveFieldValueKey', () => {
    it('uses the question id verbatim, exactly as the configuration step did', () => {
        expect(resolveFieldValueKey(question({ id: 'config_node1_spreadsheetId' }))).toBe(
            'config_node1_spreadsheetId'
        );
        expect(resolveFieldValueKey(question({ id: 'op_node2_operation' }))).toBe('op_node2_operation');
        expect(resolveFieldValueKey(question({ id: 'cred_node3_apiKey' }))).toBe('cred_node3_apiKey');
    });

    it('never derives a key from nodeId + fieldName', () => {
        const key = resolveFieldValueKey(question({ id: 'config_node1_spreadsheetId' }));
        expect(key).not.toContain('::');
        expect(key).not.toBe('node1::spreadsheetId');
        expect(key).not.toBe('node1_spreadsheetId');
    });

    it('yields an empty key when the question has no id, so nothing is written', () => {
        expect(resolveFieldValueKey(question({ id: undefined }))).toBe('');
    });
});

describe('target map — resolveFieldValueTarget', () => {
    it('routes vault credentials to credentialValues', () => {
        expect(
            resolveFieldValueTarget(question({ category: 'credential', isVaultCredential: true }))
        ).toBe('credential');
    });

    it('routes everything else to inputValues', () => {
        expect(resolveFieldValueTarget(question())).toBe('input');
        // A credential question that is NOT vault-backed stays an input, matching
        // the configuration step's `category === 'credential' && isVaultCredential`.
        expect(resolveFieldValueTarget(question({ category: 'credential' }))).toBe('input');
    });
});

describe('FieldValueControl writes', () => {
    it('writes a text value under the question id, into inputValues', () => {
        const { ctx, inputWrites, credentialWrites } = harness();
        render(<FieldValueControl question={question()} ctx={ctx} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sheet-abc' } });

        expect(inputWrites).toEqual([{ config_node1_spreadsheetId: 'sheet-abc' }]);
        expect(credentialWrites).toEqual([]);
        expect(Object.keys(inputWrites[0])[0]).toMatch(/^(config_|op_|cred_|mode_|unlock_)/);
    });

    it('writes a vault credential under the question id, into credentialValues', () => {
        const { ctx, inputWrites, credentialWrites } = harness();
        render(
            <FieldValueControl
                question={question({
                    id: 'cred_node3_apiKey',
                    fieldName: 'apiKey',
                    category: 'credential',
                    isVaultCredential: true,
                    type: 'password',
                })}
                ctx={ctx}
            />
        );
        const input = document.querySelector('input[type="password"]') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'sk-secret' } });

        expect(credentialWrites).toEqual([{ cred_node3_apiKey: 'sk-secret' }]);
        expect(inputWrites).toEqual([]);
    });

    it('writes nothing when the question has no id', () => {
        const { ctx, inputWrites, credentialWrites } = harness();
        render(<FieldValueControl question={question({ id: undefined })} ctx={ctx} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        expect(inputWrites).toEqual([]);
        expect(credentialWrites).toEqual([]);
    });

    it('writes nothing while disabled', () => {
        const { ctx, inputWrites } = harness();
        render(<FieldValueControl question={question()} ctx={ctx} disabled />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        expect(inputWrites).toEqual([]);
    });
});

/* -------------------------------------------------------------------------- */
/* PARITY — every control the configuration step rendered                      */
/* -------------------------------------------------------------------------- */

describe('parity with the configuration step', () => {
    it('text -> text input', () => {
        expect(resolveFieldControlKind(question({ type: 'text' }))).toBe('text');
    });

    it('number -> number input', () => {
        expect(resolveFieldControlKind(question({ type: 'number' }))).toBe('number');
        const { ctx } = harness();
        render(<FieldValueControl question={question({ type: 'number' })} ctx={ctx} />);
        expect(screen.getByRole('spinbutton').getAttribute('type')).toBe('number');
    });

    it('password -> masked input, value never echoed as text', () => {
        expect(resolveFieldControlKind(question({ type: 'password' }))).toBe('password');
        const { ctx } = harness();
        render(<FieldValueControl question={question({ type: 'password' })} ctx={ctx} />);
        expect(document.querySelector('input[type="password"]')).toBeTruthy();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('textarea -> textarea', () => {
        expect(resolveFieldControlKind(question({ type: 'textarea' }))).toBe('textarea');
        expect(resolveFieldControlKind(question({ fieldType: 'textarea' }))).toBe('textarea');
    });

    it('json -> textarea', () => {
        expect(resolveFieldControlKind(question({ type: 'json' }))).toBe('textarea');
    });

    it('explicit select -> select', () => {
        expect(resolveFieldControlKind(question({ type: 'select' }))).toBe('select');
    });

    it('any question carrying options -> select, even when untyped', () => {
        expect(resolveFieldControlKind(question({ options: ['read', 'append'] }))).toBe('select');
    });

    it('renders a JSON field as an editable textarea that writes under the id', () => {
        const { ctx, inputWrites } = harness();
        render(
            <FieldValueControl
                question={question({ id: 'config_node1_payload', fieldName: 'payload', type: 'json' })}
                ctx={ctx}
            />
        );
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"a":1}' } });
        expect(inputWrites).toEqual([{ config_node1_payload: '{"a":1}' }]);
    });

    it('flags invalid JSON on blur, without blocking the write', () => {
        const { ctx } = harness();
        const q = question({ id: 'config_node1_payload', type: 'json' });
        const { rerender } = render(<FieldValueControl question={q} ctx={ctx} />);
        const box = screen.getByRole('textbox');
        fireEvent.change(box, { target: { value: '{oops' } });
        fireEvent.blur(box);
        rerender(
            <FieldValueControl
                question={q}
                ctx={{ ...ctx, inputValues: { config_node1_payload: '{oops' } } as FieldOwnershipContext}
            />
        );
        expect(screen.getByText('This needs to be valid JSON.')).toBeTruthy();
    });

    it('shows the stored value, falling back to the question default', () => {
        const { ctx } = harness();
        const { rerender } = render(
            <FieldValueControl question={question({ defaultValue: 'from-default' })} ctx={ctx} />
        );
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('from-default');

        rerender(
            <FieldValueControl
                question={question({ defaultValue: 'from-default' })}
                ctx={
                    {
                        ...ctx,
                        inputValues: { config_node1_spreadsheetId: 'from-user' },
                    } as FieldOwnershipContext
                }
            />
        );
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('from-user');
    });
});
