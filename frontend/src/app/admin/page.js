'use client';

import { useEffect, useState } from 'react';
import { fetchDashboard, fetchTrades, fetchUsers } from '@/lib/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [dashData, tradeData, userData] = await Promise.all([
        fetchDashboard(),
        fetchTrades('limit=8'),
        fetchUsers(),
      ]);
      setStats(dashData.stats);
      setRecentTrades(tradeData.trades?.slice(0, 8) || []);
      setRecentUsers(
        (userData.users || [])
          .filter(u => u.role !== 'admin')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: 400 }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Platform overview and real-time statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon="👥" />
        <StatCard label="Total Trades" value={stats?.totalTrades || 0} icon="📈" />
        <StatCard label="Active Trades" value={stats?.activeTrades || 0} icon="⚡" sub="Live now" className="admin-stat-purple" />
        <StatCard label="Win Rate" value={`${stats?.winRate || 0}%`} icon="🎯" sub={`${stats?.wonTrades || 0}W / ${stats?.lostTrades || 0}L`} />
        <StatCard label="Trade Volume" value={`$${(stats?.totalVolume || 0).toLocaleString()}`} icon="💰" />
        <StatCard label="Real Volume" value={`$${(stats?.realVolume || 0).toLocaleString()}`} icon="💵" />
        <StatCard label="Total Deposits" value={`$${(stats?.totalDeposits || 0).toLocaleString()}`} icon="↓" sub={`${stats?.depositCount || 0} transactions`} className="admin-stat-positive" />
        <StatCard label="Total Withdrawals" value={`$${(stats?.totalWithdrawals || 0).toLocaleString()}`} icon="↑" sub={`${stats?.withdrawalCount || 0} transactions`} className="admin-stat-negative" />
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Recent Trades */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Recent Trades</span>
            <a href="/admin/trades" className="admin-btn admin-btn-sm admin-btn-primary">View All →</a>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Dir</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(t => (
                <tr key={t.id}>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.asset}</td>
                  <td><span className={`admin-badge admin-badge-${t.direction}`}>{t.direction.toUpperCase()}</span></td>
                  <td>${t.amount?.toFixed(2)}</td>
                  <td><span className={`admin-badge admin-badge-${t.status}`}>{t.status}</span></td>
                  <td><span className={`admin-badge admin-badge-${t.account_type}`}>{t.account_type}</span></td>
                </tr>
              ))}
              {recentTrades.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No trades yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* New Users */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">New Users</span>
            <a href="/admin/users" className="admin-btn admin-btn-sm admin-btn-primary">View All →</a>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#e0e0f0' }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: '#6b6b8a' }}>{u.email}</div>
                  </td>
                  <td style={{ color: '#22c55e', fontWeight: 600 }}>${u.balance?.toFixed(2)}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={2} className="admin-empty">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, className }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-label">{icon} {label}</div>
      <div className={`admin-stat-value ${className || ''}`}>{value}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}
