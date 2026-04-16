'use client';

import { useState, useCallback } from 'react';
import { DEFAULT_ASSET } from '@/lib/constants';
import { usePriceStream } from '@/hooks/usePriceStream';
import { useTrade } from '@/hooks/useTrade';
import { useAutoTrader } from '@/hooks/useAutoTrader';
import Sidebar from '@/components/Sidebar/Sidebar';
import Header from '@/components/Header/Header';
import TradingChart from '@/components/Chart/TradingChart';
import ChartToolbar from '@/components/ChartToolbar/ChartToolbar';
import TradingPanel from '@/components/TradingPanel/TradingPanel';
import AutoTrader from '@/components/AutoTrader/AutoTrader';
import AssetSelector from '@/components/AssetSelector/AssetSelector';
import RightSidebar from '@/components/RightSidebar/RightSidebar';
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

  const { currentPrice, priceChange, priceDirection, history, allPrices } = usePriceStream(currentAsset);
  const { activeTrades } = useTrade();

  const bot = useAutoTrader({ asset: currentAsset, priceHistory: history });

  const handleTradeResult = useCallback((result) => {
    setTradeResult(result);
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'finances') {
            setFinancesOpen(true);
          }
        }}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
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

      <RightSidebar />

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
    </div>
  );
}
