'use client';

import { useEffect, useState } from 'react';
import { fetchTransactions } from '@/lib/adminApi';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, statusFilter]);

  async function loadTransactions() {
    try {
      const params = [];
      if (typeFilter !== 'all') params.push(`type=${typeFilter}`);
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      params.push('limit=200');
      const data = await fetchTransactions(params.join('&'));
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + (t.amount || 0), 0);

  if (loading) {
    return <div className="admin-loading" style={{ minHeight: 400 }}><div className="admin-spinner" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Transactions</h1>
        <p className="admin-page-subtitle">
          {transactions.length} transactions • Deposits: ${totalDeposits.toFixed(2)} • Withdrawals: ${totalWithdrawals.toFixed(2)}
        </p>
      </div>

      <div className="admin-filters">
        {['all', 'deposit', 'withdrawal'].map(s => (
          <button key={s} className={`admin-filter-btn ${typeFilter === s ? 'active' : ''}`} onClick={() => setTypeFilter(s)}>
            {s === 'all' ? 'All Types' : s.charAt(0).toUpperCase() + s.slice(1) + 's'}
          </button>
        ))}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
        {['all', 'pending', 'completed', 'failed'].map(s => (
          <button key={s} className={`admin-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Phone</th>
              <th>M-Pesa Receipt</th>
              <th>Status</th>
              <th>Method</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>
                  <span className={`admin-badge admin-badge-${tx.type}`}>
                    {tx.type === 'deposit' ? '↓ Deposit' : '↑ Withdrawal'}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: tx.type === 'deposit' ? '#22c55e' : '#f87171' }}>
                  {tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toFixed(2)}
                </td>
                <td style={{ color: '#8b8ba7' }}>{tx.phone || '—'}</td>
                <td style={{ fontSize: 12, fontFamily: 'monospace', color: '#a78bfa' }}>{tx.mpesa_receipt || '—'}</td>
                <td><span className={`admin-badge admin-badge-${tx.status}`}>{tx.status}</span></td>
                <td style={{ color: '#8b8ba7', textTransform: 'uppercase', fontSize: 11 }}>{tx.method || 'mpesa'}</td>
                <td style={{ fontSize: 12, color: '#6b6b8a' }}>{formatTime(tx.created_at)}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7} className="admin-empty">No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
