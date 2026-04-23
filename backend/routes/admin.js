const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { getKesPerUsd } = require('../services/exchangeRate');
const { getAllUsers, getUserById, getAllTrades, getAllTransactions, getStats, updateUser, deleteUser, getTradeHistory } = require('../config/db');

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

// GET /api/admin/dashboard — Platform stats
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ stats });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/users — All users
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/users/:id — Single user detail
router.get('/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    const trades = await getTradeHistory(req.params.id, 100);
    res.json({ user, trades });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/admin/users/:id — Update user
router.put('/users/:id', async (req, res) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: updated, message: 'User updated successfully.' });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/trades — All trades
router.get('/trades', async (req, res) => {
  try {
    const { status, user_id, asset, account_type, limit } = req.query;
    const trades = await getAllTrades({
      status,
      userId: user_id,
      asset,
      accountType: account_type,
      limit: limit ? parseInt(limit) : 200,
    });
    res.json({ trades });
  } catch (err) {
    console.error('Admin trades error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/transactions — All transactions
router.get('/transactions', async (req, res) => {
  try {
    const { type, status, user_id, limit } = req.query;
    const transactions = await getAllTransactions({
      type,
      status,
      userId: user_id,
      limit: limit ? parseInt(limit) : 200,
    });
    res.json({ transactions });
  } catch (err) {
    console.error('Admin transactions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ══════════════════════════════════════════
// M-PESA ADMIN ENDPOINTS
// ══════════════════════════════════════════

// GET /api/admin/mpesa/balance — Get paybill balance + trigger refresh
router.get('/mpesa/balance', async (req, res) => {
  try {
    const mpesa = require('../services/mpesa');

    // Check if M-Pesa is fully configured
    if (!mpesa.isConfigured() || !mpesa.isB2CConfigured()) {
      // Fallback: calculate from DB transactions
      const allTx = await getAllTransactions({ limit: 10000 });
      const completedDeposits = allTx.filter(t => t.type === 'deposit' && t.status === 'completed');
      const completedWithdrawals = allTx.filter(t => t.type === 'withdrawal' && t.status === 'completed');
      const totalDeposited = completedDeposits.reduce((s, t) => s + (t.amount || 0), 0);
      const totalWithdrawn = completedWithdrawals.reduce((s, t) => s + (t.amount || 0), 0);
      const KES_PER_USD = await getKesPerUsd();
      return res.json({
        success: true,
        source: 'database',
        balance: {
          utility: Math.max(0, Math.round((totalDeposited - totalWithdrawn) * KES_PER_USD)),
          working: Math.max(0, Math.round((totalDeposited - totalWithdrawn) * KES_PER_USD)),
          uncleared: 0,
          currency: 'KES',
          exchangeRate: KES_PER_USD,
        }
      });
    }

    // Get last known balance from Safaricom callback
    const lastKnown = mpesa.getLastKnownBalance();

    // Trigger a fresh balance query (async — result comes via callback)
    const triggerRefresh = req.query.refresh === 'true';
    let queryStatus = null;
    if (triggerRefresh || lastKnown.stale) {
      try {
        const queryResult = await mpesa.accountBalance();
        queryStatus = 'queried';
        console.log('[Admin] Balance query sent — waiting for callback');
      } catch (err) {
        queryStatus = 'query_failed: ' + err.message;
      }
    }

    // Return the last known balance (from previous callback)
    if (lastKnown.balance) {
      return res.json({
        success: true,
        source: 'mpesa_callback',
        balance: lastKnown.balance,
        updatedAt: lastKnown.updatedAt,
        stale: lastKnown.stale,
        queryStatus,
      });
    }

    // No cached balance yet — trigger query and tell admin to wait
    if (!queryStatus) {
      try {
        await mpesa.accountBalance();
        queryStatus = 'queried';
      } catch (err) {
        queryStatus = 'query_failed: ' + err.message;
      }
    }

    // Fallback to DB calculation while waiting for first callback
    const allTx = await getAllTransactions({ limit: 10000 });
    const completedDeposits = allTx.filter(t => t.type === 'deposit' && t.status === 'completed');
    const completedWithdrawals = allTx.filter(t => t.type === 'withdrawal' && t.status === 'completed');
    const totalDeposited = completedDeposits.reduce((s, t) => s + (t.amount || 0), 0);
    const totalWithdrawn = completedWithdrawals.reduce((s, t) => s + (t.amount || 0), 0);
    const KES_PER_USD = await getKesPerUsd();

    res.json({
      success: true,
      source: 'database_pending_callback',
      balance: {
        utility: Math.max(0, Math.round((totalDeposited - totalWithdrawn) * KES_PER_USD)),
        working: Math.max(0, Math.round((totalDeposited - totalWithdrawn) * KES_PER_USD)),
        uncleared: 0,
        currency: 'KES',
        exchangeRate: KES_PER_USD,
      },
      queryStatus,
      message: 'Balance query sent to Safaricom. Click Refresh in a few seconds for live balance.',
    });
  } catch (err) {
    console.error('Admin M-Pesa balance error:', err);
    res.json({
      success: false,
      balance: { utility: 0, working: 0, uncleared: 0, currency: 'KES' },
      error: err.message,
    });
  }
});

// POST /api/admin/mpesa/withdraw — Admin withdraws from paybill to personal M-Pesa
router.post('/mpesa/withdraw', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || !amount || amount < 10) {
      return res.status(400).json({ error: 'Phone and amount (min KES 10) required.' });
    }

    const mpesa = require('../services/mpesa');

    if (!mpesa.isConfigured() || !mpesa.isB2CConfigured()) {
      // Simulate withdrawal in sandbox mode
      const simResult = await mpesa.simulateWithdrawal(phone, amount, 'AdminWithdrawal');
      return res.json({
        success: true,
        simulated: true,
        message: `Simulated admin withdrawal of KES ${amount} to ${phone}`,
        receipt: simResult.mpesaReceiptNumber,
      });
    }

    const result = await mpesa.b2cPayout(phone, amount, `Admin Withdrawal`);
    res.json({
      success: true,
      message: `Withdrawal of KES ${amount} initiated to ${phone}`,
      result,
    });
  } catch (err) {
    console.error('Admin M-Pesa withdraw error:', err);
    res.status(500).json({ error: err.message || 'Withdrawal failed.' });
  }
});

// ══════════════════════════════════════════
// USER BALANCE ADJUSTMENT
// ══════════════════════════════════════════

// PUT /api/admin/users/:id/adjust-balance — Credit/debit user balance
router.put('/users/:id/adjust-balance', async (req, res) => {
  try {
    const { amount, type, reason } = req.body; // type: 'credit' | 'debit', amount in USD
    const adjustAmount = parseFloat(amount);
    if (!adjustAmount || adjustAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount required.' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be credit or debit.' });
    }

    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentBalance = user.balance || 0;
    let newBalance;
    if (type === 'credit') {
      newBalance = currentBalance + adjustAmount;
    } else {
      newBalance = Math.max(0, currentBalance - adjustAmount);
    }

    const updated = await updateUser(req.params.id, { balance: newBalance });
    console.log(`[Admin] Balance ${type}: ${user.username} $${currentBalance} → $${newBalance} (${reason || 'No reason'})`);

    res.json({
      user: updated,
      adjustment: {
        type,
        amount: adjustAmount,
        previous: currentBalance,
        new: newBalance,
        reason: reason || '',
      },
      message: `${type === 'credit' ? 'Credited' : 'Debited'} $${adjustAmount.toFixed(2)} ${type === 'credit' ? 'to' : 'from'} ${user.username}`,
    });
  } catch (err) {
    console.error('Admin balance adjust error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ══════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════

// GET /api/admin/analytics — Revenue analytics
router.get('/analytics', async (req, res) => {
  try {
    const stats = await getStats();
    const transactions = await getAllTransactions({ limit: 500 });

    // Calculate revenue breakdown
    const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const withdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed');

    const totalDeposited = deposits.reduce((s, t) => s + (t.amount || 0), 0);
    const totalWithdrawn = withdrawals.reduce((s, t) => s + (t.amount || 0), 0);
    const netRevenue = totalDeposited - totalWithdrawn;

    // Platform profit from trades (house edge) 
    const wonTrades = stats?.wonTrades || 0;
    const lostTrades = stats?.lostTrades || 0;
    const totalVolume = stats?.totalVolume || 0;

    // Daily breakdown (last 7 days)
    const now = new Date();
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayDeposits = deposits.filter(t => t.created_at?.startsWith(dateStr));
      const dayWithdrawals = withdrawals.filter(t => t.created_at?.startsWith(dateStr));

      dailyStats.push({
        date: dateStr,
        deposits: dayDeposits.reduce((s, t) => s + (t.amount || 0), 0),
        withdrawals: dayWithdrawals.reduce((s, t) => s + (t.amount || 0), 0),
        count: dayDeposits.length + dayWithdrawals.length,
      });
    }

    res.json({
      revenue: {
        totalDeposited,
        totalWithdrawn,
        netRevenue,
        depositCount: deposits.length,
        withdrawalCount: withdrawals.length,
      },
      trades: {
        total: (wonTrades + lostTrades),
        won: wonTrades,
        lost: lostTrades,
        volume: totalVolume,
        winRate: stats?.winRate || 0,
      },
      dailyStats,
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
