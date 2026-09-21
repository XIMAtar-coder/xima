import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const pillarLabels: Record<string, string> = {
  drive: 'Drive',
  computational_power: 'Computational Power',
  communication: 'Communication',
  creativity: 'Creativity',
  knowledge: 'Knowledge',
};

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

interface PersonalFeedCardProps {
  item: PersonalFeedItem;
  onMarkRead?: (id: string) => void;
  onTrackEngagement?: (id: string) => void;
  userArchetype?: string;
  hoursSinceLastGrowth?: number | null;
}

/**
 * One feed entry as a row of the updates register (candidate redesign):
 * icon, type eyebrow with unread dot, time, title, one paragraph, actions.
 */
export const PersonalFeedCard = ({ item, onMarkRead, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: PersonalFeedCardProps) => {
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

const RowIcon = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => (
  <span className={cn(
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
    strong ? 'border-primary/30 bg-primary/[0.08] text-primary' : 'border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] text-muted-foreground',
  )}>
    {children}
  </span>
);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{children}</span>
);

// Personal journey items
const JourneyCard = ({ item, onMarkRead, hoursSinceLastGrowth }: { item: PersonalFeedItem; onMarkRead?: (id: string) => void; hoursSinceLastGrowth?: number | null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const typeLabel = t(`feed.types.${item.feed_type}`, humanize(item.feed_type));

  return (
    <article
      className={cn('flex cursor-pointer gap-4 border-b border-[hsl(var(--xs-line))] py-5 last:border-b-0', item.priority === 1 && 'opacity-85')}
      onClick={handleCardClick}
    >
      <RowIcon strong={item.priority >= 3 || !item.is_read}><IconComponent className="h-4 w-4" /></RowIcon>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="xs-eyebrow flex items-center gap-2">
            {!item.is_read && <i className="h-1.5 w-1.5 rounded-full bg-primary" aria-label={t('feed.unread', 'Unread')} />}
            {typeLabel}
          </span>
          <time className="shrink-0 text-[12px] text-muted-foreground">{formatRelativeTime(item.created_at)}</time>
        </div>

        <h3 className={cn('mt-1.5 text-[16px] font-semibold leading-snug text-foreground', item.priority >= 3 && 'text-[18px]')}>{item.title}</h3>
        {item.body && <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{item.body}</p>}

        {(item.feed_type === 'growth_recommendation' || item.feed_type === 'growth_test_result') && hoursSinceLastGrowth !== null && hoursSinceLastGrowth !== undefined && hoursSinceLastGrowth > 0 && (
          <p className="mt-1.5 text-[12px] text-muted-foreground/80">
            {hoursSinceLastGrowth < 24
              ? `${hoursSinceLastGrowth}h since your last Growth Hub activity`
              : hoursSinceLastGrowth < 48
                ? '1 day since your last activity'
                : `${Math.floor(hoursSinceLastGrowth / 24)} days since your last activity — keep the momentum!`
            }
          </p>
        )}

        {(item.actor_name || pillar || (item.action_url && item.action_label)) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {item.actor_name && <Chip>{item.actor_name}</Chip>}
              {pillar && <Chip>{pillarLabels[pillar] || pillar}</Chip>}
            </div>
            {item.action_url && item.action_label && (
              <button type="button" className="text-[14px] font-semibold text-primary hover:underline" onClick={handleAction}>
                {item.action_label} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

// External curated content
const ExternalContentCard = ({
  item,
  onTrackEngagement,
  userArchetype,
}: {
  item: PersonalFeedItem;
  onTrackEngagement?: (id: string) => void;
  userArchetype?: string;
}) => {
  const { t } = useTranslation();
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
    <article
      className="flex cursor-pointer gap-4 border-b border-[hsl(var(--xs-line))] py-5 last:border-b-0"
      onClick={handleClick}
    >
      <RowIcon strong={item.priority >= 3}><FileText className="h-4 w-4" /></RowIcon>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="xs-eyebrow">
            {sourceName} · {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
            {isSponsored && <> · {t('feed.sponsored', 'Sponsored')}</>}
          </span>
        </div>
        <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-foreground">{item.title}</h3>
        {item.body && <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{item.body}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>{relevanceLabel && <Chip>{relevanceLabel}</Chip>}</div>
          <span className="flex items-center gap-1 text-[14px] font-semibold text-primary">
            {t('feed.read_more', 'Read more')} <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
};
