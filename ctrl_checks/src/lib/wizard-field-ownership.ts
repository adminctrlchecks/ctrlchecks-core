import { findFieldDocField } from '@/lib/field-doc-resolver';
import { snapshotConfigFieldToString } from '@/lib/wizard-config-snapshot';

export type FieldDesc = {
    what: string;
    setupSummary?: string;
    you: string;
    aiBuild: string;
    aiRun: string;
    example: string;
    actionableExample?: {
        value: unknown;
        displayValue?: string;
        canApply?: boolean;
        applyMode?: 'buildtime_ai_once';
        reason?: string;
        source?: 'ai_field_guidance' | 'deterministic_field_guidance';
    };
    needed?: string;
    bestOwner?: string;
    dataImpact?: string;
    offBehavior?: string;
    emptyBehavior?: string;
    defaultBehaviorLabel?: string;
    recommendedOwner?: 'You' | 'AI Build' | 'AI Runtime';
    ownerReason?: string;
    validationConfidence?: 'high' | 'medium' | 'low';
    warnings?: string[];
    safeValueSuggestion?: string;
};

/* -------------------------------------------------------------------------- */
/* Row key + state helpers                                                     */
/*                                                                             */
/* Lifted out of the field-ownership JSX in Phase 0b. These were inline        */
/* expressions repeated across the block; the bodies are unchanged, so naming  */
/* them changes nothing about what renders. Keeping the key formats in one     */
/* place matters because they are the same keys `handleBuild` forwards to      */
/* attach-inputs (`mode_*`, `unlock_*`).                                       */
/* -------------------------------------------------------------------------- */

type QuestionLike = Record<string, unknown>;

const idPart = (question: QuestionLike, key: 'nodeId' | 'fieldName') => String(question?.[key] ?? '');

/** `mode_<nodeId>_<fieldName>` — the fill-mode key, also an attach-inputs key. */
export function resolveFieldModeKey(question: QuestionLike): string {
    return `mode_${idPart(question, 'nodeId')}_${idPart(question, 'fieldName')}`;
}

/** `unlock_<nodeId>_<fieldName>` — credential unlock key, also an attach-inputs key. */
export function resolveFieldUnlockKey(question: QuestionLike): string {
    return `unlock_${idPart(question, 'nodeId')}_${idPart(question, 'fieldName')}`;
}

/** `fieldEnabled_<nodeId>_<fieldName>` — UI-only per-row on/off toggle. */
export function resolveFieldEnabledKey(question: QuestionLike): string {
    return `fieldEnabled_${idPart(question, 'nodeId')}_${idPart(question, 'fieldName')}`;
}

/** `fieldhelp_<nodeId>_<fieldName>` — UI-only help-panel expansion key. */
export function resolveFieldHelpKey(question: QuestionLike): string {
    return `fieldhelp_${idPart(question, 'nodeId')}_${idPart(question, 'fieldName')}`;
}

/** `<nodeId>_<fieldName>` — key for applied-example bookkeeping. */
export function resolveAppliedExampleKey(question: QuestionLike): string {
    return `${idPart(question, 'nodeId')}_${idPart(question, 'fieldName')}`;
}

/**
 * A row is locked when the question says so and the user has not unlocked it
 * (only unlockable credentials can be unlocked).
 */
export function isOwnershipRowLocked(
    question: QuestionLike,
    isCredentialUnlocked: (q: QuestionLike) => boolean
): boolean {
    return (
        question?.ownershipUiMode === 'locked' &&
        !(question?.isUnlockableCredential && isCredentialUnlocked(question))
    );
}

/** Whether a row's on/off toggle reads as on, honouring the user's override. */
export function isOwnershipRowEnabled(
    question: QuestionLike,
    fieldEnabledOverrides: Record<string, boolean>
): boolean {
    const key = resolveFieldEnabledKey(question);
    if (fieldEnabledOverrides[key] !== undefined) return fieldEnabledOverrides[key];
    return !!(question?.aiFilledAtBuildTime || question?.aiUsesRuntime);
}

/** Owner chip text for a resolved fill mode. */
export function resolveOwnerLabel(selectedMode: string): 'You' | 'AI Build' | 'AI Runtime' {
    if (selectedMode === 'manual_static') return 'You';
    if (selectedMode === 'buildtime_ai_once') return 'AI Build';
    return 'AI Runtime';
}

/**
 * The value preview for a row: the live workflow snapshot if there is one,
 * otherwise the question's default, otherwise empty.
 */
