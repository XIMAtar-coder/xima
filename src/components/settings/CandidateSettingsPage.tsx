import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { DataExportButton } from '@/components/profile/DataExportButton';
import { ProfilingOptOutSection } from './ProfilingOptOutSection';
import { AccountDeletionSection } from './AccountDeletionSection';
import { Separator } from '@/components/ui/separator';

export function CandidateSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Data Export (GDPR Art. 20 - Portability) */}
        <DataExportButton />

        <Separator />

        {/* Profiling Opt-Out (GDPR Art. 21/22) */}
        <ProfilingOptOutSection />

        <Separator />

        {/* Account Deletion (GDPR Art. 17) */}
        <AccountDeletionSection variant="candidate" />
      </div>
    </MainLayout>
  );
}

export default CandidateSettingsPage;
