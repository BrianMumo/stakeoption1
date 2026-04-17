'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_ASSET } from '@/lib/constants';
import { usePriceStream } from '@/hooks/usePriceStream';
import { useTrade } from '@/hooks/useTrade';
import { useAutoTrader } from '@/hooks/useAutoTrader';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar/Sidebar';
import Header from '@/components/Header/Header';
import TradingChart from '@/components/Chart/TradingChart';
import ChartToolbar from '@/components/ChartToolbar/ChartToolbar';
import TradingPanel from '@/components/TradingPanel/TradingPanel';
import AutoTrader from '@/components/AutoTrader/AutoTrader';
import AssetSelector from '@/components/AssetSelector/AssetSelector';

import TradeHistory from '@/components/TradeHistory/TradeHistory';
import TradeResultPopup from '@/components/TradeResultPopup/TradeResultPopup';
import FinancesOverlay from '@/components/Finances/FinancesOverlay';
import styles from './TradingPage.module.css';

export default function TradingPage() {
  const [currentAsset, setCurrentAsset] = useState(DEFAULT_ASSET);
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [financesOpen, setFinancesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('trade');
  const [tradeResult, setTradeResult] = useState(null);
  const [tradeMode, setTradeMode] = useState('manual');
  const [autoTraderOpen, setAutoTraderOpen] = useState(false);
  const [overlayPanel, setOverlayPanel] = useState(null); // 'profile' | 'education' | 'help' | 'settings'

  const { user, logout, accountType, resetDemoBalance } = useAuth();
  const router = useRouter();

  const { currentPrice, priceChange, priceDirection, history, allPrices } = usePriceStream(currentAsset);
  const { activeTrades } = useTrade();

  const bot = useAutoTrader({ asset: currentAsset, priceHistory: history });

  const handleTradeResult = useCallback((result) => {
    setTradeResult(result);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'finances') {
      setFinancesOpen(true);
    } else if (tab === 'profile' || tab === 'education' || tab === 'help' || tab === 'settings') {
      setOverlayPanel(tab);
    } else {
      setOverlayPanel(null);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  const closeOverlay = useCallback(() => {
    setOverlayPanel(null);
    setActiveTab('trade');
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
        onLogout={handleLogout}
      />

      <Header
        currentAsset={currentAsset}
        currentPrice={currentPrice}
        priceDirection={priceDirection}
        onOpenAssetSelector={() => setAssetSelectorOpen(true)}
        onOpenFinances={() => setFinancesOpen(true)}
      />

      <AssetSelector
        isOpen={assetSelectorOpen}
        onClose={() => setAssetSelectorOpen(false)}
        onSelect={setCurrentAsset}
        currentAsset={currentAsset}
        allPrices={allPrices}
      />

      {/* Main content: full-width chart area + bottom trading bar */}
      <main className={styles.main}>
        {/* Chart fills all available vertical space */}
        <div className={styles.chartSection}>
          {/* Floating asset selector on chart */}
          <div className={styles.assetOverlay}>
            <button className={styles.assetOverlayBtn} onClick={() => setAssetSelectorOpen(true)} id="chart-asset-selector">
              <span className={styles.assetDot} />
              <span className={styles.assetOverlayName}>{currentAsset}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

          <TradingChart
            history={history}
            currentPrice={currentPrice}
            priceDirection={priceDirection}
            activeTrades={activeTrades}
            currentAsset={currentAsset}
          />
          <ChartToolbar />
        </div>

        {/* Bottom Trading Bar */}
        <TradingPanel
          currentAsset={currentAsset}
          currentPrice={currentPrice}
          onTradeResult={handleTradeResult}
        />
      </main>

      {/* Auto Trader Drawer */}
      {autoTraderOpen && (
        <div className={styles.autoTraderDrawer}>
          <div className={styles.drawerHeader}>
            <span>Auto Trader</span>
            <button className={styles.drawerClose} onClick={() => setAutoTraderOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <AutoTrader bot={bot} />
        </div>
      )}

      <TradeHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <TradeResultPopup
        result={tradeResult}
        onDismiss={() => setTradeResult(null)}
      />

      <FinancesOverlay
        isOpen={financesOpen}
        onClose={() => {
          setFinancesOpen(false);
          setActiveTab('trade');
        }}
      />

      {/* ======== OVERLAY PANELS (Profile, Education, Help, Settings) ======== */}
      {overlayPanel && (
        <div className={styles.overlayPanel}>
          <div className={styles.overlayHeader}>
            <h2 className={styles.overlayTitle}>
              {overlayPanel === 'profile' && 'My Profile'}
              {overlayPanel === 'education' && 'Education'}
              {overlayPanel === 'help' && 'Help & Support'}
              {overlayPanel === 'settings' && 'Settings'}
            </h2>
            <button className={styles.overlayClose} onClick={closeOverlay}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className={styles.overlayBody}>
            {/* ── PROFILE PANEL ── */}
            {overlayPanel === 'profile' && user && (
              <div className={styles.profilePanel}>
                <div className={styles.profileAvatar}>
                  <span>{user.username?.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className={styles.profileName}>{user.username}</h3>
                <p className={styles.profileEmail}>{user.email}</p>

                <div className={styles.profileStats}>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatLabel}>Real Balance</span>
                    <span className={styles.profileStatValue}>${parseFloat(user.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatLabel}>Demo Balance</span>
                    <span className={styles.profileStatValue}>${parseFloat(user.demo_balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatLabel}>Account Type</span>
                    <span className={styles.profileStatValue} style={{textTransform: 'capitalize'}}>{accountType}</span>
                  </div>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatLabel}>Role</span>
                    <span className={styles.profileStatValue} style={{textTransform: 'capitalize'}}>{user.role || 'user'}</span>
                  </div>
                </div>

                <button className={styles.overlayAction} onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            )}

            {/* ── EDUCATION PANEL ── */}
            {overlayPanel === 'education' && (
              <div className={styles.infoPanel}>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>📊</div>
                  <h4>Getting Started</h4>
                  <p>Learn the basics of binary options trading. Select an asset, choose your investment amount, predict the price direction, and place your trade.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>📈</div>
                  <h4>Reading Charts</h4>
                  <p>The live chart shows real-time price movement. Green indicates upward movement, red indicates downward. Use chart timeframes to analyze trends.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>⏱️</div>
                  <h4>Expiry Times</h4>
                  <p>Each trade has an expiry time. When the timer reaches zero, your trade is settled automatically. Shorter expiry = faster results but higher risk.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>💰</div>
                  <h4>Payouts & Profits</h4>
                  <p>Win up to 90% payout on successful trades. Your profit = investment × payout percentage. Practice on demo before trading real funds.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>🤖</div>
                  <h4>Auto Trader</h4>
                  <p>The Auto Trader bot can execute trades automatically based on technical strategies. Configure it from the trading panel settings.</p>
                </div>
              </div>
            )}

            {/* ── HELP PANEL ── */}
            {overlayPanel === 'help' && (
              <div className={styles.infoPanel}>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>❓</div>
                  <h4>How do I place a trade?</h4>
                  <p>Select an asset from the chart selector, set your investment amount and expiry time in the bottom bar, then click BUY (price goes up) or SELL (price goes down).</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>💳</div>
                  <h4>How do I deposit funds?</h4>
                  <p>Click the "Finances" button in the top bar, then select "Deposit". Follow the M-Pesa payment instructions to add funds to your account.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>🔄</div>
                  <h4>How do I switch accounts?</h4>
                  <p>Click on your balance display in the top bar to toggle between Demo and Real accounts. Use Demo to practice risk-free.</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>📱</div>
                  <h4>Contact Support</h4>
                  <p>Need help? Email us at support@stakeoption.com or use the chat widget for instant assistance during business hours.</p>
                </div>
              </div>
            )}

            {/* ── SETTINGS PANEL ── */}
            {overlayPanel === 'settings' && (
              <div className={styles.infoPanel}>
                <div className={styles.settingsGroup}>
                  <h4 className={styles.settingsGroupTitle}>Trading Preferences</h4>
                  <div className={styles.settingsItem}>
                    <span>Default Expiry Time</span>
                    <span className={styles.settingsValue}>30 seconds</span>
                  </div>
                  <div className={styles.settingsItem}>
                    <span>Default Investment</span>
                    <span className={styles.settingsValue}>$1.00</span>
                  </div>
                  <div className={styles.settingsItem}>
                    <span>Sound Effects</span>
                    <span className={styles.settingsValue}>On</span>
                  </div>
                </div>
                <div className={styles.settingsGroup}>
                  <h4 className={styles.settingsGroupTitle}>Account</h4>
                  <div className={styles.settingsItem}>
                    <span>Active Account</span>
                    <span className={styles.settingsValue} style={{textTransform:'capitalize'}}>{accountType}</span>
                  </div>
                  <div className={styles.settingsItem}>
                    <span>Email</span>
                    <span className={styles.settingsValue}>{user?.email || '—'}</span>
                  </div>
                </div>
                {accountType === 'demo' && (
                  <button
                    className={styles.overlayAction}
                    onClick={async () => {
                      try { await resetDemoBalance(); } catch(e) { console.error(e); }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Reset Demo Balance to $5,000
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
