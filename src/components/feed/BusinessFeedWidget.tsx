import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Bell, Sparkles, ArrowRight } from 'lucide-react';
import { useNextFeedItem } from '@/hooks/useNextFeedItem';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface BusinessFeedWidgetProps {
  className?: string;
}

/**
 * A compact feed widget for the business dashboard.
 * Shows one news item at a time following the "one news per login" pattern.
 */
export const BusinessFeedWidget = ({ className }: BusinessFeedWidgetProps) => {
  const { t } = useTranslation();
  const { item, loading, error, noNewItems, refresh } = useNextFeedItem();

  // Loading state (minimal)
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('feed.widget.title', 'Latest Update')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="py-4 text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('common.retry', 'Retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No items
  if (noNewItems || !item) {
    return (
      <Card className={cn("bg-muted/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {t('feed.widget.title', 'Latest Update')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('feed.no_new_updates', 'No new updates')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render item
  const payload = item.payload;

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-r from-primary/5 to-transparent", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('feed.widget.title', 'Latest Update')}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          {payload.ximatar_image && (
            <img
              src={payload.ximatar_image}
              alt=""
              className="h-10 w-10 rounded-full border border-border flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">
              {payload.normalized_text || t('feed.widget.new_activity', 'New activity in your pipeline')}
            </p>
            {payload.skill_tags && payload.skill_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {payload.skill_tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end mt-3 pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={refresh} className="h-7 text-xs">
            {t('feed.next', 'Next')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
