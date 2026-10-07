'use client';

import React from 'react';
import { Conversation, User } from '../../types';
import { ConversationItem } from './ConversationItem';
import { MessageSquarePlus } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentUser: User | null;
  typingMap: Record<string, string[]>;
  searchQuery: string;
  onSelect: (id: string) => void;
  onOpenNewChat: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentUser,
  typingMap,
  searchQuery,
  onSelect,
  onOpenNewChat,
}) => {
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const lastMsgMatch = c.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || lastMsgMatch;
  });

  if (filtered.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '40px 24px',
          textAlign: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <MessageSquarePlus size={36} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {searchQuery ? 'No matching conversations' : 'No chats yet'}
        </div>
        <p style={{ fontSize: 12 }}>
          {searchQuery
            ? 'Try searching with a different term'
            : 'Start a new conversation with your contacts'}
        </p>
        {!searchQuery && (
          <button className="btn-primary" onClick={onOpenNewChat} style={{ marginTop: '8px' }}>
            Start a Chat
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {filtered.map((c) => (
        <ConversationItem
          key={c.id}
          conversation={c}
          isSelected={c.id === selectedId}
          currentUser={currentUser}
          typingUsers={typingMap[c.id]}
          onClick={() => onSelect(c.id)}
        />
      ))}
    </div>
  );
};
