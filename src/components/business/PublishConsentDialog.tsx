import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

/** Bump when the consent wording changes: it is stored with every post. */
export const PUBLISH_CONSENT_VERSION = '2026-09-28';

/** The fields to write on job_posts when a company publishes with consent. */
export const publishConsentFields = () => {
  const now = new Date().toISOString();
  return { status: 'published', published_at: now, publish_consent_at: now, publish_consent_version: PUBLISH_CONSENT_VERSION };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy?: boolean;
}

/**
 * Asked every time a company publishes a listing: the post becomes visible
 * to every XIMA candidate and may be spread on other channels. Publishing
 * is not possible without ticking the box.
 */
export const PublishConsentDialog: React.FC<Props> = ({ open, onOpenChange, onConfirm, busy }) => {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  useEffect(() => { if (!open) setAgreed(false); }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('jobs.publish_consent.title', 'Publish this listing')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('jobs.publish_consent.body', 'A published listing is visible to every XIMA candidate and can be shared by XIMA on other channels, such as the website, job boards and social networks.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label htmlFor="publish-consent" className="flex cursor-pointer items-start gap-3 rounded-md border border-[hsl(var(--xs-line))] p-3 text-sm text-foreground">
          <Checkbox id="publish-consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
          <span>{t('jobs.publish_consent.checkbox', 'I authorise XIMA to publish this listing and make it visible to all candidates, on the platform and on other channels.')}</span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={!agreed || busy} onClick={(e) => { e.preventDefault(); if (agreed) onConfirm(); }}>
            {t('jobs.publish_consent.confirm', 'Publish')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PublishConsentDialog;
