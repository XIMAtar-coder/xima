import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';

export type FeedItemType = 
  | 'challenge_completed' 
  | 'skill_validated' 
  | 'level_reached' 
  | 'badge_unlocked' 
  | 'interest_aggregated';

export type FeedSource = 'candidate' | 'business' | 'system';

export interface FeedItemPayload {
  normalized_text: string;
  skill_tags?: string[];
  level?: number;
  badge?: string;
  count?: number;
  locale?: string;
  ximatar_name?: string;
  ximatar_image?: string;
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  source: FeedSource;
  subject_ximatar_id: string;
  payload: FeedItemPayload;
  visibility: {
    public?: boolean;
    business_ids?: string[];
    goal_ids?: string[];
    ximatar_ids?: string[];
  };
  created_at: string;
  reactions?: Record<string, number>;
  ximatar?: {
    id: string;
    name: string;
    image: string;
  };
}

export type ReactionType = 'interested' | 'relevant_skill' | 'save_for_review';

export const useFeedItems = () => {
  const { user } = useUser();
  const { isBusiness } = useBusinessRole();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeedItems = useCallback(async (cursor?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      let query = supabase
        .from('feed_items')
        .select(`
          id,
          type,
          source,
          subject_ximatar_id,
          payload,
          visibility,
          created_at,
          ximatars:subject_ximatar_id (
            id,
            name,
            image
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[useFeedItems] Error fetching feed:', fetchError);
        setError('Failed to load feed');
        return;
      }

      if (data) {
        const itemsWithReactions = await Promise.all(
          data.map(async (item: any) => {
            // Fetch reaction counts for each item
            const { data: reactions } = await supabase.rpc('get_feed_item_reactions', {
              item_id: item.id
            });

            return {
              ...item,
              reactions: reactions || {},
              ximatar: item.ximatars
            };
          })
        );

        if (cursor) {
          setItems(prev => [...prev, ...itemsWithReactions]);
        } else {
          setItems(itemsWithReactions);
        }
        
        setHasMore(data.length === 20);
      }
    } catch (err) {
      console.error('[useFeedItems] Exception:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add reaction
  const addReaction = useCallback(async (
    feedItemId: string,
    reactionType: ReactionType
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('add_feed_reaction', {
        p_feed_item_id: feedItemId,
        p_reaction_type: reactionType,
        p_reactor_type: isBusiness ? 'business' : 'candidate'
      });

      if (error) {
        console.error('[useFeedItems] Error adding reaction:', error);
        return false;
      }

      // Optimistically update local state
      setItems(prev => prev.map(item => {
        if (item.id === feedItemId) {
          const currentCount = item.reactions?.[reactionType] || 0;
          return {
            ...item,
            reactions: {
              ...item.reactions,
              [reactionType]: currentCount + 1
            }
          };
        }
        return item;
      }));

      return true;
    } catch (err) {
      console.error('[useFeedItems] Exception adding reaction:', err);
      return false;
    }
  }, [user, isBusiness]);

  // Load more items
  const loadMore = useCallback(() => {
    if (items.length > 0 && hasMore && !loading) {
      const lastItem = items[items.length - 1];
      fetchFeedItems(lastItem.created_at);
    }
  }, [items, hasMore, loading, fetchFeedItems]);

  // Initial load
  useEffect(() => {
    fetchFeedItems();
  }, [fetchFeedItems]);

  // Refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    setItems([]);
    fetchFeedItems();
  }, [fetchFeedItems]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    addReaction,
    isBusiness
  };
};
