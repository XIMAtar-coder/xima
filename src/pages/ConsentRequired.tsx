import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConsentCheckboxes } from '@/components/auth/ConsentCheckboxes';
import { recordUserConsents } from '@/hooks/useConsentRecording';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';

/**
 * Shown after a Google sign-in when no privacy/terms consent is on file:
 * the account exists, but it is not used until the person accepts.
 */
const ConsentRequired = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, signOut } = useUser();
  const { toast } = useToast();
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Only same-site relative paths, so ?next= cannot send anyone elsewhere.
  const rawNext = params.get('next') || '/profile';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/profile';

  const accept = async () => {
    if (!privacy || !terms) { setShowError(true); return; }
    if (!user?.id) { navigate('/login', { replace: true }); return; }
    setSaving(true);
    const res = await recordUserConsents(user.id, i18n.language);
    setSaving(false);
    if (!res.success) {
      toast({ title: t('register.consent_error_title', 'Registration Error'), description: t('register.consent_error_desc', 'Failed to record your consent. Please try registering again.'), variant: 'destructive' });
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <div className="container max-w-md mx-auto pt-16 pb-16 px-4">
      <Seo title="XIMA" description="" path="/consent" noindex />
      <Card>
        <CardHeader>
          <CardTitle>{t('consent_gate.title')}</CardTitle>
          <CardDescription>{t('consent_gate.body')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConsentCheckboxes
            privacyAccepted={privacy} termsAccepted={terms}
            onPrivacyChange={setPrivacy} onTermsChange={setTerms}
            showError={showError}
          />
          <Button className="w-full" onClick={accept} disabled={saving}>{t('consent_gate.continue')}</Button>
          <Button variant="ghost" className="w-full" onClick={async () => { await signOut(); navigate('/', { replace: true }); }}>
            {t('consent_gate.decline')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentRequired;
