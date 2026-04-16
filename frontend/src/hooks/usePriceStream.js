'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';

/**
 * Generates smooth interpolation points between two prices.
 * Uses ease-in-out curve for natural-looking transitions.
 */
function interpolatePrice(fromPrice, toPrice, steps, fromTime, toTime) {
  const points = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease-in-out cubic for smooth curve
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const price = fromPrice + (toPrice - fromPrice) * ease;
    const time = fromTime + Math.round((toTime - fromTime) * (i / steps));
    points.push({ time, value: price });
  }
  return points;
}

/**
 * Hook to subscribe to a real-time price stream for a specific asset.
 * Includes smooth interpolation for chart data.
 */
export function usePriceStream(asset) {
  const { socket, connected } = useSocket();
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceDirection, setPriceDirection] = useState(null);
  const [history, setHistory] = useState([]);
  const [allPrices, setAllPrices] = useState({});
  const prevPriceRef = useRef(null);
  const interpolationRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Subscribe to asset on mount / asset change
  useEffect(() => {
    if (!socket || !connected || !asset) return;

    // Clear any running interpolation when asset changes
    if (interpolationRef.current) {
      clearInterval(interpolationRef.current);
      interpolationRef.current = null;
    }

    socket.emit('subscribe_asset', asset);

    const handleHistory = (data) => {
      if (data.asset === asset) {
        // Smooth the initial history data
        const rawHistory = data.history || [];
        if (rawHistory.length > 2) {
          const smoothed = smoothHistoryData(rawHistory);
          setHistory(smoothed);
        } else {
          setHistory(rawHistory);
        }
        if (rawHistory.length > 0) {
          const lastPoint = rawHistory[rawHistory.length - 1];
          setCurrentPrice(lastPoint.value);
          prevPriceRef.current = lastPoint.value;
          lastTimeRef.current = lastPoint.time;
        }
      }
    };

    const handlePriceUpdate = (updates) => {
      // Store all prices for asset selector
      setAllPrices(prev => {
        const newPrices = { ...prev };
        for (const [sym, data] of Object.entries(updates)) {
          newPrices[sym] = data;
        }
        return newPrices;
      });

      // Update current asset with smooth interpolation
      if (updates[asset]) {
        const { price, change, timestamp } = updates[asset];
        const prev = prevPriceRef.current;

        if (prev !== null) {
          setPriceDirection(price > prev ? 'up' : price < prev ? 'down' : null);
        }

        setCurrentPrice(price);
        setPriceChange(change);

        const prevTime = lastTimeRef.current || timestamp - 1;

        // Generate smooth interpolation points
        if (prev !== null && prev !== price) {
          const steps = 4; // Number of intermediate points
          const interpolated = interpolatePrice(prev, price, steps, prevTime, timestamp);

          setHistory(h => {
            let newHistory = [...h];
            for (const pt of interpolated) {
              // Ensure strictly increasing time values
              if (newHistory.length === 0 || pt.time > newHistory[newHistory.length - 1].time) {
                newHistory.push(pt);
              } else if (pt.time === newHistory[newHistory.length - 1].time) {
                newHistory[newHistory.length - 1] = pt;
              }
            }
            // Keep max 800 points for smooth rendering
            if (newHistory.length > 800) {
              newHistory = newHistory.slice(-800);
            }
            return newHistory;
          });
        } else {
          // Same price or first point — just append
          setHistory(h => {
            const newPoint = { time: timestamp, value: price };
            if (h.length > 0 && h[h.length - 1].time === newPoint.time) {
              const updated = [...h];
              updated[updated.length - 1] = newPoint;
              return updated;
            }
            return [...h, newPoint].slice(-800);
          });
        }

        prevPriceRef.current = price;
        lastTimeRef.current = timestamp;
      }
    };

    socket.on('price_history', handleHistory);
    socket.on('price_update', handlePriceUpdate);

    return () => {
      socket.off('price_history', handleHistory);
      socket.off('price_update', handlePriceUpdate);
      if (interpolationRef.current) {
        clearInterval(interpolationRef.current);
        interpolationRef.current = null;
      }
    };
  }, [socket, connected, asset]);

  return { currentPrice, priceChange, priceDirection, history, allPrices };
}

/**
 * Smooth initial history by adding interpolated points between raw candles.
 * This removes the jagged look from sparse data.
 */
function smoothHistoryData(rawData) {
  if (rawData.length < 3) return rawData;

  const smoothed = [rawData[0]];

  for (let i = 1; i < rawData.length; i++) {
    const prev = rawData[i - 1];
    const curr = rawData[i];
    const timeDiff = curr.time - prev.time;
    const priceDiff = Math.abs(curr.value - prev.value);

    // Only interpolate if there's a meaningful price jump
    if (timeDiff > 1 && priceDiff > 0) {
      const steps = Math.min(3, timeDiff); // Max 3 intermediate points
      const interpolated = interpolatePrice(prev.value, curr.value, steps, prev.time, curr.time);
      // Add intermediate points (skip last since curr will be added)
      for (let j = 0; j < interpolated.length - 1; j++) {
        if (interpolated[j].time > smoothed[smoothed.length - 1].time) {
          smoothed.push(interpolated[j]);
        }
      }
    }

    if (curr.time > smoothed[smoothed.length - 1].time) {
      smoothed.push(curr);
    }
  }

  return smoothed;
}
