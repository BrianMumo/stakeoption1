'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initiateDeposit, initiateWithdrawal, getTransactions, getBalance } from '@/lib/api';
import styles from './FinancesOverlay.module.css';

const DEPOSIT_CHIPS = [100, 500, 1000, 2500, 5000, 10000];
const WITHDRAW_CHIPS = [5, 10, 25, 50, 100, 500];
const KES_PER_USD = 130;

export default function FinancesOverlay({ isOpen, onClose }) {
  const { user, updateBalance, accountType, activeBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // Fetch transactions when history tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadTransactions();
    }
  }, [isOpen, activeTab]);

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const data = await getTransactions(50);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const refreshBalance = useCallback(async () => {
    try {
      const data = await getBalance();
      updateBalance(data.balance);
    } catch (e) {}
  }, [updateBalance]);

  const handleDeposit = async () => {
    setError('');
    if (!phone.trim()) return setError('Enter your M-Pesa phone number');
    if (!amount || parseFloat(amount) < 10) return setError('Minimum deposit is KES 10');

    setLoading(true);
    try {
      const result = await initiateDeposit(phone.trim(), parseFloat(amount));
      setSuccess({
        type: 'deposit',
        message: result.message,
        amount: parseFloat(amount),
        usdAmount: result.usdAmount || (parseFloat(amount) / KES_PER_USD),
        receipt: result.receipt || result.checkoutRequestID,
        balance: result.balance
      });

      if (result.balance !== undefined) {
        updateBalance(result.balance);
      } else {
        await refreshBalance();
      }
    } catch (err) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setError('');
    if (!phone.trim()) return setError('Enter your M-Pesa phone number');
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return setError('Minimum withdrawal is $1');
    if (amt > (user?.balance || 0)) return setError('Insufficient real balance');

    setLoading(true);
    try {
      const result = await initiateWithdrawal(phone.trim(), amt);
      setSuccess({
        type: 'withdrawal',
        message: result.message,
        amount: amt,
        kesAmount: result.kesAmount || Math.round(amt * KES_PER_USD),
        receipt: result.receipt || result.transactionId,
        balance: result.balance
      });

      if (result.balance !== undefined) {
        updateBalance(result.balance);
      } else {
        await refreshBalance();
      }
    } catch (err) {
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setAmount('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetForm();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.open : ''}`}>
      <div className={styles.backdrop} onClick={handleClose} />
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            Finances
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Balance Card */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceLabel}>Real Account Balance</div>
          <div className={styles.balanceAmount}>
            <span className={styles.balanceCurrency}>$</span>
            {(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {accountType === 'demo' && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Deposits and withdrawals use your real account
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${styles.tabDeposit} ${activeTab === 'deposit' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('deposit')}
          >
            <span className={styles.tabIcon}>↓</span> Deposit
          </button>
          <button
            className={`${styles.tab} ${styles.tabWithdraw} ${activeTab === 'withdraw' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('withdraw')}
          >
            <span className={styles.tabIcon}>↑</span> Withdraw
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('history')}
          >
            <span className={styles.tabIcon}>☰</span> History
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* ── Deposit Tab ── */}
          {activeTab === 'deposit' && !success && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>M-Pesa Phone Number</label>
                <div className={styles.phoneInput}>
                  <div className={styles.phonePrefix}>
                    <span className={styles.flag}>🇰🇪</span> +254
                  </div>
                  <input
                    type="tel"
                    className={styles.phoneField}
                    placeholder="7XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={12}
                    id="deposit-phone"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (KES)</label>
                <div className={styles.amountChips}>
                  {DEPOSIT_CHIPS.map((v) => (
                    <button
                      key={v}
                      className={`${styles.chip} ${parseFloat(amount) === v ? styles.chipActive : ''}`}
                      onClick={() => setAmount(v.toString())}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className={styles.customAmount}>
                  <span className={styles.amountPrefix}>KES</span>
                  <input
                    type="number"
                    className={styles.amountField}
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    max="150000"
                    id="deposit-amount"
                  />
                </div>
              </div>

              {amount && parseFloat(amount) >= 10 && (
                <div className={styles.conversionInfo}>
                  <span className={styles.conversionIcon}>💱</span>
                  KES {parseFloat(amount).toLocaleString()} ≈{' '}
                  <span className={styles.conversionAmount}>
                    ${(parseFloat(amount) / KES_PER_USD).toFixed(2)}
                  </span>{' '}
                  will be added to your balance
                </div>
              )}

              {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>{error}</div>}

              <button
                className={`${styles.submitBtn} ${styles.depositBtn}`}
                onClick={handleDeposit}
                disabled={loading || !phone || !amount || parseFloat(amount) < 10}
                id="deposit-submit"
              >
                {loading ? (
                  <span className={styles.btnSpinner} />
                ) : (
                  <>Deposit via M-Pesa</>
                )}
              </button>

              <div className={styles.mpesaBrand}>
                Powered by <span className={styles.mpesaLogo}>M-PESA</span> · Safaricom Paybill
              </div>
            </>
          )}

          {/* ── Withdraw Tab ── */}
          {activeTab === 'withdraw' && !success && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>M-Pesa Phone Number</label>
                <div className={styles.phoneInput}>
                  <div className={styles.phonePrefix}>
                    <span className={styles.flag}>🇰🇪</span> +254
                  </div>
                  <input
                    type="tel"
                    className={styles.phoneField}
                    placeholder="7XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={12}
                    id="withdraw-phone"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (USD)</label>
                <div className={styles.amountChips}>
                  {WITHDRAW_CHIPS.map((v) => (
                    <button
                      key={v}
                      className={`${styles.chip} ${parseFloat(amount) === v ? styles.chipActiveWithdraw : ''}`}
                      onClick={() => setAmount(v.toString())}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
                <div className={styles.customAmount}>
                  <span className={styles.amountPrefix}>$</span>
                  <input
                    type="number"
                    className={styles.amountField}
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={user?.balance || 0}
                    id="withdraw-amount"
                  />
                </div>
              </div>

              {amount && parseFloat(amount) >= 1 && (
                <div className={styles.conversionInfo}>
                  <span className={styles.conversionIcon}>💱</span>
                  ${parseFloat(amount).toFixed(2)} ≈{' '}
                  <span className={styles.conversionAmount}>
                    KES {Math.round(parseFloat(amount) * KES_PER_USD).toLocaleString()}
                  </span>{' '}
                  will be sent to your phone
                </div>
              )}

              {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>{error}</div>}

              <button
                className={`${styles.submitBtn} ${styles.withdrawBtn}`}
                onClick={handleWithdraw}
                disabled={loading || !phone || !amount || parseFloat(amount) < 1 || parseFloat(amount) > (user?.balance || 0)}
                id="withdraw-submit"
              >
                {loading ? (
                  <span className={styles.btnSpinner} />
                ) : (
                  <>Withdraw to M-Pesa</>
                )}
              </button>

              <div className={styles.mpesaBrand}>
                Powered by <span className={styles.mpesaLogo}>M-PESA</span> · Safaricom Paybill
              </div>
            </>
          )}

          {/* ── Success State ── */}
          {success && (
            <div className={styles.successState}>
              <div className={`${styles.successCircle} ${success.type === 'deposit' ? styles.successCircleDeposit : styles.successCircleWithdraw}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className={styles.successTitle}>
                {success.type === 'deposit' ? 'Deposit Successful!' : 'Withdrawal Sent!'}
              </div>
              <div className={styles.successMessage}>{success.message}</div>
              <div className={styles.successDetails}>
                {success.type === 'deposit' ? (
                  <>
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>Amount</span>
                      <span className={styles.successValue}>KES {success.amount?.toLocaleString()}</span>
                    </div>
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>Added to Balance</span>
                      <span className={styles.successValue} style={{ color: '#22c55e' }}>+${success.usdAmount?.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>Amount</span>
                      <span className={styles.successValue}>${success.amount?.toFixed(2)}</span>
                    </div>
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>M-Pesa Amount</span>
                      <span className={styles.successValue}>KES {success.kesAmount?.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {success.receipt && (
                  <div className={styles.successRow}>
                    <span className={styles.successLabel}>Receipt</span>
                    <span className={styles.successValue}>{success.receipt}</span>
                  </div>
                )}
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>New Balance</span>
                  <span className={styles.successValue}>${success.balance?.toFixed(2)}</span>
                </div>
              </div>
              <button className={styles.doneBtn} onClick={resetForm}>Done</button>
            </div>
          )}

          {/* ── History Tab ── */}
          {activeTab === 'history' && (
            <div className={styles.historyList}>
              {txLoading ? (
                <div className={styles.historyEmpty}>
                  <div className={styles.btnSpinner} style={{ width: 24, height: 24, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#64748b' }} />
                </div>
              ) : transactions.length === 0 ? (
                <div className={styles.historyEmpty}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>No transactions yet</span>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className={`${styles.txItem} ${tx.type === 'deposit' ? styles.txDeposit : styles.txWithdrawal}`}>
                    <div className={styles.txIcon}>
                      {tx.type === 'deposit' ? '↓' : '↑'}
                    </div>
                    <div className={styles.txInfo}>
                      <div className={styles.txType}>
                        {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        {tx.mpesa_receipt && ` · ${tx.mpesa_receipt}`}
                      </div>
                      <div className={styles.txDate}>{formatDate(tx.created_at)}</div>
                    </div>
                    <div className={styles.txRight}>
                      <div className={styles.txAmount}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toFixed(2)}
                      </div>
                      <span className={`${styles.txStatus} ${
                        tx.status === 'completed' ? styles.statusCompleted :
                        tx.status === 'pending' || tx.status === 'processing' ? styles.statusPending :
                        styles.statusFailed
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
