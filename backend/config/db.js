/**
 * Database Layer — MongoDB via Mongoose
 * Drop-in replacement for the old JSON file store.
 * All functions are now async and return Promises.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Transaction = require('../models/Transaction');

// ── Connect to MongoDB ──
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI not set! Cannot connect.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB Atlas');
    await seedAdmin();
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// --- User Functions ---

async function createUser(email, username, password, role = 'user') {
  const password_hash = bcrypt.hashSync(password, 10);

  const user = await User.create({
    email,
    username,
    password_hash,
    role,
    status: 'active',
    balance: 0,
    demo_balance: 5000.00,
    account_type: 'demo',
  });

  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
    status: 'active',
    balance: 0,
    demo_balance: 5000.00,
    account_type: 'demo'
  };
}

// Seed admin user if none exists
async function seedAdmin() {
  const adminEmail = 'admin@stakeoption.com';
  const existing = await User.findOne({ email: adminEmail });
  if (!existing) {
    await createUser(adminEmail, 'Admin', 'admin1234', 'admin');
    console.log('[DB] Admin user seeded: admin@stakeoption.com / admin1234');
  }
}

async function getUserByEmail(email) {
  const user = await User.findOne({ email });
  if (!user) return null;
  return user.toObject();
}

async function getUserRaw(id) {
  const user = await User.findById(id);
  if (!user) return null;
  return user.toObject();
}

async function getUserById(id) {
  const user = await User.findById(id).select('-password_hash');
  if (!user) return null;
  return user.toObject();
}

async function updateBalance(userId, newBalance) {
  await User.findByIdAndUpdate(userId, { balance: newBalance });
}

async function updateDemoBalance(userId, newBalance) {
  await User.findByIdAndUpdate(userId, { demo_balance: newBalance });
}

// --- Trade Functions ---

async function createTrade(trade) {
  const expiresAt = new Date(Date.now() + trade.expiry_duration * 1000);

  const newTrade = await Trade.create({
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
    placed_at: new Date(),
    expires_at: expiresAt,
    closed_at: null,
  });

  return newTrade.toObject();
}

async function getActiveTrades() {
  const trades = await Trade.find({ status: 'active' });
  return trades.map(t => t.toObject());
}

async function getActiveTradesByUser(userId) {
  const trades = await Trade.find({ user_id: userId, status: 'active' });
  return trades.map(t => t.toObject());
}

async function getTradeHistory(userId, limit = 50) {
  const trades = await Trade.find({ user_id: userId })
    .sort({ placed_at: -1 })
    .limit(limit);
  return trades.map(t => t.toObject());
}

async function closeTrade(tradeId, closePrice, status, payout) {
  await Trade.findByIdAndUpdate(tradeId, {
    close_price: closePrice,
    status,
    payout,
    closed_at: new Date(),
  });
}

async function getUserBalance(userId, accountType) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (accountType === 'real') return user.balance;
  return user.demo_balance ?? user.balance;
}

// --- Transaction Functions ---

async function createTransaction({ user_id, type, amount, phone, method, reference }) {
  const tx = await Transaction.create({
    user_id,
    type,
    amount: parseFloat(amount),
    phone: phone || null,
    method: method || 'mpesa',
    reference: reference || null,
    mpesa_receipt: null,
    status: 'pending',
    completed_at: null,
  });
  return tx.toObject();
}

async function getTransactionById(txId) {
  const tx = await Transaction.findById(txId);
  if (!tx) return null;
  return tx.toObject();
}

async function getTransactionByReference(ref) {
  const tx = await Transaction.findOne({ reference: ref });
  if (!tx) return null;
  return tx.toObject();
}

async function updateTransaction(txId, updates) {
  const tx = await Transaction.findByIdAndUpdate(txId, updates, { new: true });
  if (!tx) return null;
  return tx.toObject();
}

async function getUserTransactions(userId, limit = 50) {
  const txs = await Transaction.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit);
  return txs.map(t => t.toObject());
}

// --- Admin Functions ---

async function getAllUsers() {
  const users = await User.find().select('-password_hash');
  return users.map(u => u.toObject());
}

async function getAllTrades({ status, userId, asset, accountType, limit = 200 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user_id = userId;
  if (asset) filter.asset = asset;
  if (accountType) filter.account_type = accountType;

  const trades = await Trade.find(filter)
    .sort({ placed_at: -1 })
    .limit(limit);
  return trades.map(t => t.toObject());
}

async function getAllTransactions({ type, status, userId, limit = 200 } = {}) {
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (userId) filter.user_id = userId;

  const txs = await Transaction.find(filter)
    .sort({ created_at: -1 })
    .limit(limit);
  return txs.map(t => t.toObject());
}

async function updateUser(userId, updates) {
  const allowed = ['balance', 'demo_balance', 'role', 'status', 'username', 'win_rate_boost'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }

  const user = await User.findByIdAndUpdate(userId, safeUpdates, { new: true }).select('-password_hash');
  if (!user) return null;
  return user.toObject();
}

async function deleteUser(userId) {
  const user = await User.findByIdAndDelete(userId);
  if (!user) return false;
  // Also remove user's trades and transactions
  await Trade.deleteMany({ user_id: userId });
  await Transaction.deleteMany({ user_id: userId });
  return true;
}

async function getStats() {
  const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
  const totalTrades = await Trade.countDocuments();
  const activeTrades = await Trade.countDocuments({ status: 'active' });
  const wonTradesCount = await Trade.countDocuments({ status: 'won' });
  const lostTradesCount = await Trade.countDocuments({ status: 'lost' });

  // Aggregation for volumes and payouts
  const [volumeAgg] = await Trade.aggregate([
    { $group: {
      _id: null,
      totalVolume: { $sum: '$amount' },
      realVolume: { $sum: { $cond: [{ $eq: ['$account_type', 'real'] }, '$amount', 0] } },
    }}
  ]) || [{ totalVolume: 0, realVolume: 0 }];

  const [payoutAgg] = await Trade.aggregate([
    { $match: { status: 'won' } },
    { $group: { _id: null, totalPayouts: { $sum: '$payout' } } }
  ]) || [{ totalPayouts: 0 }];

  const [lostAgg] = await Trade.aggregate([
    { $match: { status: 'lost' } },
    { $group: { _id: null, totalLost: { $sum: '$amount' } } }
  ]) || [{ totalLost: 0 }];

  const [depositAgg] = await Transaction.aggregate([
    { $match: { type: 'deposit', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]) || [{ total: 0, count: 0 }];

  const [withdrawalAgg] = await Transaction.aggregate([
    { $match: { type: 'withdrawal', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]) || [{ total: 0, count: 0 }];

  const [balanceAgg] = await User.aggregate([
    { $group: { _id: null, totalRealBalance: { $sum: '$balance' } } }
  ]) || [{ totalRealBalance: 0 }];

  const totalVolume = volumeAgg?.totalVolume || 0;
  const realVolume = volumeAgg?.realVolume || 0;
  const totalPayouts = payoutAgg?.totalPayouts || 0;
  const totalLost = lostAgg?.totalLost || 0;
  const platformRevenue = totalLost - totalPayouts + totalVolume;

  return {
    totalUsers,
    totalTrades,
    activeTrades,
    wonTrades: wonTradesCount,
    lostTrades: lostTradesCount,
    winRate: (wonTradesCount + lostTradesCount) > 0
      ? ((wonTradesCount / (wonTradesCount + lostTradesCount)) * 100).toFixed(1)
      : 0,
    totalVolume: parseFloat(totalVolume.toFixed(2)),
    realVolume: parseFloat(realVolume.toFixed(2)),
    totalPayouts: parseFloat(totalPayouts.toFixed(2)),
    platformRevenue: parseFloat(platformRevenue.toFixed(2)),
    totalDeposits: parseFloat((depositAgg?.total || 0).toFixed(2)),
    totalWithdrawals: parseFloat((withdrawalAgg?.total || 0).toFixed(2)),
    totalRealBalance: parseFloat((balanceAgg?.totalRealBalance || 0).toFixed(2)),
    depositCount: depositAgg?.count || 0,
    withdrawalCount: withdrawalAgg?.count || 0,
  };
}

module.exports = {
  connectDB,
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
