'use client';

import { useEffect, useState } from 'react';
import { fetchDashboard, fetchTrades, fetchUsers, fetchMpesaBalance, fetchAnalytics } from '@/lib/adminApi';

const KES_PER_USD = 129.24;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mpesaBalance, setMpesaBalance] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  async function loadData() {
    try {
      const [dashData, tradeData, userData, balData, anaData] = await Promise.all([
        fetchDashboard(),
        fetchTrades('limit=8'),
        fetchUsers(),
        fetchMpesaBalance().catch(() => null),
        fetchAnalytics().catch(() => null),
      ]);
      setStats(dashData.stats);
      setRecentTrades(tradeData.trades?.slice(0, 8) || []);
      setRecentUsers(
        (userData.users || [])
          .filter(u => u.role !== 'admin')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      );
      if (balData) setMpesaBalance(balData.balance || balData);
      if (anaData) setAnalytics(anaData);
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

  const revenue = analytics?.revenue || {};
  const tradeStats = analytics?.trades || {};
  const daily = analytics?.dailyStats || [];
  const maxDailyVol = Math.max(...daily.map(d => d.deposits + d.withdrawals), 1);

  // Compute platform P&L: what users lost (house wins)
  const platformPnL = (stats?.totalVolume || 0) - (tradeStats.won || 0) * ((stats?.totalVolume || 0) / Math.max(tradeStats.total || 1, 1));

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Platform overview · {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/admin/finances" style={{ textDecoration: 'none' }} className="admin-btn admin-btn-primary">
            💰 Finances
          </a>
          <a href="/admin/users" style={{ textDecoration: 'none' }} className="admin-btn admin-btn-primary">
            👥 Users
          </a>
        </div>
      </div>

      {/* Top Hero Row: Balance + Revenue + Live Pulse */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* M-Pesa Paybill Balance */}
        <div className="admin-stat-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(14,14,28,0.85) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💰</div>
            <div>
              <div style={{ fontSize: 11, color: '#6b6b8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Paybill Balance</div>
              <div style={{ fontSize: 10, color: '#4a4a6a' }}>M-Pesa Float</div>
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#22c55e', letterSpacing: -1 }}>
            KES {(mpesaBalance?.utility || mpesaBalance?.working || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b8a', marginTop: 4 }}>
            ≈ ${Math.round((mpesaBalance?.utility || mpesaBalance?.working || 0) / KES_PER_USD).toLocaleString()} USD
          </div>
        </div>

        {/* Net Revenue */}
        <div className="admin-stat-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(14,14,28,0.85) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
            <div>
              <div style={{ fontSize: 11, color: '#6b6b8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Net Revenue</div>
              <div style={{ fontSize: 10, color: '#4a4a6a' }}>Deposits − Withdrawals</div>
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: revenue.netRevenue >= 0 ? '#22c55e' : '#ef4444', letterSpacing: -1 }}>
            ${(revenue.netRevenue || 0).toFixed(2)}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#22c55e' }}>↓ +${(revenue.totalDeposited || 0).toFixed(0)}</span>
            <span style={{ fontSize: 11, color: '#ef4444' }}>↑ -${(revenue.totalWithdrawn || 0).toFixed(0)}</span>
          </div>
        </div>

        {/* Live Pulse */}
        <div className="admin-stat-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(14,14,28,0.85) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontSize: 11, color: '#6b6b8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Live Platform</div>
              <div style={{ fontSize: 10, color: '#4a4a6a' }}>{currentTime.toLocaleTimeString('en-GB')}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{stats?.activeTrades || 0}</div>
              <div style={{ fontSize: 11, color: '#6b6b8a' }}>Active Trades</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{stats?.totalUsers || 0}</div>
              <div style={{ fontSize: 11, color: '#6b6b8a' }}>Total Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="admin-stats-grid">
        <StatCard label="Total Trades" value={stats?.totalTrades || 0} icon="📈" />
        <StatCard label="Win Rate" value={`${stats?.winRate || 0}%`} icon="🎯" sub={`${stats?.wonTrades || 0}W / ${stats?.lostTrades || 0}L`} />
        <StatCard label="Trade Volume" value={`$${(stats?.totalVolume || 0).toLocaleString()}`} icon="💎" />
        <StatCard label="Real Volume" value={`$${(stats?.realVolume || 0).toLocaleString()}`} icon="💵" className="admin-stat-positive" />
        <StatCard label="Deposits" value={`$${(stats?.totalDeposits || 0).toLocaleString()}`} icon="↓" sub={`${stats?.depositCount || 0} txns`} className="admin-stat-positive" />
        <StatCard label="Withdrawals" value={`$${(stats?.totalWithdrawals || 0).toLocaleString()}`} icon="↑" sub={`${stats?.withdrawalCount || 0} txns`} className="admin-stat-negative" />
      </div>

      {/* 7-Day Volume Mini Chart */}
      {daily.length > 0 && (
        <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
          <div className="admin-table-header">
            <span className="admin-table-title">📈 7-Day Volume</span>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 11, color: '#6b6b8a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e', opacity: 0.7 }} />Deposits
              </span>
              <span style={{ fontSize: 11, color: '#6b6b8a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444', opacity: 0.6 }} />Withdrawals
              </span>
            </div>
          </div>
          <div style={{ padding: '16px 22px 20px', display: 'grid', gridTemplateColumns: `repeat(${daily.length}, 1fr)`, gap: 8, alignItems: 'end', height: 100 }}>
            {daily.map((d, i) => {
              const total = d.deposits + d.withdrawals;
              const h = Math.max((total / maxDailyVol) * 80, 4);
              const depRatio = total > 0 ? (d.deposits / total) : 0.5;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8aa0' }}>${total.toFixed(0)}</div>
                  <div style={{ width: '100%', maxWidth: 40, height: h, borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: depRatio, background: 'linear-gradient(180deg, #22c55e, #16a34a)', opacity: 0.7 }} />
                    <div style={{ flex: 1 - depRatio, background: 'linear-gradient(180deg, #ef4444, #dc2626)', opacity: 0.5 }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#4a4a6a', fontWeight: 500 }}>
                    {new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom: Recent Trades + New Users */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Recent Trades */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">Recent Trades</span>
            <a href="/admin/trades" className="admin-btn admin-btn-sm admin-btn-primary" style={{ textDecoration: 'none' }}>View All →</a>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Dir</th>
                <th>Amount</th>
                <th>P&L</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(t => {
                const pnl = t.status === 'won' ? (t.payout || 0) - t.amount : t.status === 'lost' ? -t.amount : 0;
                return (
                  <tr key={t.id}>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: '#e0e0f0' }}>{t.asset}</td>
                    <td><span className={`admin-badge admin-badge-${t.direction}`}>{t.direction?.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 600 }}>${t.amount?.toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#6b6b8a' }}>
                      {pnl !== 0 ? (pnl > 0 ? '+' : '') + pnl.toFixed(2) : '—'}
                    </td>
                    <td><span className={`admin-badge admin-badge-${t.status}`}>{t.status}</span></td>
                    <td><span className={`admin-badge admin-badge-${t.account_type}`}>{t.account_type}</span></td>
                  </tr>
                );
              })}
              {recentTrades.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">No trades yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* New Users */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span className="admin-table-title">New Users</span>
            <a href="/admin/users" className="admin-btn admin-btn-sm admin-btn-primary" style={{ textDecoration: 'none' }}>View All →</a>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentUsers.length === 0 ? (
              <div className="admin-empty">No users yet</div>
            ) : (
              recentUsers.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < recentUsers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, hsl(${(i * 60 + 240) % 360}, 60%, 45%), hsl(${(i * 60 + 280) % 360}, 50%, 35%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: '#4a4a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#22c55e' }}>${u.balance?.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#4a4a6a' }}>Real</div>
                  </div>
                </div>
              ))
            )}
          </div>
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
