import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, FileUp, Users } from 'lucide-react';

interface BusinessEntryPointsCardProps {
  onXimaHrClick: () => void;
}

const BusinessEntryPointsCard: React.FC<BusinessEntryPointsCardProps> = ({ onXimaHrClick }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cards = [
    {
      icon: Target,
      titleKey: 'business.dashboard.entry_points.create_goal.title',
      descKey: 'business.dashboard.entry_points.create_goal.description',
      recommended: true,
      onClick: () => navigate('/business/hiring-goals/new'),
    },
    {
      icon: FileUp,
      titleKey: 'business.dashboard.entry_points.import_jd.title',
      descKey: 'business.dashboard.entry_points.import_jd.description',
      recommended: false,
      onClick: () => navigate('/business/jobs/import'),
    },
    {
      icon: Users,
      titleKey: 'business.dashboard.entry_points.xima_hr.title',
      descKey: 'business.dashboard.entry_points.xima_hr.description',
      recommended: false,
      onClick: onXimaHrClick,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {t('business.dashboard.entry_points.heading')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('business.dashboard.entry_points.subheading')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <Card
            key={i}
            className="cursor-pointer border-border hover:border-primary/50 hover:shadow-lg hover:translate-y-[-3px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            tabIndex={0}
            role="button"
            onClick={card.onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.onClick(); } }}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                {card.recommended && (
                  <Badge variant="secondary" className="text-[11px] bg-primary/10 text-primary border-0">
                    {t('business.dashboard.entry_points.recommended')}
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-[15px] mb-1">
                  {t(card.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-snug">
                  {t(card.descKey)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusinessEntryPointsCard;
