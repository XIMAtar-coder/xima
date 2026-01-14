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
  Award,
  Zap,
  Heart,
  Bookmark,
  Target
} from 'lucide-react';
import { FeedItem, ReactionType } from '@/hooks/useFeedItems';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
    label: 'feed.type.challenge_completed'
  },
  skill_validated: {
    icon: Star,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'feed.type.skill_validated'
  },
  level_reached: {
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'feed.type.level_reached'
  },
  badge_unlocked: {
    icon: Award,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'feed.type.badge_unlocked'
  },
  interest_aggregated: {
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'feed.type.interest_aggregated'
  }
};

export const FeedItemCard = ({ item, onReact, isBusiness }: FeedItemCardProps) => {
  const { t } = useTranslation();
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 border-border/50">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* XIMAtar Avatar - Anonymous */}
          <Avatar className="h-12 w-12 border-2 border-primary/20 flex-shrink-0">
            {ximatarImage && (
              <AvatarImage 
                src={ximatarImage.startsWith('/') ? ximatarImage : `/ximatars/${ximatarImage}.png`} 
                alt={ximatarName}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {ximatarName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header with type and time */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <Badge variant="secondary" className="text-xs capitalize">
                {t(config.label, item.type.replace('_', ' '))}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Normalized text - AI generated, neutral tone */}
            <p className="text-sm text-foreground mb-3">
              <span className="font-medium text-primary capitalize">{ximatarName}</span>
              {' • '}
              {item.payload.normalized_text}
            </p>

            {/* Skill tags if present */}
            {item.payload.skill_tags && item.payload.skill_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.payload.skill_tags.map((skill, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs bg-muted/50"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}

            {/* Level/Badge indicators */}
            {item.payload.level && (
              <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs mb-3">
                Level {item.payload.level}
              </Badge>
            )}

            {/* Reactions - semantic, not social */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5",
                  reactingType === 'interested' && "opacity-50"
                )}
                onClick={() => handleReact('interested')}
                disabled={reactingType !== null}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>{t('feed.reaction.interested', 'Interested')}</span>
                {item.reactions?.interested && (
                  <span className="text-muted-foreground">({item.reactions.interested})</span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5",
                  reactingType === 'relevant_skill' && "opacity-50"
                )}
                onClick={() => handleReact('relevant_skill')}
                disabled={reactingType !== null}
              >
                <Target className="h-3.5 w-3.5" />
                <span>{t('feed.reaction.relevant', 'Relevant')}</span>
                {item.reactions?.relevant_skill && (
                  <span className="text-muted-foreground">({item.reactions.relevant_skill})</span>
                )}
              </Button>

              {isBusiness && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 text-xs gap-1.5 ml-auto",
                    reactingType === 'save_for_review' && "opacity-50"
                  )}
                  onClick={() => handleReact('save_for_review')}
                  disabled={reactingType !== null}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>{t('feed.reaction.save', 'Save')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
