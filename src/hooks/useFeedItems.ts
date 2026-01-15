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
  normalized_text?: string;
  skill_tags?: string[];
  skill?: string;
  level?: number;
  badge?: string;
  count?: number;
  locale?: string;
  ximatar_name?: string;
  ximatar_image?: string;
  challenge_context?: string;
  // Demo markers (hidden in production)
  demo?: boolean;
  demo_batch?: string;
  demo_label?: string;
  // Allow additional unknown fields
  [key: string]: unknown;
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
}

export type ReactionType = 'interested' | 'relevant_skill' | 'save_for_review';

// Debug mode check
const isDebugMode = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1' || import.meta.env.DEV;
};

export const useFeedItems = () => {
  const { user } = useUser();
  const { isBusiness } = useBusinessRole();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeedItems = useCallback(async (cursor?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setDebugError(null);
      
      // Privacy-safe query: NO joins to ximatars, profiles, or users
      // Only select fields from feed_items table
      let query = supabase
        .from('feed_items')
        .select('id, type, source, subject_ximatar_id, payload, visibility, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[useFeedItems] Error fetching feed:', fetchError);
        setError('Failed to load feed');
        if (isDebugMode()) {
          setDebugError(`${fetchError.code}: ${fetchError.message} (hint: ${fetchError.hint || 'none'})`);
        }
        return;
      }

      if (data) {
        // Filter out demo items in production unless debug mode
        // Also add defensive payload parsing
        let filteredData = data;
        if (!isDebugMode()) {
          filteredData = data.filter(item => {
            // Defensive: ensure payload is an object
            let payload: FeedItemPayload = {};
            if (item.payload && typeof item.payload === 'object') {
              payload = item.payload as unknown as FeedItemPayload;
            } else if (typeof item.payload === 'string') {
              try {
                payload = JSON.parse(item.payload);
              } catch {
                payload = {};
              }
            }
            return !payload?.demo;
          });
        }
        
        // Fetch reaction counts for each item (using privacy-safe RPC)
        const itemsWithReactions = await Promise.all(
          filteredData.map(async (item) => {
            try {
              const { data: reactions, error: reactionError } = await supabase.rpc('get_feed_item_reactions', {
                item_id: item.id
              });

              if (reactionError) {
                console.warn('[useFeedItems] Error fetching reactions for item:', item.id, reactionError);
                return {
                  ...item,
                  payload: item.payload as unknown as FeedItemPayload,
                  visibility: item.visibility as unknown as FeedItem['visibility'],
                  reactions: {}
                } as FeedItem;
              }

              return {
                ...item,
                payload: item.payload as unknown as FeedItemPayload,
                visibility: item.visibility as unknown as FeedItem['visibility'],
                reactions: reactions || {}
              } as FeedItem;
            } catch (err) {
              console.warn('[useFeedItems] Exception fetching reactions:', err);
              return {
                ...item,
                payload: item.payload as unknown as FeedItemPayload,
                visibility: item.visibility as unknown as FeedItem['visibility'],
                reactions: {}
              } as FeedItem;
            }
          })
        );

        if (cursor) {
          setItems(prev => [...prev, ...itemsWithReactions]);
        } else {
          setItems(itemsWithReactions);
        }
        
        setHasMore(filteredData.length === 50);
      }
    } catch (err) {
      console.error('[useFeedItems] Exception:', err);
      setError('An error occurred');
      if (isDebugMode() && err instanceof Error) {
        setDebugError(err.message);
      }
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
      const { error } = await supabase.rpc('add_feed_reaction', {
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
    debugError,
    hasMore,
    loadMore,
    refresh,
    addReaction,
    isBusiness
  };
};
