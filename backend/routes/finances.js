/**
 * Finances Routes — Deposit, Withdraw, Transaction History
 * Integrates with M-Pesa Daraja API (Safaricom Paybill)
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const mpesa = require('../services/mpesa');
const {
  getUserById,
  getUserBalance,
  updateBalance,
  createTransaction,
  getTransactionById,
  getTransactionByReference,
  updateTransaction,
  getUserTransactions
} = require('../config/db');

const router = express.Router();

// ─────────────────────────────────────────────────
// POST /api/finances/deposit — Initiate M-Pesa deposit (amount in USD)
// ─────────────────────────────────────────────────
const KES_PER_USD = 129.24;

router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const userId = req.user.id;

    // Validation — amount is in USD
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone number and amount are required.' });
    }

    const usdAmount = parseFloat(amount);
    if (isNaN(usdAmount) || usdAmount < 1) {
      return res.status(400).json({ error: 'Minimum deposit is $1.' });
    }
    if (usdAmount > 10000) {
      return res.status(400).json({ error: 'Maximum deposit is $10,000.' });
    }

    // Convert USD to KES for M-Pesa
    const kesAmount = Math.ceil(usdAmount * KES_PER_USD);

    // Validate phone format (Kenyan number)
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!/^(\+?254|0)\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid phone number. Use format: 07XXXXXXXX or 254XXXXXXXXX' });
    }

    // Create pending transaction — amount stored in USD
    const tx = await createTransaction({
      user_id: userId,
      type: 'deposit',
      amount: usdAmount,
      phone: mpesa.formatPhone(cleanPhone),
      method: 'mpesa',
      reference: `DEP_${Date.now()}_${userId.slice(0, 8)}`
    });

    // Initiate M-Pesa STK Push or simulate
    let result;
    if (mpesa.isConfigured()) {
      result = await mpesa.stkPush(cleanPhone, kesAmount, tx.reference);
      
      if (result.ResponseCode === '0') {
        // STK Push sent successfully — update tx with checkout ID
        await updateTransaction(tx.id, {
          reference: result.CheckoutRequestID
        });
        
        return res.json({
          success: true,
          message: 'M-Pesa payment prompt sent to your phone.\nEnter your PIN to complete.',
          transactionId: tx.id,
          checkoutRequestID: result.CheckoutRequestID
        });
      } else {
        await updateTransaction(tx.id, { status: 'failed' });
        return res.status(400).json({
          error: result.errorMessage || result.ResponseDescription || 'Failed to initiate M-Pesa payment.'
        });
      }
    } else {
      // Simulation mode — auto-complete deposit
      result = await mpesa.simulateDeposit(cleanPhone, kesAmount, tx.reference);
      
      // Credit the user's balance immediately (amount is already USD)
      const currentBalance = await getUserBalance(userId);
      const newBalance = parseFloat((currentBalance + usdAmount).toFixed(2));
      await updateBalance(userId, newBalance);

      await updateTransaction(tx.id, {
        status: 'completed',
        mpesa_receipt: result.mpesaReceiptNumber,
        completed_at: new Date().toISOString()
      });

      return res.json({
        success: true,
        simulated: true,
        message: `Deposit of $${usdAmount.toFixed(2)} (KES ${kesAmount.toLocaleString()}) successful!`,
        transactionId: tx.id,
        receipt: result.mpesaReceiptNumber,
        balance: newBalance,
        usdAmount
      });
    }
  } catch (err) {
    console.error('[Finances] Deposit error:', err);
    res.status(500).json({ error: 'Deposit failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────
// POST /api/finances/mpesa/callback — M-Pesa STK Push callback
// ─────────────────────────────────────────────────
router.post('/mpesa/callback', async (req, res) => {
  try {
    console.log('[M-Pesa] Callback received:', JSON.stringify(req.body));
    
    const result = mpesa.parseStkCallback(req.body);
    
    if (!result.checkoutRequestID) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const tx = await getTransactionByReference(result.checkoutRequestID);
    if (!tx) {
      console.error('[M-Pesa] Transaction not found for:', result.checkoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (result.success) {
      // Credit the user's balance — tx.amount is already in USD
      const currentBalance = await getUserBalance(tx.user_id);
      const newBalance = parseFloat((currentBalance + tx.amount).toFixed(2));
      await updateBalance(tx.user_id, newBalance);

      await updateTransaction(tx.id, {
        status: 'completed',
        mpesa_receipt: result.mpesaReceiptNumber,
        completed_at: new Date().toISOString()
      });

      console.log(`[M-Pesa] Deposit completed: $${tx.amount} for user ${tx.user_id}`);
    } else {
      await updateTransaction(tx.id, {
        status: 'failed',
        completed_at: new Date().toISOString()
      });
      console.log(`[M-Pesa] Deposit failed: ${result.error}`);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[M-Pesa] Callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ─────────────────────────────────────────────────
// POST /api/finances/withdraw — Initiate withdrawal
// ─────────────────────────────────────────────────
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const userId = req.user.id;

    // Validation
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone number and amount are required.' });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 1) {
      return res.status(400).json({ error: 'Minimum withdrawal is $1.' });
    }

    const balance = await getUserBalance(userId);
    if (balance === null) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (withdrawAmount > balance) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Validate phone format
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (!/^(\+?254|0)\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }

    // Deduct from balance immediately
    const newBalance = parseFloat((balance - withdrawAmount).toFixed(2));
    await updateBalance(userId, newBalance);

    const kesAmount = parseFloat((withdrawAmount * 130).toFixed(0));

    // Create transaction
    const tx = await createTransaction({
      user_id: userId,
      type: 'withdrawal',
      amount: withdrawAmount,
      phone: mpesa.formatPhone(cleanPhone),
      method: 'mpesa',
      reference: `WIT_${Date.now()}_${userId.slice(0, 8)}`
    });

    // Simulate withdrawal (B2C would go here for production)
    if (mpesa.isConfigured()) {
      // In production: initiate B2C payment
      // For now, mark as processing
      await updateTransaction(tx.id, { status: 'processing' });
      
      return res.json({
        success: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} (KES ${kesAmount.toLocaleString()}) is being processed. You will receive the funds shortly.`,
        transactionId: tx.id,
        balance: newBalance
      });
    } else {
      // Simulation mode — auto-complete
      const result = await mpesa.simulateWithdrawal(cleanPhone, kesAmount, tx.reference);

      await updateTransaction(tx.id, {
        status: 'completed',
        mpesa_receipt: result.mpesaReceiptNumber,
        completed_at: new Date().toISOString()
      });

      return res.json({
        success: true,
        simulated: true,
        message: `Withdrawal of $${withdrawAmount.toFixed(2)} (KES ${kesAmount.toLocaleString()}) sent to ${cleanPhone}`,
        transactionId: tx.id,
        receipt: result.mpesaReceiptNumber,
        balance: newBalance,
        kesAmount
      });
    }
  } catch (err) {
    console.error('[Finances] Withdraw error:', err);
    res.status(500).json({ error: 'Withdrawal failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────
// GET /api/finances/transactions — Transaction history
// ─────────────────────────────────────────────────
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await getUserTransactions(userId, limit);
    res.json({ transactions });
  } catch (err) {
    console.error('[Finances] History error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// ─────────────────────────────────────────────────
// GET /api/finances/transaction/:id — Single transaction status (with active M-Pesa query)
// ─────────────────────────────────────────────────
router.get('/transaction/:id', authMiddleware, async (req, res) => {
  try {
    let tx = await getTransactionById(req.params.id);
    if (!tx || tx.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // If transaction is still pending and has a reference (CheckoutRequestID), query M-Pesa
    if (tx.status === 'pending' && tx.type === 'deposit' && tx.reference && mpesa.isConfigured()) {
      try {
        const queryResult = await mpesa.stkQuery(tx.reference);
        console.log('[M-Pesa] STK Query result:', JSON.stringify(queryResult));

        // ResultCode 0 = success (payment completed)
        if (queryResult.ResultCode === '0' || queryResult.ResultCode === 0) {
          // Credit the user's balance — tx.amount is already in USD
          const currentBalance = await getUserBalance(tx.user_id);
          const newBalance = parseFloat((currentBalance + tx.amount).toFixed(2));
          await updateBalance(tx.user_id, newBalance);

          tx = await updateTransaction(tx.id || tx._id, {
            status: 'completed',
            mpesa_receipt: queryResult.ResultDesc || 'MPesa-Confirmed',
            completed_at: new Date().toISOString()
          });

          console.log(`[M-Pesa] STK Query confirmed payment: $${tx.amount} for user ${tx.user_id}`);
        } 
        // ResultCode 1032 = cancelled by user
        else if (queryResult.ResultCode === '1032' || queryResult.ResultCode === 1032) {
          tx = await updateTransaction(tx.id || tx._id, {
            status: 'failed',
            completed_at: new Date().toISOString()
          });
        }
        // ResultCode 1037 = timeout (user didn't enter PIN in time)
        else if (queryResult.ResultCode === '1037' || queryResult.ResultCode === 1037) {
          tx = await updateTransaction(tx.id || tx._id, {
            status: 'failed',
            completed_at: new Date().toISOString()
          });
        }
        // Other codes: still processing, keep as pending
      } catch (queryErr) {
        console.error('[M-Pesa] STK Query error:', queryErr.message);
        // Don't fail the request — just return current tx status
      }
    }

    res.json({ transaction: tx });
  } catch (err) {
    console.error('[Finances] Transaction lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction.' });
  }
});

module.exports = router;
