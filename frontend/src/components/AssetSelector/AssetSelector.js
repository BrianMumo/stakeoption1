'use client';

import { useState, useMemo } from 'react';
import { ASSETS, ASSET_CATEGORIES } from '@/lib/constants';
import styles from './AssetSelector.module.css';

export default function AssetSelector({ isOpen, onClose, onSelect, currentAsset, allPrices }) {
  const [tab, setTab] = useState('trading');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return ASSETS.filter((a) => {
      const matchCategory = category === 'All' || a.category === category;
      const matchSearch = a.symbol.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [category, search]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Assets</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ExpertOption-style tabs: Trading / Stocks */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'trading' ? styles.tabActive : ''}`}
            onClick={() => setTab('trading')}
          >
            Trading
          </button>
          <button
            className={`${styles.tab} ${tab === 'stocks' ? styles.tabActive : ''}`}
            onClick={() => setTab('stocks')}
          >
            Stocks
          </button>
        </div>

        <div className={styles.searchBar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search assets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            id="asset-search-input"
          />
        </div>

        {/* Category filters */}
        <div className={styles.categories}>
          <button className={styles.favBtn} title="Favorites">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          {ASSET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryBtn} ${category === cat ? styles.categoryActive : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div className={styles.listHeader}>
          <span>Asset</span>
          <span>Profit</span>
        </div>

        {/* Asset list */}
        <div className={styles.assetList}>
          {filtered.map((asset) => {
            const priceData = allPrices?.[asset.symbol];
            const isActive = currentAsset === asset.symbol;
            return (
              <button
                key={asset.symbol}
                className={`${styles.assetItem} ${isActive ? styles.assetActive : ''}`}
                onClick={() => { onSelect(asset.symbol); onClose(); }}
                id={`asset-${asset.symbol.replace(/[\s\/()]/g, '-')}`}
              >
                <div className={styles.assetLeft}>
                  <span className={styles.assetIcon}>{asset.icon}</span>
                  <div className={styles.assetInfo}>
                    <span className={styles.assetSymbol}>{asset.symbol}</span>
                    <span className={styles.assetProfit}>
                      Profit: <span className={styles.profitValue}>{asset.payout}%</span>
                    </span>
                  </div>
                </div>
                <div className={styles.assetRight}>
                  {/* Mini trend line */}
                  <svg width="52" height="20" viewBox="0 0 52 20" className={styles.miniChart}>
                    <polyline
                      points={priceData?.change > 0
                        ? "2,16 10,14 18,12 26,8 34,10 42,6 50,4"
                        : "2,6 10,8 18,6 26,12 34,10 42,14 50,16"}
                      fill="none"
                      stroke={priceData?.change > 0 ? "#00c853" : "#ff5252"}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className={styles.bottomActions}>
          <button className={styles.infoBtn} title="Info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
          <button className={styles.infoBtn} title="Favorites">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <button className={styles.selectBtn} onClick={onClose}>
            Select Asset ✓
          </button>
        </div>
      </div>
    </>
  );
}
