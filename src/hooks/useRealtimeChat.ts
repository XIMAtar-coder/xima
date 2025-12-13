import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
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

export const useRealtimeChat = (currentUserId: string | undefined) => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Fetch all users except current user
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUserId) {
        console.log('[useRealtimeChat] No currentUserId provided, skipping user fetch');
        setLoading(false);
        return;
      }

      setFetchError(null);
      console.log('[useRealtimeChat] Fetching users for currentUserId:', currentUserId);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, name, full_name, email, avatar, ximatar')
          .neq('user_id', currentUserId);

        if (error) {
          console.error('[useRealtimeChat] Error fetching users:', error);
          setFetchError(`Query failed: ${error.message}`);
          setLoading(false);
          return;
        }

        console.log('[useRealtimeChat] Raw data from profiles:', data);

        if (data && data.length > 0) {
          const mappedUsers = data
            .filter(user => user.user_id) // Ensure user_id exists
            .map((user) => ({
              id: user.user_id,
              name: user.full_name || user.name || user.email?.split('@')[0] || `User ${user.user_id?.slice(0, 6)}`,
              email: user.email || '',
              avatar: user.avatar,
              ximatar: user.ximatar,
              status: 'offline' as const,
              unreadCount: 0
            }));
          console.log('[useRealtimeChat] Mapped users:', mappedUsers.length);
          setUsers(mappedUsers);
        } else {
          console.log('[useRealtimeChat] No other users found in database');
          setUsers([]);
        }
      } catch (err) {
        console.error('[useRealtimeChat] Exception:', err);
        setFetchError('An unexpected error occurred');
      }
      setLoading(false);
    };

    fetchUsers();
  }, [currentUserId]);

  // Fetch or create thread with selected user
  const openThread = useCallback(async (otherUserId: string) => {
    if (!currentUserId) {
      console.log('[useRealtimeChat] openThread: No currentUserId');
      return;
    }
    
    console.log('[useRealtimeChat] openThread called:', { currentUserId, otherUserId });
    setSelectedUserId(otherUserId);
    setMessages([]);
    setThreadError(null);

    try {
      // Try to find existing thread between these two users
      const { data: myThreads, error: threadsError } = await supabase
        .from('chat_participants')
        .select('thread_id')
        .eq('user_id', currentUserId);

      if (threadsError) {
        console.error('[useRealtimeChat] Error fetching my threads:', threadsError);
      }

      console.log('[useRealtimeChat] My threads:', myThreads);

      if (myThreads && myThreads.length > 0) {
        for (const pt of myThreads) {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('thread_id', pt.thread_id)
            .eq('user_id', otherUserId)
            .maybeSingle();

          if (otherParticipant) {
            console.log('[useRealtimeChat] Found existing thread:', pt.thread_id);
            setSelectedThread(pt.thread_id);
            await fetchMessages(pt.thread_id);
            return;
          }
        }
      }

      console.log('[useRealtimeChat] Creating new thread...');
      
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          created_by: currentUserId,
          is_group: false,
          topic: 'direct'
        })
        .select()
        .single();

      if (threadError) {
        console.error('[useRealtimeChat] Error creating thread:', threadError);
        setThreadError(`Failed to create conversation: ${threadError.message}`);
        return;
      }

      console.log('[useRealtimeChat] Created thread:', newThread);

      if (newThread) {
        // Add both participants
        const { error: participantError } = await supabase
          .from('chat_participants')
          .insert([
            { thread_id: newThread.id, user_id: currentUserId },
            { thread_id: newThread.id, user_id: otherUserId }
          ]);

        if (participantError) {
          console.error('[useRealtimeChat] Error adding participants:', participantError);
          setThreadError(`Failed to add participants: ${participantError.message}`);
          return;
        }

        console.log('[useRealtimeChat] Added participants successfully');
        setSelectedThread(newThread.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('[useRealtimeChat] Exception in openThread:', err);
      setThreadError('An unexpected error occurred');
    }
  }, [currentUserId]);

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

  // Send a message with optimistic update
  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    if (!selectedThread || !currentUserId || !body.trim()) {
      console.log('[useRealtimeChat] sendMessage: Missing required data', { selectedThread, currentUserId, hasBody: !!body.trim() });
      return false;
    }

    console.log('[useRealtimeChat] Sending message:', { 
      thread_id: selectedThread, 
      sender_id: currentUserId, 
      body: body.trim().substring(0, 50) + '...' 
    });

    setSending(true);
    setSendError(null);

    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      thread_id: selectedThread,
      sender_id: currentUserId,
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
          sender_id: currentUserId,
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
  }, [selectedThread, currentUserId]);

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

  // Get selected user
  const selectedUser = users.find(u => u.id === selectedUserId) || null;

  return {
    users,
    messages,
    selectedThread,
    selectedUser,
    loading,
    sending,
    fetchError,
    sendError,
    threadError,
    openThread,
    sendMessage,
    clearSendError: () => setSendError(null)
  };
};
