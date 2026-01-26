import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

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
  [key: string]: unknown;
}

export interface SingleFeedItem {
  id: string;
  type: string;
  source: string;
  subject_ximatar_id: string;
  payload: FeedItemPayload;
  created_at: string;
  priority: number;
}

/**
 * Hook for the "one news per login" feed pattern.
 * Returns exactly ONE unseen feed item for the current user,
 * or null if no new items are available.
 * 
 * GDPR-safe: Uses audience-scoped RLS and RPC for strict isolation.
 */
export const useNextFeedItem = () => {
  const { user } = useUser();
  const [item, setItem] = useState<SingleFeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noNewItems, setNoNewItems] = useState(false);

  const fetchNextItem = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setNoNewItems(true);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Call the secure RPC that returns one feed item and marks it as seen
      const { data, error: fetchError } = await supabase.rpc('get_next_feed_item');

      if (fetchError) {
        console.error('[useNextFeedItem] Error fetching next item:', fetchError);
        setError('Failed to load update');
        return;
      }

      // RPC returns an array, we expect 0 or 1 row
      if (data && Array.isArray(data) && data.length > 0) {
        const rawItem = data[0];
        setItem({
          id: rawItem.id,
          type: rawItem.type,
          source: rawItem.source,
          subject_ximatar_id: rawItem.subject_ximatar_id,
          payload: (rawItem.payload || {}) as FeedItemPayload,
          created_at: rawItem.created_at,
          priority: rawItem.priority || 0
        });
        setNoNewItems(false);
      } else {
        setItem(null);
        setNoNewItems(true);
      }
    } catch (err) {
      console.error('[useNextFeedItem] Exception:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNextItem();
  }, [fetchNextItem]);

  // Refresh function to get the next item after dismissing current
  const refresh = useCallback(() => {
    setLoading(true);
    setItem(null);
    fetchNextItem();
  }, [fetchNextItem]);

  return {
    item,
    loading,
    error,
    noNewItems,
    refresh
  };
};
