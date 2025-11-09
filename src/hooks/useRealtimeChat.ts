import { useState, useEffect } from 'react';
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
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: {
    name: string;
    avatar?: any;
  };
}

export const useRealtimeChat = (currentUserId: string | undefined) => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all users except current user
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUserId) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, avatar, ximatar')
        .neq('user_id', currentUserId);

      if (data) {
        setUsers(
          data.map((user) => ({
            id: user.user_id,
            name: user.name || user.email || 'User',
            email: user.email || '',
            avatar: user.avatar,
            ximatar: user.ximatar,
            status: 'away' as const
          }))
        );
      }
      setLoading(false);
    };

    fetchUsers();
  }, [currentUserId]);

  // Fetch or create thread with selected user
  const openThread = async (otherUserId: string) => {
    if (!currentUserId) return;

    // Try to find existing thread
    const { data: existingThreads } = await supabase
      .from('chat_participants')
      .select('thread_id')
      .eq('user_id', currentUserId);

    if (existingThreads) {
      for (const pt of existingThreads) {
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('thread_id', pt.thread_id)
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (otherParticipant) {
          setSelectedThread(pt.thread_id);
          await fetchMessages(pt.thread_id);
          return;
        }
      }
    }

    // Create new thread
    const { data: newThread } = await supabase
      .from('chat_threads')
      .insert({
        created_by: currentUserId,
        is_group: false,
        topic: 'direct'
      })
      .select()
      .single();

    if (newThread) {
      // Add participants
      await supabase.from('chat_participants').insert([
        { thread_id: newThread.id, user_id: currentUserId },
        { thread_id: newThread.id, user_id: otherUserId }
      ]);

      setSelectedThread(newThread.id);
      setMessages([]);
    }
  };

  // Fetch messages for a thread
  const fetchMessages = async (threadId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        id,
        thread_id,
        sender_id,
        body,
        created_at,
        profiles!chat_messages_sender_id_fkey (
          name,
          avatar
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((msg: any) => ({
          ...msg,
          sender: {
            name: msg.profiles?.name || 'User',
            avatar: msg.profiles?.avatar
          }
        }))
      );
    }
  };

  // Send a message
  const sendMessage = async (body: string) => {
    if (!selectedThread || !currentUserId || !body.trim()) return;

    const { data } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: selectedThread,
        sender_id: currentUserId,
        body: body.trim()
      })
      .select()
      .single();

    if (data) {
      await fetchMessages(selectedThread);
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedThread) return;

    const channel: RealtimeChannel = supabase
      .channel(`thread:${selectedThread}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${selectedThread}`
        },
        () => {
          fetchMessages(selectedThread);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThread]);

  return {
    users,
    messages,
    selectedThread,
    loading,
    openThread,
    sendMessage
  };
};
