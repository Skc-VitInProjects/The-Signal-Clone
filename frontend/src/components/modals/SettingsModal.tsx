'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import {
  X,
  User as UserIcon,
  Shield,
  Bell,
  Palette,
  Laptop,
  Upload,
  Check,
  Moon,
  Sun,
  Lock,
} from 'lucide-react';
import { showToast } from '../ui/Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser, theme, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'appearance' | 'notifications' | 'devices'>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [about, setAbout] = useState(user?.about || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Privacy toggles state
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [screenSecurity, setScreenSecurity] = useState(true);

  // Notification toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUser({ display_name: displayName, about });
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'warning');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadAvatar(file);
      await updateUser({ avatar_url: res.avatar_url });
      showToast('Avatar updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload avatar', 'warning');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 560, height: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Navigation Tabs */}
          <div
            style={{
              width: 170,
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-color)',
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {[
              { id: 'profile', label: 'Profile', icon: <UserIcon size={16} /> },
              { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
              { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
              { id: 'devices', label: 'Linked Devices', icon: <Laptop size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? 'var(--signal-blue)' : 'var(--text-secondary)',
                  background: activeTab === tab.id ? 'var(--signal-blue-light)' : 'transparent',
                  textAlign: 'left',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="modal-body" style={{ flex: 1, padding: 20 }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar src={user?.avatar_url} name={displayName || 'User'} size={60} />
                  <div>
                    <label
                      className="btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        padding: '6px 12px',
                        fontSize: 12,
                      }}
                    >
                      <Upload size={14} /> Change Avatar
                      <input type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">About / Status</label>
                  <input
                    type="text"
                    className="form-input"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`@${user?.username}`}
                    disabled
                    style={{ opacity: 0.6 }}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={savingProfile} style={{ marginTop: 8 }}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {activeTab === 'privacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Read Receipts</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      If disabled, you won’t see or share read receipts.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--signal-blue)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Typing Indicators</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Show others when you are typing a message.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={typingIndicators}
                    onChange={(e) => setTypingIndicators(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--signal-blue)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Screen Security</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Block screenshots in recent apps list.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={screenSecurity}
                    onChange={(e) => setScreenSecurity(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--signal-blue)' }}
                  />
                </div>

                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Lock size={16} color="var(--signal-blue)" />
                  <span>Signal end-to-end cryptographic protocols simulated.</span>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Theme</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => theme !== 'dark' && toggleTheme()}
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${theme === 'dark' ? 'var(--signal-blue)' : 'var(--border-color)'}`,
                        background: '#121212',
                        color: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Moon size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Signal Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => theme !== 'light' && toggleTheme()}
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${theme === 'light' ? 'var(--signal-blue)' : 'var(--border-color)'}`,
                        background: '#ffffff',
                        color: '#000000',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Sun size={20} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Signal Light</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Sound Effects</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Play subtle audio tones on message receive.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--signal-blue)' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Message Previews</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Show sender and message text in notifications.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={messagePreview}
                    onChange={(e) => setMessagePreview(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--signal-blue)' }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'devices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center', padding: '10px 0' }}>
                <Laptop size={40} color="var(--signal-blue)" style={{ margin: '0 auto' }} />
                <div style={{ fontWeight: 600, fontSize: 15 }}>Linked Devices (Mocked)</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Pair your Signal desktop or iPad client using QR code synchronization.
                </p>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: 12,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>MacBook Pro 16&quot; (Active)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Linked 2 days ago • Signal Desktop 7.2</div>
                </div>
                <button className="btn-secondary" onClick={() => showToast('Linked device pairing coming soon!', 'info')}>
                  Link New Device
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
