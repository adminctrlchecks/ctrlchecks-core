import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { FieldDesc } from '@/lib/wizard-field-ownership';
import type { FieldPlan } from '@/lib/api/workflowBuildFieldPlan';
import type { CapabilityConnectionReadinessNode } from '@/lib/api/capabilityConnectionReadiness';
import type { RunNodeResult } from '@/lib/api/workflowBuildRunNode';

/**
 * Questions arrive from the field plane as loosely-typed records. The wizard has always
 * treated them as `any`; this alias keeps that reality visible instead of inventing a
 * shape the producer does not actually guarantee.
 */
export type OwnershipQuestion = any;

/** One node's questions, as produced by `groupQuestionsByNode` in the wizard. */
export interface NodeQuestionGroup {
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    fields: OwnershipQuestion[];
}

export type FillMode = 'manual_static' | 'runtime_ai' | 'buildtime_ai_once';

export interface NodeDescriptionState {
    loading: boolean;
    text: string | null;
    open: boolean;
}

export interface FieldDescriptionState {
    loading: boolean;
    data: Record<string, FieldDesc> | null;
}

export interface GlobalWalkState {
    currentNodeLabel: string;
    currentFieldLabel: string;
    currentFieldIdx: number;
    totalFields: number;
}

export interface OwnershipSectionStyles {
    cardClass: string;
    titleClass: string;
}

export interface AppliedGuidanceExample {
    nodeId: string;
    fieldName: string;
    mode: 'buildtime_ai_once';
    source: string;
}

/**
 * Everything the field-ownership step needs, passed as one object.
 *
 * Deliberately a prop and NOT a React context: context would change re-render semantics,
 * which breaks the zero-behaviour-change guarantee this extraction is built on.
 *
 * Note on `setAppliedFieldGuidanceExamples`: the step only *writes* it, never reads it.
 *
 * `inputValues` / `credentialValues` were setter-only until Phase 4 — the step wrote them
 * but never displayed them. Inline editing has to render the current value, so the maps
 * themselves are now passed too. **They are still owned by the wizard and must never be
 * relocated:** `handleBuild` reads them to save the workflow.
 */
export interface FieldOwnershipContext {
    // -- values --
    pendingWorkflowData: any;
    sectionStyles: OwnershipSectionStyles;
    globalWalkActive: GlobalWalkState | null;
    structuralByNode: NodeQuestionGroup[];
    secretsByNode: NodeQuestionGroup[];
    ownershipEffectiveModes: { byModeKey: Record<string, FillMode> };
    fillModeValues: Record<string, string>;
    /** Read for display by inline editing (Phase 4). Owned by the wizard — never relocate. */
    inputValues: Record<string, string>;
    /** Read for display by inline editing (Phase 4). Owned by the wizard — never relocate. */
    credentialValues: Record<string, string>;
    fieldPlaneRows: any[];
    fieldEnabledOverrides: Record<string, boolean>;
    nodeDescriptions: Record<string, NodeDescriptionState>;
    fieldDescriptions: Record<string, FieldDescriptionState>;
    appliedExampleKeys: Record<string, boolean>;
    fieldHelpExpanded: Record<string, boolean>;
    credHelpExpanded: Record<string, boolean>;
    credHelpViewMode: Record<string, 'simple' | 'technical'>;
    fieldDescFetchedRef: MutableRefObject<Set<string>>;
    /**
     * Field grouping + upstream attribution from POST /api/workflow-build/field-plan.
     * Null while loading or unavailable — the step then renders its pre-Phase-3 flat
     * layout rather than breaking.
     */
    fieldPlan?: FieldPlan | null;
    /** Fields the user owns that still lack a value — gates the build button (§6a-2 item 4). */
    outstandingCount: number;
    /**
     * Connection state per node type, from the same bounded readiness endpoint the
     * capability stage uses. Drives the connect fallback on cards for nodes the
     * generation pipeline injected, which the user never gated at node selection
     * (plan §2.4, "safety net, not a second step").
     */
    nodeConnections?: CapabilityConnectionReadinessNode[];
    /**
     * Per-node first-run results (Phase 7b).
     * ⚠️ A `passed` write node really sent the email / posted the message.
     */
    runResults?: Record<string, RunNodeResult>;
    runningNodeId?: string | null;

    // -- callbacks --
    /** Runs one node for real. `consented` must be true for write/destructive. */
    onRunNode?: (nodeId: string, consented: boolean) => void;
    isCredentialUnlocked: (question: OwnershipQuestion) => boolean;
    startGlobalWalkThrough: (
        structural: NodeQuestionGroup[],
        secrets: NodeQuestionGroup[]
    ) => void;
    fetchNodeDescription: (
        descKey: string,
        nodeType: string,
        nodeLabel: string,
        nodeId: string
    ) => void;
    fetchFieldDescriptions: (
        nodeId: string,
        nodeType: string,
        nodeLabel: string,
        questions: OwnershipQuestion[],
        requestKey: string
    ) => void;
    proceedFromOwnershipStage: () => void;

    // -- setters --
    setFieldEnabledOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
    setCredentialUnlockOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
    setFieldHelpExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
    setAppliedExampleKeys: Dispatch<SetStateAction<Record<string, boolean>>>;
    setGuideSelectedField: Dispatch<
        SetStateAction<{ nodeId: string; fieldName: string } | null>
    >;
    setCredHelpExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
    setCredHelpViewMode: Dispatch<SetStateAction<Record<string, 'simple' | 'technical'>>>;
    setFillModeValues: Dispatch<SetStateAction<Record<string, string>>>;
    setInputValues: Dispatch<SetStateAction<Record<string, string>>>;
    setCredentialValues: Dispatch<SetStateAction<Record<string, string>>>;
    setAppliedFieldGuidanceExamples: Dispatch<
        SetStateAction<Record<string, AppliedGuidanceExample>>
    >;
}
