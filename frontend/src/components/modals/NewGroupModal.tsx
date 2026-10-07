'use client';

import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { X, Check, Users, Loader2 } from 'lucide-react';
import { showToast } from '../ui/Toast';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: string[], description?: string) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setSelectedIds([]);
      return;
    }
    setLoading(true);
    api.searchUsers('')
      .then((users) => setAvailableUsers(users))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a group name', 'warning');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('Select at least one member', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateGroup(name.trim(), selectedIds, description.trim() || undefined);
      showToast(`Group "${name.trim()}" created!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--signal-blue)" />
            <h3>Create Signal Group</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ flex: 1 }}>
            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Signal Devs, Family, Book Club"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Group Description (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span className="form-label">Select Members ({selectedIds.length} selected)</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <Loader2 size={24} className="animate-spin" color="var(--signal-blue)" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                {availableUsers.map((u) => {
                  const isChecked = selectedIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isChecked ? 'var(--signal-blue-light)' : 'transparent',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={u.avatar_url} name={u.display_name} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.display_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: isChecked ? 'none' : '2px solid var(--border-color)',
                          backgroundColor: isChecked ? 'var(--signal-blue)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !name.trim() || selectedIds.length === 0}
            >
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
