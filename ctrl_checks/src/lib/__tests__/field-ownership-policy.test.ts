import { describe, expect, it } from 'vitest';
import {
    applyFieldOwnershipPoliciesToQuestions,
    normalizeFieldOwnershipPolicyMap,
    synthesizeFieldOwnershipQuestions,
} from '../field-ownership-policy';

const policyMap = {
    node_1: {
        rules: {
            fillMode: 'buildtime_ai_once' as const,
            mode: 'ai_built' as const,
            ownership: 'structural' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
            isVaultCredential: false,
            isLocked: false,
        },
        destination: {
            fillMode: 'manual_static' as const,
            mode: 'user' as const,
            ownership: 'value' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: false,
            isVaultCredential: false,
            isLocked: false,
        },
    },
};

describe('field ownership policy adapter', () => {
    it('prefers rich policy over a conflicting legacy mode', () => {
        const normalized = normalizeFieldOwnershipPolicyMap(
            { node_1: { rules: 'runtime_ai' } },
            policyMap,
        );

        expect(normalized.node_1.rules.fillMode).toBe('buildtime_ai_once');
        expect(normalized.node_1.rules.supportsRuntimeAI).toBe(false);
    });

    it('synthesizes rows without field-name or React Flow type inference', () => {
        const rows = synthesizeFieldOwnershipQuestions(
            [{ id: 'node_1', type: 'custom', data: { type: 'generic_branch', label: 'Branch' } }],
            undefined,
            policyMap,
        );

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            nodeType: 'generic_branch',
            fieldName: 'rules',
            fillModeDefault: 'buildtime_ai_once',
            supportsRuntimeAI: false,
            category: 'configuration',
        });
        expect(rows[1]).toMatchObject({
            fieldName: 'destination',
            ownershipClass: 'value',
            isVaultCredential: false,
        });
    });

    it('overrides stale comprehensive-question capability guesses', () => {
        const rows = applyFieldOwnershipPoliciesToQuestions(
            [{ nodeId: 'node_1', fieldName: 'rules', supportsRuntimeAI: true }],
            undefined,
            policyMap,
        );

        expect(rows[0]).toMatchObject({
            fillModeDefault: 'buildtime_ai_once',
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
            ownershipClass: 'structural',
        });
    });
});
