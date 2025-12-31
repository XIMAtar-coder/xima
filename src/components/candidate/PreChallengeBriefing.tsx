import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Target, FileText, CheckCircle, Bell, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChallengeLevel } from '@/lib/challenges/challengeLevels';

interface PreChallengeBriefingProps {
  level: ChallengeLevel;
  companyName: string;
  challengeTitle: string;
  estimatedMinutes: number;
  roleTitle?: string | null;
  onStart: () => void;
}

export function PreChallengeBriefing({
  level,
  companyName,
  challengeTitle,
  estimatedMinutes,
  roleTitle,
  onStart,
}: PreChallengeBriefingProps) {
  const { t } = useTranslation();

  const isLevel1 = level === 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            {isLevel1 ? t('candidate.briefing.level_1_badge') : t('candidate.briefing.level_2_badge')}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {challengeTitle}
          </h1>
          <p className="text-muted-foreground">
            {companyName}
          </p>
        </div>

        {/* Briefing Sections */}
        <div className="space-y-6">
          {/* Company Context - NEW SECTION */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.context_title')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {roleTitle 
                      ? t('candidate.briefing.context_with_role', { companyName, roleTitle })
                      : t('candidate.briefing.context_no_role', { companyName })
                    }
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                    {t('candidate.briefing.context_note')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.purpose_title')}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {isLevel1 
                      ? t('candidate.briefing.purpose_l1')
                      : t('candidate.briefing.purpose_l2')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Structure */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.structure_title')}
                  </h3>
                  <ul className="text-muted-foreground text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.structure_1')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.structure_2')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.structure_3')}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.time_title')}
                  </h3>
                  <ul className="text-muted-foreground text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.time_1', { minutes: estimatedMinutes })}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.time_2')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.time_3')}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.evaluation_title')}
                  </h3>
                  <ul className="text-muted-foreground text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.evaluation_1')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.evaluation_2')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.evaluation_3')}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What happens next */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t('candidate.briefing.next_title')}
                  </h3>
                  <ul className="text-muted-foreground text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.next_1')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                      {t('candidate.briefing.next_2')}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Level-specific note */}
          {isLevel1 ? (
            <p className="text-center text-sm text-muted-foreground italic px-4">
              {t('candidate.briefing.l1_note')}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground italic px-4">
              {t('candidate.briefing.l2_note')}
            </p>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-10 space-y-4">
          <Button 
            onClick={onStart}
            size="lg" 
            className="w-full text-base font-semibold"
          >
            {t('candidate.briefing.start_challenge')}
          </Button>
          <div className="text-center">
            <Link 
              to="/profile" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('candidate.briefing.go_back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
