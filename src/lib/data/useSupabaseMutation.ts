/**
 * Companion mutation helper for the Supabase data layer.
 * Wraps `useMutation` so callers can invoke a supabase write and let react-query
 * handle pending/error state + cache invalidation uniformly.
 *
 * Usage:
 *   const upsert = useSupabaseMutation(
 *     (row) => supabase.from('foo').upsert(row),
 *     { invalidate: [['foo']] }
 *   );
 *   await upsert.mutateAsync(row);
 */
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import type { SupabaseResult } from './useSupabaseQuery';

interface Options<TVars, TData> extends Omit<UseMutationOptions<TData | null, Error, TVars>, 'mutationFn'> {
  /** Query keys to invalidate on success. */
  invalidate?: readonly (readonly unknown[])[];
}

export function useSupabaseMutation<TVars, TData = unknown>(
  fn: (vars: TVars) => PromiseLike<SupabaseResult<TData>>,
  options?: Options<TVars, TData>
) {
  const qc = useQueryClient();
  const { invalidate, onSuccess, ...rest } = options ?? {};
  return useMutation<TData | null, Error, TVars>({
    mutationFn: async (vars) => {
      const { data, error } = await fn(vars);
      if (error) throw new Error(error.message);
      return (data as TData | null) ?? null;
    },
    onSuccess: (data, vars, ctx) => {
      invalidate?.forEach((key) => qc.invalidateQueries({ queryKey: key as unknown[] }));
      onSuccess?.(data, vars, ctx);
    },
    ...rest,
  });
}
