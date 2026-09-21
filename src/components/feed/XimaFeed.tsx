import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { InterestSignalsCard } from './InterestSignalsCard';
import { FeedActiveThreads } from './FeedActiveThreads';
import { FeedCategoryContent } from './PersonalFeedView';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { usePersonalFeed, type FeedCategory } from '@/hooks/usePersonalFeed';
import { useUser } from '@/context/UserContext';
import { useCandidateSnapshot } from '@/hooks/useCandidateSnapshot';
import { SectionIndex } from '@/components/candidate/SectionIndex';
import { Panel, Eyebrow } from '@/components/layout/PageHeader';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { formatScore, pillarName, readPillar } from '@/components/candidate/PillarBars';

interface XimaFeedProps {
  showChatAccess?: boolean;
  hasPendingChats?: boolean;
  onOpenConversations?: () => void;
}

/**
 * XIMA Feed — "spazio di osservazione": the four categories as an index on
 * the left, the updates as rows of one panel in the centre, the XIMAtar
 * context on the right (the one glass surface of the page).
 */
export const XimaFeed = ({ showChatAccess, hasPendingChats, onOpenConversations }: XimaFeedProps) => {
  const { t, i18n } = useTranslation();
  const { isBusiness } = useBusinessRole();
  const { user } = useUser();
  const { recentThreads, loadingThreads } = useRealtimeChat(user?.id);
  const [category, setCategory] = useState<FeedCategory>('for_you');
  const { unreadCount } = usePersonalFeed('for_you');
  const snapshot = useCandidateSnapshot();

  const handleOpenThread = () => {
    onOpenConversations?.();
  };

  const items = [
    { id: 'for_you', label: t('feed.tab.for_you', 'For you'), count: unreadCount },
    { id: 'growth', label: t('feed.tab.growth', 'Growth') },
    { id: 'opportunities', label: t('feed.tab.opportunities', 'Opportunities') },
    { id: 'discover', label: t('feed.tab.discover', 'Discover') },
  ];

  const heading: Record<FeedCategory, { title: string; status: string }> = {
    for_you: {
      title: t('feed.updates_title', 'Your updates'),
      status: unreadCount > 0
        ? t('feed.updates_today', { count: unreadCount, defaultValue: 'Today · {{count}} new' })
        : t('feed.updates_none', 'No new updates'),
    },
    growth: { title: t('feed.your_growth_path', 'Your growth path'), status: t('feed.status_growth', 'Growth Hub') },
    opportunities: { title: t('feed.opportunities_title', 'Your opportunities'), status: t('feed.status_opportunities', 'Matches and latest listings') },
    discover: { title: t('feed.discover_title', 'From the world of work and growth'), status: t('feed.status_discover', 'Coming soon') },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_300px]">
      <SectionIndex
        asTabs
        items={items}
        activeId={category}
        onSelect={(id) => setCategory(id as FeedCategory)}
        ariaLabel={t('feed.sections_label', 'Feed sections')}
        className="lg:sticky lg:top-20 lg:self-start"
      />

      <div className="min-w-0 space-y-5">
        {/* Interest signals for candidates */}
        {!isBusiness && <InterestSignalsCard onChatOpen={() => onOpenConversations?.()} />}

        {/* Contextual chat threads (mentor + business only) */}
        {!isBusiness && (
          <FeedActiveThreads threads={recentThreads} loading={loadingThreads} onOpenThread={handleOpenThread} />
        )}

        {/* Chat access notice */}
        {showChatAccess && hasPendingChats && (
          <Panel className="flex items-center justify-between gap-4 !py-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('feed.chat_available', 'You have conversations available')}</p>
                <p className="text-xs text-muted-foreground">{t('feed.chat_hint', 'Based on mutual interest signals')}</p>
              </div>
            </div>
            <Button size="sm" onClick={onOpenConversations}>{t('feed.open_chats', 'Open Chats')}</Button>
          </Panel>
        )}

        <Panel className="!p-0" role="tabpanel">
          <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--xs-line))] px-6 py-3.5">
            <strong className="text-[14px] font-semibold text-foreground">{heading[category].title}</strong>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{heading[category].status}</span>
          </div>
          <div className="px-6">
            <FeedCategoryContent category={category} />
          </div>
        </Panel>
      </div>

      <aside className="xs-glass self-start xl:sticky xl:top-20">
        <Eyebrow>{t('dashboard.ximatar_label', 'Your XIMAtar')}</Eyebrow>
        {snapshot.ximatarImage && (
          <div className="mt-3 h-20 w-20 overflow-hidden rounded-[10px] bg-[hsl(var(--xs-page))]">
            <OptimizedImage src={snapshot.ximatarImage} alt={snapshot.ximatarName || 'XIMAtar'} width={80} height={80} className="h-full w-full object-cover" />
          </div>
        )}
        <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.3px] text-foreground">{snapshot.ximatarName || '—'}</h3>
        <p className="text-[13px] text-muted-foreground">{snapshot.name}</p>
        <dl className="mt-4 space-y-3 border-t border-[hsl(var(--xs-line))] pt-4">
          {snapshot.strongest && (
            <div>
              <dt className="flex items-baseline justify-between text-[14px] text-foreground">
                <span>{pillarName(t, snapshot.strongest)}</span>
                <b className="font-mono text-[15px]">{formatScore(readPillar(snapshot.pillarScores, snapshot.strongest), i18n.language)}<small className="text-muted-foreground"> / 10</small></b>
              </dt>
              <dd className="text-[12px] text-muted-foreground">{t('dashboard.your_strength', 'Your strength')}</dd>
            </div>
          )}
          {snapshot.weakest && (
            <div>
              <dt className="flex items-baseline justify-between text-[14px] text-foreground">
                <span>{pillarName(t, snapshot.weakest)}</span>
                <b className="font-mono text-[15px]">{formatScore(readPillar(snapshot.pillarScores, snapshot.weakest), i18n.language)}<small className="text-muted-foreground"> / 10</small></b>
              </dt>
              <dd className="text-[12px] text-muted-foreground">{t('feed.area_to_grow', 'An area to grow')}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {snapshot.hasAssessment ? t('feed.assessment_done', 'Assessment completed') : t('feed.assessment_missing', 'Assessment to complete')}
        </p>
      </aside>
    </div>
  );
};
