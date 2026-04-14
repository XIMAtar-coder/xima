import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface XimaHrRequestModalProps {
  open: boolean;
  onClose: () => void;
  source: 'dashboard' | 'listing' | 'hiring_goal';
  sourceId?: string;
  businessId: string;
  contactEmail?: string;
}

const XimaHrRequestModal: React.FC<XimaHrRequestModalProps> = ({
  open, onClose, source, sourceId, businessId, contactEmail
}) => {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<'explain' | 'confirm' | 'success'>('explain');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setScreen('explain');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('request-xima-hr', {
        body: {
          business_id: businessId,
          source: source === 'dashboard' ? 'generic' : source,
          source_id: source === 'dashboard' ? undefined : sourceId,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setScreen('success');
    } catch (err: any) {
      console.error('[XimaHrRequestModal] Error:', err);
      setError(err.message || t('business.xima_hr.modal.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        {screen === 'explain' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-xl">{t('business.xima_hr.modal.title')}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('business.xima_hr.modal.intro')}
              </p>
              <ul className="space-y-2">
                {['benefit_1', 'benefit_2', 'benefit_3'].map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t(`business.xima_hr.modal.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>{t('business.xima_hr.modal.cancel')}</Button>
              <Button onClick={() => setScreen('confirm')}>{t('business.xima_hr.modal.continue')}</Button>
            </div>
          </>
        )}

        {screen === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('business.xima_hr.modal.confirm_title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t('business.xima_hr.modal.confirm_body')}
              </p>
              {contactEmail && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">{t('business.xima_hr.modal.contact_email_label')}</span>
                  <p className="text-sm font-medium text-foreground">{contactEmail}</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setScreen('explain')}>{t('business.xima_hr.modal.back')}</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('business.xima_hr.modal.submitting') : t('business.xima_hr.modal.submit')}
              </Button>
            </div>
          </>
        )}

        {screen === 'success' && (
          <>
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-fit p-4 rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('business.xima_hr.modal.success_title')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('business.xima_hr.modal.success_body')}</p>
              </div>
              <Button onClick={handleClose}>{t('business.xima_hr.modal.close')}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default XimaHrRequestModal;
