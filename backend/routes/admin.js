const express = require('express');
const adminAuth = require('../middleware/adminAuth');
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

module.exports = router;
