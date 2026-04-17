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
    // Trim all env vars to remove accidental whitespace/newlines
    this.consumerKey = (process.env.MPESA_CONSUMER_KEY || '').trim();
    this.consumerSecret = (process.env.MPESA_CONSUMER_SECRET || '').trim();
    this.shortcode = (process.env.MPESA_SHORTCODE || '174379').trim();
    this.passkey = (process.env.MPESA_PASSKEY || '').trim();
    this.callbackUrl = (process.env.MPESA_CALLBACK_URL || '').trim();
    this.environment = (process.env.MPESA_ENVIRONMENT || 'sandbox').trim();
    
    // B2C (withdrawal) credentials
    this.b2cShortcode = (process.env.MPESA_B2C_SHORTCODE || this.shortcode).trim();
    this.b2cInitiatorName = (process.env.MPESA_B2C_INITIATOR_NAME || '').trim();
    this.b2cSecurityCredential = (process.env.MPESA_B2C_SECURITY_CREDENTIAL || '').trim();
    this.b2cResultUrl = (process.env.MPESA_B2C_RESULT_URL || `${this.callbackUrl.replace('/mpesa/callback', '/mpesa/b2c/result')}`).trim();
    this.b2cTimeoutUrl = (process.env.MPESA_B2C_TIMEOUT_URL || `${this.callbackUrl.replace('/mpesa/callback', '/mpesa/b2c/timeout')}`).trim();

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
    console.log(`[M-Pesa] B2C Shortcode: ${this.b2cShortcode}`);
    console.log(`[M-Pesa] B2C Initiator: ${this.b2cInitiatorName}`);
    console.log(`[M-Pesa] B2C Configured: ${this.isB2CConfigured()}`);
    console.log(`[M-Pesa] Callback: ${this.callbackUrl}`);

    // Test connectivity on startup
    if (this.isConfigured()) {
      this.getAccessToken()
        .then(() => console.log('[M-Pesa] ✅ API connectivity OK — access token obtained'))
        .catch(err => console.error('[M-Pesa] ❌ API connectivity FAILED:', err.message));
    }
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
   * Initiate B2C payout (send money to customer's phone)
   * @param {string} phone - Customer phone number
   * @param {number} amount - Amount in KES
   * @param {string} remarks - Transaction remarks
   * @returns {Promise<object>} B2C result
   */
  async b2cPayout(phone, amount, remarks = 'Withdrawal') {
    const token = await this.getAccessToken();
    const formattedPhone = this.formatPhone(phone);

    // Generate unique OriginatorConversationID (required by B2C v3)
    const originatorId = `B2C_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const payload = {
      OriginatorConversationID: originatorId,
      InitiatorName: this.b2cInitiatorName,
      SecurityCredential: this.b2cSecurityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.floor(amount),
      PartyA: this.b2cShortcode,
      PartyB: formattedPhone,
      Remarks: remarks,
      QueueTimeOutURL: this.b2cTimeoutUrl,
      ResultURL: this.b2cResultUrl,
      Occasion: remarks
    };

    console.log(`[M-Pesa] B2C Payout: KES ${Math.floor(amount)} to ${formattedPhone}`);

    try {
      const response = await this.http.post('/mpesa/b2c/v3/paymentrequest', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[M-Pesa] B2C response:', JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error('[M-Pesa] B2C error:', msg);
      throw new Error(`M-Pesa B2C payout failed: ${msg}`);
    }
  }

  /**
   * Parse B2C callback result
   */
  parseB2CResult(body) {
    try {
      const result = body.Result;
      if (!result) return { success: false, error: 'Invalid B2C callback format' };

      const resultCode = result.ResultCode;
      const resultDesc = result.ResultDesc;
      const conversationID = result.ConversationID;
      const transactionID = result.TransactionID;

      if (resultCode !== 0) {
        return {
          success: false,
          error: resultDesc,
          conversationID,
          transactionID,
          resultCode
        };
      }

      // Extract result parameters
      const params = {};
      const items = result.ResultParameters?.ResultParameter || [];
      for (const item of items) {
        params[item.Key] = item.Value;
      }

      return {
        success: true,
        conversationID,
        transactionID,
        amount: params.TransactionAmount,
        mpesaReceiptNumber: params.TransactionReceipt,
        receiverPhone: params.ReceiverPartyPublicName,
        completedTime: params.TransactionCompletedDateTime
      };
    } catch (e) {
      return { success: false, error: 'B2C callback parse error: ' + e.message };
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

  /**
   * Check if B2C (withdrawal) is properly configured
   */
  isB2CConfigured() {
    return !!(this.b2cInitiatorName && this.b2cSecurityCredential && this.b2cShortcode);
  }
}

module.exports = new MpesaService();
