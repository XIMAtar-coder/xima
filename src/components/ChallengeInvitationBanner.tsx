import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, ChevronRight, Clock, Building2 } from 'lucide-react';
import { useChallengeInvitations } from '@/hooks/useChallengeInvitations';
import { formatDistanceToNow } from 'date-fns';

export const ChallengeInvitationBanner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { invitations, loading, pendingCount } = useChallengeInvitations();

  if (loading || pendingCount === 0) return null;

  const pendingInvitations = invitations.filter(i => i.status === 'invited');
  const latestInvitation = pendingInvitations[0];

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30 mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-full bg-primary/20 shrink-0">
            <Target className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                {t('challenge_invitation.banner_title', { count: pendingCount })}
              </h3>
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {pendingCount} {t('challenge_invitation.pending')}
              </Badge>
            </div>
            
            {latestInvitation && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building2 size={14} />
                  <span>{latestInvitation.company_name}</span>
                </div>
                {latestInvitation.role_title && (
                  <>
                    <span className="text-border">•</span>
                    <span>{latestInvitation.role_title}</span>
                  </>
                )}
                <span className="text-border">•</span>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>
                    {formatDistanceToNow(new Date(latestInvitation.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => navigate(`/challenge/accept?token=${latestInvitation?.invite_token}`)}
            className="shrink-0 gap-2"
          >
            {t('challenge_invitation.view_challenge')}
            <ChevronRight size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
