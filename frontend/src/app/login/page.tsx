'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { Shield, Smartphone, KeyRound, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { showToast } from '../../components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, switchUser, demoUsers } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('123456');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    try {
      await login(identifier.trim(), otp.trim());
      showToast('Welcome to Signal!', 'success');
      router.push('/');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Use mock OTP 123456', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;

    setLoading(true);
    try {
      await register(username.trim(), displayName.trim(), phone.trim() || undefined);
      showToast('Account registered successfully!', 'success');
      router.push('/');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 50% 20%, #1e2640 0%, #0d0d12 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Signal Brand Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1d57d4 0%, #2c6bed 100%)',
            padding: '32px 24px',
            textAlign: 'center',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <Shield size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>Signal Messenger</h1>
          <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            Say &ldquo;hello&rdquo; to privacy. Simple. Secure. End-to-end encrypted.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              fontWeight: 600,
              fontSize: 13.5,
              borderBottom: mode === 'login' ? '2px solid var(--signal-blue)' : 'none',
              color: mode === 'login' ? 'var(--signal-blue)' : 'var(--text-muted)',
              background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
            }}
          >
            Sign In with Phone / Username
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '12px',
              fontWeight: 600,
              fontSize: 13.5,
              borderBottom: mode === 'register' ? '2px solid var(--signal-blue)' : 'none',
              color: mode === 'register' ? 'var(--signal-blue)' : 'var(--text-muted)',
              background: mode === 'register' ? 'var(--bg-card)' : 'transparent',
            }}
          >
            Create New Account
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: 24 }}>
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Phone Number or Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. sarah_c or +1 555-0100"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={{ width: '100%', paddingLeft: 38 }}
                  />
                  <Smartphone
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Mock SMS Verification Code</label>
                  <span style={{ fontSize: 11, color: 'var(--signal-blue)' }}>Fixed OTP: 123456</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{ width: '100%', paddingLeft: 38, letterSpacing: '4px', fontWeight: 600 }}
                  />
                  <KeyRound
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  padding: 12,
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Continue to Signal</span> <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. jane_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  padding: 12,
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Create Signal Account</span> <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* One-Click Evaluation Demo Accounts */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 10,
                letterSpacing: '0.5px',
              }}
            >
              Or One-Click Demo Log In
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {demoUsers.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await switchUser(u);
                      showToast(`Logged in as ${u.display_name}`, 'success');
                      router.push('/');
                    } catch (err: any) {
                      showToast(err.message, 'warning');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg-input)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Avatar src={u.avatar_url} name={u.display_name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
