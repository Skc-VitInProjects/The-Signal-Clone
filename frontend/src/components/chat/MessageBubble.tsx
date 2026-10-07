'use client';

import React, { useState } from 'react';
import { Message, User } from '../../types';
import { StatusIcon } from '../ui/StatusIcon';
import { api } from '../../lib/api';
import {
  Reply,
  Trash2,
  FileText,
  Download,
  Timer,
  Lock,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  currentUser: User | null;
  isGroup: boolean;
  onReply: (msg: Message) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  onImageClick: (url: string) => void;
}

const EMOJI_PALETTE = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUser,
  isGroup,
  onReply,
  onToggleReaction,
  onDelete,
  onImageClick,
}) => {
  const isMine = message.sender_id === currentUser?.id;
  const isSystem = message.message_type === 'system';

  // Format timestamp
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate disappearing countdown remaining if any
  const getDisappearingRemaining = () => {
    if (!message.expires_at) return null;
    const diff = Math.max(0, Math.floor((new Date(message.expires_at).getTime() - Date.now()) / 1000));
    if (diff <= 0) return 'Expired';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const remainingTime = getDisappearingRemaining();

  if (isSystem) {
    return (
      <div className="message-row system">
        <div className="message-bubble system-bubble">
          {message.content}
        </div>
      </div>
    );
  }

  // Aggregate reactions by emoji
  const reactionCounts: Record<string, { count: number; reactedByMe: boolean }> = {};
  if (message.reactions) {
    message.reactions.forEach((r) => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, reactedByMe: false };
      }
      reactionCounts[r.emoji].count += 1;
      if (r.user_id === currentUser?.id) {
        reactionCounts[r.emoji].reactedByMe = true;
      }
    });
  }

  return (
    <div className={`message-row ${isMine ? 'outgoing' : 'incoming'}`}>
      {/* Floating Action Bar on hover */}
      {!message.is_deleted && (
        <div className="message-actions-hover">
          {EMOJI_PALETTE.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggleReaction(message.id, emoji)}
              style={{ fontSize: 13, padding: '2px', borderRadius: 4 }}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div style={{ width: 1, height: 14, background: 'var(--border-color)', margin: '0 2px' }} />
          <button
            onClick={() => onReply(message)}
            title="Reply"
            style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}
          >
            <Reply size={13} color="var(--text-secondary)" />
          </button>
          {isMine && (
            <button
              onClick={() => onDelete(message.id)}
              title="Delete message"
              style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={13} color="var(--signal-red)" />
            </button>
          )}
        </div>
      )}

      <div className="message-bubble">
        {/* Sender name in group */}
        {isGroup && !isMine && (
          <div className="message-sender-name">
            {message.sender?.display_name || 'Member'}
          </div>
        )}

        {/* Quoted Reply Preview */}
        {message.reply_to && (
          <div className="message-quoted-preview">
            <div style={{ fontWeight: 600, color: 'var(--signal-blue)', fontSize: 11 }}>
              {message.reply_to.sender_name}
            </div>
            <div style={{ opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.reply_to.content}
            </div>
          </div>
        )}

        {/* Image Attachment */}
        {message.message_type === 'image' && message.file_url && (
          <div style={{ marginBottom: 6, cursor: 'pointer' }} onClick={() => onImageClick(api.getMediaUrl(message.file_url))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.getMediaUrl(message.file_url)}
              alt="Attachment"
              style={{
                maxWidth: '100%',
                maxHeight: 260,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* File Attachment */}
        {message.message_type === 'file' && message.file_url && (
          <a
            href={api.getMediaUrl(message.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <FileText size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.file_name || 'Attached file'}
              </div>
              {message.file_size && (
                <div style={{ fontSize: 10, opacity: 0.7 }}>
                  {(message.file_size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            <Download size={14} />
          </a>
        )}

        {/* Message Content */}
        <div style={{ fontStyle: message.is_deleted ? 'italic' : 'normal', opacity: message.is_deleted ? 0.7 : 1 }}>
          {message.content}
        </div>

        {/* Message Meta: Time, Expiry, Status */}
        <div className="message-meta">
          {remainingTime && (
            <span
              title={`Expires in ${remainingTime}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, opacity: 0.8 }}
            >
              <Timer size={10} /> {remainingTime}
            </span>
          )}
          <span>{time}</span>
          {isMine && <StatusIcon status={message.status} size={13} />}
        </div>
      </div>

      {/* Reaction Badges on bottom */}
      {Object.entries(reactionCounts).length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: -4, zIndex: 2, flexWrap: 'wrap' }}>
          {Object.entries(reactionCounts).map(([emoji, data]) => (
            <div
              key={emoji}
              className="reaction-counter-badge"
              style={{
                borderColor: data.reactedByMe ? 'var(--signal-blue)' : 'var(--border-color)',
                background: data.reactedByMe ? 'var(--signal-blue-light)' : 'var(--bg-card)',
              }}
              onClick={() => onToggleReaction(message.id, emoji)}
              title={`${data.count} reaction(s)`}
            >
              <span>{emoji}</span>
              <span style={{ fontWeight: 600 }}>{data.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
