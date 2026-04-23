/**
 * Price Engine — Synthetic Continuous Indices
 * 
 * Generates Volatility Indices (V10 to V100) using geometric Brownian motion.
 * These are synthetic instruments that run 24/7 with configurable volatility.
 * 
 * Standard indices tick every 500ms.
 * 1s indices tick every 1000ms (1 second).
 */

// ── Synthetic Index Definitions ──
const ASSETS = {
  // Standard tick indices (tick every 500ms)
  // volatility values are scaled for per-tick application, NOT annualized
  'Volatility 10 Index':   { basePrice: 6421.35,  volatility: 0.0003,  tickRate: 'standard', decimals: 2 },
  'Volatility 25 Index':   { basePrice: 3842.18,  volatility: 0.0007,  tickRate: 'standard', decimals: 2 },
  'Volatility 50 Index':   { basePrice: 8156.72,  volatility: 0.0014,  tickRate: 'standard', decimals: 2 },
  'Volatility 75 Index':   { basePrice: 12530.45, volatility: 0.0020,  tickRate: 'standard', decimals: 2 },
  'Volatility 100 Index':  { basePrice: 4287.60,  volatility: 0.0028,  tickRate: 'standard', decimals: 2 },

  // 1-second tick indices
  'Volatility 10 (1s) Index':  { basePrice: 5214.80,  volatility: 0.0004,  tickRate: '1s', decimals: 2 },
  'Volatility 25 (1s) Index':  { basePrice: 9871.33,  volatility: 0.0009,  tickRate: '1s', decimals: 2 },
  'Volatility 50 (1s) Index':  { basePrice: 7423.56,  volatility: 0.0018,  tickRate: '1s', decimals: 2 },
  'Volatility 75 (1s) Index':  { basePrice: 2865.19,  volatility: 0.0026,  tickRate: '1s', decimals: 2 },
  'Volatility 100 (1s) Index': { basePrice: 11642.07, volatility: 0.0035,  tickRate: '1s', decimals: 2 },
};

class PriceEngine {
  constructor({ loadState, saveState } = {}) {
    this.prices = {};
    this.priceHistory = {};
    this.listeners = [];
    this.intervals = [];
    this.broadcastInterval = null;
    this.saveInterval = null;
    this.pendingUpdates = {};
    // Active directional biases: { asset: [{ id, direction, strength, expiresAt }] }
    this.biases = {};
    // Persistence callbacks (injected from server.js to avoid circular deps)
    this.loadState = loadState || null;
    this.saveState = saveState || null;

    // Initialize with base prices and generated history (may be overwritten by persisted state)
    for (const [asset, config] of Object.entries(ASSETS)) {
      this.prices[asset] = config.basePrice;
      this.priceHistory[asset] = [];
      this.biases[asset] = [];
      this._generateHistory(asset, config);
    }
  }

  // ── PUBLIC API ──

  async start(broadcastMs = 500) {
    console.log(`[PriceEngine] Starting synthetic engine with ${Object.keys(ASSETS).length} indices...`);

    // ── Restore persisted state (overrides generated history) ──
    if (this.loadState) {
      try {
        const state = await this.loadState();
        if (state && state.prices) {
          let restored = 0;
          for (const [asset, config] of Object.entries(ASSETS)) {
            if (state.prices[asset] !== undefined) {
              this.prices[asset] = state.prices[asset];
              restored++;
            }
            if (state.history?.[asset]?.length > 0) {
              this.priceHistory[asset] = state.history[asset];
            }
          }
          if (restored > 0) {
            console.log(`[PriceEngine] ✅ Restored ${restored} asset prices from database`);
          }
        }
      } catch (err) {
        console.error('[PriceEngine] Failed to load persisted state:', err.message);
      }
    }

    // Start standard indices (tick every broadcastMs)
    const standardInterval = setInterval(() => {
      this._tickGroup('standard');
    }, broadcastMs);
    this.intervals.push(standardInterval);

    // Start 1s indices (tick every 1000ms)
    const oneSecInterval = setInterval(() => {
      this._tickGroup('1s');
    }, 1000);
    this.intervals.push(oneSecInterval);

    // Broadcast pending updates to listeners
    this.broadcastInterval = setInterval(() => this._broadcast(), broadcastMs);

    // ── Persist state every 30 seconds ──
    if (this.saveState) {
      this.saveInterval = setInterval(() => this._persistState(), 30000);
      console.log('[PriceEngine] Price state persistence enabled (every 30s)');
    }

    console.log(`[PriceEngine] ✅ Synthetic indices running — 24/7, no market hours`);
    return Promise.resolve();
  }

