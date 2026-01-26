import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export function ProfilingOptOutSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const [optedOut, setOptedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current setting
  useEffect(() => {
    const loadSetting = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profiling_opt_out')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setOptedOut(data?.profiling_opt_out ?? false);
      } catch (err) {
        console.error('Error loading profiling preference:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSetting();
  }, [user?.id]);

  const handleToggle = async (checked: boolean) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profiling_opt_out: checked })
        .eq('user_id', user.id);

      if (error) throw error;

      setOptedOut(checked);
      toast({
        title: checked 
          ? t('settings.profiling.optOutSuccess') 
          : t('settings.profiling.optInSuccess'),
        description: checked
          ? t('settings.profiling.optOutMessage')
          : t('settings.profiling.optInMessage'),
      });
    } catch (err: any) {
      console.error('Error updating profiling preference:', err);
      toast({
        title: t('common.error'),
        description: err.message || t('settings.profiling.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('settings.profiling.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.profiling.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What is profiling explanation */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">{t('settings.profiling.whatIsTitle')}</p>
            <p className="text-sm text-muted-foreground mb-2">
              {t('settings.profiling.whatIsDescription')}
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t('settings.profiling.includes1')}</li>
              <li>{t('settings.profiling.includes2')}</li>
              <li>{t('settings.profiling.includes3')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="space-y-0.5 flex-1 mr-4">
            <Label htmlFor="profiling-opt-out" className="text-foreground font-medium cursor-pointer">
              {t('settings.profiling.optOutLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('settings.profiling.optOutDescription')}
            </p>
          </div>
          <Switch
            id="profiling-opt-out"
            checked={optedOut}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>

        {/* What changes if opted out */}
        {optedOut && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertDescription>
              <p className="font-medium mb-2 text-amber-700 dark:text-amber-400">
                {t('settings.profiling.optedOutTitle')}
              </p>
              <ul className="text-sm text-amber-600 dark:text-amber-300 list-disc list-inside space-y-1">
                <li>{t('settings.profiling.change1')}</li>
                <li>{t('settings.profiling.change2')}</li>
                <li>{t('settings.profiling.change3')}</li>
              </ul>
              <p className="text-sm text-amber-600 dark:text-amber-300 mt-2">
                {t('settings.profiling.existingData')}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Human review contact */}
        <p className="text-sm text-muted-foreground">
          {t('settings.profiling.humanReview')}{' '}
          <a href="mailto:privacy@xima.app" className="text-primary hover:underline">
            privacy@xima.app
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
