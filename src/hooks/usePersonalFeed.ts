import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export type FeedCategory = 'for_you' | 'growth' | 'opportunities' | 'discover';

export interface PersonalFeedItem {
  id: string;
  user_id: string | null;
  feed_type: string;
  title: string | null;
  body: string | null;
  icon: string | null;
  action_url: string | null;
  action_label: string | null;
  actor_type: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  priority: number;
  created_at: string;
  _source: 'personal' | 'external';
}

export interface ExternalContentItem {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  image_url: string | null;
  content_type: string;
  target_archetypes: string[];
  target_pillars: string[];
  tags: string[];
  language: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  priority: number;
  published_at: string;
  created_at: string;
}

const PERSONAL_TYPES: Record<string, string[] | null> = {
  for_you: null, // all personal types
  growth: ['trajectory_update', 'growth_recommendation', 'growth_test_result', 'ximatar_progress'],
  opportunities: ['challenge_invitation', 'challenge_result', 'company_view', 'actor_interaction'],
  discover: null, // external only
};

export const usePersonalFeed = (category: FeedCategory = 'for_you') => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get user archetype for content matching
  const { data: profile } = useQuery({
    queryKey: ['feed-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('ximatar, ximatar_id, pillar_scores')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Last Growth Hub activity
  const { data: lastGrowthActivity } = useQuery({
    queryKey: ['lastGrowthActivity', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('growth_hub_progress' as any)
        .select('created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as unknown as { created_at: string; completed_at: string | null } | null;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const hoursSinceLastGrowth = (() => {
    if (!lastGrowthActivity) return null;
    const lastDate = (lastGrowthActivity as any).completed_at || (lastGrowthActivity as any).created_at;
    if (!lastDate) return null;
    return Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60));
  })();

  const userArchetype = (profile?.ximatar || '').toLowerCase();
  const pillarScores = (profile?.pillar_scores || {}) as Record<string, number>;
  const weakestPillar = Object.entries(pillarScores).sort(([, a], [, b]) => a - b)[0]?.[0] || '';

  const { data: feedItems = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-feed', user?.id, category, userArchetype],
    queryFn: async () => {
      if (!user?.id) return [];

      // For "discover" tab, only show external content
      if (category === 'discover') {
        const external = await fetchExternalContent(userArchetype);
        return external.map(toFeedItem);
      }

      // Fetch personal feed items
      let personalQuery = supabase
        .from('feed_items')
        .select('id, user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, actor_avatar, is_read, metadata, priority, created_at')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .not('feed_type', 'eq', 'system')
        .order('created_at', { ascending: false })
        .limit(30);

      const types = PERSONAL_TYPES[category];
      if (types) {
        personalQuery = personalQuery.in('feed_type', types);
      }

      const { data: personalData } = await personalQuery;
      const personalItems: PersonalFeedItem[] = ((personalData || []) as any[]).map(item => ({
        ...item,
        _source: 'personal' as const,
      }));

      // For "for_you", interleave external content
      if (category === 'for_you') {
        const external = await fetchExternalContent(userArchetype);
        return interleave(personalItems, external.map(toFeedItem));
      }

      // For "growth", add pillar-matched external content
      if (category === 'growth' && weakestPillar) {
        const external = await fetchExternalContent(userArchetype, weakestPillar);
        return interleave(personalItems, external.map(toFeedItem));
      }

      return personalItems;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('feed_items')
        .update({ is_read: true } as any)
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-feed'] });
    },
  });

  const trackEngagement = useMutation({
    mutationFn: async (contentId: string) => {
      await supabase.rpc('increment_engagement', { content_id: contentId } as any);
    },
  });

  const unreadCount = feedItems.filter(i => !i.is_read && i._source === 'personal').length;

  return { feedItems, isLoading, refetch, markAsRead, trackEngagement, unreadCount, userArchetype, hoursSinceLastGrowth };
};

async function fetchExternalContent(archetype: string, pillar?: string): Promise<ExternalContentItem[]> {
  let query = supabase
    .from('feed_external_content' as any)
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(10);

  const { data } = await query;
  
  // Client-side filter for archetype matching (since array contains is tricky via API)
  return ((data || []) as any[]).filter((item: any) => {
    const archetypes = item.target_archetypes || [];
    const pillars = item.target_pillars || [];
    const archetypeMatch = archetypes.length === 0 || archetypes.includes(archetype);
    const pillarMatch = !pillar || pillars.length === 0 || pillars.includes(pillar);
    return archetypeMatch && (pillar ? pillarMatch : true);
  });
}

function toFeedItem(ext: ExternalContentItem): PersonalFeedItem {
  return {
    id: ext.id,
    user_id: null,
    feed_type: 'external_content',
    title: ext.title,
    body: ext.summary,
    icon: ext.content_type === 'video' ? 'play-circle' : ext.content_type === 'podcast' ? 'headphones' : 'file-text',
    action_url: ext.source_url,
    action_label: 'Read More →',
    actor_type: 'source',
    actor_name: ext.source_name,
    actor_avatar: null,
    is_read: false,
    metadata: {
      source_name: ext.source_name,
      source_url: ext.source_url,
      content_type: ext.content_type,
      target_pillars: ext.target_pillars,
      target_archetypes: ext.target_archetypes,
      is_sponsored: ext.is_sponsored,
      tags: ext.tags,
    },
    priority: ext.priority,
    created_at: ext.published_at || ext.created_at,
    _source: 'external',
  };
}

function interleave(personal: PersonalFeedItem[], external: PersonalFeedItem[]): PersonalFeedItem[] {
  const merged: PersonalFeedItem[] = [];
  let extIdx = 0;
  for (let i = 0; i < personal.length; i++) {
    merged.push(personal[i]);
    if ((i + 1) % 3 === 0 && extIdx < external.length) {
      merged.push(external[extIdx++]);
    }
  }
  while (extIdx < external.length) {
    merged.push(external[extIdx++]);
  }
  return merged;
}
