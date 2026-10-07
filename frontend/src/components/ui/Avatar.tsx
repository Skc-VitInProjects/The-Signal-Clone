'use client';

import React from 'react';
import { api } from '../../lib/api';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  isOnline?: boolean;
  isGroup?: boolean;
}

const COLOR_PALETTES = [
  ['#2c6bed', '#1b4bba'],
  ['#8e44ad', '#6c3483'],
  ['#27ae60', '#1e8449'],
  ['#e67e22', '#ba6419'],
  ['#d35400', '#a04000'],
  ['#16a085', '#117a65'],
  ['#2980b9', '#1f618d'],
];

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 40,
  isOnline = false,
  isGroup = false,
}) => {
  // Hash name for deterministic background gradient
  const hash = (name || 'Signal').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = COLOR_PALETTES[hash % COLOR_PALETTES.length];

  const getInitials = (text: string) => {
    if (!text) return 'S';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const fullSrc = src ? api.getMediaUrl(src) : null;

  return (
    <div
      className="avatar-container"
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {fullSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullSrc}
          alt={name}
          className="avatar-img"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            // fallback to initials on error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: size * 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.5px',
            userSelect: 'none',
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline && !isGroup && (
        <span
          className="avatar-online-dot"
          style={{
            width: Math.max(9, size * 0.25),
            height: Math.max(9, size * 0.25),
            border: '2px solid var(--bg-sidebar)',
          }}
        />
      )}
    </div>
  );
};
