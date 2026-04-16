/**
 * StakeOption — Constants & Configuration
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// Synthetic Continuous Indices
export const ASSETS = [
  // Standard tick indices
  { symbol: 'Volatility 10 Index',   icon: 'V10',  category: 'Continuous', payout: 95 },
  { symbol: 'Volatility 25 Index',   icon: 'V25',  category: 'Continuous', payout: 93 },
  { symbol: 'Volatility 50 Index',   icon: 'V50',  category: 'Continuous', payout: 90 },
  { symbol: 'Volatility 75 Index',   icon: 'V75',  category: 'Continuous', payout: 88 },
  { symbol: 'Volatility 100 Index',  icon: 'V100', category: 'Continuous', payout: 85 },
  // 1-second tick indices
  { symbol: 'Volatility 10 (1s) Index',  icon: 'V10s', category: '1s Indices', payout: 94 },
  { symbol: 'Volatility 25 (1s) Index',  icon: 'V25s', category: '1s Indices', payout: 92 },
  { symbol: 'Volatility 50 (1s) Index',  icon: 'V50s', category: '1s Indices', payout: 89 },
  { symbol: 'Volatility 75 (1s) Index',  icon: 'V75s', category: '1s Indices', payout: 87 },
  { symbol: 'Volatility 100 (1s) Index', icon: 'V100s', category: '1s Indices', payout: 84 },
];

export const ASSET_CATEGORIES = ['All', 'Continuous', '1s Indices'];

// Expiry durations (seconds)
export const EXPIRY_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
];

// Default settings
export const DEFAULT_ASSET = 'Volatility 50 Index';
export const DEFAULT_AMOUNT = 1;
export const DEFAULT_EXPIRY = 30;
export const STARTING_BALANCE = 5000;

// Sidebar navigation items
export const SIDEBAR_NAV = [
  { id: 'trade', icon: 'chart', label: 'Trade', active: true },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'finances', icon: 'wallet', label: 'Finances' },
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'education', icon: 'book', label: 'Education' },
  { id: 'help', icon: 'help', label: 'Help' },
];
