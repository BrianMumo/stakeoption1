'use client';

import { useTrade } from '@/hooks/useTrade';
import styles from './TradeHistory.module.css';

export default function TradeHistory({ isOpen, onClose }) {
  const { tradeHistory, activeTrades } = useTrade();

  if (!isOpen) return null;

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Trade History</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.activeDot} />
            Active ({activeTrades.length})
          </h4>
          {activeTrades.map((trade) => (
            <div key={trade.id} className={styles.tradeItem}>
              <div className={styles.tradeLeft}>
                <span className={`${styles.direction} ${trade.direction === 'buy' ? styles.dirBuy : styles.dirSell}`}>
                  {trade.direction === 'buy' ? '▲' : '▼'}
                </span>
                <div className={styles.tradeInfo}>
                  <span className={styles.tradeAsset}>{trade.asset}</span>
                  <span className={styles.tradeTime}>{formatTime(trade.placed_at)}</span>
                </div>
              </div>
              <div className={styles.tradeRight}>
                <span className={styles.tradeAmount}>${trade.amount}</span>
                <span className={styles.tradeStatus}>Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Trades */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>History</h4>
        {tradeHistory.length === 0 ? (
          <div className={styles.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p>No trades yet</p>
          </div>
        ) : (
          tradeHistory.map((trade) => (
            <div key={trade.id} className={`${styles.tradeItem} ${trade.status === 'won' ? styles.tradeWon : styles.tradeLost}`}>
              <div className={styles.tradeLeft}>
                <span className={`${styles.direction} ${trade.direction === 'buy' ? styles.dirBuy : styles.dirSell}`}>
                  {trade.direction === 'buy' ? '▲' : '▼'}
                </span>
                <div className={styles.tradeInfo}>
                  <span className={styles.tradeAsset}>{trade.asset}</span>
                  <span className={styles.tradeTime}>{formatTime(trade.closed_at)}</span>
                </div>
              </div>
              <div className={styles.tradeRight}>
                <span className={`${styles.tradeResult} ${trade.status === 'won' ? styles.resultWon : styles.resultLost}`}>
                  {trade.status === 'won' ? `+$${trade.payout?.toFixed(2)}` : `-$${trade.amount?.toFixed(2)}`}
                </span>
                <span className={`${styles.tradeStatus} ${trade.status === 'won' ? styles.statusWon : styles.statusLost}`}>
                  {trade.status === 'won' ? 'Won' : 'Lost'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