export function resolveWorkflowPreviewText(
    valueSnapshot: unknown,
    question: QuestionLike
): string {
    const fromNodeSnapshot = snapshotConfigFieldToString(valueSnapshot);
    if (fromNodeSnapshot && String(fromNodeSnapshot).trim() !== '') return fromNodeSnapshot;
    const fromQuestionDefault =
        question?.defaultValue !== undefined && question?.defaultValue !== null
            ? snapshotConfigFieldToString(question.defaultValue)
            : '';
    if (fromQuestionDefault && String(fromQuestionDefault).trim() !== '') return fromQuestionDefault;
    return '';
}

/* -------------------------------------------------------------------------- */
/* Inline value editing (Phase 4)                                              */
/*                                                                             */
/* ⚠️ THE KEY CONTRACT — plan §6a-2 calls this the single highest-risk detail   */
/* in the project. Inline editing MUST write into `inputValues` /              */
/* `credentialValues` under the SAME question-ID keys the (now-deleted)        */
/* configuration step used, because `handleBuild` forwards those maps verbatim */
/* to /attach-inputs and /attach-credentials.                                  */
/*                                                                             */
/* A different scheme (e.g. `nodeId::fieldName`) still type-checks and the UI  */
/* still looks correct, but the workflow saves with NONE of the user's values. */
/* Every write goes through resolveFieldValueKey + resolveFieldValueTarget so  */
/* there is exactly one place this can be wrong, and it is asserted by         */
/* fieldRowKeyContract.test.tsx.                                               */
/* -------------------------------------------------------------------------- */

/** The map key for a question's value. Mirrors `const questionKey = question.id`. */
export function resolveFieldValueKey(question: QuestionLike): string {
    return String(question?.id ?? '');
}

/**
 * Which map a question's value belongs in. Mirrors the configuration step's
 * `isCredVaultQ = question.category === 'credential' && question.isVaultCredential`.
 */
export function resolveFieldValueTarget(question: QuestionLike): 'credential' | 'input' {
    return question?.category === 'credential' && question?.isVaultCredential
        ? 'credential'
        : 'input';
}

/**
 * The control's displayed value: the stored answer, else the question default, else ''.
 * Mirrors the configuration step's `textControlledValue`.
 */
export function resolveFieldControlValue(
    question: QuestionLike,
    inputValues: Record<string, string>,
    credentialValues: Record<string, string>
): string {
    const key = resolveFieldValueKey(question);
    const raw =
        resolveFieldValueTarget(question) === 'credential'
            ? credentialValues[key]
            : inputValues[key];
    if (raw !== undefined && raw !== null) return String(raw);
    if (question?.defaultValue !== undefined && question?.defaultValue !== null) {
        return String(question.defaultValue);
    }
    return '';
}

export type FieldControlKind = 'select' | 'textarea' | 'number' | 'password' | 'text';

/**
 * Which control a question renders. Mirrors the configuration step's branching exactly:
 * select when typed select or options exist; textarea for textarea/json; otherwise an
 * input whose HTML type is number / password / text.
 */
export function resolveFieldControlKind(question: QuestionLike): FieldControlKind {
    const options = question?.options as unknown[] | undefined;
    if (question?.type === 'select' || (Array.isArray(options) && options.length > 0)) {
        return 'select';
    }
    if (question?.type === 'textarea' || question?.fieldType === 'textarea' || question?.type === 'json') {
        return 'textarea';
    }
    if (question?.type === 'number') return 'number';
    if (question?.type === 'password') return 'password';
    return 'text';
}

/** True when a JSON-typed field's current text does not parse. */
export function jsonFieldParseError(question: QuestionLike, value: string): string | null {
    if (question?.type !== 'json') return null;
    const trimmed = String(value ?? '').trim();
    if (trimmed === '') return null;
    try {
        JSON.parse(trimmed);
        return null;
    } catch {
        return 'This needs to be valid JSON.';
    }
}

/* -------------------------------------------------------------------------- */
/* Node checklist rail (Phase 1)                                               */
/* -------------------------------------------------------------------------- */

export type RailNodeStatus = 'waiting' | 'needs-input' | 'ready';

export interface RailEntry {
    key: string;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: RailNodeStatus;
    /** Fields still needing a value; 0 when the node is ready. */
    outstanding: number;
}

interface RailNodeGroup {
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    fields: QuestionLike[];
}

export interface BuildRailEntriesInput {
    sections: Array<{ key: string; groups: RailNodeGroup[] }>;
    fieldEnabledOverrides: Record<string, boolean>;
    effectiveModesByKey: Record<string, string>;
    fillModeValues: Record<string, string>;
    isCredentialUnlocked: (question: QuestionLike) => boolean;
    /** Resolves the live workflow value for a row, or '' when there is none. */
    resolveRowValue: (question: QuestionLike) => string;
}

