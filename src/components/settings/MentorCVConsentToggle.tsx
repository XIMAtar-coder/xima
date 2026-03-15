import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, FileText, User, AlertCircle } from 'lucide-react';

interface MentorCVConsentToggleProps {
  candidateProfileId: string;
  mentorId: string | null;
  mentorName: string | null;
}

export function MentorCVConsentToggle({ 
  candidateProfileId, 
  mentorId, 
  mentorName 
}: MentorCVConsentToggleProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (mentorId) {
      fetchConsentStatus();
    } else {
      setLoading(false);
    }
  }, [mentorId, candidateProfileId]);

  const fetchConsentStatus = async () => {
    if (!mentorId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentor_cv_access')
        .select('is_allowed')
        .eq('mentor_id', mentorId)
        .eq('candidate_profile_id', candidateProfileId)
        .maybeSingle();

      if (error) {
        console.error('[MentorCVConsentToggle] Error fetching consent:', error);
        return;
      }

      setIsAllowed(data?.is_allowed || false);
    } catch (err) {
      console.error('[MentorCVConsentToggle] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!mentorId) return;

    setUpdating(true);
    try {
      const now = new Date().toISOString();

      // Upsert the consent record
      const { error: upsertError } = await supabase
        .from('mentor_cv_access')
        .upsert({
          mentor_id: mentorId,
          candidate_profile_id: candidateProfileId,
          is_allowed: checked,
          allowed_at: checked ? now : null,
          revoked_at: checked ? null : now,
          updated_at: now,
        }, {
          onConflict: 'mentor_id,candidate_profile_id',
        });

      if (upsertError) {
        console.error('[MentorCVConsentToggle] Error updating consent:', upsertError);
        throw upsertError;
      }

      // Log the action in audit log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: auditError } = await supabase
          .from('mentor_access_audit_logs')
          .insert({
            mentor_id: mentorId,
            candidate_profile_id: candidateProfileId,
            action: checked ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
            actor_user_id: user.id,
            actor_role: 'candidate',
            metadata: {
              source: 'settings_toggle',
              timestamp: now,
            },
          });

        if (auditError) {
          console.error('[MentorCVConsentToggle] Error logging audit:', auditError);
          // Don't fail the operation for audit errors
        }
      }

      setIsAllowed(checked);
      
      toast({
        title: checked 
          ? t('settings.cv_access_granted', 'CV Access Granted')
          : t('settings.cv_access_revoked', 'CV Access Revoked'),
        description: checked
          ? t('settings.cv_access_granted_desc', 'Your mentor can now view your CV')
          : t('settings.cv_access_revoked_desc', 'Your mentor can no longer view your CV'),
      });
    } catch (err: any) {
      console.error('[MentorCVConsentToggle] Error:', err);
      toast({
        title: t('common.error'),
        description: err.message || t('settings.cv_consent_error', 'Failed to update consent'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // No mentor assigned
  if (!mentorId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {t('settings.mentor_cv_title', 'Mentor CV Access')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              {t('settings.mentor_cv_incomplete', 'Complete your assessment to get a mentor and manage CV access.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          {t('settings.cv_consent_title', 'Mentor CV Access')}
        </CardTitle>
        <CardDescription>
          {t('settings.cv_consent_desc', 'Control whether your mentor can view your CV')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{mentorName || 'Your Mentor'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {t('settings.cv_access_label', 'CV Access')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isAllowed ? 'default' : 'secondary'}>
              {isAllowed 
                ? t('settings.cv_allowed', 'Allowed') 
                : t('settings.cv_not_allowed', 'Not allowed')}
            </Badge>
            <Switch
              checked={isAllowed}
              onCheckedChange={handleToggle}
              disabled={updating}
              aria-label={t('settings.toggle_cv_access', 'Toggle CV access')}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('settings.cv_consent_note', 'When enabled, your mentor can view your CV to better help with career guidance. You can revoke access at any time.')}
        </p>
      </CardContent>
    </Card>
  );
}
