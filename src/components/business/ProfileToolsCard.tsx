import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileToolsCardProps {
  companyProfile: any;
  businessProfile: any;
  profileLoading: boolean;
  onGenerateProfile: () => void;
}

export const ProfileToolsCard: React.FC<ProfileToolsCardProps> = ({
  companyProfile,
  businessProfile,
  profileLoading,
  onGenerateProfile
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const hasProfile = !!companyProfile;
  const lastUpdated = companyProfile?.updated_at 
    ? new Date(companyProfile.updated_at).toLocaleDateString() 
    : null;

  return (
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t('business.profile_tools.title')}
                {hasProfile && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                    {t('business.profile_tools.generated')}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {t('business.profile_tools.last_updated', { date: lastUpdated })}
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {hasProfile ? (
              <>
                {/* Summary Preview */}
                {companyProfile.summary && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {companyProfile.summary}
                    </p>
                  </div>
                )}
                
                {/* Values */}
                {companyProfile.values && companyProfile.values.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {companyProfile.values.slice(0, 5).map((value: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {value}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onGenerateProfile}
                    disabled={profileLoading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${profileLoading ? 'animate-spin' : ''}`} />
                    {t('business.profile_tools.regenerate')}
                  </Button>
                  <Link to="/business/settings">
                    <Button variant="ghost" size="sm">
                      {t('business.profile_tools.edit_settings')}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {businessProfile?.website 
                    ? t('business.profile_tools.generate_desc')
                    : t('business.profile_tools.add_website_first')
                  }
                </p>
                {businessProfile?.website ? (
                  <Button 
                    onClick={onGenerateProfile} 
                    disabled={profileLoading}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {profileLoading 
                      ? t('business.profile_tools.generating')
                      : t('business.profile_tools.generate_cta')
                    }
                  </Button>
                ) : (
                  <Link to="/business/settings">
                    <Button variant="outline">
                      {t('business.profile_tools.add_website')}
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
