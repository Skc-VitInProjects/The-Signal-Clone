'use client';

import React, { useState } from 'react';
import { Conversation } from '../../types';
import { X, ShieldCheck, QrCode, CheckCircle2 } from 'lucide-react';
import { showToast } from '../ui/Toast';

interface SafetyNumberModalProps {
  isOpen: boolean;
  conversation: Conversation;
  onClose: () => void;
}

// Generate deterministic 60-digit safety number from conversation id
function generateSafetyNumber(id: string): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const chunks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const val = Math.abs(Math.sin(hash + i * 37) * 90000 + 10000);
    chunks.push(Math.floor(val).toString().padStart(5, '0'));
  }
  return chunks;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  isOpen,
  conversation,
  onClose,
}) => {
  const [verified, setVerified] = useState(false);

  if (!isOpen) return null;

  const safetyNumbers = generateSafetyNumber(conversation.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="var(--signal-blue)" />
            <h3>Verify Safety Numbers</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            To verify end-to-end encryption with <strong style={{ color: 'var(--text-primary)' }}>{conversation.name}</strong>,
            compare the numbers below with their device, or scan their QR code.
          </p>

          {/* Simulated QR Code */}
          <div
            style={{
              margin: '16px auto',
              width: 140,
              height: 140,
              background: '#ffffff',
              padding: 10,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <QrCode size={120} color="#000000" />
          </div>

          {/* 60-digit block grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px 12px',
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            {safetyNumbers.map((chunk, i) => (
              <span key={i} style={{ color: 'var(--text-primary)' }}>
                {chunk}
              </span>
            ))}
          </div>

          {/* Verified toggle button */}
          <button
            onClick={() => {
              setVerified(!verified);
              showToast(
                !verified ? 'Safety number verified!' : 'Verification cleared',
                !verified ? 'success' : 'info'
              );
            }}
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: verified ? 'var(--signal-green)' : 'var(--bg-input)',
              color: verified ? '#ffffff' : 'var(--text-primary)',
              border: `1px solid ${verified ? 'transparent' : 'var(--border-color)'}`,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
              transition: 'all var(--transition-fast)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{verified ? 'Marked as Verified ✓' : 'Mark as Verified'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
