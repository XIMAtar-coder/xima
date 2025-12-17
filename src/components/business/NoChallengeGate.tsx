import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Rocket, Bookmark } from 'lucide-react';

interface NoChallengeGateProps {
  onCreateChallenge: () => void;
  onViewSaved?: () => void;
}

export const NoChallengeGate: React.FC<NoChallengeGateProps> = ({
  onCreateChallenge,
  onViewSaved,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="border-amber-500/40 bg-amber-500/10 backdrop-blur-sm shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-amber-500/20">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              {t('business_challenge.gate_title')}
            </h3>
            <p className="text-sm text-white/80 mb-4">
              {t('business_challenge.gate_description')}
            </p>
            <div className="flex gap-3">
              <Button onClick={onCreateChallenge}>
                <Rocket className="mr-2 h-4 w-4" />
                {t('business_challenge.create_button')}
              </Button>
              {onViewSaved && (
                <Button variant="outline" onClick={onViewSaved}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  {t('business_challenge.view_saved')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
