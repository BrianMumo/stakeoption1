'use client';

import { useEffect, useState } from 'react';
import { fetchTrades } from '@/lib/adminApi';

export default function AdminTradesPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  useEffect(() => {
    loadTrades();
  }, [statusFilter, accountFilter]);

  async function loadTrades() {
    try {
      const params = [];
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (accountFilter !== 'all') params.push(`account_type=${accountFilter}`);
      params.push('limit=200');
      const data = await fetchTrades(params.join('&'));
      setTrades(data.trades || []);
    } catch (err) {
      console.error('Failed to load trades:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // Compute stats from filtered trades
  const wonCount = trades.filter(t => t.status === 'won').length;
  const lostCount = trades.filter(t => t.status === 'lost').length;
  const totalVolume = trades.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPayout = trades.filter(t => t.status === 'won').reduce((s, t) => s + (t.payout || 0), 0);

  if (loading) {
    return <div className="admin-loading" style={{ minHeight: 400 }}><div className="admin-spinner" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Trades</h1>
        <p className="admin-page-subtitle">{trades.length} trades • Vol: ${totalVolume.toFixed(2)} • Payouts: ${totalPayout.toFixed(2)}</p>
      </div>

      <div className="admin-filters">
        {['all', 'active', 'won', 'lost'].map(s => (
          <button key={s} className={`admin-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'won' && ` (${wonCount})`}
            {s === 'lost' && ` (${lostCount})`}
          </button>
        ))}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
        {['all', 'demo', 'real'].map(s => (
          <button key={s} className={`admin-filter-btn ${accountFilter === s ? 'active' : ''}`} onClick={() => setAccountFilter(s)}>
            {s === 'all' ? 'All Accounts' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Entry</th>
              <th>Close</th>
              <th>P&L</th>
              <th>Status</th>
              <th>Account</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => {
              const pnl = t.status === 'won' ? (t.payout || 0) - t.amount : t.status === 'lost' ? -t.amount : 0;
              return (
                <tr key={t.id}>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.asset}</td>
                  <td><span className={`admin-badge admin-badge-${t.direction}`}>{t.direction?.toUpperCase()}</span></td>
                  <td style={{ fontWeight: 600 }}>${t.amount?.toFixed(2)}</td>
                  <td>{t.strike_price?.toFixed(2) || '—'}</td>
                  <td>{t.close_price?.toFixed(2) || '—'}</td>
                  <td style={{ fontWeight: 600, color: pnl > 0 ? '#22c55e' : pnl < 0 ? '#f87171' : '#8b8ba7' }}>
                    {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                  </td>
                  <td><span className={`admin-badge admin-badge-${t.status}`}>{t.status}</span></td>
                  <td><span className={`admin-badge admin-badge-${t.account_type}`}>{t.account_type}</span></td>
                  <td style={{ fontSize: 12, color: '#6b6b8a' }}>{formatTime(t.placed_at)}</td>
                </tr>
              );
            })}
            {trades.length === 0 && (
              <tr><td colSpan={9} className="admin-empty">No trades found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
