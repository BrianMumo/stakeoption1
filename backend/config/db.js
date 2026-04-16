/**
 * In-Memory Data Store with JSON file persistence.
 * Uses a simple JSON file for persistence across restarts.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

let store = {
  users: [],
  trades: [],
  transactions: []
};

// Load from file if exists
function loadStore() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      store = JSON.parse(raw);
      // Ensure transactions array exists (migration from older data files)
      if (!Array.isArray(store.transactions)) {
        store.transactions = [];
      }
      // Ensure all users have demo_balance and role
      for (const user of store.users) {
        if (user.demo_balance === undefined) {
          user.demo_balance = 5000.00;
        }
        if (!user.role) {
          user.role = 'user';
        }
        if (!user.status) {
          user.status = 'active';
        }
        // win_rate_boost: null/0 = normal, 0.70 = 70% forced wins
        if (user.win_rate_boost === undefined) {
          user.win_rate_boost = null;
        }
      }
      // Ensure all trades have account_type
      for (const trade of store.trades) {
        if (!trade.account_type) {
          trade.account_type = 'demo';
        }
      }
      console.log(`[DB] Loaded ${store.users.length} users, ${store.trades.length} trades, ${store.transactions.length} transactions`);
    }
  } catch (err) {
    console.error('[DB] Error loading data file, starting fresh:', err.message);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[DB] Error saving data:', err.message);
  }
}

// Auto-save every 10 seconds
setInterval(saveStore, 10000);

// Initialize
loadStore();

// --- User Functions ---

function createUser(email, username, password, role = 'user') {
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  
  const user = {
    id,
    email,
    username,
    password_hash,
    role,
    status: 'active',
    balance: 5000.00,
    demo_balance: 5000.00,
    account_type: 'demo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  store.users.push(user);
  saveStore();

  return { id, email, username, role, status: 'active', balance: 5000.00, demo_balance: 5000.00, account_type: 'demo' };
}

// Seed admin user if none exists
function seedAdmin() {
  const adminEmail = 'admin@stakeoption.com';
  const existing = store.users.find(u => u.email === adminEmail);
  if (!existing) {
    createUser(adminEmail, 'Admin', 'admin1234', 'admin');
    console.log('[DB] Admin user seeded: admin@stakeoption.com / admin1234');
  }
}
seedAdmin();

function getUserByEmail(email) {
  return store.users.find(u => u.email === email) || null;
}

function getUserRaw(id) {
  return store.users.find(u => u.id === id) || null;
}

function getUserById(id) {
  const user = store.users.find(u => u.id === id);
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function updateBalance(userId, newBalance) {
  const user = store.users.find(u => u.id === userId);
  if (user) {
    user.balance = newBalance;
    user.updated_at = new Date().toISOString();
  }
}

function updateDemoBalance(userId, newBalance) {
  const user = store.users.find(u => u.id === userId);
  if (user) {
    user.demo_balance = newBalance;
    user.updated_at = new Date().toISOString();
  }
}

// --- Trade Functions ---

function createTrade(trade) {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + trade.expiry_duration * 1000).toISOString();
  
  const newTrade = {
    id,
    user_id: trade.user_id,
    asset: trade.asset,
    direction: trade.direction,
    amount: trade.amount,
    strike_price: trade.strike_price,
    close_price: null,
    payout_percent: trade.payout_percent || 0.95,
    expiry_duration: trade.expiry_duration,
    account_type: trade.account_type || 'demo',
    status: 'active',
    payout: 0,
    placed_at: new Date().toISOString(),
    expires_at: expiresAt,
    closed_at: null
  };

  store.trades.push(newTrade);
  return { ...newTrade };
}

function getActiveTrades() {
  return store.trades.filter(t => t.status === 'active');
}

function getActiveTradesByUser(userId) {
  return store.trades.filter(t => t.user_id === userId && t.status === 'active');
}

function getTradeHistory(userId, limit = 50) {
  return store.trades
    .filter(t => t.user_id === userId)
    .sort((a, b) => new Date(b.placed_at) - new Date(a.placed_at))
    .slice(0, limit);
}

function closeTrade(tradeId, closePrice, status, payout) {
  const trade = store.trades.find(t => t.id === tradeId);
  if (trade) {
    trade.close_price = closePrice;
    trade.status = status;
    trade.payout = payout;
    trade.closed_at = new Date().toISOString();
  }
}

function getUserBalance(userId, accountType) {
  const user = store.users.find(u => u.id === userId);
  if (!user) return null;
  if (accountType === 'real') return user.balance;
  return user.demo_balance ?? user.balance;
}

// --- Transaction Functions ---

function createTransaction({ user_id, type, amount, phone, method, reference }) {
  const id = uuidv4();
  const tx = {
    id,
    user_id,
    type,           // 'deposit' | 'withdrawal'
    amount: parseFloat(amount),
    phone: phone || null,
    method: method || 'mpesa',
    reference: reference || null,
    mpesa_receipt: null,
    status: 'pending', // 'pending' | 'completed' | 'failed' | 'cancelled'
    created_at: new Date().toISOString(),
    completed_at: null
  };
  store.transactions.push(tx);
  saveStore();
  return { ...tx };
}

function getTransactionById(txId) {
  return store.transactions.find(t => t.id === txId) || null;
}

function getTransactionByReference(ref) {
  return store.transactions.find(t => t.reference === ref) || null;
}

function updateTransaction(txId, updates) {
  const tx = store.transactions.find(t => t.id === txId);
  if (tx) {
    Object.assign(tx, updates);
    saveStore();
  }
  return tx;
}

function getUserTransactions(userId, limit = 50) {
  return store.transactions
    .filter(t => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// --- Admin Functions ---

function getAllUsers() {
  return store.users.map(u => {
    const { password_hash, ...safe } = u;
    return safe;
  });
}

function getAllTrades({ status, userId, asset, accountType, limit = 200 } = {}) {
  let trades = [...store.trades];
  if (status) trades = trades.filter(t => t.status === status);
  if (userId) trades = trades.filter(t => t.user_id === userId);
  if (asset) trades = trades.filter(t => t.asset === asset);
  if (accountType) trades = trades.filter(t => t.account_type === accountType);
  return trades
    .sort((a, b) => new Date(b.placed_at) - new Date(a.placed_at))
    .slice(0, limit);
}

function getAllTransactions({ type, status, userId, limit = 200 } = {}) {
  let txs = [...store.transactions];
  if (type) txs = txs.filter(t => t.type === type);
  if (status) txs = txs.filter(t => t.status === status);
  if (userId) txs = txs.filter(t => t.user_id === userId);
  return txs
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

function updateUser(userId, updates) {
  const user = store.users.find(u => u.id === userId);
  if (!user) return null;
  const allowed = ['balance', 'demo_balance', 'role', 'status', 'username', 'win_rate_boost'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      user[key] = updates[key];
    }
  }
  user.updated_at = new Date().toISOString();
  saveStore();
  const { password_hash, ...safe } = user;
  return safe;
}

function deleteUser(userId) {
  const idx = store.users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  store.users.splice(idx, 1);
  // Also remove user's trades and transactions
  store.trades = store.trades.filter(t => t.user_id !== userId);
  store.transactions = store.transactions.filter(t => t.user_id !== userId);
  saveStore();
  return true;
}

function getStats() {
  const totalUsers = store.users.filter(u => u.role !== 'admin').length;
  const totalTrades = store.trades.length;
  const activeTrades = store.trades.filter(t => t.status === 'active').length;
  const wonTrades = store.trades.filter(t => t.status === 'won');
  const lostTrades = store.trades.filter(t => t.status === 'lost');
  
  const totalVolume = store.trades.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPayouts = wonTrades.reduce((sum, t) => sum + (t.payout || 0), 0);
  const totalLost = lostTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
  const platformRevenue = totalLost - totalPayouts + totalVolume;
  
  const realTrades = store.trades.filter(t => t.account_type === 'real');
  const realVolume = realTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const deposits = store.transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
  const withdrawals = store.transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed');
  const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalRealBalance = store.users.reduce((sum, u) => sum + (u.balance || 0), 0);
  
  return {
    totalUsers,
    totalTrades,
    activeTrades,
    wonTrades: wonTrades.length,
    lostTrades: lostTrades.length,
    winRate: totalTrades > 0 ? ((wonTrades.length / (wonTrades.length + lostTrades.length)) * 100).toFixed(1) : 0,
    totalVolume: parseFloat(totalVolume.toFixed(2)),
    realVolume: parseFloat(realVolume.toFixed(2)),
    totalPayouts: parseFloat(totalPayouts.toFixed(2)),
    platformRevenue: parseFloat(platformRevenue.toFixed(2)),
    totalDeposits: parseFloat(totalDeposits.toFixed(2)),
    totalWithdrawals: parseFloat(totalWithdrawals.toFixed(2)),
    totalRealBalance: parseFloat(totalRealBalance.toFixed(2)),
    depositCount: deposits.length,
    withdrawalCount: withdrawals.length,
  };
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getUserRaw,
  updateBalance,
  updateDemoBalance,
  createTrade,
  getActiveTrades,
  getActiveTradesByUser,
  getTradeHistory,
  closeTrade,
  getUserBalance,
  createTransaction,
  getTransactionById,
  getTransactionByReference,
  updateTransaction,
  getUserTransactions,
  getAllUsers,
  getAllTrades,
  getAllTransactions,
  updateUser,
  deleteUser,
  getStats
};
