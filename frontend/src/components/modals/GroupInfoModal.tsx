'use client';

import React, { useState, useEffect } from 'react';
import { Conversation, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import {
  X,
  Timer,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { showToast } from '../ui/Toast';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUser: User | null;
  onUpdateSettings: (convId: string, data: { name?: string; description?: string; disappearing_timer?: number }) => Promise<void>;
  onAddMember: (convId: string, userId: string) => Promise<void>;
  onRemoveMember: (convId: string, userId: string) => Promise<void>;
}

const TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30 seconds', value: 30 },
  { label: '5 minutes', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '1 week', value: 604800 },
];

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUser,
  onUpdateSettings,
  onAddMember,
  onRemoveMember,
}) => {
  const [selectedTimer, setSelectedTimer] = useState(conversation.disappearing_timer);
  const [addingMember, setAddingMember] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    setSelectedTimer(conversation.disappearing_timer);
  }, [conversation.disappearing_timer]);

  useEffect(() => {
    if (addingMember) {
      api.searchUsers('')
        .then((users) => setAllUsers(users))
        .catch((err) => console.error(err));
    }
  }, [addingMember]);

  if (!isOpen) return null;

  const myParticipant = conversation.participants.find((p) => p.user_id === currentUser?.id);
  const isAdmin = myParticipant?.role === 'admin';

  const handleTimerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setSelectedTimer(val);
    try {
      await onUpdateSettings(conversation.id, { disappearing_timer: val });
      showToast('Disappearing messages timer updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update timer', 'warning');
    }
  };

  const handleAdd = async (userId: string) => {
    try {
      await onAddMember(conversation.id, userId);
      showToast('Member added to group', 'success');
      setAddingMember(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'warning');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await onRemoveMember(conversation.id, userId);
      showToast('Member removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'warning');
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    if (!confirm('Leave this group conversation?')) return;
    try {
      await onRemoveMember(conversation.id, currentUser.id);
      showToast('You left the group', 'info');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to leave group', 'warning');
    }
  };

  const existingMemberIds = new Set(conversation.participants.map((p) => p.user_id));
  const candidateUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Group Details</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Header & Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <Avatar
              src={conversation.avatar_url}
              name={conversation.name || 'Group'}
              size={68}
              isGroup={conversation.is_group}
            />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{conversation.name}</div>
              {conversation.description && (
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {conversation.description}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />

          {/* Disappearing Messages Settings */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Timer size={16} color="var(--signal-blue)" />
              <label className="form-label" style={{ fontWeight: 600 }}>Disappearing Messages</label>
            </div>
            <select
              className="form-input"
              value={selectedTimer}
              onChange={handleTimerChange}
            >
              {TIMER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              New messages sent in this chat will disappear after the selected time.
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />

          {/* Members List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Members ({conversation.participants.length})
                </span>
              </div>

              {isAdmin && !addingMember && (
                <button
                  onClick={() => setAddingMember(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--signal-blue)',
                    fontWeight: 600,
                  }}
                >
                  <UserPlus size={14} /> Add Member
                </button>
              )}
            </div>

            {/* Add member subpanel */}
            {addingMember && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: 10,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span>Select user to add:</span>
                  <button onClick={() => setAddingMember(false)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
                </div>
                {candidateUsers.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All contacts are already in this group.</div>
                ) : (
                  candidateUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleAdd(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar src={u.avatar_url} name={u.display_name} size={28} />
                        <span style={{ fontSize: 12 }}>{u.display_name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--signal-blue)', fontWeight: 600 }}>+ Add</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Existing Members */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {conversation.participants.map((p) => {
                const isMemberMe = p.user_id === currentUser?.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar
                        src={p.user.avatar_url}
                        name={p.user.display_name}
                        size={32}
                        isOnline={p.user.is_online}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {p.user.display_name} {isMemberMe ? '(You)' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{p.user.username}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.role === 'admin' && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: 'var(--signal-blue)',
                            background: 'var(--signal-blue-light)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          Admin
                        </span>
                      )}
                      {isAdmin && !isMemberMe && (
                        <button
                          onClick={() => handleRemove(p.user_id)}
                          title="Remove from group"
                          style={{ color: 'var(--signal-red)', opacity: 0.8 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />

          {/* Leave Group */}
          <button
            onClick={handleLeave}
            className="btn-danger"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
          >
            <LogOut size={16} /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};
