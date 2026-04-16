'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TradeResultPopup.module.css';

export default function TradeResultPopup({ result, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!result) {
      setVisible(false);
      setCurrentResult(null);
      return;
    }

    setCurrentResult(result);
    // Small delay before showing for animation
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after 3 seconds
    const dismissTimer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    // Remove from DOM after exit animation
    const removeTimer = setTimeout(() => {
      dismissRef.current?.();
    }, 3400);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [result]);

  const handleClick = useCallback(() => {
    setVisible(false);
    setTimeout(() => dismissRef.current?.(), 300);
  }, []);

  if (!currentResult) return null;

  const isWon = currentResult.status === 'won';
  const amount = isWon ? currentResult.payout : currentResult.amount;

  return (
    <div
      className={`${styles.toast} ${isWon ? styles.toastWon : styles.toastLost} ${visible ? styles.toastVisible : ''}`}
      onClick={handleClick}
    >
      <div className={`${styles.toastIcon} ${isWon ? styles.iconWon : styles.iconLost}`}>
        {isWon ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </div>
      <div className={styles.toastContent}>
        <span className={`${styles.toastAmount} ${isWon ? styles.amountWon : styles.amountLost}`}>
          {isWon ? '+' : '-'}${amount?.toFixed(2)}
        </span>
        <span className={styles.toastDetail}>
          {currentResult.asset?.split(' ')[0]} · {currentResult.direction?.toUpperCase()}
        </span>
      </div>
      <div className={styles.toastProgress}>
        <div className={`${styles.progressBar} ${isWon ? styles.progressWon : styles.progressLost} ${visible ? styles.progressActive : ''}`} />
      </div>
    </div>
  );
}
