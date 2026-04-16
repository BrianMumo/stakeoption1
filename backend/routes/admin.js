const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { getAllUsers, getUserById, getAllTrades, getAllTransactions, getStats, updateUser, deleteUser, getTradeHistory } = require('../config/db');

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

// GET /api/admin/dashboard — Platform stats
router.get('/dashboard', (req, res) => {
  try {
    const stats = getStats();
    res.json({ stats });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/users — All users
router.get('/users', (req, res) => {
  try {
    const users = getAllUsers();
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/users/:id — Single user detail
router.get('/users/:id', (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    const trades = getTradeHistory(req.params.id, 100);
    res.json({ user, trades });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/admin/users/:id — Update user
router.put('/users/:id', (req, res) => {
  try {
    const updated = updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: updated, message: 'User updated successfully.' });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const deleted = deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/trades — All trades
router.get('/trades', (req, res) => {
  try {
    const { status, user_id, asset, account_type, limit } = req.query;
    const trades = getAllTrades({
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
router.get('/transactions', (req, res) => {
  try {
    const { type, status, user_id, limit } = req.query;
    const transactions = getAllTransactions({
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

module.exports = router;
