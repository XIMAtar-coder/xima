import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { FeedHeader } from './FeedHeader';
import { SingleFeedCard } from './SingleFeedCard';
import { InterestSignalsCard } from './InterestSignalsCard';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessRole } from '@/hooks/useBusinessRole';

interface XimaFeedProps {
  showChatAccess?: boolean;
  hasPendingChats?: boolean;
  onOpenConversations?: () => void;
}

/**
 * GDPR-Safe XIMA Feed - "One news per login" pattern.
 * 
 * Replaces the infinite scroll feed with a single audience-scoped news card.
 * No global visibility, strict RLS enforcement at database level.
 */
export const XimaFeed = ({ showChatAccess, hasPendingChats, onOpenConversations }: XimaFeedProps) => {
  const { t } = useTranslation();
  const { isBusiness } = useBusinessRole();

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader />

      {/* Interest signals for candidates - shows companies that showed interest */}
      {!isBusiness && (
        <div className="mb-6">
          <InterestSignalsCard onChatOpen={() => onOpenConversations?.()} />
        </div>
      )}

      {/* Chat access notice - only shown when mutual interest exists */}
      {showChatAccess && hasPendingChats && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {t('feed.chat_available', 'You have conversations available')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('feed.chat_hint', 'Based on mutual interest signals')}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={onOpenConversations}
            >
              {t('feed.open_chats', 'Open Chats')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Single feed card - "One news per login" */}
      <SingleFeedCard className="mb-6" />

      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground/60 text-center mt-8 max-w-md mx-auto">
        {t('feed.privacy_notice', 
          'All signals are anonymized and AI-normalized. XIMAtar identities are shown, not personal information. Reactions are aggregated and never attributed to individuals.'
        )}
      </p>
    </div>
  );
};
