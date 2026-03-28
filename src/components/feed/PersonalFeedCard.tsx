import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, CheckCircle, RefreshCw, Zap,
  BookOpen, Star, FileText, Users, Target, Award, Info, LucideIcon,
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

interface PersonalFeedCardProps {
  item: PersonalFeedItem;
  onMarkRead?: (id: string) => void;
}

export const PersonalFeedCard = ({ item, onMarkRead }: PersonalFeedCardProps) => {
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

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer hover:shadow-md',
        item.priority >= 3 && 'border-primary/30 bg-primary/5',
        item.priority === 1 && 'opacity-80',
        !item.is_read && 'border-l-4 border-l-primary'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex-shrink-0 rounded-full p-2',
            item.priority >= 3 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <IconComponent className="h-5 w-5" />
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

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {item.actor_name && (
                  <Badge variant="secondary" className="text-xs">{item.actor_name}</Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {(item.feed_type || '').replace(/_/g, ' ')}
                </Badge>
              </div>
              {item.action_url && item.action_label && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={handleAction}>
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
