'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

export default function Header({ currentAsset, currentPrice, priceDirection, onOpenAssetSelector, onOpenFinances }) {
  const { user, logout, accountType, setAccountType, activeBalance, resetDemoBalance } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dropRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const formatBalance = (bal) => {
    if (bal === null || bal === undefined) return '$0.00';
    return `$${parseFloat(bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isDemo = accountType === 'demo';
  const demoBalance = user?.demo_balance ?? 0;
  const realBalance = user?.balance ?? 0;

  return (
    <header className={styles.header}>
      {/* Left */}
      <div className={styles.left}></div>

      {/* Center: Balance + Account Dropdown + Finances */}
      <div className={styles.center}>
        {user ? (
          <>
            <div className={styles.balanceBlock} ref={dropRef}>
              <div
                className={styles.balanceSection}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className={styles.balanceAmount} id="user-balance">
                  {formatBalance(activeBalance)}
                </span>
                <div className={styles.balanceMeta}>
                  <span className={`${styles.accountLabel} ${isDemo ? styles.accountDemo : styles.accountReal}`}>
                    {isDemo ? 'demo' : 'real'} balance
                  </span>
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    className={`${styles.dropdownArrow} ${dropdownOpen ? styles.dropdownArrowUp : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {/* Account Type Dropdown */}
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownTitle}>Select Account</div>

                  <button
                    className={`${styles.dropdownItem} ${isDemo ? styles.dropdownItemActive : ''}`}
                    onClick={() => { setAccountType('demo'); setDropdownOpen(false); }}
                  >
                    <div className={styles.dropdownItemLeft}>
                      <div className={`${styles.accountDot} ${styles.dotDemo}`} />
                      <div>
                        <div className={styles.dropdownItemLabel}>Demo Account</div>
                        <div className={styles.dropdownItemBal}>{formatBalance(demoBalance)}</div>
                      </div>
                    </div>
                    {isDemo && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>

                  <button
                    className={`${styles.dropdownItem} ${!isDemo ? styles.dropdownItemActive : ''}`}
                    onClick={() => { setAccountType('real'); setDropdownOpen(false); }}
                  >
                    <div className={styles.dropdownItemLeft}>
                      <div className={`${styles.accountDot} ${styles.dotReal}`} />
                      <div>
                        <div className={styles.dropdownItemLabel}>Real Account</div>
                        <div className={styles.dropdownItemBal}>{formatBalance(realBalance)}</div>
                      </div>
                    </div>
                    {!isDemo && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>

                  <div className={styles.dropdownInfo}>
                    {isDemo
                      ? 'Practice with virtual funds. No risk!'
                      : 'Trading with real money. Profit is yours!'}
                  </div>

                  {isDemo && (
                    <button
                      className={styles.resetDemoBtn}
                      onClick={async () => {
                        setResetting(true);
                        try {
                          await resetDemoBalance();
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setResetting(false);
                          setDropdownOpen(false);
                        }
                      }}
                      disabled={resetting}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                      {resetting ? 'Resetting...' : 'Reset Demo Balance'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button className={styles.financesBtn} id="finances-btn" onClick={onOpenFinances}>
              Finances
            </button>
          </>
        ) : null}
      </div>

      {/* Right: Chat + Avatar */}
      <div className={styles.right}>
        {user && (
          <>
            <button className={styles.chatBtn} title="Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <div className={styles.userMenu}>
              <button className={styles.avatarBtn} title={user.username} onClick={logout}>
                <div className={styles.avatarImg}>
                  <span className={styles.avatarText}>{user.username?.charAt(0).toUpperCase()}</span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
