import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Brain, 
  Target, 
  Video, 
  Building2, 
  MapPin, 
  Users, 
  Globe, 
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  Settings
} from 'lucide-react';
import { 
  resolveCompanySnapshot, 
  type CompanyProfileData 
} from '@/lib/business/resolveCompanySnapshot';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

interface BusinessOverviewBannerProps {
  companyProfile: CompanyProfileData | null;
  // businessProfile is now optional - we use the hook directly for real-time sync
  businessProfile?: any;
}

// Helper to format large numbers with separators
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(Math.round(num));
};

// Stepper item component for the pipeline
const PipelineStep: React.FC<{
  level: number;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}> = ({ level, icon, titleKey, descKey }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center text-center flex-1 min-w-0">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2 border border-primary/30">
          {icon}
        </div>
        <Badge variant="secondary" className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0">
          L{level}
        </Badge>
      </div>
      <span className="text-xs font-semibold text-foreground mb-0.5 truncate w-full">
        {t(titleKey)}
      </span>
      <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
        {t(descKey)}
      </span>
    </div>
  );
};

// Company snapshot field
const SnapshotField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  isHighlight?: boolean;
  employeeCount?: number;
}> = ({ icon, label, value, isHighlight, employeeCount }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const displayValue = value || '—';
  
  // Calculate days saved for employee count
  const daysSaved = employeeCount ? Math.round(employeeCount * 30 * 0.8) : null;
  
  if (isHighlight && employeeCount) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-primary/10 cursor-pointer transition-colors group"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <span className="text-muted-foreground">{icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
                {label}
              </span>
              <span className="text-sm font-bold text-primary group-hover:text-primary/80 flex items-center gap-1">
                {formatNumber(employeeCount)}
                <Sparkles className="h-3 w-3 text-amber-500" />
              </span>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          className="w-72 p-3 bg-card/95 backdrop-blur-sm border-primary/20"
        >
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('business.overview.xima_impact_title')}
            </h4>
            
            {/* Callout 1: Time savings */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
              <Clock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 block">
                  {t('business.overview.reduce_time_hire')}
                </span>
                <span className="text-sm font-bold text-foreground">
                  ≈ {formatNumber(daysSaved!)} {t('business.overview.days_saved_month')}
                </span>
              </div>
            </div>
            
            {/* Callout 2: Turnover reduction */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">
                  {t('business.overview.reduce_turnover')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('business.overview.turnover_desc')}
                </span>
              </div>
            </div>
            
            {/* Callout 3: Workforce readiness */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
              <Target className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 block">
                  {t('business.overview.workforce_readiness')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('business.overview.workforce_desc')}
                </span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
          {label}
        </span>
        <span className="text-sm font-medium text-foreground truncate block">
          {displayValue}
        </span>
      </div>
    </div>
  );
};

export const BusinessOverviewBanner: React.FC<BusinessOverviewBannerProps> = ({
  companyProfile,
  businessProfile: propBusinessProfile
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Use the shared hook for real-time sync with Settings page
  const { businessProfile: hookBusinessProfile } = useBusinessProfile();
  
  // Prefer hook data (always fresh) over prop data
  const businessProfile = hookBusinessProfile || propBusinessProfile;
  
  // Resolve snapshot with priority: manual overrides -> auto-extracted -> fallback
  const snapshot = resolveCompanySnapshot(businessProfile, companyProfile);
  
  // Check if snapshot is missing critical data
  const hasMissingData = !snapshot.hq_location && !snapshot.industry && !snapshot.employees_count;
  
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: How XIMA works */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {t('businessPortal.how_xima_works_title')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('businessPortal.how_xima_works_body')}
              </p>
            </div>
            
            {/* Pipeline Stepper */}
            <div className="flex items-start justify-between gap-2 relative">
              {/* Connecting line */}
              <div className="absolute top-6 left-8 right-8 h-px bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 hidden sm:block" />
              
              <PipelineStep
                level={1}
                icon={<Brain className="h-5 w-5 text-primary" />}
                titleKey="business.overview.level1_title"
                descKey="business.overview.level1_desc"
              />
              
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-4 flex-shrink-0 hidden sm:block" />
              
              <PipelineStep
                level={2}
                icon={<Target className="h-5 w-5 text-primary" />}
                titleKey="business.overview.level2_title"
                descKey="business.overview.level2_desc"
              />
              
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-4 flex-shrink-0 hidden sm:block" />
              
              <PipelineStep
                level={3}
                icon={<Video className="h-5 w-5 text-primary" />}
                titleKey="business.overview.level3_title"
                descKey="business.overview.level3_desc"
              />
            </div>
            
            {/* Business control note */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-start gap-2">
              <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>{t('businessPortal.how_xima_works_privacy')}</span>
            </div>
          </div>
          
          {/* Right Column: Company Snapshot */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {t('businessPortal.company_overview_title')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('businessPortal.company_overview_body')}
                </p>
              </div>
            </div>
            
            {/* Snapshot Grid */}
            <div className="grid grid-cols-2 gap-2">
              <SnapshotField
                icon={<MapPin className="h-4 w-4" />}
                label={t('business.overview.field_location')}
                value={snapshot.hq_location}
              />
              
              <SnapshotField
                icon={<Building2 className="h-4 w-4" />}
                label={t('business.overview.field_industry')}
                value={snapshot.industry}
              />
              
              <SnapshotField
                icon={<Users className="h-4 w-4" />}
                label={t('business.overview.field_employees')}
                value={snapshot.employees_count ? formatNumber(snapshot.employees_count) : null}
                isHighlight={!!snapshot.employees_count}
                employeeCount={snapshot.employees_count || undefined}
              />
              
              <SnapshotField
                icon={<Globe className="h-4 w-4" />}
                label={t('business.overview.field_website')}
                value={snapshot.website_domain}
              />
            </div>
            
            {/* Edit Snapshot CTA when data is missing */}
            {hasMissingData && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    {t('business.overview.edit_snapshot_hint')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-primary hover:text-primary/80"
                  onClick={() => navigate('/business/settings#snapshot')}
                >
                  {t('business.overview.edit_snapshot_cta')}
                </Button>
              </div>
            )}
            
            {/* Employee count CTA when only that is missing */}
            {!hasMissingData && !snapshot.employees_count && (
              <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2">
                <Users className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                <span>{t('business.overview.set_employee_count')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
