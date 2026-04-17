'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initiateDeposit, initiateWithdrawal, getTransactions, getBalance, getTransactionStatus } from '@/lib/api';
import styles from './FinancesOverlay.module.css';

const DEPOSIT_CHIPS = [1, 10, 25, 50, 100, 250];
const KES_PER_USD = 129.24;
const POLL_INTERVAL = 3000; // 3 seconds
const POLL_TIMEOUT = 120000; // 2 minutes max wait

export default function FinancesOverlay({ isOpen, onClose }) {
  const { user, updateBalance, accountType } = useAuth();
  const [view, setView] = useState('menu'); // menu | deposit | withdraw | history
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [pending, setPending] = useState(null); // { transactionId, usdAmount, kesAmount }
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const pollRef = useRef(null);
  const pollStartRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Fetch transactions when history view is active
  useEffect(() => {
    if (isOpen && view === 'history') {
      loadTransactions();
    }
  }, [isOpen, view]);

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
    const usdAmt = parseFloat(amount);
    if (!usdAmt || usdAmt < 1) return setError('Minimum deposit is $1');
    
    const kesAmount = Math.ceil(usdAmt * KES_PER_USD);

    setLoading(true);
    try {
      // Send USD amount — backend converts to KES for M-Pesa
      const result = await initiateDeposit(phone.trim(), usdAmt);

      if (result.simulated) {
        // Simulation mode — instant success
        setSuccess({
          type: 'deposit',
          message: result.message,
          usdAmount: usdAmt,
          kesAmount: kesAmount,
          receipt: result.receipt,
          balance: result.balance
        });
        if (result.balance !== undefined) updateBalance(result.balance);
      } else {
        // Real M-Pesa — STK Push sent, wait for user to enter PIN
        setPending({
          transactionId: result.transactionId,
          usdAmount: usdAmt,
          kesAmount: kesAmount,
          message: result.message || 'M-Pesa payment prompt sent to your phone. Enter your PIN to complete.'
        });
        // Start polling for transaction status
        startPolling(result.transactionId, usdAmt, kesAmount);
      }
    } catch (err) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (txId, usdAmt, kesAmt) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollStartRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      try {
        const data = await getTransactionStatus(txId);
        const tx = data.transaction;

        if (tx.status === 'completed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(null);
          await refreshBalance();
          const balData = await getBalance();
          setSuccess({
            type: 'deposit',
            message: 'Deposit completed successfully!',
            usdAmount: usdAmt,
            kesAmount: kesAmt,
            receipt: tx.mpesa_receipt || tx.reference,
            balance: balData.balance
          });
          updateBalance(balData.balance);
        } else if (tx.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(null);
          setError('M-Pesa payment was cancelled or failed. Please try again.');
        }

        // Timeout after 2 minutes
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPending(null);
          setError('Payment confirmation timed out. If you were charged, your balance will update shortly.');
        }
      } catch (err) {
        // Silently retry on poll errors
      }
    }, POLL_INTERVAL);
  };

  const handleWithdraw = async () => {
    setError('');
    if (!phone.trim()) return setError('Enter your M-Pesa phone number');
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return setError('Minimum withdrawal is $1');
    if (amt > (user?.balance || 0)) return setError('Insufficient balance');

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
    setPending(null);
    setAmount('');
    setError('');
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleClose = () => {
    resetForm();
    setView('menu');
    onClose();
  };

  const handleBack = () => {
    resetForm();
    setView('menu');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const usdAmount = parseFloat(amount) || 0;
  const kesEquiv = Math.ceil(usdAmount * KES_PER_USD);
  const userBalance = user?.balance || 0;
  const maxWithdraw = Math.min(userBalance, 1900);

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

        {/* Content */}
        <div className={styles.content}>

          {/* ── Menu View ── */}
          {view === 'menu' && (
            <>
              {/* Balance Card */}
              <div className={styles.balanceCard}>
                <div className={styles.balanceLabel}>Real Account Balance</div>
                <div className={styles.balanceAmount}>
                  <span className={styles.balanceCurrency}>$</span>
                  {userBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {accountType === 'demo' && (
                  <div className={styles.demoNotice}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Deposits and withdrawals use your real account
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={styles.menuActions}>
                <button className={styles.menuBtn} onClick={() => setView('deposit')}>
                  <div className={styles.menuBtnIcon} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </div>
                  <div className={styles.menuBtnText}>
                    <span className={styles.menuBtnLabel}>Deposit</span>
                    <span className={styles.menuBtnSub}>Add funds via M-Pesa</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className={styles.menuBtn} onClick={() => setView('withdraw')}>
                  <div className={styles.menuBtnIcon} style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  </div>
                  <div className={styles.menuBtnText}>
                    <span className={styles.menuBtnLabel}>Withdraw</span>
                    <span className={styles.menuBtnSub}>Send to M-Pesa</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className={styles.menuBtn} onClick={() => setView('history')}>
                  <div className={styles.menuBtnIcon} style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div className={styles.menuBtnText}>
                    <span className={styles.menuBtnLabel}>History</span>
                    <span className={styles.menuBtnSub}>View past transactions</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </>
          )}

          {/* ── Pending M-Pesa Confirmation ── */}
          {pending && (
            <div className={styles.pendingState}>
              <div className={styles.pendingSpinnerWrap}>
                <div className={styles.pendingSpinner} />
                <div className={styles.pendingPhoneIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
              </div>
              <div className={styles.pendingTitle}>Check your phone</div>
              <div className={styles.pendingMessage}>{pending.message}</div>
              <div className={styles.pendingDetails}>
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>Amount</span>
                  <span className={styles.successValue}>${pending.usdAmount?.toFixed(2)}</span>
                </div>
                <div className={styles.successRow}>
                  <span className={styles.successLabel}>M-Pesa Amount</span>
                  <span className={styles.successValue}>KES {pending.kesAmount?.toLocaleString()}</span>
                </div>
              </div>
              <button className={styles.cancelPendingBtn} onClick={resetForm}>Cancel</button>
            </div>
          )}

          {/* ── Deposit View ── */}
          {view === 'deposit' && !success && !pending && (
            <>
              <div className={styles.subHeader}>
                <h3 className={styles.subTitle}>Deposit Funds</h3>
                <p className={styles.subDesc}>Choose payment method</p>
              </div>

              <button className={styles.backBtn} onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (USD)</label>
                <div className={styles.customAmount}>
                  <span className={styles.amountPrefix}>$</span>
                  <input
                    type="number"
                    className={styles.amountField}
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max="10000"
                    id="deposit-amount"
                  />
                </div>
                <div className={styles.amountChips}>
                  {DEPOSIT_CHIPS.map((v) => (
                    <button
                      key={v}
                      className={`${styles.chip} ${usdAmount === v ? styles.chipActive : ''}`}
                      onClick={() => setAmount(v.toString())}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
                {usdAmount >= 1 && (
                  <div className={styles.kesEquiv}>≈ KES {kesEquiv.toLocaleString()}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone Number</label>
                <div className={styles.phoneInput}>
                  <input
                    type="tel"
                    className={styles.phoneFieldFull}
                    placeholder="0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={13}
                    id="deposit-phone"
                  />
                </div>
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button
                className={`${styles.submitBtn} ${styles.depositBtn}`}
                onClick={handleDeposit}
                disabled={loading || !phone || usdAmount < 1}
                id="deposit-submit"
              >
                {loading ? (
                  <span className={styles.btnSpinner} />
                ) : (
                  `Deposit $${usdAmount > 0 ? usdAmount : 0}`
                )}
              </button>
            </>
          )}

          {/* ── Withdraw View ── */}
          {view === 'withdraw' && !success && (
            <>
              <div className={styles.subHeader}>
                <h3 className={styles.subTitle}>Withdraw Funds</h3>
                <p className={styles.subDesc}>Balance: ${userBalance.toFixed(2)}</p>
              </div>

              <button className={styles.backBtn} onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (USD)</label>
                <div className={styles.customAmount}>
                  <span className={styles.amountPrefix}>$</span>
                  <input
                    type="number"
                    className={styles.amountField}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={maxWithdraw}
                    id="withdraw-amount"
                  />
                </div>
                <div className={styles.amountMeta}>Min: $1 · Max: ${maxWithdraw.toLocaleString()}</div>
                {usdAmount >= 1 && (
                  <div className={styles.kesEquiv}>≈ KES {kesEquiv.toLocaleString()}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>M-Pesa</label>
                {phone ? (
                  <div className={styles.phoneInput}>
                    <input
                      type="tel"
                      className={styles.phoneFieldFull}
                      placeholder="0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={13}
                      id="withdraw-phone"
                    />
                  </div>
                ) : (
                  <div className={styles.mpesaNotice}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p>Make an M-Pesa deposit first to register your number.</p>
                      <p>Withdrawals will then be sent to that number only.</p>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className={styles.errorMsg}>{error}</div>}

              <button
                className={`${styles.submitBtn} ${styles.withdrawBtn}`}
                onClick={handleWithdraw}
                disabled={loading || !phone || usdAmount < 1 || usdAmount > userBalance}
                id="withdraw-submit"
              >
                {loading ? (
                  <span className={styles.btnSpinner} />
                ) : (
                  'Continue'
                )}
              </button>
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
                      <span className={styles.successValue}>${success.usdAmount?.toFixed(2)}</span>
                    </div>
                    <div className={styles.successRow}>
                      <span className={styles.successLabel}>M-Pesa Amount</span>
                      <span className={styles.successValue}>KES {success.kesAmount?.toLocaleString()}</span>
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

          {/* ── History View ── */}
          {view === 'history' && (
            <>
              <button className={styles.backBtn} onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
