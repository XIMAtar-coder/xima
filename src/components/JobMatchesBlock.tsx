import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useJobMatches } from '@/hooks/useJobMatches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const JobMatchesBlock: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { matches, loading, refresh } = useJobMatches(user);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle>{t('profile.job_matches_title')}</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>{t('profile.refresh')}</Button>
      </CardHeader>
      <CardContent>
        {(!matches || matches.length === 0) && !loading && (
          <p className="text-sm text-muted-foreground">{t('profile.job_matches_empty')}</p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('profile.loading')}</p>
        ) : (
          <div className="max-h-80 overflow-auto space-y-3">
            {matches.map(({ job, score }) => (
              <div key={job.id} className="p-3 border rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{job.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{job.company} • {t('opportunity.location')}: {job.location}</div>
                    <p className="text-sm mt-1 line-clamp-2 text-muted-foreground">{job.summary}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{t('profile.match')}</div>
                    <div className="text-lg font-bold">{score}%</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.skills.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => navigate(`/opportunity/${job.id}`)}>
                    {t('profile.view_opportunity')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
