import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AccountDeletionSectionProps {
  variant?: 'candidate' | 'business';
}

export function AccountDeletionSection({ variant = 'candidate' }: AccountDeletionSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async () => {
    if (confirmText !== CONFIRMATION_PHRASE) {
      toast({
        title: t('settings.deletion.error'),
        description: t('settings.deletion.confirmationMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: CONFIRMATION_PHRASE }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: t('settings.deletion.success'),
          description: t('settings.deletion.successMessage'),
        });

        // Sign out and redirect to home
        await supabase.auth.signOut();
        navigate('/');
      } else if (data?.partial) {
        toast({
          title: t('settings.deletion.partialSuccess'),
          description: t('settings.deletion.partialMessage'),
          variant: 'destructive',
        });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Account deletion error:', err);
      toast({
        title: t('settings.deletion.error'),
        description: err.message || t('settings.deletion.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
      setConfirmText('');
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          {t('settings.delete_title')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('settings.delete_subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium mb-2">{t('settings.deletion.warningTitle')}</p>
              <ul className="list-disc list-inside space-y-1 text-destructive/80">
                <li>{t('settings.deletion.warning1')}</li>
                <li>{t('settings.deletion.warning2')}</li>
                <li>{t('settings.deletion.warning3')}</li>
                <li>{t('settings.deletion.warning4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('settings.deletion.button')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('settings.deletion.confirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.deletion.confirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-3">
              <Label htmlFor="confirm-delete">
                {t('settings.deletion.typeToConfirm', { phrase: CONFIRMATION_PHRASE })}
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                className="font-mono"
                disabled={isDeleting}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmText !== CONFIRMATION_PHRASE}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings.deletion.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('settings.deletion.confirmButton')}
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
