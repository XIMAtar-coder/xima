import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CvAnalysisJobStatus = 'processing' | 'done' | 'error' | 'stale' | 'unknown';

export interface CvAnalysisJobState {
  status: CvAnalysisJobStatus;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  results: any | null;
  isPolling: boolean;
}

const STALE_AFTER_MS = 3 * 60 * 1000; // 3 minutes — server may have died silently
const FAST_INTERVAL_MS = 2500;
const SLOW_INTERVAL_MS = 10_000;
const SLOWDOWN_AFTER_MS = 120_000;

/**
 * Polls the `cv_uploads` row identified by `cvUploadId` until the analysis is
 * either `done`, `error`, or considered `stale` (started >3 min ago without a
 * terminal state — treated as an implicit failure so no UI gets stuck).
 *
 * The job state lives entirely in the database; the hook is a pure reader.
 */
export function useCvAnalysisJob(cvUploadId: string | null | undefined) {
  const [state, setState] = useState<CvAnalysisJobState>({
    status: 'unknown',
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    results: null,
    isPolling: false,
  });

  const startedAtRef = useRef<number>(Date.now());
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async (): Promise<CvAnalysisJobState | null> => {
    if (!cvUploadId) return null;

    const { data, error } = await supabase
      .from('cv_uploads')
      .select('analysis_status, analysis_error_message, analysis_started_at, analysis_completed_at, analysis_results')
      .eq('id', cvUploadId)
      .maybeSingle();

    if (error || !data) return null;

    const startedMs = data.analysis_started_at ? new Date(data.analysis_started_at).getTime() : null;
    const isStale =
      data.analysis_status === 'processing' &&
      startedMs !== null &&
      Date.now() - startedMs > STALE_AFTER_MS;

    const status: CvAnalysisJobStatus = isStale
      ? 'stale'
      : (data.analysis_status as CvAnalysisJobStatus) || 'unknown';

    return {
      status,
      errorMessage: isStale
        ? 'Analysis timed out. Please retry.'
        : (data.analysis_error_message ?? null),
      startedAt: data.analysis_started_at ?? null,
      completedAt: data.analysis_completed_at ?? null,
      results: data.analysis_results ?? null,
      isPolling: status === 'processing',
    };
  }, [cvUploadId]);

  useEffect(() => {
    if (!cvUploadId) {
      setState((s) => ({ ...s, status: 'unknown', isPolling: false }));
      return;
    }

    cancelledRef.current = false;
    startedAtRef.current = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelledRef.current) return;
      const next = await fetchOnce();
      if (cancelledRef.current) return;
      if (next) setState(next);

      const terminal =
        next?.status === 'done' || next?.status === 'error' || next?.status === 'stale';
      if (terminal) return;

      const elapsed = Date.now() - startedAtRef.current;
      const interval = elapsed > SLOWDOWN_AFTER_MS ? SLOW_INTERVAL_MS : FAST_INTERVAL_MS;
      timer = setTimeout(tick, interval);
    };

    // Initial fetch
    tick();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [cvUploadId, fetchOnce]);

  const refetch = useCallback(async () => {
    const next = await fetchOnce();
    if (next) setState(next);
    return next;
  }, [fetchOnce]);

  return { ...state, refetch };
}
