import React from 'react';
import { log } from '@/lib/log';

interface State { error: Error | null }

/**
 * Outermost error boundary.
 *
 * ChunkErrorBoundary sits inside the provider tree, so a throw from a provider
 * (auth, query client, theme, i18n) had nothing above it and produced a blank
 * page with no message and no way out. This wraps the whole tree with a plain
 * fallback that needs none of the app's providers to render — no router, no
 * translations, no theme — because those are exactly what may have failed.
 */
export class RootErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error('[RootErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center',
          background: '#fff', color: '#111827',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '.5rem' }}>Something went wrong / Qualcosa è andato storto</h1>
          <p style={{ color: '#4B5563', marginBottom: '1.25rem' }}>
            The page could not start. Reloading usually fixes it. / La pagina non è riuscita ad avviarsi. Di solito basta ricaricare.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '.6rem 1.2rem', borderRadius: '.5rem', border: '1px solid #D1D5DB', background: '#111827', color: '#fff', cursor: 'pointer' }}
          >
            Reload / Ricarica
          </button>
        </div>
      </div>
    );
  }
}
