import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateOnboardingPath, getOnboardingState, patchOnboardingState } from '@/lib/api/onboardingAPI';
import type { OnboardingState } from '@/types/onboarding';

const ONBOARDING_STATE_QUERY_KEY = ['onboarding-state'];

export function useOnboarding() {
  const queryClient = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ONBOARDING_STATE_QUERY_KEY,
    queryFn: getOnboardingState,
    staleTime: 60_000,
  });

  const generateMutation = useMutation({
    mutationFn: (goal?: string) => generateOnboardingPath(goal),
    onSuccess: (result, goalArg) => {
      queryClient.setQueryData<OnboardingState>(ONBOARDING_STATE_QUERY_KEY, (prev) => ({
        goal: goalArg || prev?.goal || null,
        dismissed: result.dismissed,
        completedStepIds: result.completedStepIds,
        skippedStepIds: result.skippedStepIds,
        lastGeneratedAt: result.generatedAt,
        lastPath: result,
      }));
    },
  });

  const patchMutation = useMutation({
    mutationFn: patchOnboardingState,
    onSuccess: (state) => {
      queryClient.setQueryData(ONBOARDING_STATE_QUERY_KEY, state);
    },
  });

  const state = stateQuery.data;
  // Goal is the single source of truth for whether a path should render —
  // resetting the goal hides any stale cached path without a second request.
  const path = state?.goal ? state?.lastPath ?? null : null;
  const needsGoal = !state?.goal;

  const setGoal = useCallback((goal: string) => generateMutation.mutate(goal), [generateMutation]);
  const regenerate = useCallback(() => generateMutation.mutate(state?.goal || undefined), [generateMutation, state?.goal]);
  // Retries whatever was last attempted (even if it never got persisted because
  // the request failed) rather than falling back to the possibly-still-empty
  // stored goal — otherwise retrying a failed *first* attempt silently no-ops.
  const retryLastAttempt = useCallback(
    () => generateMutation.mutate(generateMutation.variables ?? state?.goal ?? undefined),
    [generateMutation, state?.goal],
  );

  const completeStep = useCallback(
    (actionTarget: string) => {
      const next = Array.from(new Set([...(state?.completedStepIds || []), actionTarget]));
      patchMutation.mutate({ completedStepIds: next });
    },
    [patchMutation, state?.completedStepIds],
  );

  const skipStep = useCallback(
    (actionTarget: string) => {
      const next = Array.from(new Set([...(state?.skippedStepIds || []), actionTarget]));
      patchMutation.mutate({ skippedStepIds: next });
    },
    [patchMutation, state?.skippedStepIds],
  );

  const dismiss = useCallback(() => patchMutation.mutate({ dismissed: true }), [patchMutation]);

  const reset = useCallback(() => {
    patchMutation.mutate({ goal: null, dismissed: false, completedStepIds: [], skippedStepIds: [] });
  }, [patchMutation]);

  return {
    isLoadingState: stateQuery.isLoading,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error as Error | null,
    path,
    needsGoal,
    dismissed: Boolean(state?.dismissed),
    completedStepIds: state?.completedStepIds || [],
    skippedStepIds: state?.skippedStepIds || [],
    setGoal,
    regenerate,
    retry: retryLastAttempt,
    completeStep,
    skipStep,
    dismiss,
    reset,
  };
}
