import { create } from 'zustand';
import type {
  AiEditorCapabilitiesResponse,
  AiEditorMutationOperation,
  AiEditorNodeCandidateOption,
  AnalyzerExecutionSummary,
  AnalyzerRemediationCandidate,
  WorkflowDiffSummary,
} from '@/types/aiEditor';

export interface AiEditorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AI_EDITOR_WELCOME_MESSAGE: AiEditorMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi! I can explain workflow runs, inspect outputs, and prepare safe workflow changes. Ask what happened, why something failed, or what you want changed.',
  timestamp: new Date(),
};

/**
 * Conversation and preview state for the AI Editor.
 *
 * This lives in a store rather than in the component because the AI Editor renders from
 * several different places — two separate return branches of PropertiesPanel in Expert
 * mode, and directly under WorkflowBuilder in Prompt mode. Component-local state would be
 * destroyed every time the host branch changed (e.g. selecting or deselecting a node),
 * which is not how the panel behaved when this state lived in PropertiesPanel itself.
 */
interface AiEditorData {
  aiMessages: AiEditorMessage[];
  aiInput: string;
  isAiLoading: boolean;
  aiCapabilities: AiEditorCapabilitiesResponse | null;

  pendingAiOperations: AiEditorMutationOperation[];
  pendingAiDiff: WorkflowDiffSummary | null;
  pendingAiPrompt: string;
  pendingPreviewValid: boolean;
  showAiDiffDetails: boolean;
  isAiApplyLoading: boolean;

  analyzerExecutions: AnalyzerExecutionSummary[];
  selectedExecutionId: string;
  isLoadingExecutions: boolean;
  /** Workflow id whose analyzer memory has already been hydrated (hydrate once per workflow). */
  hydratedWorkflowId: string | null;

  remediationCandidates: AnalyzerRemediationCandidate[];
  isPreviewingFixIndex: number | null;
  nodeCandidateOptions: AiEditorNodeCandidateOption[];
  lastAiUserPrompt: string;
}

type Updater<T> = T | ((prev: T) => T);

type Setters = {
  [K in keyof AiEditorData as `set${Capitalize<string & K>}`]: (value: Updater<AiEditorData[K]>) => void;
};

type AiEditorState = AiEditorData & Setters;

export const useAiEditorStore = create<AiEditorState>((set) => {
  const setter =
    <K extends keyof AiEditorData>(key: K) =>
    (value: Updater<AiEditorData[K]>) =>
      set((state) => ({
        [key]:
          typeof value === 'function'
            ? (value as (prev: AiEditorData[K]) => AiEditorData[K])(state[key])
            : value,
      }) as Pick<AiEditorState, K>);

  return {
    aiMessages: [AI_EDITOR_WELCOME_MESSAGE],
    setAiMessages: setter('aiMessages'),

    aiInput: '',
    setAiInput: setter('aiInput'),

    isAiLoading: false,
    setIsAiLoading: setter('isAiLoading'),

    aiCapabilities: null,
    setAiCapabilities: setter('aiCapabilities'),

    pendingAiOperations: [],
    setPendingAiOperations: setter('pendingAiOperations'),

    pendingAiDiff: null,
    setPendingAiDiff: setter('pendingAiDiff'),

    pendingAiPrompt: '',
    setPendingAiPrompt: setter('pendingAiPrompt'),

    pendingPreviewValid: true,
    setPendingPreviewValid: setter('pendingPreviewValid'),

    showAiDiffDetails: false,
    setShowAiDiffDetails: setter('showAiDiffDetails'),

    isAiApplyLoading: false,
    setIsAiApplyLoading: setter('isAiApplyLoading'),

    analyzerExecutions: [],
    setAnalyzerExecutions: setter('analyzerExecutions'),

    selectedExecutionId: '',
    setSelectedExecutionId: setter('selectedExecutionId'),

    isLoadingExecutions: false,
    setIsLoadingExecutions: setter('isLoadingExecutions'),

    hydratedWorkflowId: null,
    setHydratedWorkflowId: setter('hydratedWorkflowId'),

    remediationCandidates: [],
    setRemediationCandidates: setter('remediationCandidates'),

    isPreviewingFixIndex: null,
    setIsPreviewingFixIndex: setter('isPreviewingFixIndex'),

    nodeCandidateOptions: [],
    setNodeCandidateOptions: setter('nodeCandidateOptions'),

    lastAiUserPrompt: '',
    setLastAiUserPrompt: setter('lastAiUserPrompt'),
  };
});
