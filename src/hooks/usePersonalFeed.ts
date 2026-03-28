import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

export type FeedCategory = 'all' | 'growth' | 'opportunities' | 'milestones';

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
}

const CATEGORY_TYPES: Record<FeedCategory, string[] | null> = {
  all: null,
  growth: ['trajectory_update', 'growth_recommendation', 'growth_test_result', 'ximatar_progress'],
  opportunities: ['challenge_invitation', 'challenge_result', 'company_view', 'actor_interaction'],
  milestones: ['milestone', 'community_achievement'],
};

export const usePersonalFeed = (category: FeedCategory = 'all') => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: feedItems = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-feed', user?.id, category],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('feed_items')
        .select('id, user_id, feed_type, title, body, icon, action_url, action_label, actor_type, actor_name, actor_avatar, is_read, metadata, priority, created_at')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);

      const types = CATEGORY_TYPES[category];
      if (types) {
        query = query.in('feed_type', types);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PersonalFeedItem[];
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

  const unreadCount = feedItems.filter(i => !i.is_read).length;

  return { feedItems, isLoading, refetch, markAsRead, unreadCount };
};
