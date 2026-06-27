export type FieldFillMode = 'manual_static' | 'buildtime_ai_once' | 'runtime_ai';
export type FieldOwnershipClass = 'structural' | 'value' | 'credential';

export interface FieldOwnershipPolicy {
    fillMode: FieldFillMode;
    mode: 'user' | 'ai_built' | 'ai_runtime';
    ownership: FieldOwnershipClass;
    supportsRuntimeAI: boolean;
    supportsBuildtimeAI: boolean;
    isVaultCredential: boolean;
    isLocked: boolean;
}

export type LegacyFieldOwnershipMap = Record<string, Record<string, FieldFillMode>>;
export type FieldOwnershipPolicyMap = Record<string, Record<string, FieldOwnershipPolicy>>;

function isFillMode(value: unknown): value is FieldFillMode {
    return value === 'manual_static' || value === 'buildtime_ai_once' || value === 'runtime_ai';
}

function legacyPolicy(mode: unknown): FieldOwnershipPolicy {
    const fillMode = isFillMode(mode) ? mode : 'manual_static';
    return {
        fillMode,
        mode: fillMode === 'runtime_ai' ? 'ai_runtime' : fillMode === 'buildtime_ai_once' ? 'ai_built' : 'user',
        ownership: 'value',
        supportsRuntimeAI: fillMode === 'runtime_ai',
        supportsBuildtimeAI: fillMode !== 'manual_static',
        isVaultCredential: false,
        isLocked: false,
    };
}

function isPolicy(value: unknown): value is FieldOwnershipPolicy {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<FieldOwnershipPolicy>;
    return (
        isFillMode(candidate.fillMode) &&
        (candidate.ownership === 'structural' || candidate.ownership === 'value' || candidate.ownership === 'credential') &&
        typeof candidate.supportsRuntimeAI === 'boolean' &&
        typeof candidate.supportsBuildtimeAI === 'boolean' &&
        typeof candidate.isVaultCredential === 'boolean' &&
        typeof candidate.isLocked === 'boolean'
    );
}

export function normalizeFieldOwnershipPolicyMap(
    legacyMap?: Record<string, Record<string, unknown>>,
    policyMap?: Record<string, Record<string, unknown>>,
): FieldOwnershipPolicyMap {
    const normalized: FieldOwnershipPolicyMap = {};
    const nodeIds = new Set([
        ...Object.keys(legacyMap || {}),
        ...Object.keys(policyMap || {}),
    ]);

    for (const nodeId of nodeIds) {
        const fields = new Set([
            ...Object.keys(legacyMap?.[nodeId] || {}),
            ...Object.keys(policyMap?.[nodeId] || {}),
        ]);
        if (fields.size === 0) continue;
        normalized[nodeId] = {};
        for (const fieldName of fields) {
            const rich = policyMap?.[nodeId]?.[fieldName];
            normalized[nodeId][fieldName] = isPolicy(rich)
                ? rich
                : legacyPolicy(legacyMap?.[nodeId]?.[fieldName]);
        }
    }
    return normalized;
}

function fieldLabel(fieldName: string): string {
    return fieldName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
}

export function applyFieldOwnershipPoliciesToQuestions(
    questions: any[],
    legacyMap?: Record<string, Record<string, unknown>>,
    policyMap?: Record<string, Record<string, unknown>>,
): any[] {
    const normalized = normalizeFieldOwnershipPolicyMap(legacyMap, policyMap);
    return (Array.isArray(questions) ? questions : []).map((question) => {
        const policy = normalized[String(question?.nodeId || '')]?.[String(question?.fieldName || '')];
        if (!policy) return question;
        return {
            ...question,
            fillModeDefault: policy.fillMode,
            effectiveFillMode: policy.fillMode,
            supportsRuntimeAI: policy.supportsRuntimeAI,
            supportsBuildtimeAI: policy.supportsBuildtimeAI,
            ownershipClass: policy.ownership,
            ownershipUiMode: policy.isLocked ? 'locked' : 'selectable',
            isVaultCredential: policy.isVaultCredential,
        };
    });
}

export function synthesizeFieldOwnershipQuestions(
    nodes: any[],
    legacyMap?: Record<string, Record<string, unknown>>,
    policyMap?: Record<string, Record<string, unknown>>,
): any[] {
    const normalized = normalizeFieldOwnershipPolicyMap(legacyMap, policyMap);
    const nodeMap = new Map<string, any>();
    for (const node of Array.isArray(nodes) ? nodes : []) {
        if (node?.id) nodeMap.set(String(node.id), node);
    }

    const questions: any[] = [];
    let askOrder = 1;
    for (const [nodeId, fields] of Object.entries(normalized)) {
        const node = nodeMap.get(nodeId);
        const nodeType = String(node?.data?.type || node?.type || nodeId);
        const nodeLabel = String(node?.data?.label || node?.data?.name || nodeType);
        for (const [fieldName, policy] of Object.entries(fields)) {
            const isCredential = policy.ownership === 'credential';
            const label = fieldLabel(fieldName);
            questions.push({
                questionType: isCredential ? 'credential' : 'input',
                id: `fom_${nodeId}_${fieldName}`,
                nodeId,
                nodeType,
                nodeLabel,
                fieldName,
                label,
                text: label,
                type: isCredential ? 'password' : 'text',
                category: isCredential ? 'credential' : 'configuration',
                ownershipClass: policy.ownership,
                required: false,
                askOrder: askOrder++,
                fillModeDefault: policy.fillMode,
                effectiveFillMode: policy.fillMode,
                supportsRuntimeAI: policy.supportsRuntimeAI,
                supportsBuildtimeAI: policy.supportsBuildtimeAI,
                ownershipUiMode: policy.isLocked ? 'locked' : 'selectable',
                isVaultCredential: policy.isVaultCredential,
            });
        }
    }
    return questions;
}
