import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { JobPreferencesFields, useJobPreferencesForm, type JobPreferencesInitialData } from './JobPreferencesForm';

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  initialData?: JobPreferencesInitialData;
}

/**
 * "Complete your profile" from the dashboard: the shared preferences form
 * in a dialog. The settings page shows the same fields inline.
 */
export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ open, onClose, userId, onSuccess, initialData }) => {
  const { t } = useTranslation();
  const form = useJobPreferencesForm(userId, initialData);

  const handleSave = async () => {
    const ok = await form.save();
    if (ok) { onSuccess(); onClose(); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border bg-background shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('profile_completion.title')}</DialogTitle>
          <DialogDescription className="text-base">{t('profile_completion.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <JobPreferencesFields form={form} idPrefix="modal-prefs" />
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="ghost" onClick={onClose}>{t('profile_completion.later')}</Button>
          <Button onClick={handleSave} disabled={form.saving}>
            {form.saving ? '...' : t('profile_completion.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
