const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getTradeHistory, getActiveTradesByUser } = require('../config/db');

const router = express.Router();

// GET /api/trades/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const trades = await getTradeHistory(req.user.id, limit);
    res.json({ trades });
  } catch (err) {
    console.error('Trade history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/trades/active
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const trades = await getActiveTradesByUser(req.user.id);
    res.json({ trades });
  } catch (err) {
    console.error('Active trades error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
