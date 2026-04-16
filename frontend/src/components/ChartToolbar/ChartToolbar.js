'use client';

import styles from './ChartToolbar.module.css';

export default function ChartToolbar() {
  return (
    <div className={styles.toolbar}>
      {/* Settings */}
      <div className={styles.toolGroup}>
        <button className={styles.tool} title="Chart Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
        </button>
      </div>

      <div className={styles.separator} />

      {/* Drawing Tools */}
      <div className={styles.toolGroup}>
        <button className={styles.tool} title="Rectangle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
          </svg>
        </button>
        <button className={styles.tool} title="Triangle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L22 21H2L12 3z"/>
          </svg>
        </button>
        <button className={styles.tool} title="Pencil">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button className={styles.tool} title="Line">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="20" x2="20" y2="4"/>
          </svg>
        </button>
        <button className={styles.tool} title="Circle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </button>
        <button className={styles.tool} title="Fibonacci">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </button>
        <button className={styles.tool} title="Grid">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="3" x2="12" y2="21"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="3" x2="21" y2="3"/>
            <line x1="3" y1="21" x2="21" y2="21"/>
            <line x1="3" y1="3" x2="3" y2="21"/>
            <line x1="21" y1="3" x2="21" y2="21"/>
          </svg>
        </button>
      </div>

      <div className={styles.spacer} />

      {/* Zoom Controls */}
      <div className={styles.toolGroup}>
        <button className={styles.tool} title="Zoom Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button className={styles.tool} title="Zoom In">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
