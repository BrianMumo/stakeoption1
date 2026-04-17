'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './TradingChart.module.css';

export default function TradingChart({ history, currentPrice, priceDirection, activeTrades, currentAsset }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const dotRef = useRef(null);
  const guideLineRef = useRef(null);
  const rafRef = useRef(null);
  const tradeZonesRef = useRef(null); // ref for trade zone overlays container
  const [chartReady, setChartReady] = useState(false);
  const [, forceUpdate] = useState(0); // for re-rendering trade zone positions

  // Load lightweight-charts from CDN (bypasses Turbopack bundling issues)
  function loadLWC() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      if (window.LightweightCharts) {
        resolve(window.LightweightCharts);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lightweight-charts@4.2.2/dist/lightweight-charts.standalone.production.js';
      script.onload = () => resolve(window.LightweightCharts);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize chart — handles React StrictMode double-mount
  useEffect(() => {
    let cancelled = false;
    let chartInstance = null;
    let resizeObserver = null;

    (async () => {
      if (!containerRef.current) return;
      
      const LWC = await loadLWC();
      if (!LWC || cancelled) return;

      // Clear leftover DOM from previous StrictMode mount
      containerRef.current.innerHTML = '';
      
      const chart = LWC.createChart(containerRef.current, {
        layout: {
          background: { color: '#131722' },
          textColor: '#8899aa',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
        },
        grid: {
          vertLines: { color: 'transparent' },
          horzLines: { color: 'transparent' },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            color: 'rgba(33, 150, 243, 0.4)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#2196F3',
          },
          horzLine: {
            color: 'rgba(33, 150, 243, 0.4)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#2196F3',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          scaleMargins: { top: 0.15, bottom: 0.15 },
          autoScale: true,
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          timeVisible: true,
          secondsVisible: true,
          rightOffset: 30,
          lockVisibleTimeRangeOnResize: true,
          fixLeftEdge: false,
          fixRightEdge: false,
          minBarSpacing: 6,
          shiftVisibleRangeOnNewBar: true,
        },
        handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false },
      });

      if (cancelled) { chart.remove(); return; }

      const series = chart.addAreaSeries({
        lineColor: '#2196F3',
        topColor: 'rgba(33, 150, 243, 0.28)',
        bottomColor: 'rgba(33, 150, 243, 0.02)',
        lineWidth: 2,
        lineType: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBackgroundColor: '#2196F3',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
        priceLineVisible: true,
        priceLineColor: '#2196F3',
        priceLineWidth: 1,
        priceLineStyle: 2,
        lastValueVisible: true,
      });

      if (cancelled) { chart.remove(); return; }

      chartInstance = chart;
      chartRef.current = chart;
      seriesRef.current = series;
      setChartReady(true);

      // Auto-scroll to keep latest data always visible (ExpertOption-style)
      chart.timeScale().scrollToRealTime();

      // Handle resize
      resizeObserver = new ResizeObserver((entries) => {
        if (cancelled) return;
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chart.applyOptions({ width, height });
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    })();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (chartInstance) chartInstance.remove();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // Position the pulsing dot at the last data point
  const updateDotPosition = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || !dotRef.current || !guideLineRef.current) return;
    if (!history || history.length === 0) return;

    const lastPoint = history[history.length - 1];
    if (!lastPoint) return;

    try {
      const timeScale = chartRef.current.timeScale();
      const x = timeScale.timeToCoordinate(lastPoint.time);
      const y = seriesRef.current.priceToCoordinate(lastPoint.value);

      if (x === null || y === null || x < 0) {
        dotRef.current.style.display = 'none';
        guideLineRef.current.style.display = 'none';
        return;
      }

      dotRef.current.style.display = 'block';
      dotRef.current.style.left = `${x}px`;
      dotRef.current.style.top = `${y}px`;

      // Guide line from dot to right edge
      const chartWidth = containerRef.current?.clientWidth || 0;
      guideLineRef.current.style.display = 'block';
      guideLineRef.current.style.top = `${y}px`;
      guideLineRef.current.style.left = `${x}px`;
      guideLineRef.current.style.width = `${Math.max(0, chartWidth - x)}px`;
    } catch (e) {
      // Coordinates may not be available yet
    }
  }, [history]);

  // ── Dynamically adjust rightOffset when trades are active ──
  // IMPORTANT: This is separate from updateTradeZonePositions to avoid
  // an infinite loop (applyOptions triggers time scale change events)
  useEffect(() => {
    if (!chartRef.current) return;
    if (activeTrades && activeTrades.length > 0) {
      const maxExpiry = Math.max(...activeTrades.map(t => {
        const now = Date.now() / 1000;
        const expiresAt = new Date(t.expires_at).getTime() / 1000;
        return Math.max(0, expiresAt - now);
      }));
      const barsNeeded = Math.max(30, Math.ceil(maxExpiry / 2) + 10);
      chartRef.current.timeScale().applyOptions({ rightOffset: barsNeeded });
    } else {
      chartRef.current.timeScale().applyOptions({ rightOffset: 30 });
    }
  }, [activeTrades, chartReady]);

  // ── Update Start/Finish trade zone positions ──
  const updateTradeZonePositions = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || !tradeZonesRef.current || !activeTrades) return;
    
    const timeScale = chartRef.current.timeScale();
    const chartHeight = containerRef.current?.clientHeight || 0;
    const chartWidth = containerRef.current?.clientWidth || 0;
    
    for (const trade of activeTrades) {
      const startTime = Math.floor(new Date(trade.placed_at).getTime() / 1000);
      const endTime = Math.floor(new Date(trade.expires_at).getTime() / 1000);
      const entryPrice = trade.entry_price || trade.strike_price;
      
      const startLineEl = tradeZonesRef.current.querySelector(`[data-trade-start="${trade.id}"]`);
      const endLineEl = tradeZonesRef.current.querySelector(`[data-trade-end="${trade.id}"]`);
      const zoneEl = tradeZonesRef.current.querySelector(`[data-trade-zone="${trade.id}"]`);
      const badgeEl = tradeZonesRef.current.querySelector(`[data-trade-badge="${trade.id}"]`);
      const startLabelEl = tradeZonesRef.current.querySelector(`[data-trade-start-label="${trade.id}"]`);
      const endLabelEl = tradeZonesRef.current.querySelector(`[data-trade-end-label="${trade.id}"]`);

      if (!startLineEl || !endLineEl || !zoneEl || !badgeEl) continue;

      try {
        const xStart = timeScale.timeToCoordinate(startTime);
        let xEnd = timeScale.timeToCoordinate(endTime);
        const yEntry = entryPrice ? seriesRef.current.priceToCoordinate(entryPrice) : null;

        // If xEnd is null (future time not on chart), estimate its position
        // by extrapolating from the last known data point
        if (xEnd === null && xStart !== null && history && history.length > 0) {
          const lastTime = history[history.length - 1].time;
          const xLast = timeScale.timeToCoordinate(lastTime);
          if (xLast !== null) {
            // Calculate pixels per second based on recent bars
            const timeDiff = lastTime - startTime;
            const pixelDiff = xLast - xStart;
            if (timeDiff > 0 && pixelDiff > 0) {
              const pixelsPerSecond = pixelDiff / timeDiff;
              const futureSeconds = endTime - lastTime;
              xEnd = xLast + (futureSeconds * pixelsPerSecond);
            }
          }
        }

        if (xStart === null) {
          startLineEl.style.display = 'none';
          endLineEl.style.display = 'none';
          zoneEl.style.display = 'none';
          badgeEl.style.display = 'none';
          if (startLabelEl) startLabelEl.style.display = 'none';
          if (endLabelEl) endLabelEl.style.display = 'none';
          continue;
        }

        // Start line
        startLineEl.style.display = 'block';
        startLineEl.style.left = `${xStart}px`;
        startLineEl.style.height = `${chartHeight}px`;

        // Start label
        if (startLabelEl) {
          startLabelEl.style.display = 'flex';
          startLabelEl.style.left = `${xStart}px`;
        }

        // End line (finish) — ExpertOption-style bright orange, always visible
        if (xEnd !== null && xEnd > 0) {
          // Clamp xEnd to visible area (don't let it go beyond chart width)
          const clampedXEnd = Math.min(xEnd, chartWidth - 10);
          endLineEl.style.display = 'block';
          endLineEl.style.left = `${clampedXEnd}px`;
          endLineEl.style.height = `${chartHeight}px`;

          if (endLabelEl) {
            endLabelEl.style.display = 'flex';
            endLabelEl.style.left = `${clampedXEnd}px`;
          }
        } else {
          // Fallback: place at right edge
          endLineEl.style.display = 'block';
          endLineEl.style.left = `${chartWidth - 60}px`;
          endLineEl.style.height = `${chartHeight}px`;
          if (endLabelEl) {
            endLabelEl.style.display = 'flex';
            endLabelEl.style.left = `${chartWidth - 60}px`;
          }
        }

        // Shaded zone between start and end
        const effectiveXEnd = xEnd !== null ? Math.min(xEnd, chartWidth - 10) : (chartWidth - 60);
        const zoneWidth = Math.max(0, effectiveXEnd - xStart);
        zoneEl.style.display = 'block';
        zoneEl.style.left = `${xStart}px`;
        zoneEl.style.width = `${zoneWidth}px`;
        zoneEl.style.height = `${chartHeight}px`;

        // Amount badge — position at midpoint of zone, at entry price Y
        const midX = xStart + zoneWidth / 2;
        const badgeY = yEntry !== null ? yEntry : chartHeight / 2;
        badgeEl.style.display = 'flex';
        badgeEl.style.left = `${midX}px`;
        badgeEl.style.top = `${badgeY - 30}px`;

        // ExpertOption-style Y-axis profit/loss labels
        const profitLabelEl = tradeZonesRef.current.querySelector(`[data-trade-profit-label="${trade.id}"]`);
        const lossLabelEl = tradeZonesRef.current.querySelector(`[data-trade-loss-label="${trade.id}"]`);
        
        if (profitLabelEl && yEntry !== null) {
          profitLabelEl.style.display = 'flex';
          profitLabelEl.style.right = '0px';
          profitLabelEl.style.top = `${yEntry - 28}px`;
        }
        if (lossLabelEl && yEntry !== null) {
          lossLabelEl.style.display = 'flex';
          lossLabelEl.style.right = '0px';
          lossLabelEl.style.top = `${yEntry + 8}px`;
        }
      } catch (e) {
        // Coordinates not yet available
      }
    }
  }, [activeTrades, history]);

  // Track whether initial data has been loaded
  const initialFitDoneRef = useRef(false);
  const prevAssetRef = useRef(null);

  // Reset chart data when asset changes
  useEffect(() => {
    if (currentAsset && currentAsset !== prevAssetRef.current) {
      prevAssetRef.current = currentAsset;
      initialFitDoneRef.current = false;
      // Clear existing series data to prevent mixing old/new asset data
      if (seriesRef.current) {
        try { seriesRef.current.setData([]); } catch (e) {}
      }
    }
  }, [currentAsset]);

  // Update chart data — direct synchronous call (matches working standalone chart)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !history || history.length === 0) return;

    // Build strictly-increasing, validated data
    const cleaned = [];
    let lastTime = -1;
    for (const point of history) {
      if (
        typeof point.time === 'number' && !isNaN(point.time) &&
        typeof point.value === 'number' && !isNaN(point.value) && isFinite(point.value) &&
        point.time > lastTime
      ) {
        cleaned.push({ time: point.time, value: point.value });
        lastTime = point.time;
      }
    }

    if (cleaned.length === 0) return;

    try {
      if (!initialFitDoneRef.current) {
        // First load: set all data and fit to view
        seriesRef.current.setData(cleaned);
        chartRef.current.timeScale().fitContent();
        initialFitDoneRef.current = true;
      } else {
        // Streaming: update with latest point only
        const lastPoint = cleaned[cleaned.length - 1];
        seriesRef.current.update(lastPoint);
      }
      // Always keep chart scrolled to real-time (ExpertOption-style containment)
      chartRef.current.timeScale().scrollToRealTime();
    } catch (e) {
      // On any error, try full reset
      try {
        seriesRef.current.setData(cleaned);
        chartRef.current.timeScale().fitContent();
      } catch (_) {}
    }

    requestAnimationFrame(() => {
      updateDotPosition();
      updateTradeZonePositions();
    });
  }, [history, chartReady, updateDotPosition, updateTradeZonePositions]);

  // Continuously update dot + trade zone positions on scroll/scale changes
  useEffect(() => {
    if (!chartRef.current) return;

    const tsUnsubscribe = chartRef.current.timeScale().subscribeVisibleTimeRangeChange(() => {
      updateDotPosition();
      updateTradeZonePositions();
    });

    const logicalUnsubscribe = chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateDotPosition();
      updateTradeZonePositions();
    });

    return () => {
      try {
        tsUnsubscribe();
        logicalUnsubscribe();
      } catch (e) {}
    };
  }, [chartReady, updateDotPosition, updateTradeZonePositions]);

  // Re-position trade zones when activeTrades changes
  useEffect(() => {
    requestAnimationFrame(updateTradeZonePositions);
  }, [activeTrades, updateTradeZonePositions]);

  // Periodically update trade zone positions (for countdown + smooth tracking)
  useEffect(() => {
    if (!activeTrades || activeTrades.length === 0) return;
    const interval = setInterval(() => {
      updateTradeZonePositions();
      forceUpdate(n => n + 1); // trigger re-render for countdown timers
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTrades, updateTradeZonePositions]);

  // ── PHASE 1: On-chart trade indicators ──
  // Add horizontal entry price lines + expiry markers for active trades
  useEffect(() => {
    if (!seriesRef.current || !activeTrades) return;

    // Remove old price lines
    for (const pl of priceLinesRef.current) {
      try { seriesRef.current.removePriceLine(pl); } catch (e) {}
    }
    priceLinesRef.current = [];

    // Add price lines for each active trade
    for (const trade of activeTrades) {
      const entryPrice = trade.entry_price || trade.strike_price;
      if (!entryPrice) continue;

      const isBuy = trade.direction === 'buy';
      const lineColor = isBuy ? '#00c853' : '#ff5252';
      const title = `${isBuy ? '▲ BUY' : '▼ SELL'} $${trade.amount}`;

      try {
        const priceLine = seriesRef.current.createPriceLine({
          price: entryPrice,
          color: lineColor,
          lineWidth: 1,
          lineStyle: 0, // Solid line
          axisLabelVisible: true,
          title: title,
          lineVisible: true,
          axisLabelColor: lineColor,
          axisLabelTextColor: '#ffffff',
        });
        priceLinesRef.current.push(priceLine);
      } catch (e) {}
    }

    // Set trade entry markers
    const markers = activeTrades.map((trade) => ({
      time: Math.floor(new Date(trade.placed_at).getTime() / 1000),
      position: trade.direction === 'buy' ? 'belowBar' : 'aboveBar',
      color: trade.direction === 'buy' ? '#00c853' : '#ff5252',
      shape: trade.direction === 'buy' ? 'arrowUp' : 'arrowDown',
      text: `$${trade.amount}`,
    }));

    try {
      seriesRef.current.setMarkers(markers);
    } catch (e) {}
  }, [activeTrades]);

  // Calculate active trade overlays (floating labels, expiry timers)
  const tradeOverlays = (activeTrades || []).map(trade => {
    const entryPrice = trade.entry_price || trade.strike_price;
    const expiresAt = new Date(trade.expires_at).getTime();
    const placedAt = new Date(trade.placed_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const totalDuration = Math.max(1, Math.ceil((expiresAt - placedAt) / 1000));
    const elapsed = totalDuration - remaining;
    const progress = Math.min(1, elapsed / totalDuration);
    const isBuy = trade.direction === 'buy';
    const payout = trade.amount * (trade.payout || 95) / 100;
    
    // Current P&L
    let pnl = 0;
    if (currentPrice && entryPrice) {
      if (isBuy) {
        pnl = currentPrice > entryPrice ? payout : -trade.amount;
      } else {
        pnl = currentPrice < entryPrice ? payout : -trade.amount;
      }
    }

    return {
      id: trade.id,
      direction: trade.direction,
      amount: trade.amount,
      entryPrice,
      payout,
      remaining,
      totalDuration,
      progress,
      pnl,
      isBuy,
      isWinning: isBuy ? (currentPrice > entryPrice) : (currentPrice < entryPrice),
    };
  });

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartContainer} ref={containerRef} id="trading-chart" />
      
      {/* Pulsing dot at leading edge of price line */}
      <div
        ref={dotRef}
        className={`${styles.chartDot} ${
          priceDirection === 'up' ? styles.chartDotUp : priceDirection === 'down' ? styles.chartDotDown : ''
        }`}
        style={{ display: 'none' }}
      >
        <span className={styles.chartDotInner} />
        <span className={styles.chartDotRing} />
        <span className={styles.chartDotGlow} />
      </div>

      {/* Horizontal guide line from dot to right edge */}
      <div
        ref={guideLineRef}
        className={`${styles.chartGuideLine} ${
          priceDirection === 'up' ? styles.guideLineUp : priceDirection === 'down' ? styles.guideLineDown : ''
        }`}
        style={{ display: 'none' }}
      />

      {!chartReady && (
        <div className={styles.chartLoading}>
          <div className={styles.loadingSpinner} />
          <span>Loading chart...</span>
        </div>
      )}

      {/* Live price badge with pulsing glow */}
      {currentPrice && (
        <div className={`${styles.livePriceBadge} ${priceDirection === 'up' ? styles.priceUp : priceDirection === 'down' ? styles.priceDown : ''}`}>
          <span className={styles.liveDot} />
          <span>{currentPrice}</span>
        </div>
      )}

      {/* ── START / FINISH Trade Zone Overlays (ExpertOption-style) ── */}
      <div ref={tradeZonesRef} className={styles.tradeZonesContainer}>
        {(activeTrades || []).map(trade => {
          const isBuy = trade.direction === 'buy';
          const entryColor = '#2196F3'; // Blue entry line like ExpertOption
          const finishColor = '#FF9800'; // Orange finish line like ExpertOption
          const zoneColor = isBuy
            ? 'rgba(0, 200, 83, 0.06)'
            : 'rgba(255, 82, 82, 0.06)';
          const payout = trade.amount * (trade.payout || 95) / 100;

          return (
            <div key={trade.id}>
              {/* Shaded zone between start & finish */}
              <div
                data-trade-zone={trade.id}
                className={styles.tradeZone}
                style={{ display: 'none', background: zoneColor }}
              />

              {/* Start vertical line (blue, subtle) */}
              <div
                data-trade-start={trade.id}
                className={styles.tradeVertLine}
                style={{ display: 'none', borderColor: entryColor, opacity: 0.5 }}
              />

              {/* Start label */}
              <div
                data-trade-start-label={trade.id}
                className={styles.tradeVertLabel}
                style={{ display: 'none', background: entryColor }}
              >
                start
              </div>

              {/* Finish vertical line — ExpertOption-style bright ORANGE SOLID */}
              <div
                data-trade-end={trade.id}
                className={`${styles.tradeVertLine} ${styles.finishLine}`}
                style={{ display: 'none' }}
              />

              {/* Finish label */}
              <div
                data-trade-end-label={trade.id}
                className={styles.tradeVertLabel}
                style={{ display: 'none', background: finishColor }}
              >
                finish
              </div>

              {/* Floating amount badge */}
              <div
                data-trade-badge={trade.id}
                className={`${styles.tradeBadge} ${isBuy ? styles.tradeBadgeBuy : styles.tradeBadgeSell}`}
                style={{ display: 'none' }}
              >
                <span className={styles.tradeBadgeIcon}>{isBuy ? '▲' : '▼'}</span>
                <span className={styles.tradeBadgeAmount}>${trade.amount.toFixed(2)}</span>
              </div>

              {/* ExpertOption-style Y-axis profit/loss labels */}
              <div
                data-trade-profit-label={trade.id}
                className={styles.profitLabel}
                style={{ display: 'none' }}
              >
                +${payout.toFixed(2)}
              </div>
              <div
                data-trade-loss-label={trade.id}
                className={styles.lossLabel}
                style={{ display: 'none' }}
              >
                -${trade.amount.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active trade overlays — floating payout labels + countdown */}
      {tradeOverlays.map(trade => (
        <div key={trade.id} className={styles.tradeOverlay}>
          {/* Payout label */}
          <div className={`${styles.tradePayoutLabel} ${trade.isWinning ? styles.tradeWinning : styles.tradeLosing}`}>
            <span className={styles.tradePayoutIcon}>{trade.isBuy ? '▲' : '▼'}</span>
            <span className={styles.tradePayoutAmount}>
              {trade.isWinning ? `+$${trade.payout.toFixed(2)}` : `-$${trade.amount.toFixed(2)}`}
            </span>
          </div>
          
          {/* Countdown timer */}
          <div className={styles.tradeTimer}>
            <svg className={styles.timerRing} viewBox="0 0 36 36">
              <circle className={styles.timerBg} cx="18" cy="18" r="16" />
              <circle 
                className={`${styles.timerProgress} ${trade.remaining <= 5 ? styles.timerUrgent : ''}`}
                cx="18" cy="18" r="16"
                style={{ strokeDashoffset: 100 * (1 - trade.progress) }}
              />
            </svg>
            <span className={`${styles.timerText} ${trade.remaining <= 5 ? styles.timerUrgent : ''}`}>
              {trade.remaining}s
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
