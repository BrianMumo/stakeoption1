'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './profile.module.css';
import { API_BASE } from '@/lib/constants';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load user data + stats
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      fetch(`${API_BASE}/api/user/profile`, { headers: getHeaders() }).then(r => r.json()),
      fetch(`${API_BASE}/api/user/stats`, { headers: getHeaders() }).then(r => r.json()),
    ])
      .then(([profileData, statsData]) => {
        if (profileData.user) {
          setUser(profileData.user);
          setUsername(profileData.user.username || '');
        } else {
          router.push('/login');
        }
        setStats(statsData);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleProfileUpdate = useCallback(async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  }, [username]);

  const handlePasswordChange = useCallback(async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('account_type');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageLoading}>
          <div className={styles.pageSpinner} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.username || user.email || '?').charAt(0).toUpperCase();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <Link href="/trade" className={styles.backBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Trading
        </Link>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>

      <div className={styles.container}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.headerInfo}>
            <div className={styles.headerName}>{user.username || 'Trader'}</div>
            <div className={styles.headerEmail}>
              {user.email}
              <span className={`${styles.headerBadge} ${user.account_type === 'real' ? styles.badgeReal : styles.badgeDemo}`}>
                {user.account_type || 'demo'}
              </span>
            </div>
            <div className={styles.headerDate}>Member since {memberSince}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(56,189,248,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className={styles.statValue}>{stats?.totalTrades || 0}</div>
            <div className={styles.statLabel}>Total Trades</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(16,185,129,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className={styles.statValue}>{stats?.winRate || '0.0'}%</div>
            <div className={styles.statLabel}>Win Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(129,140,248,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8l-8 8M8 8l8 8" strokeWidth="0"/><text x="12" y="16" textAnchor="middle" fill="#818cf8" fontSize="12" fontWeight="bold">$</text></svg>
            </div>
            <div className={styles.statValue}>${stats?.totalVolume?.toLocaleString() || '0'}</div>
            <div className={styles.statLabel}>Volume Traded</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: stats?.netPnL >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stats?.netPnL >= 0 ? '#10b981' : '#f43f5e'} strokeWidth="2">
                <polyline points={stats?.netPnL >= 0 ? '22 7 13.5 15.5 8.5 10.5 2 17' : '22 17 13.5 8.5 8.5 13.5 2 7'}/>
              </svg>
            </div>
            <div className={`${styles.statValue} ${stats?.netPnL >= 0 ? styles.statPositive : styles.statNegative}`}>
              {stats?.netPnL >= 0 ? '+' : ''}${stats?.netPnL?.toLocaleString() || '0'}
            </div>
            <div className={styles.statLabel}>Net P&L</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className={styles.sectionGrid}>
          {/* Account Balances */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon} style={{ background: 'rgba(56,189,248,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </span>
              Account Balances
            </h3>
            <div className={styles.balanceCards}>
              <div className={styles.balanceCard}>
                <div className={styles.balanceLabel}>Real Balance</div>
                <div className={styles.balanceValue}>${(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className={styles.balanceCard}>
                <div className={styles.balanceLabel}>Demo Balance</div>
                <div className={styles.balanceValue}>${(user.demo_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            {stats && (
              <div className={styles.winRateBar}>
                <div className={styles.winRateHeader}>
                  <span className={styles.winRateLabel}>Win Rate</span>
                  <span className={styles.winRateValue}>{stats.wonTrades}W / {stats.lostTrades}L</span>
                </div>
                <div className={styles.winRateTrack}>
                  <div className={styles.winRateFill} style={{ width: `${stats.winRate}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Edit Profile */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon} style={{ background: 'rgba(129,140,248,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              Edit Profile
            </h3>
            {profileMsg.text && (
              <div className={profileMsg.type === 'success' ? styles.success : styles.error}>
                {profileMsg.text}
              </div>
            )}
            <form onSubmit={handleProfileUpdate}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input className={styles.input} type="email" value={user.email} disabled />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input
                    className={styles.input}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
              </div>
              <button type="submit" className={styles.saveBtn} disabled={savingProfile}>
                {savingProfile ? <span className={styles.spinner} /> : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className={styles.sectionFull}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon} style={{ background: 'rgba(245,158,11,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              Change Password
            </h3>
            {passwordMsg.text && (
              <div className={passwordMsg.type === 'success' ? styles.success : styles.error}>
                {passwordMsg.text}
              </div>
            )}
            <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div className={styles.field}>
                <label className={styles.label}>Current Password</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    className={styles.input}
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    required
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New Password</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    className={styles.input}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm New Password</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <input
                    className={styles.input}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className={styles.saveBtn} disabled={savingPassword}>
                  {savingPassword ? <span className={styles.spinner} /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