  stop() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    // Final save on shutdown
    this._persistState();
    console.log('[PriceEngine] Stopped');
  }

  async _persistState() {
    if (!this.saveState) return;
    try {
      await this.saveState({
        prices: { ...this.prices },
        history: Object.fromEntries(
          Object.entries(this.priceHistory).map(([k, v]) => [k, v.slice(-300)])
        )
      });
    } catch (err) {
      console.error('[PriceEngine] Failed to persist state:', err.message);
    }
  }

  onPriceUpdate(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  getCurrentPrice(asset) {
    return this.prices[asset] || null;
  }

  getHistory(asset) {
    return this.priceHistory[asset] || [];
  }

  getAssetList() {
    return Object.keys(ASSETS).map(symbol => ({
      symbol,
      price: this.prices[symbol],
      decimals: ASSETS[symbol].decimals,
      category: ASSETS[symbol].tickRate === '1s' ? '1s Indices' : 'Continuous'
    }));
  }

  // ── DIRECTIONAL BIAS API ──
  // Used by the trade engine to subtly push price in a direction
  // for boosted/marketing accounts

  /**
   * Register a directional bias on an asset.
   * @param {string} id - Unique bias ID (usually trade ID)
   * @param {string} asset - Asset symbol
   * @param {string} direction - 'buy' (push up) or 'sell' (push down)
   * @param {number} durationSec - How long the bias lasts
   * @param {number} strength - Bias strength (0.3 = subtle, 0.6 = moderate, 0.8 = strong)
   */
  addBias(id, asset, direction, durationSec, strength = 0.6) {
    if (!this.biases[asset]) this.biases[asset] = [];
    // Remove existing bias with same ID
    this.biases[asset] = this.biases[asset].filter(b => b.id !== id);
    this.biases[asset].push({
      id,
      direction, // 'buy' = push up, 'sell' = push down
      strength: Math.min(1, Math.max(0, strength)),
      expiresAt: Date.now() + durationSec * 1000,
    });
    console.log(`[PriceEngine] Bias added: ${asset} → ${direction} (strength: ${strength}, duration: ${durationSec}s)`);
  }

  removeBias(id, asset) {
    if (this.biases[asset]) {
      this.biases[asset] = this.biases[asset].filter(b => b.id !== id);
    }
  }

  // ── PRICE TICK (per-tick volatility applied directly) ──

  _tickGroup(tickRate) {
    for (const [asset, config] of Object.entries(ASSETS)) {
      if (config.tickRate !== tickRate) continue;
      this._tickAsset(asset, config);
    }
  }

  _tickAsset(asset, config) {
    const currentPrice = this.prices[asset];
    
    // Normal random using Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Per-tick percentage change: volatility is already scaled per tick
    let pctChange = config.volatility * z;
    
    // ── Apply active biases ──
    // Clean up expired biases first
    if (this.biases[asset]) {
      const now = Date.now();
      this.biases[asset] = this.biases[asset].filter(b => b.expiresAt > now);
      
      // Sum up active biases for this asset
      for (const bias of this.biases[asset]) {
        // The bias adds a directional drift scaled by asset volatility
        // strength 0.6 means the drift is 60% of one volatility unit per tick
        const drift = config.volatility * bias.strength;
        if (bias.direction === 'buy') {
          pctChange += drift; // push price up
        } else {
          pctChange -= drift; // push price down
        }
      }
    }
    
    // Clamp per-tick change to ±0.5% to prevent extreme spikes
    const maxChange = 0.005;
    pctChange = Math.max(-maxChange, Math.min(maxChange, pctChange));
    
    let newPrice = currentPrice * (1 + pctChange);
    
    // Mean reversion: pull price back toward base price
    const deviation = (newPrice - config.basePrice) / config.basePrice;
    const reversionStrength = 0.002;
    newPrice -= deviation * reversionStrength * config.basePrice;
    
    // Stronger reversion if price drifts beyond ±20% of base
    if (Math.abs(deviation) > 0.20) {
      const extraReversion = (deviation - Math.sign(deviation) * 0.20) * 0.01 * config.basePrice;
      newPrice -= extraReversion;
    }
    
    // Ensure positive
    if (newPrice <= 0) newPrice = config.basePrice * 0.5;
    
    newPrice = parseFloat(newPrice.toFixed(config.decimals));
    
    const change = newPrice - currentPrice;
    this.prices[asset] = newPrice;

    const timestamp = Math.floor(Date.now() / 1000);
    const dataPoint = { time: timestamp, value: newPrice };

    this.priceHistory[asset].push(dataPoint);
    if (this.priceHistory[asset].length > 500) {
      this.priceHistory[asset] = this.priceHistory[asset].slice(-500);
    }

    this.pendingUpdates[asset] = {
      price: newPrice,
      change: parseFloat(change.toFixed(config.decimals + 1)),
      timestamp
    };
  }

  // ── GENERATE INITIAL HISTORY ──

  _generateHistory(asset, config) {
    let price = config.basePrice;
    const now = Math.floor(Date.now() / 1000);
    const points = 300;
    // Space each point 2 seconds apart for unique timestamps
    // This gives us 600 seconds (10 minutes) of visible history
    const spacing = 2;

    for (let i = points; i >= 0; i--) {
      const z = this._normalRandom();
      
      // Same per-tick volatility as live ticks
      let pctChange = config.volatility * z;
      
      // Clamp to ±0.5%
      pctChange = Math.max(-0.005, Math.min(0.005, pctChange));
      
      price = price * (1 + pctChange);
      
      // Mean reversion
      const deviation = (price - config.basePrice) / config.basePrice;
      price -= deviation * 0.002 * config.basePrice;
      
      if (Math.abs(deviation) > 0.20) {
        price -= (deviation - Math.sign(deviation) * 0.20) * 0.01 * config.basePrice;
      }
      
      if (price <= 0) price = config.basePrice * 0.5;
      price = parseFloat(price.toFixed(config.decimals));

      this.priceHistory[asset].push({
        time: now - (i * spacing),
        value: price
      });
    }

    this.prices[asset] = price;
  }

  _normalRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ── BROADCAST ──

  _broadcast() {
    const updates = this.pendingUpdates;
    if (Object.keys(updates).length === 0) return;
    this.pendingUpdates = {};

    for (const listener of this.listeners) {
      listener(updates);
    }
  }
}

module.exports = PriceEngine;
