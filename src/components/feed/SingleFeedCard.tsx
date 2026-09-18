import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles, CheckCircle, Trophy, Star, Zap, Bell } from 'lucide-react';
import { useNextFeedItem, SingleFeedItem } from '@/hooks/useNextFeedItem';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SingleFeedCardProps {
  className?: string;
  compact?: boolean; // For business dashboard widget
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'challenge_completed':
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    case 'level_reached':
      return <Trophy className="h-5 w-5 text-amber-500" />;
    case 'badge_unlocked':
      return <Star className="h-5 w-5 text-violet-500" />;
    case 'skill_validated':
      return <Zap className="h-5 w-5 text-sky-500" />;
    default:
      return <Sparkles className="h-5 w-5 text-primary" />;
  }
};

const TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
  challenge_completed: { key: 'feed.types.challenge_completed', fallback: 'Challenge Completed' },
  level_reached: { key: 'feed.types.level_reached', fallback: 'Level Reached' },
  badge_unlocked: { key: 'feed.types.badge_unlocked', fallback: 'Badge Unlocked' },
  skill_validated: { key: 'feed.types.skill_validated', fallback: 'Skill Validated' },
  interest_aggregated: { key: 'feed.types.interest', fallback: 'Interest Signal' },
};

export const SingleFeedCard = ({ className, compact }: SingleFeedCardProps) => {
  const { t } = useTranslation();
  const { item, loading, error, noNewItems, refresh } = useNextFeedItem();

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('feed.loading', 'Loading update...')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="py-6 text-center">
          <p className="text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No new items state
  if (noNewItems || !item) {
    return (
      <Card className={cn("border-muted bg-muted/30", className)}>
        <CardContent className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6" : "py-10")}>
          <div className="p-3 rounded-full bg-muted mb-4">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">
            {t('feed.no_new_updates', 'No new updates')}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t('feed.no_updates_desc', 'You\'re all caught up! New updates will appear here when available.')}
          </p>
          <Button variant="ghost" size="sm" onClick={refresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('feed.check_again', 'Check again')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render the single feed item
  const payload = item.payload;

  return (
    <Card className={cn(
      "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden transition-all",
      className
    )}>
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(item.type)}
            <CardTitle className={cn("font-medium", compact ? "text-sm" : "text-base")}>
              {t(TYPE_LABELS[item.type]?.key || 'feed.types.update', TYPE_LABELS[item.type]?.fallback || 'Update')}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && "py-3")}>
        {/* Main content */}
        <div className="space-y-3">
          {/* XIMAtar visual (anonymized) */}
          {payload.ximatar_image && (
            <div className="flex items-center gap-3">
              <img
                src={payload.ximatar_image}
                alt=""
                className="h-12 w-12 rounded-full border-2 border-primary/20"
              />
              {payload.ximatar_name && (
                <span className="text-sm font-medium capitalize">
                  {payload.ximatar_name}
                </span>
              )}
            </div>
          )}

          {/* Normalized text (privacy-safe) */}
          {payload.normalized_text && (
            <p className={cn(
              "text-foreground leading-relaxed",
              compact ? "text-sm" : "text-base"
            )}>
              {payload.normalized_text}
            </p>
          )}

          {/* Skill tags */}
          {payload.skill_tags && payload.skill_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {payload.skill_tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Level indicator */}
          {payload.level && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>Level {payload.level}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground/70">
            {t('feed.privacy_badge', 'Anonymized signal • No personal data')}
          </p>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {t('feed.next', 'Next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
