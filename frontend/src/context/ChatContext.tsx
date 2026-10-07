'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Conversation, Message, Contact, User } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';

interface ChatContextType {
  conversations: Conversation[];
  contacts: Contact[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loadingMessages: boolean;
  replyingTo: Message | null;
  typingMap: Record<string, string[]>; // conversationId -> userNames[]
  selectConversation: (conversationId: string | null) => void;
  sendMessage: (content: string, attachment?: { url: string; name: string; size: number; type: string }) => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  createDirectChat: (userId: string) => Promise<Conversation>;
  createGroupChat: (name: string, memberIds: string[], avatarUrl?: string, description?: string) => Promise<Conversation>;
  updateGroupSettings: (convId: string, data: { name?: string; description?: string; disappearing_timer?: number }) => Promise<void>;
  addMember: (convId: string, userId: string) => Promise<void>;
  removeMember: (convId: string, userId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe, sendTyping, markRead } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await api.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, [user]);

  const refreshContacts = useCallback(async () => {
    if (!user) return;
    try {
      const c = await api.getContacts();
      setContacts(c);
    } catch (err) {
      console.error('Failed to load contacts', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConversations();
      refreshContacts();
    } else {
      setConversations([]);
      setContacts([]);
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [user, refreshConversations, refreshContacts]);

  // Load messages when conversation changes
  const selectConversation = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      setSelectedConversation(null);
      setMessages([]);
      setReplyingTo(null);
      return;
    }

    const conv = conversations.find((c) => c.id === conversationId) || null;
    setSelectedConversation(conv);
    setReplyingTo(null);
    setLoadingMessages(true);

    try {
      const msgs = await api.getMessages(conversationId);
      setMessages(msgs);
      // Mark as read
      await api.markAsRead(conversationId);
      markRead(conversationId);

      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversations, markRead]);

  // Handle Real-Time WebSocket Events
  useEffect(() => {
    const unsubNewMessage = subscribe('new_message', (data) => {
      const msg: Message = data.message;
      if (!msg) return;

      // If incoming message belongs to currently open conversation
      if (selectedConversation && msg.conversation_id === selectedConversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_id !== user?.id) {
          api.markAsRead(msg.conversation_id);
          markRead(msg.conversation_id);
        }
      }

      // Update conversation list item last_message and position
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversation_id);
        if (index === -1) {
          // If conversation is new, refresh
          refreshConversations();
          return prev;
        }

        const target = prev[index];
        const isCurrentOpen = selectedConversation?.id === msg.conversation_id;
        const newUnread = isCurrentOpen || msg.sender_id === user?.id ? 0 : target.unread_count + 1;

        const updatedConv: Conversation = {
          ...target,
          last_message: msg,
          unread_count: newUnread,
          updated_at: msg.created_at,
        };

        const remaining = prev.filter((_, idx) => idx !== index);
        return [updatedConv, ...remaining];
      });
    });

    const unsubTyping = subscribe('typing', (data) => {
      const { conversation_id, user_id, user_name, is_typing } = data;
      if (user_id === user?.id) return;

      setTypingMap((prev) => {
        const currentList = prev[conversation_id] || [];
        let nextList: string[];
        if (is_typing) {
          nextList = currentList.includes(user_name) ? currentList : [...currentList, user_name];
        } else {
          nextList = currentList.filter((n) => n !== user_name);
        }
        return { ...prev, [conversation_id]: nextList };
      });
    });

    const unsubRead = subscribe('messages_read', (data) => {
      const { conversation_id, read_by } = data;
      if (read_by === user?.id) return;

      setMessages((prev) =>
        prev.map((m) => (m.conversation_id === conversation_id ? { ...m, status: 'read' } : m))
      );

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation_id && c.last_message && c.last_message.sender_id === user?.id) {
            return {
              ...c,
              last_message: { ...c.last_message, status: 'read' },
            };
          }
          return c;
        })
      );
    });

    const unsubDelivered = subscribe('message_delivered', (data) => {
      const { message_id, conversation_id } = data;
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id && m.status !== 'read' ? { ...m, status: 'delivered' } : m))
      );
    });

    const unsubReaction = subscribe('reaction_updated', (data) => {
      const { message_id, reactions } = data;
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    });

    const unsubDeleted = subscribe('message_deleted', (data) => {
      const { message_id } = data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message_id ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
        )
      );
    });

    const unsubConvUpdate = subscribe('conversation_updated', (data) => {
      refreshConversations();
    });

    const unsubUserStatus = subscribe('user_status', (data) => {
      const { user_id, is_online, last_seen } = data;
      setConversations((prev) =>
        prev.map((c) => {
          const updatedParts = c.participants.map((p) =>
            p.user_id === user_id
              ? { ...p, user: { ...p.user, is_online, last_seen } }
              : p
          );
          return { ...c, participants: updatedParts };
        })
      );
    });

    return () => {
      unsubNewMessage();
      unsubTyping();
      unsubRead();
      unsubDelivered();
      unsubReaction();
      unsubDeleted();
      unsubConvUpdate();
      unsubUserStatus();
    };
  }, [selectedConversation, user, subscribe, markRead, refreshConversations]);

  // Send Message
  const sendMessage = async (
    content: string,
    attachment?: { url: string; name: string; size: number; type: string }
  ) => {
    if (!selectedConversation) return;

    const payload = {
      conversation_id: selectedConversation.id,
      content,
      message_type: attachment ? (attachment.type as any) : 'text',
      file_url: attachment?.url,
      file_name: attachment?.name,
      file_size: attachment?.size,
      reply_to_id: replyingTo?.id,
    };

    // Optimistic message append
    setReplyingTo(null);
    await api.sendMessage(payload);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    await api.toggleReaction(messageId, emoji);
  };

  const deleteMessage = async (messageId: string) => {
    await api.deleteMessage(messageId);
  };

  const createDirectChat = async (recipientId: string): Promise<Conversation> => {
    const conv = await api.createDirectConversation(recipientId);
    await refreshConversations();
    setSelectedConversation(conv);
    return conv;
  };

  const createGroupChat = async (
    name: string,
    memberIds: string[],
    avatarUrl?: string,
    description?: string
  ): Promise<Conversation> => {
    const conv = await api.createGroupConversation(name, memberIds, avatarUrl, description);
    await refreshConversations();
    setSelectedConversation(conv);
    return conv;
  };

  const updateGroupSettings = async (
    convId: string,
    data: { name?: string; description?: string; disappearing_timer?: number }
  ) => {
    const updated = await api.updateConversation(convId, data);
    setSelectedConversation(updated);
    await refreshConversations();
  };

  const addMember = async (convId: string, userId: string) => {
    await api.addGroupMember(convId, userId);
    const updated = await api.getConversation(convId);
    setSelectedConversation(updated);
    await refreshConversations();
  };

  const removeMember = async (convId: string, userId: string) => {
    await api.removeGroupMember(convId, userId);
    if (userId === user?.id) {
      setSelectedConversation(null);
    } else {
      const updated = await api.getConversation(convId);
      setSelectedConversation(updated);
    }
    await refreshConversations();
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        contacts,
        selectedConversation,
        messages,
        loadingMessages,
        replyingTo,
        typingMap,
        selectConversation,
        sendMessage,
        setReplyingTo,
        toggleReaction,
        deleteMessage,
        refreshConversations,
        createDirectChat,
        createGroupChat,
        updateGroupSettings,
        addMember,
        removeMember,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
