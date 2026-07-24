/**
 * Thin data-access layer on top of @tanstack/react-query + supabase-js.
 *
 * Goal: replace repetitive `useEffect + useState({data, loading, error}) +
 * supabase.from(...).select()` boilerplate with a single hook that:
 *  - throws on `error` so react-query surfaces it consistently,
 *  - returns the unwrapped `data`,
 *  - inherits caching / invalidation from the shared QueryClient.
 *
 * Usage:
 *   const { data, isLoading, error } = useSupabaseQuery(
 *     ['business_challenges', businessId],
 *     () => supabase.from('business_challenges').select('*').eq('business_id', businessId),
 *     { enabled: !!businessId }
 *   );
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { PostgrestSingleResponse, PostgrestMaybeSingleResponse } from '@supabase/supabase-js';

export type SupabaseResult<T> =
  | PostgrestSingleResponse<T>
  | PostgrestMaybeSingleResponse<T>
  | { data: T | null; error: { message: string } | null };

export function useSupabaseQuery<T>(
  key: readonly unknown[],
  fetcher: () => PromiseLike<SupabaseResult<T>>,
  options?: Omit<UseQueryOptions<T | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T | null, Error>({
    queryKey: key as unknown[],
    queryFn: async () => {
      const { data, error } = await fetcher();
      if (error) throw new Error(error.message);
      return (data as T | null) ?? null;
    },
    ...options,
  });
}
