/**
 * M-Pesa Daraja API Service
 * Handles STK Push (Lipa na M-Pesa Online) for deposits
 * and B2C for withdrawals.
 * Uses axios for reliable HTTPS connectivity.
 */

const axios = require('axios');

const REQUEST_TIMEOUT = 30000; // 30 seconds

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.shortcode = process.env.MPESA_SHORTCODE || '174379';
    this.passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://example.com/api/finances/mpesa/callback';
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseUrl = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    this.accessToken = null;
    this.tokenExpiry = 0;

    // Create axios instance with defaults
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: REQUEST_TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[M-Pesa] Environment: ${this.environment}`);
    console.log(`[M-Pesa] Base URL: ${this.baseUrl}`);
    console.log(`[M-Pesa] Shortcode: ${this.shortcode}`);
    console.log(`[M-Pesa] Callback: ${this.callbackUrl}`);
    console.log(`[M-Pesa] Configured: ${this.isConfigured()}`);
  }

  /**
   * Get OAuth access token from Daraja API
   */
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    try {
      const response = await this.http.get('/oauth/v1/generate?grant_type=client_credentials', {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      const data = response.data;
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (parseInt(data.expires_in) - 60) * 1000;
        console.log('[M-Pesa] Access token obtained successfully');
        return this.accessToken;
      } else {
        throw new Error('No access_token in response: ' + JSON.stringify(data));
      }
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`M-Pesa auth failed: ${msg}`);
    }
  }

  /**
   * Generate timestamp in the format YYYYMMDDHHmmss
   */
  getTimestamp() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  /**
   * Generate password for STK Push
   */
  getPassword() {
    const timestamp = this.getTimestamp();
    const raw = `${this.shortcode}${this.passkey}${timestamp}`;
    return {
      password: Buffer.from(raw).toString('base64'),
      timestamp
    };
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  formatPhone(phone) {
    let formatted = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    return formatted;
  }

  /**
   * Initiate STK Push (Lipa na M-Pesa Online) for deposit
   */
  async stkPush(phone, amount, accountRef) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();
    const formattedPhone = this.formatPhone(phone);

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: `StakeOption Deposit - ${accountRef}`
    };

    console.log(`[M-Pesa] STK Push: KES ${Math.ceil(amount)} to ${formattedPhone}`);

    try {
      const response = await this.http.post('/mpesa/stkpush/v1/processrequest', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[M-Pesa] STK Push response:', JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[M-Pesa] STK Push error:', msg);
      throw new Error(`M-Pesa STK Push failed: ${msg}`);
    }
  }

  /**
   * Query STK Push status (check if user has entered PIN)
   */
  async stkQuery(checkoutRequestID) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID
    };

    try {
      const response = await this.http.post('/mpesa/stkpushquery/v1/query', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`M-Pesa STK Query failed: ${msg}`);
    }
  }

  /**
   * Parse STK Push callback data
   */
  parseStkCallback(body) {
    try {
      const result = body.Body?.stkCallback;
      if (!result) return { success: false, error: 'Invalid callback format' };

      const resultCode = result.ResultCode;
      const resultDesc = result.ResultDesc;
      const merchantRequestID = result.MerchantRequestID;
      const checkoutRequestID = result.CheckoutRequestID;

      if (resultCode !== 0) {
        return {
          success: false,
          error: resultDesc,
          checkoutRequestID,
          merchantRequestID,
          resultCode
        };
      }

      const metadata = {};
      const items = result.CallbackMetadata?.Item || [];
      for (const item of items) {
        metadata[item.Name] = item.Value;
      }

      return {
        success: true,
        checkoutRequestID,
        merchantRequestID,
        amount: metadata.Amount,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        phone: metadata.PhoneNumber?.toString(),
        transactionDate: metadata.TransactionDate?.toString()
      };
    } catch (e) {
      return { success: false, error: 'Callback parse error: ' + e.message };
    }
  }

  /**
   * Simulate a deposit for demo/testing purposes
   */
  async simulateDeposit(phone, amount, accountRef) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      simulated: true,
      checkoutRequestID: `sim_${Date.now()}`,
      amount: Math.ceil(amount),
      mpesaReceiptNumber: `SIM${Date.now().toString().slice(-8)}`,
      phone: this.formatPhone(phone),
    };
  }

  /**
   * Simulate a withdrawal for demo/testing purposes
   */
  async simulateWithdrawal(phone, amount, accountRef) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      simulated: true,
      conversationID: `sim_w_${Date.now()}`,
      amount: Math.ceil(amount),
      mpesaReceiptNumber: `SIMW${Date.now().toString().slice(-8)}`,
      phone: this.formatPhone(phone),
    };
  }

  /**
   * Check if M-Pesa is properly configured
   */
  isConfigured() {
    return !!(this.consumerKey && this.consumerSecret && this.consumerKey !== '');
  }
}

module.exports = new MpesaService();
