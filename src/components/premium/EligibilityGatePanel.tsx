/**
 * XIMA Premium: Eligibility Gate Panel
 * Shows verification status for education, certificates, and language
 * Business-only view in submission drawer
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, GraduationCap, Award, Languages, 
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Crown, Lock, Bell
} from 'lucide-react';

interface EligibilityStatus {
  education: 'verified' | 'pending' | 'not_provided' | 'rejected';
  educationLevel?: string;
  certificates: 'verified' | 'pending' | 'not_provided' | 'rejected';
  certificatesList?: string[];
  language: 'verified' | 'pending' | 'self_declared' | 'not_provided';
  languageLevel?: string;
}

interface EligibilityGatePanelProps {
  eligibility: EligibilityStatus | null;
  isPremium?: boolean;
  onRequestVerification?: () => void;
  className?: string;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    verified: { 
      icon: <CheckCircle2 className="h-3 w-3" />, 
      className: 'bg-green-500/10 text-green-600 border-green-500/30',
      label: t('premium.eligibility.verified')
    },
    pending: { 
      icon: <Clock className="h-3 w-3" />, 
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      label: t('premium.eligibility.pending')
    },
    self_declared: { 
      icon: <AlertTriangle className="h-3 w-3" />, 
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      label: t('premium.eligibility.self_declared')
    },
    not_provided: { 
      icon: <XCircle className="h-3 w-3" />, 
      className: 'bg-muted text-muted-foreground border-border',
      label: t('premium.eligibility.not_provided')
    },
    rejected: { 
      icon: <XCircle className="h-3 w-3" />, 
      className: 'bg-red-500/10 text-red-600 border-red-500/30',
      label: t('premium.eligibility.rejected')
    },
  };
  
  const { icon, className, label } = config[status] || config.not_provided;
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  );
}

function LockedPanel() {
  const { t } = useTranslation();
  
  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-[2px] flex items-center justify-center z-10">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-amber-500/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{t('premium.eligibility.locked_title')}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {t('signals.premium.unlock_cta')}
          </Button>
        </div>
      </div>
      <CardHeader className="pb-3 opacity-30">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {t('premium.eligibility.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 opacity-30">
        <div className="h-12 bg-muted/50 rounded blur-[2px]" />
        <div className="h-12 bg-muted/50 rounded blur-[2px]" />
        <div className="h-12 bg-muted/50 rounded blur-[2px]" />
      </CardContent>
    </Card>
  );
}

export function EligibilityGatePanel({
  eligibility,
  isPremium = false,
  onRequestVerification,
  className = '',
}: EligibilityGatePanelProps) {
  const { t } = useTranslation();

  if (!isPremium) {
    return <LockedPanel />;
  }

  // If no eligibility data, show "not provided" for all
  const status: EligibilityStatus = eligibility || {
    education: 'not_provided',
    certificates: 'not_provided',
    language: 'not_provided',
  };

  const hasMissingEvidence = 
    status.education === 'not_provided' ||
    status.certificates === 'not_provided' ||
    status.language === 'not_provided';

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t('premium.eligibility.title')}
          </CardTitle>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
            XIMA Premium
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('premium.eligibility.description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Education */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{t('premium.eligibility.education')}</p>
              {status.educationLevel && (
                <p className="text-xs text-muted-foreground">{status.educationLevel}</p>
              )}
            </div>
          </div>
          <StatusBadge status={status.education} />
        </div>

        {/* Certificates */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium">{t('premium.eligibility.certificates')}</p>
              {status.certificatesList && status.certificatesList.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {status.certificatesList.slice(0, 2).join(', ')}
                  {status.certificatesList.length > 2 && ` +${status.certificatesList.length - 2}`}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={status.certificates} />
        </div>

        {/* Language */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">{t('premium.eligibility.language')}</p>
              {status.languageLevel && (
                <p className="text-xs text-muted-foreground">{status.languageLevel}</p>
              )}
            </div>
          </div>
          <StatusBadge status={status.language} />
        </div>

        {/* Missing Evidence Callout */}
        {hasMissingEvidence && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600">
                  {t('premium.eligibility.missing_evidence')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('premium.eligibility.missing_evidence_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Request Verification Action */}
        {onRequestVerification && hasMissingEvidence && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRequestVerification}
            className="w-full"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {t('premium.eligibility.request_verification')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
