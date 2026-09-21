import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/layout/PageHeader';
import { Chip } from '@/components/business/XsBits';

interface BusinessEntryPointsCardProps {
  onXimaHrClick: () => void;
}

/** First visit: the three ways to start, as plain rows in one panel. */
const BusinessEntryPointsCard: React.FC<BusinessEntryPointsCardProps> = ({ onXimaHrClick }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const rows = [
    {
      titleKey: 'business.dashboard.entry_points.create_goal.title',
      descKey: 'business.dashboard.entry_points.create_goal.description',
      recommended: true,
      onClick: () => navigate('/business/hiring-goals/new'),
    },
    {
      titleKey: 'business.dashboard.entry_points.import_jd.title',
      descKey: 'business.dashboard.entry_points.import_jd.description',
      recommended: false,
      onClick: () => navigate('/business/jobs/import'),
    },
    {
      titleKey: 'business.dashboard.entry_points.xima_hr.title',
      descKey: 'business.dashboard.entry_points.xima_hr.description',
      recommended: false,
      onClick: onXimaHrClick,
    },
  ];

  return (
    <Panel className="py-3">
      <div className="pt-2 pb-1">
        <h2 className="text-[19px] font-semibold tracking-[-0.45px] text-foreground">{t('business.dashboard.entry_points.heading')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('business.dashboard.entry_points.subheading')}</p>
      </div>
      {rows.map((row) => (
        <button
          key={row.titleKey}
          type="button"
          onClick={row.onClick}
          className="xs-row w-full text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">{t(row.titleKey)}</span>
              {row.recommended && <Chip tone="blue">{t('business.dashboard.entry_points.recommended')}</Chip>}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{t(row.descKey)}</span>
          </span>
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">↗</span>
        </button>
      ))}
    </Panel>
  );
};

export default BusinessEntryPointsCard;
