import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/log';

/**
 * Active pipeline chat threads for the signed-in user. Shared by the thread
 * list and the Messages page header (same query key, so the data is fetched
 * once and refreshed every 15 s).
 */
export function usePipelineChatThreads(role: 'business' | 'candidate') {
  return useQuery({
    queryKey: ['pipeline-chat-threads', role],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('pipeline_chat_threads')
        .select('*')
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        log.error('Failed to load pipeline threads:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 15000,
  });
}
