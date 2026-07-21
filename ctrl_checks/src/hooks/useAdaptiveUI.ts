import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchAdaptiveUI } from '@/lib/api/adaptiveUIAPI';
import type { AdaptiveUIRequest, AdaptiveUIResponse } from '@/types/adaptive-ui';

export interface UseAdaptiveUIResult {
  data: AdaptiveUIResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  generate: (request: AdaptiveUIRequest) => void;
  regenerate: () => void;
  retry: () => void;
  reset: () => void;
}

export function useAdaptiveUI(): UseAdaptiveUIResult {
  const lastRequestRef = useRef<AdaptiveUIRequest | null>(null);
  const mutation = useMutation({
    mutationFn: fetchAdaptiveUI,
  });

  const generate = useCallback(
    (request: AdaptiveUIRequest) => {
      lastRequestRef.current = request;
      mutation.mutate(request);
    },
    [mutation],
  );

  const runAgain = useCallback(() => {
    if (lastRequestRef.current) {
      mutation.mutate(lastRequestRef.current);
    }
  }, [mutation]);

  const reset = useCallback(() => {
    lastRequestRef.current = null;
    mutation.reset();
  }, [mutation]);

  return {
    data: mutation.data,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    generate,
    regenerate: runAgain,
    retry: runAgain,
    reset,
  };
}
