const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getUserById } = require('../config/db');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const user = getUserById(req.user.id);
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
router.get('/balance', authMiddleware, (req, res) => {
  try {
    const user = getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ balance: user.balance, demo_balance: user.demo_balance });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