/**
 * A row is satisfied when it is locked (nothing for the user to do), switched off
 * (deliberately skipped), owned by AI, or already carries a value.
 */
function isRailRowSatisfied(question: QuestionLike, input: BuildRailEntriesInput): boolean {
    if (isOwnershipRowLocked(question, input.isCredentialUnlocked)) return true;
    if (!isOwnershipRowEnabled(question, input.fieldEnabledOverrides)) return true;

    const modeKey = resolveFieldModeKey(question);
    const mode = input.effectiveModesByKey[modeKey] || input.fillModeValues[modeKey];
    if (mode === 'runtime_ai' || mode === 'buildtime_ai_once') return true;

    return input.resolveRowValue(question).trim() !== '';
}

/**
 * Per-node status for the field-ownership left rail.
 *
 * Per plan §6a/G9 this returns node identity and status only — no per-group counts.
 * Grouping arrives in Phase 3; building counts before then means building them twice.
 * The vocabulary is a placeholder that Phase 7b replaces with real run status.
 */
export function buildRailEntries(input: BuildRailEntriesInput): RailEntry[] {
    return input.sections.flatMap((section) =>
        section.groups.map((group) => {
            const outstanding = group.fields.filter((q) => !isRailRowSatisfied(q, input)).length;
            const anyEnabled = group.fields.some((q) =>
                isOwnershipRowEnabled(q, input.fieldEnabledOverrides)
            );
            const status: RailNodeStatus =
                outstanding > 0 ? 'needs-input' : anyEnabled ? 'ready' : 'waiting';
            return {
                key: `${section.key}_${group.nodeId}`,
                nodeId: group.nodeId,
                nodeLabel: group.nodeLabel,
                nodeType: group.nodeType,
                status,
                outstanding,
            };
        })
    );
}

export function humanizeFieldName(fieldName: string): string {
    return String(fieldName || 'this field')
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^./, (c) => c.toUpperCase());
}

export function findFieldDocForQuestion(question: Record<string, any>): any | null {
    const nodeType = String(question.nodeType || '').trim();
    const fieldName = String(question.fieldName || '').trim();
    if (!nodeType || !fieldName) return null;
    return findFieldDocField({
        nodeType,
        fieldKey: fieldName,
        operation: question.operation || question.action || question.operationValue,
        resource: question.resource,
        config: question.config || question.nodeConfig || {
            operation: question.operation || question.action || question.operationValue,
            resource: question.resource,
        },
    });
}

function buildDeterministicFieldExample(question: Record<string, any>, fieldDoc: any | null): string {
    const raw =
        question.exampleValue ??
        question.example ??
        fieldDoc?.example ??
        fieldDoc?.placeholder ??
        question.defaultValue ??
        fieldDoc?.defaultValue;
    const value = raw === undefined || raw === null ? '' : String(raw).trim();
    if (value) return `Example: ${value}`;
    const fieldName = String(question.fieldName || '');
    if (/spreadsheet/i.test(fieldName)) return 'Example: use the ID between /d/ and /edit in the Google Sheet URL.';
    if (/sheet.*name|tab/i.test(fieldName)) return 'Example: Sheet1 or Leads.';
    if (/range/i.test(fieldName)) return 'Example: A1:D100 reads columns A through D.';
    if (/operation|action/i.test(fieldName)) return 'Example: choose read when the workflow needs existing data.';
    return 'Example: set the value that matches the workflow you are building.';
}

function normalizeSummarySentence(value: unknown): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : `${text}.`;
}

function stripConditionLead(value: string): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^if\s+(?:this\s+)?(?:field\s+)?(?:is\s+)?(?:enabled\s+but\s+)?empty,?\s*/i, '')
        .replace(/^if\s+empty,?\s*/i, '')
        .replace(/^if\s+(?:this\s+)?(?:field\s+)?(?:is\s+)?off,?\s*/i, '')
        .trim();
}

function lowerFirst(value: string): string {
    if (!value) return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
}

function buildFallbackSetupSummary(args: {
    what: string;
    requiredText: string;
    emptyBehavior: string;
    recommendedOwner: 'You' | 'AI Build' | 'AI Runtime';
    ownerReason: string;
    actionableExample?: FieldDesc['actionableExample'];
}) {
    const sentences: string[] = [];
    const seen = new Set<string>();
    const push = (value: unknown) => {
        const sentence = normalizeSummarySentence(value);
        const key = sentence.toLowerCase();
        if (!sentence || seen.has(key)) return;
        seen.add(key);
        sentences.push(sentence);
    };

    push(args.what);
    const emptyText = stripConditionLead(args.emptyBehavior);
    push(emptyText ? `${args.requiredText} When no value is set, ${lowerFirst(emptyText)}` : args.requiredText);
    push(`Recommended owner: ${args.recommendedOwner}. ${args.ownerReason}`);
    if (args.actionableExample?.canApply) {
        push('A safe suggested value is available below and can be applied as AI Build.');
    } else if (args.actionableExample?.reason && !/no safe typed example/i.test(args.actionableExample.reason)) {
        push(args.actionableExample.reason);
    }

    return sentences.slice(0, 4).join(' ');
}

