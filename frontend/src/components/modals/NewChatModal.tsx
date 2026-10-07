'use client';

import React, { useState, useEffect } from 'react';
import { User, Contact } from '../../types';
import { api } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Search, UserPlus, X, MessageSquare, Loader2 } from 'lucide-react';
import { showToast } from '../ui/Toast';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [addContactMode, setAddContactMode] = useState(false);
  const [newContactIdentifier, setNewContactIdentifier] = useState('');
  const [newContactNickname, setNewContactNickname] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.searchUsers('')
      .then((res) => setUsers(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSearch = (text: string) => {
    setQuery(text);
    setLoading(true);
    api.searchUsers(text)
      .then((res) => setUsers(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactIdentifier.trim()) return;
    try {
      const contact = await api.addContact(newContactIdentifier.trim(), newContactNickname.trim() || undefined);
      showToast(`Added ${contact.contact_user.display_name} to contacts!`, 'success');
      setAddContactMode(false);
      setNewContactIdentifier('');
      setNewContactNickname('');
      onSelectUser(contact.contact_user);
    } catch (err: any) {
      showToast(err.message || 'Could not add contact', 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{addContactMode ? 'Add New Contact' : 'New Direct Chat'}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {addContactMode ? (
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Username or Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. alex_r or +1 555-0101"
                  value={newContactIdentifier}
                  onChange={(e) => setNewContactIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nickname (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Work"
                  value={newContactNickname}
                  onChange={(e) => setNewContactNickname(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddContactMode(false)}
                >
                  Back
                </button>
                <button type="submit" className="btn-primary">
                  Save Contact
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search user */}
              <div className="search-bar" style={{ marginBottom: 8 }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Find by name, username, or phone..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Add contact by phone/username button */}
              <button
                onClick={() => setAddContactMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--signal-blue-light)',
                  color: 'var(--signal-blue)',
                  fontWeight: 600,
                  fontSize: 13,
                  width: '100%',
                }}
              >
                <UserPlus size={18} />
                <span>Add Contact by Username / Phone</span>
              </button>

              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 8 }}>
                AVAILABLE CONTACTS & USERS
              </div>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Loader2 size={24} className="animate-spin" color="var(--signal-blue)" />
                </div>
              ) : users.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                  No users found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-sidebar-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Avatar src={u.avatar_url} name={u.display_name} size={38} isOnline={u.is_online} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.display_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {u.phone ? `${u.phone} • ` : ''}@{u.username}
                        </div>
                      </div>
                      <MessageSquare size={16} color="var(--signal-blue)" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
