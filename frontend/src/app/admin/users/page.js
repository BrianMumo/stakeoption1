'use client';

import { useEffect, useState } from 'react';
import { fetchUsers, updateUserAdmin, deleteUserAdmin, adjustUserBalance } from '@/lib/adminApi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMsg, setAdjustMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(user) {
    setEditUser(user);
    setEditForm({
      username: user.username,
      balance: user.balance,
      demo_balance: user.demo_balance,
      role: user.role || 'user',
      status: user.status || 'active',
      win_rate_boost: user.win_rate_boost || 0,
    });
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true);
    try {
      const data = await updateUserAdmin(editUser.id, {
        ...editForm,
        balance: parseFloat(editForm.balance),
        demo_balance: parseFloat(editForm.demo_balance),
        win_rate_boost: parseFloat(editForm.win_rate_boost) || null,
      });
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data.user } : u));
      setEditUser(null);
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their trades and transactions.')) return;
    try {
      await deleteUserAdmin(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return <div className="admin-loading" style={{ minHeight: 400 }}><div className="admin-spinner" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-subtitle">{users.length} registered users</p>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">All Users</span>
          <input
            className="admin-search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Real Balance</th>
              <th>Demo Balance</th>
              <th>Win Boost</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#e0e0f0' }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: '#6b6b8a' }}>{u.email}</div>
                </td>
                <td><span className={`admin-badge admin-badge-${u.role || 'user'}`}>{u.role || 'user'}</span></td>
                <td><span className={`admin-badge admin-badge-${u.status || 'active'}`}>{u.status || 'active'}</span></td>
                <td style={{ fontWeight: 600, color: '#22c55e' }}>${(u.balance || 0).toFixed(2)}</td>
                <td style={{ color: '#fbbf24' }}>${(u.demo_balance || 0).toFixed(2)}</td>
                <td>
                  {u.win_rate_boost ? (
                    <span className="admin-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                      🎯 {(u.win_rate_boost * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span style={{ color: '#4a4a6a', fontSize: 12 }}>Off</span>
                  )}
                </td>
                <td>{formatDate(u.created_at)}</td>
                <td>
                  <div className="admin-btn-group">
                    <button className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => openEdit(u)}>Edit</button>
                    {u.role !== 'admin' && (
                      <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="admin-empty">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal-title">Edit User: {editUser.username}</h2>
            
            <div className="admin-form-field">
              <label className="admin-form-label">Username</label>
              <input className="admin-form-input" value={editForm.username || ''} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-form-field">
                <label className="admin-form-label">Real Balance ($)</label>
                <input className="admin-form-input" type="number" step="0.01" value={editForm.balance} onChange={(e) => setEditForm(f => ({ ...f, balance: e.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Demo Balance ($)</label>
                <input className="admin-form-input" type="number" step="0.01" value={editForm.demo_balance} onChange={(e) => setEditForm(f => ({ ...f, demo_balance: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-form-field">
                <label className="admin-form-label">Role</label>
                <select className="admin-form-select" value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Status</label>
                <select className="admin-form-select" value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="admin-form-field">
              <label className="admin-form-label">🎯 Win Rate Boost (for marketing accounts)</label>
              <select className="admin-form-select" value={editForm.win_rate_boost || 0} onChange={(e) => setEditForm(f => ({ ...f, win_rate_boost: parseFloat(e.target.value) }))}>
                <option value="0">Off — Normal Win Rate</option>
                <option value="0.60">60% — Slight Boost</option>
                <option value="0.70">70% — Marketing Demo</option>
                <option value="0.80">80% — High Boost</option>
                <option value="0.90">90% — Maximum Boost</option>
              </select>
              <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 6 }}>
                When enabled, trade outcomes are adjusted so this user wins approximately this percentage of their trades. The close price is nudged naturally — it looks realistic on the chart.
              </div>
            </div>

            {/* Quick Balance Adjustment */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 4 }}>
              <label className="admin-form-label">💰 Quick Balance Adjustment</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                <input className="admin-form-input" type="number" placeholder="Amount ($)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                <input className="admin-form-input" type="text" placeholder="Reason (optional)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </div>
              <div className="admin-btn-group">
                <button className="admin-btn admin-btn-sm" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', flex: 1 }} onClick={async () => {
                  if (!adjustAmount) return;
                  try {
                    const res = await adjustUserBalance(editUser.id, adjustAmount, 'credit', adjustReason);
                    setAdjustMsg(`✅ ${res.message}`);
                    setEditForm(f => ({ ...f, balance: res.adjustment.new }));
                    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, balance: res.adjustment.new } : u));
                    setAdjustAmount(''); setAdjustReason('');
                  } catch (e) { setAdjustMsg(`❌ ${e.message}`); }
                }}>+ Credit</button>
                <button className="admin-btn admin-btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', flex: 1 }} onClick={async () => {
                  if (!adjustAmount) return;
                  try {
                    const res = await adjustUserBalance(editUser.id, adjustAmount, 'debit', adjustReason);
                    setAdjustMsg(`✅ ${res.message}`);
                    setEditForm(f => ({ ...f, balance: res.adjustment.new }));
                    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, balance: res.adjustment.new } : u));
                    setAdjustAmount(''); setAdjustReason('');
                  } catch (e) { setAdjustMsg(`❌ ${e.message}`); }
                }}>- Debit</button>
              </div>
              {adjustMsg && <div style={{ fontSize: 11, marginTop: 6, color: adjustMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{adjustMsg}</div>}
            </div>

            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-danger" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
