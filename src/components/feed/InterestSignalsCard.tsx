import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Check, 
  MessageCircle, 
  Loader2,
  Sparkles,
  Eye
} from 'lucide-react';
import { useMutualInterest, PendingInterest } from '@/hooks/useMutualInterest';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface InterestSignalsCardProps {
  onChatOpen?: (threadId: string) => void;
}

export const InterestSignalsCard = ({ onChatOpen }: InterestSignalsCardProps) => {
  const { t } = useTranslation();
  const { 
    pendingInterests, 
    pendingCount, 
    loading, 
    acceptInterest 
  } = useMutualInterest();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (interest: PendingInterest) => {
    setAcceptingId(interest.id);
    const result = await acceptInterest(interest.id);
    setAcceptingId(null);

    if (result.success) {
      toast.success(t('feed.interest.accepted_success', 'Interest accepted! Chat is now available.'));
      if (result.threadId && onChatOpen) {
        onChatOpen(result.threadId);
      }
    } else {
      toast.error(result.error || t('common.error'));
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (pendingInterests.length === 0) {
    return null; // Don't show if no interests
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {t('feed.interest.title', 'Interest Signals')}
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="default" className="bg-primary">
              {pendingCount} {t('feed.interest.pending', 'pending')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('feed.interest.subtitle', 'Companies have shown interest in your profile. Accept to unlock chat.')}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {pendingInterests.map((interest) => (
              <div 
                key={interest.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  interest.accepted 
                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-background border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "p-2 rounded-full flex-shrink-0",
                      interest.accepted ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                    )}>
                      <Building2 className={cn(
                        "h-4 w-4",
                        interest.accepted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {interest.business_name}
                      </p>
                      {interest.hiring_goal_title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {interest.hiring_goal_title}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(interest.interested_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {interest.accepted ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="gap-1.5 text-green-600 dark:text-green-400"
                        onClick={() => onChatOpen?.('')}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {t('feed.interest.open_chat', 'Chat')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(interest)}
                        disabled={acceptingId !== null}
                        className="gap-1.5"
                      >
                        {acceptingId === interest.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {t('feed.interest.accept', 'Accept')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 mt-4 pt-3 border-t border-border/50">
          <Eye className="h-3.5 w-3.5 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground/70">
            {t('feed.interest.privacy_note', 
              'Company names are revealed only after showing interest. Your identity remains anonymous until you accept.'
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
