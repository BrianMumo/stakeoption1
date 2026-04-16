'use client';

import { useState } from 'react';
import { useTrade } from '@/hooks/useTrade';
import styles from './RightSidebar.module.css';

const TABS = [
  { id: 'deals', label: 'Trades', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
];

const TREND_ASSETS = [
  { name: 'EUR/USD', profit: 84, trend: 'up' },
  { name: 'GBP/USD', profit: 84, trend: 'up' },
  { name: 'Gold', profit: 79, trend: 'down' },
  { name: 'Bitcoin', profit: 82, trend: 'up' },
  { name: 'Apple', profit: 76, trend: 'down' },
];

const SOCIAL_TRADES = [
  { user: 'Trader_1', direction: 'buy', asset: 'Gold', amount: 250, time: '2m ago' },
  { user: 'Pro_Alex', direction: 'sell', asset: 'EUR/USD', amount: 100, time: '5m ago' },
  { user: 'Master_K', direction: 'buy', asset: 'Bitcoin', amount: 500, time: '8m ago' },
  { user: 'Luna_22', direction: 'sell', asset: 'GBP/USD', amount: 75, time: '12m ago' },
];

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState('deals');
  const [expanded, setExpanded] = useState(false);
  const { activeTrades, tradeHistory } = useTrade();

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.expanded : ''}`}>
      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (!expanded) setExpanded(true);
            }}
            title={tab.label}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>{TABS.find(t => t.id === activeTab)?.label}</h3>
            <button className={styles.closeBtn} onClick={() => setExpanded(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <div className={styles.dealsList}>
              {activeTrades.length === 0 && tradeHistory.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>No deals yet</span>
                </div>
              ) : (
                <>
                  {activeTrades.map(trade => (
                    <div key={trade.id} className={`${styles.dealItem} ${styles.dealActive}`}>
                      <div className={`${styles.dealDot} ${trade.direction === 'buy' ? styles.dotGreen : styles.dotRed}`} />
                      <div className={styles.dealInfo}>
                        <span className={styles.dealAsset}>{trade.asset?.split(' ')[0]}</span>
                        <span className={styles.dealDirection}>{trade.direction === 'buy' ? '▲' : '▼'} ${trade.amount}</span>
                      </div>
                      <span className={styles.dealStatus}>Active</span>
                    </div>
                  ))}
                  {tradeHistory.slice(0, 8).map(trade => (
                    <div key={trade.id} className={`${styles.dealItem} ${trade.status === 'won' ? styles.dealWon : styles.dealLost}`}>
                      <div className={`${styles.dealDot} ${trade.status === 'won' ? styles.dotGreen : styles.dotRed}`} />
                      <div className={styles.dealInfo}>
                        <span className={styles.dealAsset}>{trade.asset?.split(' ')[0]}</span>
                        <span className={styles.dealAmount}>
                          {trade.status === 'won' ? `+$${trade.payout?.toFixed(0)}` : `-$${trade.amount?.toFixed(0)}`}
                        </span>
                      </div>
                      <span className={`${styles.dealResult} ${trade.status === 'won' ? styles.resultWon : styles.resultLost}`}>
                        {trade.status === 'won' ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className={styles.trendsList}>
              {TREND_ASSETS.map((asset, i) => (
                <div key={i} className={styles.trendItem}>
                  <div className={styles.trendInfo}>
                    <span className={styles.trendName}>{asset.name}</span>
                    <span className={styles.trendProfit}>Profit: {asset.profit}%</span>
                  </div>
                  <div className={`${styles.trendMini} ${asset.trend === 'up' ? styles.trendUp : styles.trendDown}`}>
                    <svg width="48" height="20" viewBox="0 0 48 20">
                      {asset.trend === 'up' ? (
                        <polyline points="2,18 10,14 18,16 26,8 34,10 42,4 46,2" fill="none" stroke="#00c853" strokeWidth="1.5"/>
                      ) : (
                        <polyline points="2,4 10,6 18,8 26,14 34,12 42,16 46,18" fill="none" stroke="#ff5252" strokeWidth="1.5"/>
                      )}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <div className={styles.socialList}>
              {SOCIAL_TRADES.map((trade, i) => (
                <div key={i} className={styles.socialItem}>
                  <div className={styles.socialAvatar}>
                    {trade.user.charAt(0)}
                  </div>
                  <div className={styles.socialInfo}>
                    <span className={styles.socialUser}>{trade.user}</span>
                    <span className={styles.socialDetail}>
                      <span className={trade.direction === 'buy' ? styles.socialBuy : styles.socialSell}>
                        {trade.direction === 'buy' ? '▲' : '▼'}
                      </span>
                      {' '}{trade.asset} · ${trade.amount}
                    </span>
                  </div>
                  <span className={styles.socialTime}>{trade.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.quickBtn} title="Grid View">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button className={styles.quickBtn} title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button className={styles.quickBtn} title="Sound">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </button>
        <button className={styles.quickBtn} title="Help">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
