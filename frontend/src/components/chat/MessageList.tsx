'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Message, Conversation, User } from '../../types';
import { MessageBubble } from './MessageBubble';
import { Lock, X } from 'lucide-react';

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User | null;
  typingUsers?: string[];
  onReply: (msg: Message) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  onOpenSafetyNumbers: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversation,
  messages,
  currentUser,
  typingUsers = [],
  onReply,
  onToggleReaction,
  onDelete,
  onOpenSafetyNumbers,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Group messages by date
  const formatDateDivider = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  let lastDate = '';

  return (
    <div className="messages-container">
      {/* Signal End-to-End Encryption Banner */}
      <div
        className="encryption-banner"
        onClick={onOpenSafetyNumbers}
        style={{ cursor: 'pointer' }}
        title="Tap to verify safety numbers"
      >
        <Lock size={14} color="var(--signal-blue)" style={{ flexShrink: 0 }} />
        <span>
          Messages are end-to-end encrypted. No one outside of this chat, not even Signal, can read them. Tap to verify.
        </span>
      </div>

      {messages.map((msg) => {
        const msgDate = formatDateDivider(msg.created_at);
        const showDivider = msgDate !== lastDate;
        lastDate = msgDate;

        return (
          <React.Fragment key={msg.id}>
            {showDivider && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '12px 0 6px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    padding: '3px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {msgDate}
                </span>
              </div>
            )}
            <MessageBubble
              message={msg}
              currentUser={currentUser}
              isGroup={conversation.is_group}
              onReply={onReply}
              onToggleReaction={onToggleReaction}
              onDelete={onDelete}
              onImageClick={(url) => setSelectedImage(url)}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <span>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: 1 }} />

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedImage(null)}
          style={{ cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: -36,
                right: 0,
                color: '#ffffff',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Full preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: 'var(--radius-md)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
