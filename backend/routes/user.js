const express = require('express');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const { getUserById, getUserRaw, updateUser, updateDemoBalance, getTradeHistory } = require('../config/db');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/user/profile — Update username
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' });
    }

    const updated = await updateUser(req.user.id, { username: username.trim() });
    if (!updated) return res.status(404).json({ error: 'User not found.' });

    res.json({ user: updated, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/user/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    // Verify current password
    const user = await getUserRaw(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash and save new password
    const User = require('../models/User');
    const newHash = bcrypt.hashSync(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { password_hash: newHash });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/user/stats — Trade statistics for profile page
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const trades = await getTradeHistory(req.user.id, 1000);
    const settled = trades.filter(t => t.status !== 'active');
    const won = settled.filter(t => t.status === 'won');
    const lost = settled.filter(t => t.status === 'lost');
    const totalVolume = settled.reduce((s, t) => s + (t.amount || 0), 0);
    const totalPayout = won.reduce((s, t) => s + (t.payout || 0), 0);
    const totalInvested = settled.reduce((s, t) => s + (t.amount || 0), 0);
    const netPnL = totalPayout - totalInvested;

    res.json({
      totalTrades: settled.length,
      wonTrades: won.length,
      lostTrades: lost.length,
      winRate: settled.length > 0 ? ((won.length / settled.length) * 100).toFixed(1) : '0.0',
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
      netPnL: parseFloat(netPnL.toFixed(2)),
      activeTrades: trades.filter(t => t.status === 'active').length,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/user/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ balance: user.balance, demo_balance: user.demo_balance });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/user/reset-demo — Reset demo balance to $5,000
router.post('/reset-demo', authMiddleware, async (req, res) => {
  try {
    const DEMO_STARTING_BALANCE = 5000.00;
    await updateDemoBalance(req.user.id, DEMO_STARTING_BALANCE);
    res.json({ message: 'Demo balance reset successfully.', demo_balance: DEMO_STARTING_BALANCE });
  } catch (err) {
    console.error('Reset demo error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
