'use client';

import React, { useState, useEffect } from 'react';
import { Conversation } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldCheck,
} from 'lucide-react';

interface MockCallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  conversation: Conversation;
  onClose: () => void;
}

export const MockCallModal: React.FC<MockCallModalProps> = ({
  isOpen,
  callType,
  conversation,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState<'Connecting...' | 'Ringing...' | 'Connected'>('Connecting...');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');

  useEffect(() => {
    if (!isOpen) {
      setDuration(0);
      setCallStatus('Connecting...');
      return;
    }

    const t1 = setTimeout(() => setCallStatus('Ringing...'), 1500);
    const t2 = setTimeout(() => setCallStatus('Connected'), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen]);

  useEffect(() => {
    if (callStatus !== 'Connected') return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          width: 380,
          background: '#161616',
          color: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          textAlign: 'center',
          padding: '30px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--signal-blue)' }}>
          <ShieldCheck size={14} />
          <span>Signal End-to-End Encrypted Call</span>
        </div>

        <div style={{ position: 'relative', marginTop: 10 }}>
          <Avatar
            src={conversation.avatar_url}
            name={conversation.name || 'User'}
            size={90}
            isGroup={conversation.is_group}
          />
        </div>

        <div>
          <h3 style={{ fontSize: 19, fontWeight: 700 }}>{conversation.name}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {callStatus === 'Connected' ? formatDuration(duration) : callStatus}
          </p>
        </div>

        {callType === 'video' && (
          <div
            style={{
              width: '100%',
              height: 120,
              background: '#222222',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            {isVideoOff ? 'Camera Off (Mock)' : 'Simulated HD Video Stream (Active)'}
          </div>
        )}

        {/* Call Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: isMuted ? 'var(--signal-red)' : 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {callType === 'video' && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isVideoOff ? 'rgba(255,255,255,0.1)' : 'var(--signal-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isVideoOff ? 'Start Video' : 'Stop Video'}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--signal-red)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="End Call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
