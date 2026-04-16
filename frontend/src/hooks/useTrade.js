'use client';

import { useState, useCallback } from 'react';
import { useTrades } from '@/contexts/TradeContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for placing trades and tracking trade state.
 */
export function useTrade() {
  const { placeTrade, activeTrades, tradeHistory, lastResult } = useTrades();
  const { user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  const executeTrade = useCallback(async ({ asset, direction, amount, expiry_duration }) => {
    if (!user) {
      setError('Please login to trade');
      return null;
    }
    
    setPlacing(true);
    setError(null);
    
    try {
      const trade = await placeTrade({
        asset,
        direction,
        amount: parseFloat(amount),
        expiry_duration: parseInt(expiry_duration),
      });
      return trade;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setPlacing(false);
    }
  }, [placeTrade, user]);

  const clearError = useCallback(() => setError(null), []);

  return {
    executeTrade,
    placing,
    error,
    clearError,
    activeTrades,
    tradeHistory,
    lastResult,
  };
}
