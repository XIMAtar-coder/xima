import React from 'react';
import { log } from '@/lib/log';

interface State { hasError: boolean; reloaded: boolean }

/**
 * Catches errors from lazy chunk loading (e.g. stale index.html requesting
 * a chunk that no longer exists after a deploy → ChunkLoadError → white screen).
 * Auto-reloads once on ChunkLoadError, otherwise shows a recover UI.
 */
export class ChunkErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  state: State = { hasError: false, reloaded: false };

  static getDerivedStateFromError() {
    return { hasError: true, reloaded: false };
  }

  componentDidCatch(error: unknown) {
    const msg = (error as Error)?.message || '';
    const name = (error as Error)?.name || '';
    const isChunkError =
      name === 'ChunkLoadError' ||
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /error loading dynamically imported module/i.test(msg);

    if (isChunkError && typeof window !== 'undefined') {
      const key = '__xima_chunk_reload';
      const already = sessionStorage.getItem(key);
      if (!already) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    // eslint-disable-next-line no-console
    log.error('[ChunkErrorBoundary]', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Qualcosa non si è caricato</h2>
          <p className="text-sm text-muted-foreground">
            Una parte dell'app non è disponibile in questo momento. Prova a ricaricare la pagina.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            onClick={() => {
              try { sessionStorage.removeItem('__xima_chunk_reload'); } catch {}
              window.location.reload();
            }}
          >
            Ricarica
          </button>
        </div>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
