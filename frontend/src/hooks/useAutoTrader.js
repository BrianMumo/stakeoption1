'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTrades } from '@/contexts/TradeContext';
import { useAuth } from '@/contexts/AuthContext';

const STRATEGIES = {
  trend: {
    name: 'Trend Following',
    description: 'Follows price momentum — buys on uptrends, sells on downtrends',
    decide: (priceHistory) => {
      if (!priceHistory || priceHistory.length < 6) return Math.random() > 0.5 ? 'buy' : 'sell';
      const recent = priceHistory.slice(-6);
      const firstAvg = (recent[0].value + recent[1].value + recent[2].value) / 3;
      const lastAvg = (recent[3].value + recent[4].value + recent[5].value) / 3;
      return lastAvg > firstAvg ? 'buy' : 'sell';
    },
  },
  martingale: {
    name: 'Martingale',
    description: 'Doubles trade amount after each loss, resets after a win',
    decide: () => Math.random() > 0.5 ? 'buy' : 'sell',
    getAmount: (baseAmount, lastResult, currentAmount) => {
      if (!lastResult) return baseAmount;
      return lastResult.status === 'lost' ? Math.min(currentAmount * 2, baseAmount * 16) : baseAmount;
    },
  },
  antiMartingale: {
    name: 'Anti-Martingale',
    description: 'Doubles trade amount after each win, resets after a loss',
    decide: () => Math.random() > 0.5 ? 'buy' : 'sell',
    getAmount: (baseAmount, lastResult, currentAmount) => {
      if (!lastResult) return baseAmount;
      return lastResult.status === 'won' ? Math.min(currentAmount * 2, baseAmount * 16) : baseAmount;
    },
  },
  random: {
    name: 'Random',
    description: 'Randomly picks BUY or SELL — useful for testing',
    decide: () => Math.random() > 0.5 ? 'buy' : 'sell',
  },
};

export function useAutoTrader({ asset, priceHistory }) {
  const { placeTrade, lastResult } = useTrades();
  const { user } = useAuth();

  // Configuration
  const [strategy, setStrategy] = useState('trend');
  const [baseAmount, setBaseAmount] = useState(1);
  const [expiry, setExpiry] = useState(30);
  const [stopProfit, setStopProfit] = useState(50);
  const [stopLoss, setStopLoss] = useState(25);
  const [maxTrades, setMaxTrades] = useState(100);

  // State
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ totalTrades: 0, wins: 0, losses: 0, pnl: 0 });
  const [tradeLog, setTradeLog] = useState([]);
  const [currentAmount, setCurrentAmount] = useState(1);
  const [status, setStatus] = useState('idle'); // idle | waiting | trading | stopped

  // Refs for the trading loop
  const runningRef = useRef(false);
  const statsRef = useRef({ totalTrades: 0, wins: 0, losses: 0, pnl: 0 });
  const currentAmountRef = useRef(1);
  const waitingForResultRef = useRef(false);
  const lastProcessedResultRef = useRef(null);
  const priceHistoryRef = useRef([]);

  // Keep price history ref updated
  useEffect(() => {
    priceHistoryRef.current = priceHistory || [];
  }, [priceHistory]);

  // Listen for trade results while bot is running
  useEffect(() => {
    if (!running || !lastResult) return;
    if (!waitingForResultRef.current) return;
    if (lastProcessedResultRef.current === lastResult) return;
    
    lastProcessedResultRef.current = lastResult;
    waitingForResultRef.current = false;

    const isWin = lastResult.status === 'won';
    const pnlChange = isWin ? lastResult.payout - lastResult.amount : -lastResult.amount;

    // Update stats
    const newStats = {
      totalTrades: statsRef.current.totalTrades + 1,
      wins: statsRef.current.wins + (isWin ? 1 : 0),
      losses: statsRef.current.losses + (isWin ? 0 : 1),
      pnl: parseFloat((statsRef.current.pnl + pnlChange).toFixed(2)),
    };
    statsRef.current = newStats;
    setStats({ ...newStats });

    // Add to trade log
    const logEntry = {
      id: Date.now(),
      direction: lastResult.direction,
      amount: lastResult.amount,
      result: isWin ? 'won' : 'lost',
      pnl: isWin ? `+$${lastResult.payout.toFixed(2)}` : `-$${lastResult.amount.toFixed(2)}`,
      asset: lastResult.asset,
    };
    setTradeLog(prev => [logEntry, ...prev].slice(0, 50));

    // Adjust amount for martingale strategies
    const strat = STRATEGIES[strategy];
    if (strat.getAmount) {
      const nextAmount = strat.getAmount(baseAmount, lastResult, currentAmountRef.current);
      currentAmountRef.current = nextAmount;
      setCurrentAmount(nextAmount);
    }

    // Check stop conditions
    if (newStats.pnl >= stopProfit) {
      stopBot('Stop profit reached: +$' + newStats.pnl.toFixed(2));
      return;
    }
    if (newStats.pnl <= -stopLoss) {
      stopBot('Stop loss reached: -$' + Math.abs(newStats.pnl).toFixed(2));
      return;
    }
    if (newStats.totalTrades >= maxTrades) {
      stopBot('Max trades reached: ' + newStats.totalTrades);
      return;
    }

    // Schedule next trade
    if (runningRef.current) {
      setStatus('waiting');
      setTimeout(() => {
        if (runningRef.current) placeNextTrade();
      }, 1500 + Math.random() * 1000); // 1.5-2.5s delay between trades
    }
  }, [lastResult, running]);

  const placeNextTrade = useCallback(async () => {
    if (!runningRef.current || !user) return;

    const strat = STRATEGIES[strategy];
    const direction = strat.decide(priceHistoryRef.current);
    const amount = currentAmountRef.current;

    // Check balance
    if (user.balance < amount) {
      stopBot('Insufficient balance');
      return;
    }

    setStatus('trading');
    waitingForResultRef.current = true;

    try {
      await placeTrade({
        asset,
        direction,
        amount: parseFloat(amount),
        expiry_duration: parseInt(expiry),
      });
    } catch (err) {
      waitingForResultRef.current = false;
      stopBot('Trade error: ' + err.message);
    }
  }, [strategy, asset, expiry, placeTrade, user]);

  const startBot = useCallback(() => {
    if (!user) return;

    // Reset stats
    const freshStats = { totalTrades: 0, wins: 0, losses: 0, pnl: 0 };
    statsRef.current = freshStats;
    setStats(freshStats);
    setTradeLog([]);
    currentAmountRef.current = baseAmount;
    setCurrentAmount(baseAmount);
    lastProcessedResultRef.current = null;
    waitingForResultRef.current = false;

    runningRef.current = true;
    setRunning(true);
    setStatus('waiting');

    // Place first trade after short delay
    setTimeout(() => {
      if (runningRef.current) placeNextTrade();
    }, 1000);
  }, [baseAmount, user, placeNextTrade]);

  const stopBot = useCallback((reason) => {
    runningRef.current = false;
    waitingForResultRef.current = false;
    setRunning(false);
    setStatus('stopped');
    if (reason) {
      setTradeLog(prev => [{ id: Date.now(), result: 'info', pnl: reason, direction: 'system' }, ...prev]);
    }
  }, []);

  return {
    // Config
    strategy, setStrategy,
    baseAmount, setBaseAmount,
    expiry, setExpiry,
    stopProfit, setStopProfit,
    stopLoss, setStopLoss,
    maxTrades, setMaxTrades,
    // State
    running, status,
    stats, tradeLog,
    currentAmount,
    // Actions
    startBot, stopBot,
    // Strategy list
    strategies: STRATEGIES,
  };
}
