'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const TradeContext = createContext(null);

export function TradeProvider({ children }) {
  const { socket } = useSocket();
  const { user, updateBalance, accountType } = useAuth();
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  // Listen for trade results from server
  useEffect(() => {
    if (!socket) return;

    const handleTradeResult = (result) => {
      console.log('[Trade] Result:', result);
      setLastResult(result);
      
      // Remove from active trades
      setActiveTrades((prev) => prev.filter((t) => t.id !== result.tradeId));
      
      // Add to history
      setTradeHistory((prev) => [{
        id: result.tradeId,
        asset: result.asset,
        direction: result.direction,
        amount: result.amount,
        strike_price: result.strike_price,
        close_price: result.close_price,
        status: result.status,
        payout: result.payout,
        closed_at: new Date().toISOString(),
      }, ...prev].slice(0, 100));
      
      // Update balance
      if (result.balance !== undefined) {
        updateBalance(result.balance);
      }

      // Auto-clear result notification after 5s
      setTimeout(() => setLastResult(null), 5000);
    };

    socket.on('trade_result', handleTradeResult);
    return () => socket.off('trade_result', handleTradeResult);
  }, [socket, updateBalance]);

  const placeTrade = useCallback((tradeData) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      
      socket.emit('place_trade', { ...tradeData, account_type: accountType }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          setActiveTrades((prev) => [...prev, response.trade]);
          if (response.trade.balance !== undefined) {
            updateBalance(response.trade.balance);
          }
          resolve(response.trade);
        }
      });
    });
  }, [socket, updateBalance, accountType]);

  return (
    <TradeContext.Provider value={{ activeTrades, tradeHistory, lastResult, placeTrade }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTrades must be used within TradeProvider');
  }
  return context;
}

export default TradeContext;
