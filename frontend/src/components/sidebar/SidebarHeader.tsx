'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import {
  Edit3,
  Users,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { showToast } from '../ui/Toast';

interface SidebarHeaderProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenSettings: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
}) => {
  const { user, demoUsers, switchUser, logout, theme, toggleTheme } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="sidebar-header">
      <div
        className="sidebar-header-user"
        onClick={() => setMenuOpen(!menuOpen)}
        title="Account & Quick User Switcher"
      >
        <Avatar
          src={user?.avatar_url}
          name={user?.display_name || 'Signal User'}
          size={36}
          isOnline={true}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
            {user?.display_name || 'Signal'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {user?.phone || `@${user?.username}`}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="sidebar-actions">
        <button
          className="icon-btn"
          onClick={onOpenNewChat}
          title="New Chat / Contact"
        >
          <Edit3 size={18} />
        </button>

        <button
          className="icon-btn"
          onClick={onOpenNewGroup}
          title="New Group"
        >
          <Users size={18} />
        </button>

        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {/* User Switch & Quick Actions Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '56px',
            left: '12px',
            width: '260px',
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            padding: '6px 0',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
            }}
          >
            Quick Switch Demo User
          </div>

          {demoUsers.map((u) => (
            <div
              key={u.id}
              onClick={async () => {
                setMenuOpen(false);
                if (u.id !== user?.id) {
                  showToast(`Switching to ${u.display_name}...`, 'info');
                  await switchUser(u);
                  showToast(`Logged in as ${u.display_name}`, 'success');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                cursor: 'pointer',
                background: u.id === user?.id ? 'var(--bg-sidebar-hover)' : 'transparent',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (u.id !== user?.id) e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
              }}
              onMouseLeave={(e) => {
                if (u.id !== user?.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Avatar src={u.avatar_url} name={u.display_name} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
              </div>
              {u.id === user?.id && <UserCheck size={16} color="var(--signal-blue)" />}
            </div>
          ))}

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '6px 0' }} />

          <div
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>

          <div
            onClick={() => {
              setMenuOpen(false);
              onOpenSettings();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            <SettingsIcon size={16} />
            <span>Settings & Privacy</span>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '6px 0' }} />

          <div
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--signal-red)',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </div>
        </div>
      )}
    </div>
  );
};