export function buildFieldOwnershipCopy(
    question: Record<string, any>,
    aiFieldDesc: FieldDesc | null,
    opts: {
        selectedMode?: string;
        fieldEnabled?: boolean;
        locked?: boolean;
    } = {}
) {
    const label = String(question.text || question.label || humanizeFieldName(question.fieldName || ''));
    const fieldName = String(question.fieldName || '').trim();
    const fieldDoc = findFieldDocForQuestion(question);
    const humanField = humanizeFieldName(fieldName).toLowerCase();
    const fieldPurpose = String(
        fieldDoc?.description || question.helpText || question.description || ''
    ).trim();
    const what =
        aiFieldDesc?.what ||
        (fieldPurpose
            ? fieldPurpose
            : `${label} controls the ${humanField} input for this step.`);
    const example = aiFieldDesc?.example || buildDeterministicFieldExample(question, fieldDoc);
    const you =
        aiFieldDesc?.you ||
        `You provide this value manually and it stays fixed for every run — right for a specific ${humanField} that won't change.`;
    const aiBuild =
        aiFieldDesc?.aiBuild && aiFieldDesc.aiBuild !== 'N/A' && aiFieldDesc.aiBuild !== 'Not available for this field.'
            ? aiFieldDesc.aiBuild
            : `AI will determine this ${humanField} once during workflow setup, then reuse it on every run.`;
    const aiRun =
        aiFieldDesc?.aiRun && aiFieldDesc.aiRun !== 'N/A' && aiFieldDesc.aiRun !== 'Not available for this field.'
            ? aiFieldDesc.aiRun
            : `AI will decide this ${humanField} fresh on every run from the live data flowing through the workflow.`;
    const emptyBehavior =
        aiFieldDesc?.emptyBehavior ||
        (question.required === false
            ? `If empty, this optional ${humanField} setting is skipped unless this workflow specifically needs it.`
            : `If empty, this step may fail because ${humanField} is required before the workflow can run.`);
    const offBehavior =
        aiFieldDesc?.offBehavior ||
        (question.required === false
            ? `If off, this ${humanField} input is not included in setup. ${emptyBehavior}`
            : `If off, this step will still need ${humanField} before the workflow can run.`);
    const toggleOff = offBehavior;
    const requiredText = aiFieldDesc?.needed || (
        question.required === false
            ? `Leave this off only if this workflow does not need a custom ${humanField}.`
            : `Toggle this on and enter the value. This field is required for the step to work.`
    );
    const dataImpact = aiFieldDesc?.dataImpact || (
        opts.fieldEnabled === false
            ? `Because it is off, this input will not shape how this step handles data yet.`
            : `When enabled, this input changes how this step reads, filters, writes, or prepares data for the next step.`
    );
    const recommendedOwner = aiFieldDesc?.recommendedOwner || (opts.selectedMode === 'runtime_ai' ? 'AI Runtime' : opts.selectedMode === 'buildtime_ai_once' ? 'AI Build' : 'You');
    const ownerReason = aiFieldDesc?.ownerReason || 'This recommendation follows the field type, selected operation, and available AI ownership modes.';
    const setupSummary = aiFieldDesc?.setupSummary || buildFallbackSetupSummary({
        what,
        requiredText,
        emptyBehavior,
        recommendedOwner,
        ownerReason,
        actionableExample: aiFieldDesc?.actionableExample,
    });
    return {
        what,
        setupSummary,
        you,
        aiBuild,
        aiRun,
        example,
        toggleOff,
        requiredText,
        dataImpact,
        offBehavior,
        emptyBehavior,
        defaultBehaviorLabel: aiFieldDesc?.defaultBehaviorLabel || (question.required === false ? 'Optional setting skipped' : 'Required value'),
        recommendedOwner,
        ownerReason,
        validationConfidence: aiFieldDesc?.validationConfidence || 'medium',
        warnings: Array.isArray(aiFieldDesc?.warnings) ? aiFieldDesc.warnings : [],
        safeValueSuggestion: aiFieldDesc?.safeValueSuggestion,
    };
}
