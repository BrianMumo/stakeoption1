const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getUserById, updateDemoBalance } = require('../config/db');

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

