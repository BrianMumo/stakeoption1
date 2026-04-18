'use client';

import { useEffect, useState } from 'react';
import { fetchMpesaBalance, adminMpesaWithdraw, fetchAnalytics, fetchTransactions } from '@/lib/adminApi';

const KES_PER_USD = 129.24;

export default function AdminFinancesPage() {
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Withdrawal form
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);
  const [withdrawError, setWithdrawError] = useState('');

  const [balanceSource, setBalanceSource] = useState(null);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [balData, anaData, txData] = await Promise.all([
        fetchMpesaBalance(),
        fetchAnalytics(),
        fetchTransactions('limit=20'),
      ]);
      setBalance(balData?.balance || balData);
      setBalanceSource(balData?.source || null);
      setBalanceUpdatedAt(balData?.updatedAt || null);
      setAnalytics(anaData);
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Finances load error:', err);
    } finally {
      setBalanceLoading(false);
      setTxLoading(false);
    }
  }

  async function refreshBalance() {
    setBalanceLoading(true);
    try {
      // Pass refresh=true to trigger a fresh Daraja Account Balance query
      const data = await fetchMpesaBalance(true);
      setBalance(data?.balance || data);
      setBalanceSource(data?.source || null);
      setBalanceUpdatedAt(data?.updatedAt || null);
      // If it was queried but no callback yet, poll again in 5 seconds
      if (data?.queryStatus === 'queried' && data?.source !== 'mpesa_callback') {
        setTimeout(async () => {
          try {
            const updated = await fetchMpesaBalance();
            setBalance(updated?.balance || updated);
            setBalanceSource(updated?.source || null);
            setBalanceUpdatedAt(updated?.updatedAt || null);
          } catch (_) {}
        }, 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawResult(null);
    const kesAmount = parseFloat(amount);
    if (!phone.trim()) return setWithdrawError('Enter phone number');
    if (!kesAmount || kesAmount < 10) return setWithdrawError('Minimum withdrawal is KES 10');

    setWithdrawing(true);
    try {
      const result = await adminMpesaWithdraw(phone.trim(), kesAmount);
      setWithdrawResult(result);
      setPhone('');
      setAmount('');
      // Refresh balance after withdrawal
      setTimeout(refreshBalance, 2000);
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const revenue = analytics?.revenue || {};
  const trades = analytics?.trades || {};
  const daily = analytics?.dailyStats || [];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Finances</h1>
        <p className="admin-page-subtitle">M-Pesa balance, withdrawals, and revenue analytics</p>
      </div>

      {/* Top Grid: Balance + Withdrawal + Revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* M-Pesa Balance Card */}
        <div className="admin-stat-card" style={{ gridColumn: 'span 1', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="admin-stat-label" style={{ margin: 0, fontSize: 14 }}>💰 M-Pesa Paybill Balance</div>
            <button
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={refreshBalance}
              disabled={balanceLoading}
              style={{ fontSize: 11 }}
            >
              {balanceLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          {balanceLoading ? (
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6b6b8a' }}>Loading...</div>
          ) : balance ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', letterSpacing: -1 }}>
                KES {(balance.utility || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 14, color: '#8a8aa0', marginTop: 6, fontWeight: 600 }}>
                ≈ ${balance.usd?.total?.toFixed(2) || Math.round((balance.utility || 0) / KES_PER_USD).toLocaleString()} USD
              </div>
              <div style={{ fontSize: 12, color: '#4a4a6a', marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Available</span>
                  <span style={{ color: '#22c55e' }}>KES {(balance.working || 0).toLocaleString()}</span>
                </div>
                {balance.uncleared > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending</span>
                    <span style={{ color: '#fbbf24' }}>KES {balance.uncleared.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#4a4a6a', marginTop: 4 }}>
                  Source: {balanceSource === 'mpesa_callback' ? '🟢 M-Pesa Live' : balanceSource === 'database' ? '🔵 DB Estimate' : '⏳ Waiting for M-Pesa...'}
                  {balanceUpdatedAt && ` · ${new Date(balanceUpdatedAt).toLocaleTimeString()}`}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: '#6b6b8a' }}>No transaction data</div>
          )}
        </div>

        {/* Admin Withdrawal */}
        <div className="admin-stat-card" style={{ gridColumn: 'span 1', padding: 24 }}>
          <div className="admin-stat-label" style={{ margin: '0 0 16px', fontSize: 14 }}>💸 Withdraw to M-Pesa</div>
          <form onSubmit={handleWithdraw}>
            <div className="admin-form-field" style={{ marginBottom: 10 }}>
              <label className="admin-form-label" style={{ fontSize: 11 }}>Phone Number</label>
              <input
                className="admin-form-input"
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={13}
              />
            </div>
            <div className="admin-form-field" style={{ marginBottom: 10 }}>
              <label className="admin-form-label" style={{ fontSize: 11 }}>Amount (KES)</label>
              <input
                className="admin-form-input"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="10"
              />
              {parseFloat(amount) > 0 && (
                <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 4 }}>
                  ≈ ${(parseFloat(amount) / KES_PER_USD).toFixed(2)} USD
                </div>
              )}
            </div>
            {withdrawError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                {withdrawError}
              </div>
            )}
            {withdrawResult && (
              <div style={{ fontSize: 12, color: '#22c55e', marginBottom: 8, padding: '6px 10px', background: 'rgba(34,197,94,0.1)', borderRadius: 6 }}>
                ✅ {withdrawResult.message}
                {withdrawResult.receipt && <div style={{ color: '#6b6b8a', marginTop: 2 }}>Receipt: {withdrawResult.receipt}</div>}
              </div>
            )}
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: 13 }}
              disabled={withdrawing}
            >
              {withdrawing ? 'Processing...' : 'Withdraw to M-Pesa'}
            </button>
          </form>
        </div>

        {/* Revenue Summary */}
        <div className="admin-stat-card" style={{ gridColumn: 'span 1', padding: 24 }}>
          <div className="admin-stat-label" style={{ margin: '0 0 16px', fontSize: 14 }}>📊 Revenue Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8aa0', fontSize: 13 }}>Total Deposits</span>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 15 }}>+${revenue.totalDeposited?.toFixed(2) || '0.00'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8aa0', fontSize: 13 }}>Total Withdrawals</span>
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 15 }}>-${revenue.totalWithdrawn?.toFixed(2) || '0.00'}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#e0e0f0', fontWeight: 600, fontSize: 14 }}>Net Revenue</span>
              <span style={{ color: revenue.netRevenue >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800, fontSize: 18 }}>
                ${revenue.netRevenue?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8aa0', fontSize: 13 }}>Trade Volume</span>
              <span style={{ color: '#818cf8', fontWeight: 600, fontSize: 14 }}>${trades.volume?.toLocaleString() || '0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8aa0', fontSize: 13 }}>Win Rate</span>
              <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 14 }}>
                {trades.winRate || 0}% ({trades.won || 0}W / {trades.lost || 0}L)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Volume Chart (simple bar representation) */}
      {daily.length > 0 && (
        <div className="admin-table-wrap" style={{ marginBottom: 24 }}>
          <div className="admin-table-header">
            <span className="admin-table-title">📈 Daily Volume (Last 7 Days)</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daily.length}, 1fr)`, gap: 12, alignItems: 'end', minHeight: 120 }}>
              {daily.map((d, i) => {
                const maxVal = Math.max(...daily.map(x => x.deposits + x.withdrawals), 1);
                const barHeight = ((d.deposits + d.withdrawals) / maxVal) * 100;
                const depPct = d.deposits / (d.deposits + d.withdrawals || 1) * 100;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 11, color: '#8a8aa0', fontWeight: 600 }}>
                      ${(d.deposits + d.withdrawals).toFixed(0)}
                    </div>
                    <div style={{ width: '100%', height: Math.max(barHeight, 4), borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: depPct, background: 'rgba(34,197,94,0.6)', minHeight: d.deposits > 0 ? 2 : 0 }} />
                      <div style={{ flex: 100 - depPct, background: 'rgba(239,68,68,0.4)', minHeight: d.withdrawals > 0 ? 2 : 0 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b6b8a' }}>
                      {new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#6b6b8a' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(34,197,94,0.6)', marginRight: 4 }} />Deposits</span>
              <span style={{ fontSize: 11, color: '#6b6b8a' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.4)', marginRight: 4 }} />Withdrawals</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <span className="admin-table-title">Recent Transactions</span>
          <a href="/admin/transactions" className="admin-btn admin-btn-sm admin-btn-primary">View All →</a>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>User</th>
              <th>Amount</th>
              <th>M-Pesa</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {txLoading ? (
              <tr><td colSpan={6} className="admin-empty"><div className="admin-spinner" style={{ width: 20, height: 20 }} /></td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} className="admin-empty">No transactions yet</td></tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className={`admin-badge admin-badge-${tx.type}`}>
                      {tx.type === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.user_email || tx.user_id?.substring(0, 8) || '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: tx.type === 'deposit' ? '#22c55e' : '#ef4444' }}>
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toFixed(2)}
                  </td>
                  <td style={{ fontSize: 11, color: '#6b6b8a' }}>{tx.mpesa_receipt || '—'}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${tx.status}`}>{tx.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: '#8a8aa0' }}>{formatDate(tx.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
