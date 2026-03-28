import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, CheckCircle, RefreshCw, Zap,
  BookOpen, Star, FileText, Users, Target, Award, Info,
  PlayCircle, Headphones, Lightbulb, ExternalLink, LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalFeedItem } from '@/hooks/usePersonalFeed';

const iconMap: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'check-circle': CheckCircle,
  'refresh-cw': RefreshCw,
  zap: Zap,
  'book-open': BookOpen,
  star: Star,
  'file-text': FileText,
  users: Users,
  target: Target,
  award: Award,
  info: Info,
  'play-circle': PlayCircle,
  headphones: Headphones,
  lightbulb: Lightbulb,
};

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const contentTypeEmoji: Record<string, string> = {
  article: '📄',
  video: '🎬',
  podcast: '🎧',
  report: '📊',
  talk: '🎤',
};

const pillarLabels: Record<string, string> = {
  drive: 'Drive',
  computational_power: 'Computational Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

interface PersonalFeedCardProps {
  item: PersonalFeedItem;
  onMarkRead?: (id: string) => void;
  onTrackEngagement?: (id: string) => void;
  userArchetype?: string;
  hoursSinceLastGrowth?: number | null;
}

export const PersonalFeedCard = ({ item, onMarkRead, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: PersonalFeedCardProps) => {
  const navigate = useNavigate();
  const isExternal = item._source === 'external';

  if (isExternal) {
    return (
      <ExternalContentCard
        item={item}
        onTrackEngagement={onTrackEngagement}
        userArchetype={userArchetype}
      />
    );
  }

  return (
    <JourneyCard item={item} onMarkRead={onMarkRead} hoursSinceLastGrowth={hoursSinceLastGrowth} />
  );
};

// Personal journey items
const JourneyCard = ({ item, onMarkRead, hoursSinceLastGrowth }: { item: PersonalFeedItem; onMarkRead?: (id: string) => void; hoursSinceLastGrowth?: number | null }) => {
  const navigate = useNavigate();
  const IconComponent = iconMap[item.icon || 'info'] || Info;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.is_read) onMarkRead?.(item.id);
    if (item.action_url) navigate(item.action_url);
  };

  const handleCardClick = () => {
    if (!item.is_read) onMarkRead?.(item.id);
  };

  const pillar = (item.metadata?.pillar as string) || '';

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:shadow-md border-border/50',
        item.priority >= 3 && 'border-primary/30 bg-primary/5',
        item.priority === 1 && 'opacity-85',
        !item.is_read && 'border-l-4 border-l-primary'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex-shrink-0 rounded-full p-2 mt-0.5',
            item.priority >= 3 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <IconComponent className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {!item.is_read && (
                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                )}
                <h4 className="text-sm font-semibold truncate">{item.title}</h4>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatRelativeTime(item.created_at)}
              </span>
            </div>

            {item.body && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
            )}

            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5">
                {item.actor_name && (
                  <Badge variant="secondary" className="text-xs font-normal">{item.actor_name}</Badge>
                )}
                {pillar && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {pillarLabels[pillar] || pillar}
                  </Badge>
                )}
              </div>
              {item.action_url && item.action_label && (
                <Button size="sm" variant="ghost" className="text-xs h-7 text-primary" onClick={handleAction}>
                  {item.action_label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// External curated content cards
const ExternalContentCard = ({
  item,
  onTrackEngagement,
  userArchetype,
}: {
  item: PersonalFeedItem;
  onTrackEngagement?: (id: string) => void;
  userArchetype?: string;
}) => {
  const meta = item.metadata || {};
  const contentType = (meta.content_type as string) || 'article';
  const sourceName = (meta.source_name as string) || item.actor_name || 'Source';
  const sourceUrl = (meta.source_url as string) || item.action_url || '#';
  const targetPillars = (meta.target_pillars as string[]) || [];
  const targetArchetypes = (meta.target_archetypes as string[]) || [];
  const isSponsored = (meta.is_sponsored as boolean) || false;

  const handleClick = () => {
    onTrackEngagement?.(item.id);
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  // Build relevance label
  let relevanceLabel = '';
  if (userArchetype && targetArchetypes.length > 0 && targetArchetypes.includes(userArchetype)) {
    const capitalArchetype = userArchetype.charAt(0).toUpperCase() + userArchetype.slice(1);
    relevanceLabel = `Recommended for ${capitalArchetype}s`;
  } else if (targetPillars.length > 0) {
    const pillar = pillarLabels[targetPillars[0]] || targetPillars[0];
    relevanceLabel = `Boosts your ${pillar}`;
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:shadow-md',
        'border-border/40 bg-card/80 hover:bg-card',
        item.priority >= 3 && 'ring-1 ring-primary/20'
      )}
      onClick={handleClick}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {sourceName}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground/70">
            {contentTypeEmoji[contentType] || '📄'} {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </span>
          {isSponsored && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground/50 italic">Sponsored</span>
            </>
          )}
        </div>

        <h4 className="text-sm font-semibold leading-snug mb-1.5">{item.title}</h4>
        
        {item.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.body}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {relevanceLabel && (
              <Badge variant="outline" className="text-xs font-normal">
                🎯 {relevanceLabel}
              </Badge>
            )}
          </div>
          <span className="text-xs text-primary flex items-center gap-1 font-medium">
            Read More <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
