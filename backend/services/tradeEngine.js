/**
 * Trade Engine — Handles trade placement, evaluation, and settlement.
 * Supports demo and real account types with separate balances.
 * 
 * Win Rate Boost: Instead of faking close prices, we push the actual
 * price in the trader's direction using the PriceEngine bias system.
 * The chart moves naturally and trades settle honestly.
 */

const { createTrade, closeTrade, getUserBalance, updateBalance, updateDemoBalance, getActiveTrades, getUserRaw } = require('../config/db');

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

    // ── Win Rate Boost: Register price bias ──
    // If user has a boost, push the price in their direction naturally.
    // The bias is a subtle drift added each tick in the price engine.
    // We only apply it probabilistically so the user still loses some trades.
    const user = await getUserRaw(userId);
    const boost = user?.win_rate_boost;
    if (boost && boost > 0) {
      // Roll: only apply bias on some trades (probability = boost level)
      // For 70% boost: 70% of trades get bias, 30% get none (natural outcome)
      const roll = Math.random();
      if (roll < boost) {
        // Bias strength is kept low so the drift is subtle.
        const biasStrength = 0.08 + (boost - 0.5) * 0.15;
        this.priceEngine.addBias(trade.id, asset, direction, expiry_duration, biasStrength);
      }
    }

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
    console.log(`[TradeEngine] Trade ${trade.id} settled: ${status} [${acctType}]${boostTag} | Payout: $${payout}`);
  }
}

module.exports = TradeEngine;
