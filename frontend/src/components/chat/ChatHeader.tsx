'use client';

import React from 'react';
import { Conversation, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  Phone,
  Video,
  Info,
  ArrowLeft,
  ShieldCheck,
  Timer,
  MoreVertical,
} from 'lucide-react';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUser: User | null;
  onBackMobile: () => void;
  onOpenInfo: () => void;
  onOpenCall: (type: 'audio' | 'video') => void;
  onOpenSafetyNumbers: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  currentUser,
  onBackMobile,
  onOpenInfo,
  onOpenCall,
  onOpenSafetyNumbers,
}) => {
  const otherParticipant = !conversation.is_group
    ? conversation.participants.find((p) => p.user_id !== currentUser?.id)?.user
    : null;

  const isOnline = otherParticipant?.is_online ?? false;

  const getSubtitle = () => {
    if (conversation.is_group) {
      return `${conversation.participants.length} members`;
    }
    if (isOnline) {
      return 'Online';
    }
    if (otherParticipant?.last_seen) {
      return `Last seen ${new Date(otherParticipant.last_seen).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }
    return otherParticipant?.phone || 'Encrypted Direct Chat';
  };

  return (
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {/* Mobile Back Button */}
        <button
          className="icon-btn"
          onClick={onBackMobile}
          style={{ display: 'none' }}
          id="mobile-back-btn"
          title="Back to conversations"
        >
          <ArrowLeft size={18} />
        </button>

        <div
          className="chat-header-info"
          onClick={onOpenInfo}
          title="View chat information"
        >
          <Avatar
            src={conversation.avatar_url}
            name={conversation.name || 'Conversation'}
            size={40}
            isOnline={isOnline}
            isGroup={conversation.is_group}
          />

          <div className="chat-header-text">
            <h3>
              {conversation.name}
              {conversation.disappearing_timer > 0 && (
                <span
                  title={`Disappearing messages: ${conversation.disappearing_timer}s`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '11px',
                    color: 'var(--signal-blue)',
                    background: 'var(--signal-blue-light)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  <Timer size={11} /> {conversation.disappearing_timer}s
                </span>
              )}
            </h3>
            <p>{getSubtitle()}</p>
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        {/* Voice Call (Mocked/Simulated) */}
        <button
          className="icon-btn"
          onClick={() => onOpenCall('audio')}
          title="Signal Audio Call (End-to-End Encrypted)"
        >
          <Phone size={18} />
        </button>

        {/* Video Call (Mocked/Simulated) */}
        <button
          className="icon-btn"
          onClick={() => onOpenCall('video')}
          title="Signal Video Call (End-to-End Encrypted)"
        >
          <Video size={18} />
        </button>

        {/* Safety Number Verification */}
        <button
          className="icon-btn"
          onClick={onOpenSafetyNumbers}
          title="Verify Safety Numbers (Cryptography Mock)"
        >
          <ShieldCheck size={18} />
        </button>

        {/* Conversation Info / Settings */}
        <button
          className="icon-btn"
          onClick={onOpenInfo}
          title="Conversation Info"
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
};
