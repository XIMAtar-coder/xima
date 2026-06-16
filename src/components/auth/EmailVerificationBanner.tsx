import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { computeVerificationStatus, VerificationStatus } from '@/lib/auth/verificationGuard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatRemaining(s: VerificationStatus): string {
  if (!s.deadline) return '';
  if (s.expired) return 'scaduta';
  const ms = s.deadline.getTime() - Date.now();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return `${days}g ${remH}h`;
  }
  if (hours >= 1) return `${hours} ore`;
  const mins = Math.max(1, Math.floor(ms / (1000 * 60)));
  return `${mins} minuti`;
}

export const EmailVerificationBanner: React.FC = () => {
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [resending, setResending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('email_verified_at, verification_required_until')
      .eq('user_id', user.id)
      .maybeSingle();
    setStatus(computeVerificationStatus(data?.email_verified_at, data?.verification_required_until));
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setIsAdmin(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (!cancelled) setIsAdmin(!!data?.some((r: any) => r.role === 'admin'));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) { setStatus(null); return; }
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [isAuthenticated, load]);


  const handleResend = async () => {
    if (!user?.id || !user.email) return;
    setResending(true);
    try {
      const deadline = status?.deadline ?? new Date(Date.now() + 72 * 3600 * 1000);
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          user_id: user.id,
          email: user.email,
          name: (user as any).name || '',
          verification_deadline: deadline.toISOString(),
        },
      });
      if (error) throw error;
      toast({ title: 'Email inviata', description: 'Controlla la tua casella.' });
    } catch (e: any) {
      toast({ title: 'Invio fallito', description: e?.message || 'Riprova tra qualche minuto.', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  if (!isAuthenticated || !status || status.verified) return null;
  if (isAdmin) return null;
  if (!status.deadline) return null;


  const expired = status.expired;
  const remaining = formatRemaining(status);

  return (
    <div className="container mx-auto px-4 pt-4">
      <Alert className={expired
        ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800'
        : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800'}>
        {expired
          ? <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
          : <Mail className="h-4 w-4 text-amber-600 dark:text-amber-300" />}
        <AlertTitle>
          {expired ? 'Verifica scaduta' : `Verifica la tua email entro ${remaining}`}
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
          <span className="text-sm">
            {expired
              ? 'Alcune funzioni sono bloccate (candidatura, condivisione XIMAtar, accettazione offerte). Verifica ora per sbloccarle.'
              : 'Conferma il tuo indirizzo per mantenere pieno accesso a tutte le funzionalità XIMA.'}
          </span>
          <Button variant="outline" size="sm" onClick={handleResend} disabled={resending} className="shrink-0">
            {resending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Reinvia email
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
