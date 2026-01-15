import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Zap,
  Heart,
  Bookmark,
  Target
} from 'lucide-react';
import { FeedItem, ReactionType } from '@/hooks/useFeedItems';
import { cn } from '@/lib/utils';
import { FeedChip, FeedChipVariant } from './FeedChip';

interface FeedItemCardProps {
  item: FeedItem;
  onReact: (itemId: string, reactionType: ReactionType) => Promise<boolean>;
  isBusiness: boolean;
}

const TYPE_CONFIG = {
  challenge_completed: {
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  skill_validated: {
    icon: Star,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  level_reached: {
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  interest_aggregated: {
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  }
};

// Helper: safely extract XIMAtar data from payload
const getSafeXimatar = (payload: Record<string, unknown>): { name: string; image: string | null } => ({
  name: (payload.ximatar_name as string) || 'XIMAtar',
  image: (payload.ximatar_image as string) || null
});

// Helper: extract level from payload
const getLevel = (payload: Record<string, unknown>): number | null => {
  const level = payload.level;
  return typeof level === 'number' ? level : null;
};

// Helper: extract count from payload
const getCount = (payload: Record<string, unknown>): number | null => {
  const count = payload.count;
  return typeof count === 'number' ? count : null;
};

// Format relative time with localization
const formatRelativeTime = (date: string, lang: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isIt = lang.startsWith('it');
  const isEs = lang.startsWith('es');

  if (diffMins < 1) {
    return isIt ? 'Ora' : isEs ? 'Ahora' : 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays === 1) {
    return isIt ? 'Ieri' : isEs ? 'Ayer' : 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return `${Math.floor(diffDays / 7)}w`;
};

// Truncate text with ellipsis
const truncateText = (text: string | undefined, maxChars: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars).trim() + '…';
};

export const FeedItemCard = ({ item, onReact, isBusiness }: FeedItemCardProps) => {
  const { t, i18n } = useTranslation();
  const [reactingType, setReactingType] = useState<ReactionType | null>(null);

  const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.challenge_completed;
  const Icon = config.icon;

  const handleReact = async (reactionType: ReactionType) => {
    setReactingType(reactionType);
    await onReact(item.id, reactionType);
    setReactingType(null);
  };

  // Extract payload data using helpers
  const ximatar = getSafeXimatar(item.payload);
  const level = getLevel(item.payload);
  const count = getCount(item.payload);
  const skillTags = (item.payload.skill_tags as string[]) || [];
  const skill = (item.payload.skill as string) || skillTags[0] || '';
  const challengeContext = item.payload.challenge_context as string | undefined;
  const normalizedText = item.payload.normalized_text as string | undefined;

  // Get type title
  const getTypeTitle = (): string => {
    switch (item.type) {
      case 'challenge_completed':
        return t('feed.titles.challenge_completed');
      case 'skill_validated':
        return t('feed.titles.skill_validated');
      case 'level_reached':
        return t('feed.titles.level_reached');
      case 'interest_aggregated':
        return t('feed.titles.interest_aggregated');
      default:
        return item.type;
    }
  };

  // Build chips array (max 3)
  const getChips = (): { label: string; variant: FeedChipVariant }[] => {
    const chips: { label: string; variant: FeedChipVariant }[] = [];

    switch (item.type) {
      case 'challenge_completed':
        if (level) {
          chips.push({ 
            label: t('feed.chips.level', { level }), 
            variant: 'level' 
          });
        }
        chips.push({ 
          label: t('feed.chips.verified'), 
          variant: 'verified' 
        });
        chips.push({ 
          label: t('feed.chips.challenge'), 
          variant: 'category' 
        });
        break;

      case 'skill_validated':
        chips.push({ 
          label: t('feed.chips.skill'), 
          variant: 'category' 
        });
        chips.push({ 
          label: t('feed.chips.verified'), 
          variant: 'verified' 
        });
        break;

      case 'level_reached':
        if (level) {
          chips.push({ 
            label: t('feed.chips.level', { level }), 
            variant: 'level' 
          });
        }
        chips.push({ 
          label: t('feed.chips.verified'), 
          variant: 'verified' 
        });
        break;

      case 'interest_aggregated':
        chips.push({ 
          label: t('feed.chips.market'), 
          variant: 'category' 
        });
        break;

      default:
        chips.push({ 
          label: t('feed.chips.verified'), 
          variant: 'verified' 
        });
    }

    return chips.slice(0, 3);
  };

  // Render type-specific primary line
  const renderPrimaryLine = (): string => {
    switch (item.type) {
      case 'challenge_completed':
        return t('feed.card.primary.level_completed', { level: level || 2 });
      case 'skill_validated':
        return skill || t('feed.chips.skill');
      case 'level_reached':
        return t('feed.card.primary.advanced_to_level', { level: level || 3 });
      case 'interest_aggregated':
        return t('feed.card.primary.interest_count', { count: count || 1 });
      default:
        return truncateText(normalizedText, 80) || t('feed.card.fallback.primary');
    }
  };

  // Render type-specific secondary line
  const renderSecondaryLine = (): string | null => {
    switch (item.type) {
      case 'challenge_completed':
        return challengeContext 
          ? truncateText(challengeContext, 50) 
          : t('feed.card.secondary.verified');
      case 'skill_validated':
        return t('feed.card.secondary.verified');
      case 'level_reached':
        return t('feed.card.secondary.verified');
      case 'interest_aggregated':
        return t('feed.card.secondary.identity_unlock');
      default:
        return null;
    }
  };

  const chips = getChips();
  const primaryLine = renderPrimaryLine();
  const secondaryLine = renderSecondaryLine();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Left: XIMAtar Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-11 w-11 border-2 border-primary/20">
              {ximatar.image && (
                <AvatarImage 
                  src={ximatar.image.startsWith('/') ? ximatar.image : `/ximatars/${ximatar.image}.png`} 
                  alt={ximatar.name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {ximatar.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[10px] text-center text-muted-foreground mt-1 capitalize truncate max-w-[44px]">
              {ximatar.name}
            </p>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0">
            {/* Header row: type icon + title + timestamp */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1 rounded-md", config.bgColor)}>
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground truncate">
                {getTypeTitle()}
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0">
                {formatRelativeTime(item.created_at, i18n.language)}
              </span>
            </div>

            {/* Primary line (max 1 line, clamp) */}
            <p className={cn(
              "font-semibold text-foreground line-clamp-1",
              item.type === 'skill_validated' ? 'text-base' : 'text-sm'
            )}>
              {primaryLine}
            </p>

            {/* Secondary line (max 1 line, clamp) */}
            {secondaryLine && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {secondaryLine}
              </p>
            )}

            {/* Chips row */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {chips.map((chip, idx) => (
                  <FeedChip key={idx} variant={chip.variant}>
                    {chip.label}
                  </FeedChip>
                ))}
              </div>
            )}

            {/* Reactions row */}
            <div className="flex items-center gap-1 pt-3 mt-3 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5 px-2 hover:bg-primary/10",
                  reactingType === 'interested' && "opacity-50"
                )}
                onClick={() => handleReact('interested')}
                disabled={reactingType !== null}
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('feed.reaction.interested')}</span>
                {item.reactions?.interested ? (
                  <span className="text-muted-foreground text-[10px]">({item.reactions.interested})</span>
                ) : null}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5 px-2 hover:bg-primary/10",
                  reactingType === 'relevant_skill' && "opacity-50"
                )}
                onClick={() => handleReact('relevant_skill')}
                disabled={reactingType !== null}
              >
                <Target className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('feed.reaction.relevant')}</span>
                {item.reactions?.relevant_skill ? (
                  <span className="text-muted-foreground text-[10px]">({item.reactions.relevant_skill})</span>
                ) : null}
              </Button>

              {isBusiness && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1.5 px-2 ml-auto hover:bg-primary/10",
                    reactingType === 'save_for_review' && "opacity-50"
                  )}
                  onClick={() => handleReact('save_for_review')}
                  disabled={reactingType !== null}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('feed.reaction.save')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
