import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Target, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompanyProfile {
  summary: string;
  values: string[];
  operating_style: string;
  communication_style: string;
  ideal_traits: string[];
  risk_areas: string[];
  pillar_vector: {
    drive: number;
    comp_power: number;
    communication: number;
    creativity: number;
    knowledge: number;
  };
  recommended_ximatars: string[];
  created_at: string;
  updated_at: string;
}

interface CompanyProfileCardProps {
  profile: CompanyProfile | null;
  loading: boolean;
  onGenerate: () => void;
}

export const CompanyProfileCard: React.FC<CompanyProfileCardProps> = ({
  profile,
  loading,
  onGenerate
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[hsl(var(--xima-accent))]" />
            {t('businessPortal.company_profile_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--xima-accent))]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[hsl(var(--xima-accent))]" />
            {t('businessPortal.company_profile_title')}
          </CardTitle>
          <CardDescription>{t('business.profile.no_profile')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Sparkles className="h-16 w-16 text-muted-foreground/50" />
          <p className="text-center text-muted-foreground max-w-md">
            {t('business.profile.generate_description')}
          </p>
          <Button onClick={onGenerate} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('business.profile.generate_cta')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[hsl(var(--xima-accent))]" />
            {t('businessPortal.company_profile_title')}
          </CardTitle>
          <CardDescription>
            {t('businessPortal.company_profile_updated')}: {new Date(profile.updated_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">
              {t('business.profile.summary')}
            </h4>
            {profile.summary ? (
              <p className="text-foreground leading-relaxed">{profile.summary}</p>
            ) : (
              <p className="text-muted-foreground italic">{t('business.profile.not_generated')}</p>
            )}
          </div>

          {/* Values */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">
              {t('business.profile.values')}
            </h4>
            {(profile.values || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.values.map((value, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-[hsl(var(--xima-accent))]/10 text-[hsl(var(--xima-accent))]">
                    {value}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">{t('business.profile.not_generated')}</p>
            )}
          </div>

          {/* Operating & Communication Style */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                {t('business.profile.operating_style')}
              </h4>
              {profile.operating_style ? (
                <p className="text-foreground">{profile.operating_style}</p>
              ) : (
                <p className="text-muted-foreground italic">{t('business.profile.not_generated')}</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                {t('business.profile.communication_style')}
              </h4>
              {profile.communication_style ? (
                <p className="text-foreground">{profile.communication_style}</p>
              ) : (
                <p className="text-muted-foreground italic">{t('business.profile.not_generated')}</p>
              )}
            </div>
          </div>

          {/* Ideal Traits */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              {t('business.profile.ideal_traits')}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              {(profile.ideal_traits || []).map((trait, idx) => (
                <li key={idx}>{trait}</li>
              ))}
            </ul>
          </div>

          {/* Risk Areas */}
          {(profile.risk_areas || []).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('business.profile.risk_areas')}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-foreground">
                {(profile.risk_areas || []).map((risk, idx) => (
                  <li key={idx}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pillar Vector */}
          {profile.pillar_vector && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('business.profile.pillar_vector')}
              </h4>
              <div className="space-y-3">
                {Object.entries(profile.pillar_vector).map(([pillar, value]) => {
                  // Map pillar keys to translation keys with safe fallbacks
                  const pillarKeyMap: Record<string, string> = {
                    'drive': 'drive',
                    'comp_power': 'computational',
                    'communication': 'communication',
                    'creativity': 'creativity',
                    'knowledge': 'knowledge'
                  };
                  const translationKey = pillarKeyMap[pillar] || pillar;
                  // Get the pillar name safely - use .name subkey since pillars.* are objects
                  const pillarName = t(`pillars.${translationKey}.name`, { defaultValue: pillar.replace('_', ' ') });
                  
                  return (
                    <div key={pillar}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-foreground">
                          {pillarName}
                        </span>
                        <span className="font-medium text-[hsl(var(--xima-accent))]">{value as number}/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(var(--xima-accent))] transition-all duration-500"
                          style={{ width: `${value as number}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended XIMAtars */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-3">
              {t('business.profile.recommended_ximatars')}
            </h4>
            <div className="flex flex-wrap gap-3">
              {(profile.recommended_ximatars || []).map((ximatar) => (
                <div
                  key={ximatar}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border"
                >
                  <img
                    src={`/ximatars/${ximatar}.png`}
                    alt={ximatar}
                    className="h-8 w-8 object-contain"
                  />
                  <span className="capitalize font-medium text-foreground">{ximatar}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t('business.profile.recommended_ximatars_description')}
            </p>
          </div>

          {/* Regenerate Button */}
          <div className="pt-4 border-t border-border">
            <Button onClick={onGenerate} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {t('business.profile.regenerate_cta')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
