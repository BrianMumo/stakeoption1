'use client';

import { EXPIRY_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AutoTrader.module.css';

export default function AutoTrader({ bot }) {
  const { user } = useAuth();
  const {
    strategy, setStrategy,
    baseAmount, setBaseAmount,
    expiry, setExpiry,
    stopProfit, setStopProfit,
    stopLoss, setStopLoss,
    maxTrades, setMaxTrades,
    running, status,
    stats, tradeLog,
    currentAmount,
    startBot, stopBot,
    strategies,
  } = bot;

  const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : '0.0';

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="12" cy="5" r="3"/>
            <line x1="12" y1="8" x2="12" y2="11"/>
            <line x1="8" y1="16" x2="8" y2="16.01"/>
            <line x1="16" y1="16" x2="16" y2="16.01"/>
          </svg>
          <span>AUTO TRADER</span>
        </div>
        {running && (
          <div className={styles.runningBadge}>
            <span className={styles.runningDot} />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Strategy Selector */}
      <div className={styles.section}>
        <label className={styles.label}>Strategy</label>
        <select
          className={styles.select}
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          disabled={running}
          id="strategy-select"
        >
          {Object.entries(strategies).map(([key, strat]) => (
            <option key={key} value={key}>{strat.name}</option>
          ))}
        </select>
        <p className={styles.strategyDesc}>{strategies[strategy]?.description}</p>
      </div>

      {/* Trade Amount */}
      <div className={styles.section}>
        <label className={styles.label}>Trade Amount</label>
        <div className={styles.inputRow}>
          <button className={styles.inputBtn} onClick={() => setBaseAmount(Math.max(1, baseAmount - 1))} disabled={running}>−</button>
          <div className={styles.inputDisplay}>
            <span className={styles.currSign}>$</span>
            <input
              type="number"
              value={baseAmount}
              onChange={(e) => setBaseAmount(Math.max(1, parseFloat(e.target.value) || 1))}
              className={styles.inputField}
              disabled={running}
              min="1"
            />
          </div>
          <button className={styles.inputBtn} onClick={() => setBaseAmount(baseAmount + 1)} disabled={running}>+</button>
        </div>
        {(strategy === 'martingale' || strategy === 'antiMartingale') && running && (
          <div className={styles.currentAmountBadge}>
            Current bet: <strong>${currentAmount}</strong>
          </div>
        )}
      </div>

      {/* Expiry */}
      <div className={styles.section}>
        <label className={styles.label}>Expiry</label>
        <div className={styles.expiryGrid}>
          {EXPIRY_OPTIONS.slice(0, 3).map((opt) => (
            <button
              key={opt.value}
              className={`${styles.expiryBtn} ${expiry === opt.value ? styles.expiryActive : ''}`}
              onClick={() => setExpiry(opt.value)}
              disabled={running}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stop Conditions */}
      <div className={styles.section}>
        <label className={styles.label}>Stop Conditions</label>
        <div className={styles.stopGrid}>
          <div className={styles.stopItem}>
            <span className={styles.stopLabel}>Take Profit</span>
            <div className={styles.stopInput}>
              <span className={styles.stopSign}>+$</span>
              <input
                type="number"
                value={stopProfit}
                onChange={(e) => setStopProfit(parseFloat(e.target.value) || 0)}
                className={styles.stopField}
                disabled={running}
                min="1"
              />
            </div>
          </div>
          <div className={styles.stopItem}>
            <span className={styles.stopLabel}>Stop Loss</span>
            <div className={styles.stopInputLoss}>
              <span className={styles.stopSign}>-$</span>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className={styles.stopField}
                disabled={running}
                min="1"
              />
            </div>
          </div>
          <div className={styles.stopItem}>
            <span className={styles.stopLabel}>Max Trades</span>
            <div className={styles.stopInput}>
              <span className={styles.stopSign}>#</span>
              <input
                type="number"
                value={maxTrades}
                onChange={(e) => setMaxTrades(parseInt(e.target.value) || 1)}
                className={styles.stopField}
                disabled={running}
                min="1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Start/Stop Button */}
      {!running ? (
        <button
          className={styles.startBtn}
          onClick={startBot}
          disabled={!user}
          id="start-bot"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>START BOT</span>
        </button>
      ) : (
        <button
          className={styles.stopBtn}
          onClick={() => stopBot('Stopped by user')}
          id="stop-bot"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
          <span>STOP BOT</span>
        </button>
      )}

      {/* Live Stats */}
      {stats.totalTrades > 0 && (
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <span>LIVE STATS</span>
            <span className={`${styles.pnlBadge} ${stats.pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}`}>
              {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
            </span>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.totalTrades}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.statWin}`}>{stats.wins}</span>
              <span className={styles.statLabel}>Won</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.statLoss}`}>{stats.losses}</span>
              <span className={styles.statLabel}>Lost</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
          </div>

          {/* Win Rate Progress Bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Trade Log */}
      {tradeLog.length > 0 && (
        <div className={styles.logSection}>
          <span className={styles.logTitle}>TRADE LOG</span>
          <div className={styles.logList}>
            {tradeLog.map((entry) => (
              <div
                key={entry.id}
                className={`${styles.logEntry} ${entry.result === 'won' ? styles.logWon : entry.result === 'lost' ? styles.logLost : styles.logInfo}`}
              >
                <span className={styles.logIcon}>
                  {entry.result === 'won' ? '✅' : entry.result === 'lost' ? '❌' : 'ℹ️'}
                </span>
                <span className={styles.logDirection}>
                  {entry.direction === 'system' ? '' : entry.direction?.toUpperCase()}
                </span>
                <span className={styles.logPnl}>{entry.pnl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status indicator */}
      {running && (
        <div className={styles.statusBar}>
          <div className={styles.statusLoader} />
          <span>{status === 'trading' ? 'Placing trade...' : status === 'waiting' ? 'Analyzing next trade...' : 'Running...'}</span>
        </div>
      )}
    </div>
  );
}
