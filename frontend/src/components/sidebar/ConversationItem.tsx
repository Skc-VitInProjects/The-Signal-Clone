'use client';

import React from 'react';
import { Conversation, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { StatusIcon } from '../ui/StatusIcon';
import { Clock, Timer } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUser: User | null;
  typingUsers?: string[];
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  currentUser,
  typingUsers = [],
  onClick,
}) => {
  // Format timestamp like Signal
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Find other participant for direct chat online status
  const otherParticipant = !conversation.is_group
    ? conversation.participants.find((p) => p.user_id !== currentUser?.id)?.user
    : null;

  const isOnline = otherParticipant?.is_online ?? false;
  const isTyping = typingUsers.length > 0;

  // Determine last message snippet
  const renderPreview = () => {
    if (isTyping) {
      return (
        <span style={{ color: 'var(--signal-blue)', fontStyle: 'italic', fontWeight: 500 }}>
          {typingUsers[0]} is typing...
        </span>
      );
    }

    const lastMsg = conversation.last_message;
    if (!lastMsg) {
      return <span style={{ color: 'var(--text-muted)' }}>No messages yet</span>;
    }

    if (lastMsg.is_deleted) {
      return <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Message deleted</span>;
    }

    const isMine = lastMsg.sender_id === currentUser?.id;
    let prefix = '';
    if (conversation.is_group && !isMine) {
      prefix = `${lastMsg.sender?.display_name?.split(' ')[0]}: `;
    } else if (isMine) {
      prefix = 'You: ';
    }

    let body = lastMsg.content;
    if (lastMsg.message_type === 'image') {
      body = '📷 Photo';
    } else if (lastMsg.message_type === 'file') {
      body = `📎 ${lastMsg.file_name || 'File'}`;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isMine && <StatusIcon status={lastMsg.status} size={13} />}
        <span className="conversation-preview">
          {prefix}{body}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`conversation-item ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      <Avatar
        src={conversation.avatar_url}
        name={conversation.name || 'Conversation'}
        size={46}
        isOnline={isOnline}
        isGroup={conversation.is_group}
      />

      <div className="conversation-info">
        <div className="conversation-top">
          <span className="conversation-name">{conversation.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {conversation.disappearing_timer > 0 && (
              <span title="Disappearing messages enabled" style={{ display: 'inline-flex' }}>
                <Timer size={12} color="var(--text-muted)" />
              </span>
            )}
            <span className="conversation-time">
              {formatTime(conversation.last_message?.created_at || conversation.updated_at)}
            </span>
          </div>
        </div>

        <div className="conversation-bottom">
          <div style={{ flex: 1, minWidth: 0 }}>{renderPreview()}</div>
          {conversation.unread_count > 0 && (
            <span className="unread-badge">{conversation.unread_count}</span>
          )}
        </div>
      </div>
    </div>
  );
};
