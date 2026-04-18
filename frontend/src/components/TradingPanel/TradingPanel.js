'use client';

import { useState, useEffect, useCallback } from 'react';
import { EXPIRY_OPTIONS, DEFAULT_AMOUNT, DEFAULT_EXPIRY, ASSETS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTrade } from '@/hooks/useTrade';
import styles from './TradingPanel.module.css';

export default function TradingPanel({ currentAsset, currentPrice, onTradeResult }) {
  const { user, activeBalance } = useAuth();
  const { executeTrade, placing, error, clearError, lastResult } = useTrade();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);
  const [expiryIndex, setExpiryIndex] = useState(EXPIRY_OPTIONS.findIndex(o => o.value === DEFAULT_EXPIRY));

  const assetConfig = ASSETS.find((a) => a.symbol === currentAsset);
  const payout = assetConfig?.payout || 95;

  // Fire trade result popup
  useEffect(() => {
    if (lastResult) {
      onTradeResult?.(lastResult);
    }
  }, [lastResult, onTradeResult]);

  const handleAmountChange = (delta) => {
    setAmount((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > activeBalance) return Math.floor(activeBalance);
      return next;
    });
  };

  // Expiry arrow navigation — left/right arrows like ExpertOption
  const handleExpiryNav = (dir) => {
    setExpiryIndex(prev => {
      const next = prev + dir;
      if (next < 0) return 0;
      if (next >= EXPIRY_OPTIONS.length) return EXPIRY_OPTIONS.length - 1;
      setExpiry(EXPIRY_OPTIONS[next].value);
      return next;
    });
  };

  const handleTrade = useCallback(async (direction) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    await executeTrade({
      asset: currentAsset,
      direction,
      amount,
      expiry_duration: expiry,
    });
  }, [executeTrade, currentAsset, amount, expiry, user]);

  // Format expiry as hh:mm:ss like ExpertOption
  const formatExpiry = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={styles.bottomBar}>
      {/* Error Display - floats above bottom bar */}
      {error && (
        <div className={styles.errorFloat} onClick={clearError}>
          <span>{error}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      )}

      {/* Row 1: Investment + Expiry (ExpertOption layout) */}
      <div className={styles.topRow}>
        {/* Investment Amount Section */}
        <div className={styles.investmentSection}>
          <button className={styles.amountBtn} onClick={() => handleAmountChange(-1)} id="amount-decrease">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <div className={styles.amountDisplay}>
            <span className={styles.amountValue}>
              <span className={styles.amountCurrency}>$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 1) setAmount(val);
                }}
                className={styles.amountInput}
                min="1"
                id="trade-amount-input"
              />
            </span>
            <span className={styles.amountLabel}>stake</span>
          </div>
          <button className={styles.amountBtn} onClick={() => handleAmountChange(1)} id="amount-increase">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Expiry Timer Section — ExpertOption style with < > arrows */}
        <div className={styles.expirySection}>
          <button
            className={styles.expiryArrow}
            onClick={() => handleExpiryNav(-1)}
            disabled={expiryIndex === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className={styles.expiryDisplay}>
            <span className={styles.expiryTime}>{formatExpiry(expiry)}</span>
            <span className={styles.expiryLabel}>auto close</span>
          </div>
          <button
            className={styles.expiryArrow}
            onClick={() => handleExpiryNav(1)}
            disabled={expiryIndex === EXPIRY_OPTIONS.length - 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Row 2: SELL and BUY buttons (ExpertOption layout) */}
      <div className={styles.bottomRow}>
        {/* SELL Button */}
        <button
          className={`${styles.sellBtn} ${placing ? styles.btnDisabled : ''}`}
          onClick={() => handleTrade('sell')}
          disabled={placing}
          id="sell-button"
        >
          <svg className={styles.btnArrow} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 7 17 17"/>
            <polyline points="17 7 17 17 7 17"/>
          </svg>
          <div className={styles.btnInfo}>
            <span className={styles.btnLabel}>SELL</span>
            <span className={styles.btnPayout}>{payout}%</span>
          </div>
        </button>

        {/* BUY Button */}
        <button
          className={`${styles.buyBtn} ${placing ? styles.btnDisabled : ''}`}
          onClick={() => handleTrade('buy')}
          disabled={placing}
          id="buy-button"
        >
          <div className={styles.btnInfo}>
            <span className={styles.btnLabel}>BUY</span>
            <span className={styles.btnPayout}>{payout}%</span>
          </div>
          <svg className={styles.btnArrow} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 17 7 7"/>
            <polyline points="7 17 7 7 17 7"/>
          </svg>
        </button>
      </div>

      {placing && (
        <div className={styles.placingOverlay}>
          <div className={styles.placingSpinner} />
        </div>
      )}
    </div>
  );
}
