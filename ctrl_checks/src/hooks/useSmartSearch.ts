import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runSmartSearch } from '@/lib/api/searchAPI';

export function useSmartSearch() {
  const lastQueryRef = useRef<string>('');
  const mutation = useMutation({
    mutationFn: (query: string) => runSmartSearch(query),
  });

  const search = useCallback(
    (query: string) => {
      lastQueryRef.current = query;
      mutation.mutate(query);
    },
    [mutation],
  );

  const retry = useCallback(() => {
    if (lastQueryRef.current) mutation.mutate(lastQueryRef.current);
  }, [mutation]);

  const reset = useCallback(() => {
    lastQueryRef.current = '';
    mutation.reset();
  }, [mutation]);

  return {
    data: mutation.data,
    isSearching: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    lastQuery: lastQueryRef.current,
    search,
    retry,
    reset,
  };
}
