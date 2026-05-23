import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: 'invalid' });
          return;
        }
        if (data?.valid === false && data?.reason === 'already_unsubscribed') {
          setState({ kind: 'already' });
        } else if (data?.valid === true) {
          setState({ kind: 'valid' });
        } else {
          setState({ kind: 'invalid' });
        }
      } catch (e: any) {
        setState({ kind: 'error', message: e?.message ?? 'Network error' });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState({ kind: 'submitting' });
    try {
      const { data, error } = await supabase.functions.invoke(
        'handle-email-unsubscribe',
        { body: { token } },
      );
      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }
      if ((data as any)?.success === false && (data as any)?.reason === 'already_unsubscribed') {
        setState({ kind: 'already' });
        return;
      }
      setState({ kind: 'done' });
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message ?? 'Network error' });
    }
  };

  return (
    <LandingLayout>
      <Seo title="Unsubscribe — XIMA" description="Manage your email preferences." path="/unsubscribe" />
      <section className="px-6 lg:px-10 py-20">
        <div className="max-w-[560px] mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-3" style={{ color: '#0B6BFF' }}>
            XIMA
          </p>
          <h1 className="text-2xl font-bold text-foreground">Email preferences</h1>

          {state.kind === 'loading' && (
            <p className="mt-4 text-muted-foreground">Verifying your link…</p>
          )}

          {state.kind === 'valid' && (
            <>
              <p className="mt-4 text-muted-foreground">
                Click below to confirm that you no longer want to receive emails from XIMA.
              </p>
              <Button className="mt-6" onClick={confirm}>
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state.kind === 'submitting' && (
            <p className="mt-4 text-muted-foreground">Processing…</p>
          )}

          {state.kind === 'done' && (
            <p className="mt-4 text-foreground">
              You've been unsubscribed. You will no longer receive emails from XIMA.
            </p>
          )}

          {state.kind === 'already' && (
            <p className="mt-4 text-foreground">
              This address is already unsubscribed. No further action needed.
            </p>
          )}

          {state.kind === 'invalid' && (
            <p className="mt-4 text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          )}

          {state.kind === 'error' && (
            <p className="mt-4 text-destructive">Something went wrong: {state.message}</p>
          )}
        </div>
      </section>
    </LandingLayout>
  );
};

export default Unsubscribe;
