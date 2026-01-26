import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatUser {
  id: string;
  name: string;
  // SECURITY: email removed to prevent enumeration - P0-2 fix
  avatar?: any;
  ximatar?: string;
  lastSeen?: string;
  status: 'online' | 'away' | 'offline';
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  is_read?: boolean;
  sender?: {
    name: string;
    avatar?: any;
  };
}

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 400;
const MAX_RESULTS = 15;

export interface RecentThread {
  thread_id: string;
  other_user: ChatUser;
  last_message?: string;
  last_message_time?: string;
}

export const useRealtimeChat = (currentUserId: string | undefined) => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentThreads, setRecentThreads] = useState<RecentThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sending, setSending] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current user's profile.id on mount
  useEffect(() => {
    if (!currentUserId) {
      setCurrentProfileId(null);
      return;
    }

    const fetchProfileId = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (error) {
        console.error('[useRealtimeChat] Error fetching profile id:', error);
      } else if (data) {
        setCurrentProfileId(data.id);
        console.log('[useRealtimeChat] Current profile id:', data.id);
      }
    };

    fetchProfileId();
  }, [currentUserId]);

  // Fetch recent conversation threads
  const fetchRecentThreads = useCallback(async () => {
    if (!currentProfileId) return;
    
    setLoadingThreads(true);
    console.log('[useRealtimeChat] Fetching recent threads for profile:', currentProfileId);

    try {
      // Get threads the user participates in
      const { data: myParticipations, error: partError } = await supabase
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', currentProfileId);

      if (partError) {
        console.error('[useRealtimeChat] Error fetching participations:', partError);
        return;
      }

      if (!myParticipations || myParticipations.length === 0) {
        setRecentThreads([]);
        return;
      }

      const threadIds = myParticipations.map(p => p.thread_id);

      // For each thread, get the other participant
      const threads: RecentThread[] = [];

      for (const threadId of threadIds) {
        // Get the other participant
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('thread_id', threadId)
          .neq('user_id', currentProfileId)
          .maybeSingle();

        if (!otherParticipant) continue;

        // Get user profile info - SECURITY: email removed (P0-2 fix)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, name, full_name, avatar, ximatar')
          .eq('id', otherParticipant.user_id)
          .maybeSingle();

        if (!profile) continue;

        // Get last message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('body, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        threads.push({
          thread_id: threadId,
          other_user: {
            id: profile.user_id || profile.id,
            name: profile.full_name || profile.name || 'User',
            // SECURITY: email removed (P0-2 fix)
            avatar: profile.avatar,
            ximatar: profile.ximatar,
            status: 'offline'
          },
          last_message: lastMsg?.body,
          last_message_time: lastMsg?.created_at
        });
      }

      // Sort by last message time (newest first)
      threads.sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setRecentThreads(threads);
      console.log('[useRealtimeChat] Recent threads:', threads);
    } catch (err) {
      console.error('[useRealtimeChat] Exception fetching threads:', err);
    } finally {
      setLoadingThreads(false);
    }
  }, [currentProfileId]);

  // Fetch recent threads when profile id is available
  useEffect(() => {
    if (currentProfileId) {
      fetchRecentThreads();
    }
  }, [currentProfileId, fetchRecentThreads]);

  // Search users with debounce
  // SECURITY: P0-2 fix - Only search users who are already in threads with current user
  // or have mutual interest. No global email search allowed.
  const searchUsers = useCallback(async (query: string) => {
    if (!currentUserId || !currentProfileId) return;
    
    // Clear results if query too short
    if (query.length < MIN_SEARCH_LENGTH) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setFetchError(null);

    try {
      // SECURITY: Only search within users the current user can legitimately contact:
      // 1. Users they already have a thread with
      // 2. This prevents global user enumeration
      
      // Get thread IDs the user participates in
      const { data: myThreads } = await supabase
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', currentProfileId);
      
      const threadIds = myThreads?.map(t => t.thread_id) || [];
      
      if (threadIds.length === 0) {
        // No threads = no one to search
        setUsers([]);
        setHasSearched(true);
        setSearching(false);
        return;
      }
      
      // Get other participants from those threads
      const { data: otherParticipants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .in('thread_id', threadIds)
        .neq('user_id', currentProfileId);
      
      const allowedProfileIds = [...new Set(otherParticipants?.map(p => p.user_id) || [])];
      
      if (allowedProfileIds.length === 0) {
        setUsers([]);
        setHasSearched(true);
        setSearching(false);
        return;
      }
      
      // Search only within allowed users (no email in query or results)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, full_name, avatar, ximatar')
        .in('id', allowedProfileIds)
        .or(`full_name.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(MAX_RESULTS);

      if (error) {
        console.error('[useRealtimeChat] Search error:', error);
        setFetchError(`Search failed: ${error.message}`);
        setUsers([]);
      } else if (data) {
        const mappedUsers = data
          .filter(user => user.user_id)
          .map((user) => ({
            id: user.user_id,
            name: user.full_name || user.name || `User ${user.user_id?.slice(0, 6)}`,
            // SECURITY: No email exposed
            avatar: user.avatar,
            ximatar: user.ximatar,
            status: 'offline' as const,
            unreadCount: 0
          }));
        setUsers(mappedUsers);
      }
      setHasSearched(true);
    } catch (err) {
      console.error('[useRealtimeChat] Search exception:', err);
      setFetchError('Search failed unexpectedly');
      setUsers([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }, [currentUserId, currentProfileId]);

  // Debounced search handler
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < MIN_SEARCH_LENGTH) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(query);
    }, DEBOUNCE_MS);
  }, [searchUsers]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          thread_id,
          sender_id,
          body,
          created_at
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useRealtimeChat] Error fetching messages:', error);
        return;
      }

      if (data) {
        // Fetch sender profiles separately
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, full_name, avatar')
          .in('user_id', senderIds);

        const profileMap = new Map(
          profiles?.map(p => [p.user_id, { name: p.full_name || p.name || 'User', avatar: p.avatar }]) || []
        );

        setMessages(
          data.map((msg) => ({
            ...msg,
            sender: profileMap.get(msg.sender_id) || { name: 'User' }
          }))
        );
      }
    } catch (err) {
      console.error('[useRealtimeChat] Exception fetching messages:', err);
    }
  }, []);

  // GDPR-SAFE: Thread creation is now restricted to B2C and M2C only via RPC
  // Legacy openThread is deprecated - use createSecureThread instead
  const openThread = useCallback(async (otherUserId: string) => {
    console.warn('[useRealtimeChat] openThread is deprecated. Direct thread creation is no longer supported for privacy compliance.');
    setThreadError('Direct thread creation is disabled. Use mutual interest or mentor match to initiate conversations.');
  }, []);

  /**
   * Create a secure chat thread using the new RPC.
   * Validates mutual_interest (B2C) or mentor_match (M2C) server-side.
   */
  const createSecureThread = useCallback(async (
    threadType: 'business_candidate' | 'mentor_candidate',
    candidateProfileId: string,
    businessId?: string,
    mentorProfileId?: string
  ): Promise<string | null> => {
    if (!currentUserId || !currentProfileId) {
      setThreadError('Not authenticated');
      return null;
    }

    try {
      setThreadError(null);
      
      const { data, error } = await supabase.rpc('create_chat_thread', {
        p_thread_type: threadType,
        p_candidate_profile_id: candidateProfileId,
        p_business_id: businessId || null,
        p_mentor_profile_id: mentorProfileId || null
      });

      if (error) {
        console.error('[useRealtimeChat] Error creating secure thread:', error);
        setThreadError(error.message);
        return null;
      }

      if (data) {
        const threadId = data as string;
        setSelectedThread(threadId);
        await fetchMessages(threadId);
        await fetchRecentThreads(); // Refresh thread list
        return threadId;
      }

      return null;
    } catch (err) {
      console.error('[useRealtimeChat] Exception creating secure thread:', err);
      setThreadError('Failed to create conversation');
      return null;
    }
  }, [currentUserId, currentProfileId, fetchMessages, fetchRecentThreads]);

  // Open an existing thread (for participants only - RLS enforced)
  const openExistingThread = useCallback(async (threadId: string, otherUser: ChatUser) => {
    setSelectedThread(threadId);
    setSelectedUserId(otherUser.id);
    setUsers([otherUser]);
    await fetchMessages(threadId);
  }, [fetchMessages]);
  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    if (!selectedThread || !currentProfileId || !body.trim()) {
      console.log('[useRealtimeChat] sendMessage: Missing required data', { selectedThread, currentProfileId, hasBody: !!body.trim() });
      return false;
    }

    console.log('[useRealtimeChat] Sending message:', { 
      thread_id: selectedThread, 
      sender_id: currentProfileId, 
      body: body.trim().substring(0, 50) + '...' 
    });

    setSending(true);
    setSendError(null);

    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      thread_id: selectedThread,
      sender_id: currentProfileId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      sender: { name: 'You' }
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: selectedThread,
          sender_id: currentProfileId,
          body: body.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('[useRealtimeChat] Error sending message:', error);
        setSendError(`Failed to send: ${error.message}`);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        return false;
      }

      console.log('[useRealtimeChat] Message sent successfully:', data);
      
      // Replace optimistic message with real one (realtime will also fire, but we handle duplicates)
      setMessages(prev => prev.map(m => 
        m.id === optimisticId 
          ? { ...m, id: data.id } 
          : m
      ));
      
      return true;
    } catch (err) {
      console.error('[useRealtimeChat] Exception sending message:', err);
      setSendError('An unexpected error occurred');
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      return false;
    } finally {
      setSending(false);
    }
  }, [selectedThread, currentProfileId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedThread) return;

    console.log('[useRealtimeChat] Subscribing to thread:', selectedThread);

    const channel: RealtimeChannel = supabase
      .channel(`chat-thread-${selectedThread}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${selectedThread}`
        },
        async (payload) => {
          console.log('[useRealtimeChat] New message received:', payload);
          // Fetch the new message with sender info
          const newMsg = payload.new as any;
          
          // Get sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('user_id, name, full_name, avatar')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();

          const messageWithSender: ChatMessage = {
            id: newMsg.id,
            thread_id: newMsg.thread_id,
            sender_id: newMsg.sender_id,
            body: newMsg.body,
            created_at: newMsg.created_at,
            sender: senderProfile 
              ? { name: senderProfile.full_name || senderProfile.name || 'User', avatar: senderProfile.avatar }
              : { name: 'User' }
          };

          // Avoid duplicates (in case optimistic update already added it)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, messageWithSender];
          });
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeChat] Subscription status:', status);
      });

    return () => {
      console.log('[useRealtimeChat] Unsubscribing from thread:', selectedThread);
      supabase.removeChannel(channel);
    };
  }, [selectedThread]);

  // Get selected user - check both search results and recent threads
  const selectedUser = users.find(u => u.id === selectedUserId) 
    || recentThreads.find(t => t.other_user.id === selectedUserId)?.other_user
    || null;

  return {
    users,
    messages,
    recentThreads,
    loadingThreads,
    selectedThread,
    selectedUser,
    searchQuery,
    searching,
    hasSearched,
    sending,
    fetchError,
    sendError,
    threadError,
    openThread,
    openExistingThread,
    createSecureThread,
    sendMessage,
    handleSearchChange,
    clearSendError: () => setSendError(null),
    refreshThreads: fetchRecentThreads
  };
};
