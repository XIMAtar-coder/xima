import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LandingLayout from '@/components/landing/LandingLayout';

type Status = 'loading' | 'success' | 'already' | 'expired' | 'invalid';

const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-email-token', { body: { token } });
        if (error) { setStatus('invalid'); return; }
        if (data?.success && data.alreadyUsed) { setStatus('already'); return; }
        if (data?.success) {
          setStatus('success');
          setTimeout(() => navigate('/profile'), 2200);
          return;
        }
        if (data?.reason === 'expired') { setStatus('expired'); return; }
        setStatus('invalid');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [params, navigate]);

  return (
    <LandingLayout>
      <div className="container max-w-md mx-auto pt-16 pb-16 px-4 text-center">
        <div className="mx-auto mb-8"><Logo variant="full" className="h-12 mx-auto" alt="XIMA" /></div>
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifica in corso…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Email confermata</h1>
            <p className="text-muted-foreground">Ti stiamo portando alla dashboard…</p>
          </>
        )}
        {status === 'already' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Già confermata</h1>
            <p className="text-muted-foreground mb-6">Il tuo account è già verificato.</p>
            <Button onClick={() => navigate('/profile')}>Vai alla dashboard</Button>
          </>
        )}
        {status === 'expired' && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Link scaduto</h1>
            <p className="text-muted-foreground mb-6">Accedi e clicca "Reinvia email" sul banner.</p>
            <Button onClick={() => navigate('/login')}>Vai al login</Button>
          </>
        )}
        {status === 'invalid' && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Link non valido</h1>
            <p className="text-muted-foreground mb-6">Controlla di aver copiato il link completo.</p>
            <Button onClick={() => navigate('/login')}>Vai al login</Button>
          </>
        )}
      </div>
    </LandingLayout>
  );
};

export default VerifyEmail;
