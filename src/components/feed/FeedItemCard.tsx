import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Zap,
  Heart,
  Bookmark,
  Target,
  CheckCircle2
} from 'lucide-react';
import { FeedItem, ReactionType } from '@/hooks/useFeedItems';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it, es, enUS } from 'date-fns/locale';

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
  badge_unlocked: {
    icon: CheckCircle2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  interest_aggregated: {
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  }
};

// Get locale for date-fns
const getDateLocale = (lang: string) => {
  if (lang.startsWith('it')) return it;
  if (lang.startsWith('es')) return es;
  return enUS;
};

// Format relative time
const formatRelativeTime = (date: string, lang: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Custom short format for recent times
  if (diffMins < 1) {
    return lang.startsWith('it') ? 'Ora' : lang.startsWith('es') ? 'Ahora' : 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays === 1) {
    return lang.startsWith('it') ? 'Ieri' : lang.startsWith('es') ? 'Ayer' : 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  
  // Fallback to date-fns for older
  return formatDistanceToNow(then, { 
    addSuffix: false, 
    locale: getDateLocale(lang) 
  });
};

// Truncate text to max lines (approx characters)
const truncateText = (text: string, maxChars: number = 100) => {
  if (!text || text.length <= maxChars) return text;
  return text.substring(0, maxChars).trim() + '…';
};

export const FeedItemCard = ({ item, onReact, isBusiness }: FeedItemCardProps) => {
  const { t, i18n } = useTranslation();
  const [reactingType, setReactingType] = useState<ReactionType | null>(null);

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.challenge_completed;
  const Icon = config.icon;

  const handleReact = async (reactionType: ReactionType) => {
    setReactingType(reactionType);
    await onReact(item.id, reactionType);
    setReactingType(null);
  };

  // XIMAtar info comes from payload (privacy-safe, no joins to ximatar tables)
  const ximatarImage = item.payload.ximatar_image;
  const ximatarName = item.payload.ximatar_name || 'XIMAtar';
  const level = item.payload.level;
  const skillTags = item.payload.skill_tags || [];
  const interestCount = item.payload.count;

  // Render type-specific content
  const renderTypeContent = () => {
    switch (item.type) {
      case 'challenge_completed':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {level 
                ? t('feed.card.challenge_level', 'Level {{level}} challenge', { level })
                : truncateText(item.payload.normalized_text, 80)
              }
            </p>
            <div className="flex flex-wrap gap-1.5">
              {level && (
                <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">
                  Level {level}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-300 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('feed.chip.verified', 'Verified')}
              </Badge>
            </div>
          </div>
        );

      case 'skill_validated':
        const skillName = skillTags[0] || item.payload.normalized_text?.replace('Validated skill: ', '') || 'Skill';
        return (
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">
              {skillName}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('feed.card.verified_signal', 'Verified signal')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skillTags.slice(0, 3).map((skill, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
                >
                  {skill}
                </Badge>
              ))}
              <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-300 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('feed.chip.verified', 'Verified')}
              </Badge>
            </div>
          </div>
        );

      case 'level_reached':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t('feed.card.advanced_to_level', 'Advanced to Level {{level}}', { level: level || 3 })}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {t('feed.card.qualification_verified', 'Qualification signal verified')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-300 border-0">
                Level {level || 3}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-300 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('feed.chip.verified', 'Verified')}
              </Badge>
            </div>
          </div>
        );

      case 'interest_aggregated':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t('feed.card.companies_interested', '{{count}} companies showed interest', { count: interestCount || 1 })}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {t('feed.card.identity_unlocked', 'Identity unlocked only on mutual interest')}
            </p>
          </div>
        );

      default:
        // Fallback to normalized_text
        return (
          <div className="space-y-2">
            <p className="text-sm text-foreground line-clamp-2">
              {truncateText(item.payload.normalized_text, 100)}
            </p>
            {level && (
              <Badge variant="secondary" className="text-xs bg-muted">
                Level {level}
              </Badge>
            )}
          </div>
        );
    }
  };

  // Get type title
  const getTypeTitle = () => {
    switch (item.type) {
      case 'challenge_completed':
        return t('feed.titles.challenge_completed', 'Challenge completed');
      case 'skill_validated':
        return t('feed.titles.skill_validated', 'Skill validated');
      case 'level_reached':
        return t('feed.titles.level_reached', 'Progress update');
      case 'interest_aggregated':
        return t('feed.titles.interest_aggregated', 'Market signal');
      default:
        return t('feed.titles.signal', 'Signal');
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 border-border/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* XIMAtar Avatar - Anonymous */}
          <Avatar className="h-10 w-10 border-2 border-primary/20 flex-shrink-0">
            {ximatarImage && (
              <AvatarImage 
                src={ximatarImage.startsWith('/') ? ximatarImage : `/ximatars/${ximatarImage}.png`} 
                alt={ximatarName}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {ximatarName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header with type icon, title, and time */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1 rounded", config.bgColor)}>
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {getTypeTitle()}
              </span>
              <span className="text-xs text-muted-foreground/60 ml-auto">
                {formatRelativeTime(item.created_at, i18n.language)}
              </span>
            </div>

            {/* XIMAtar name + type-specific content */}
            <div className="mb-3">
              <span className="text-xs font-medium text-primary/80 capitalize">
                {ximatarName}
              </span>
              <div className="mt-1.5">
                {renderTypeContent()}
              </div>
            </div>

            {/* Reactions - semantic, not social */}
            <div className="flex items-center gap-1 pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1 px-2",
                  reactingType === 'interested' && "opacity-50"
                )}
                onClick={() => handleReact('interested')}
                disabled={reactingType !== null}
              >
                <Heart className="h-3 w-3" />
                <span className="hidden sm:inline">{t('feed.reaction.interested', 'Interested')}</span>
                {item.reactions?.interested ? (
                  <span className="text-muted-foreground text-[10px]">({item.reactions.interested})</span>
                ) : null}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1 px-2",
                  reactingType === 'relevant_skill' && "opacity-50"
                )}
                onClick={() => handleReact('relevant_skill')}
                disabled={reactingType !== null}
              >
                <Target className="h-3 w-3" />
                <span className="hidden sm:inline">{t('feed.reaction.relevant', 'Relevant')}</span>
                {item.reactions?.relevant_skill ? (
                  <span className="text-muted-foreground text-[10px]">({item.reactions.relevant_skill})</span>
                ) : null}
              </Button>

              {isBusiness && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1 px-2 ml-auto",
                    reactingType === 'save_for_review' && "opacity-50"
                  )}
                  onClick={() => handleReact('save_for_review')}
                  disabled={reactingType !== null}
                >
                  <Bookmark className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('feed.reaction.save', 'Save')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
