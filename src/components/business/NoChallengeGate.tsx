import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain, Bookmark, Settings, Star } from 'lucide-react';

interface NoChallengeGateProps {
  onCreateChallenge?: () => void;
  onViewSaved?: () => void;
  goalId?: string | null;
}

export const NoChallengeGate: React.FC<NoChallengeGateProps> = ({
  onCreateChallenge,
  onViewSaved,
  goalId,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Default behavior: route to XIMA Core Challenge (Level 1)
  const handleCreateChallenge = () => {
    if (goalId) {
      // Route to challenge type selector which will auto-redirect to XIMA Core if needed
      navigate(`/business/challenges/select?goal=${goalId}`);
    } else if (onCreateChallenge) {
      onCreateChallenge();
    } else {
      navigate('/business/challenges/xima-core');
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5 backdrop-blur-sm shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                {t('business_challenge.gate_title_xima')}
              </h3>
              <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                <Star className="h-3 w-3 fill-current" />
                {t('challenge_type.recommended')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('business_challenge.gate_description_xima')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCreateChallenge} className="gap-2">
                <Brain className="h-4 w-4" />
                {t('business_challenge.activate_xima_core')}
              </Button>
              {onViewSaved && (
                <Button variant="outline" onClick={onViewSaved}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  {t('business_challenge.view_saved')}
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={() => navigate('/business/challenges')}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('business_challenge.manage_challenges')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
