/**
 * M-Pesa Daraja API Service
 * Handles STK Push (Lipa na M-Pesa Online) for deposits
 * and B2C for withdrawals.
 */

const https = require('https');

const REQUEST_TIMEOUT = 15000; // 15 seconds

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.shortcode = process.env.MPESA_SHORTCODE || '174379'; // Sandbox default
    this.passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://example.com/api/finances/mpesa/callback';
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseUrl = this.environment === 'production'
      ? 'api.safaricom.co.ke'
      : 'sandbox.safaricom.co.ke';
    
    this.accessToken = null;
    this.tokenExpiry = 0;

    console.log(`[M-Pesa] Environment: ${this.environment} → ${this.baseUrl}`);
    console.log(`[M-Pesa] Shortcode: ${this.shortcode}`);
    console.log(`[M-Pesa] Callback: ${this.callbackUrl}`);
    console.log(`[M-Pesa] Configured: ${this.isConfigured()}`);
  }

  /**
   * Make an HTTPS request with timeout
   */
  _request(options, payload = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.setTimeout(REQUEST_TIMEOUT, () => {
        req.destroy();
        reject(new Error(`M-Pesa request timed out after ${REQUEST_TIMEOUT / 1000}s`));
      });

      req.on('error', (err) => {
        reject(new Error(`M-Pesa request failed: ${err.message}`));
      });

      if (payload) req.write(payload);
      req.end();
    });
  }

  /**
   * Get OAuth access token from Daraja API
   */
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    const parsed = await this._request({
      hostname: this.baseUrl,
      path: '/oauth/v1/generate?grant_type=client_credentials',
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (parsed.access_token) {
      this.accessToken = parsed.access_token;
      this.tokenExpiry = Date.now() + (parseInt(parsed.expires_in) - 60) * 1000;
      return this.accessToken;
    } else {
      throw new Error('Failed to get M-Pesa access token: ' + JSON.stringify(parsed));
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

    const payload = JSON.stringify({
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
    });

    console.log(`[M-Pesa] STK Push: KES ${Math.ceil(amount)} to ${formattedPhone} via ${this.baseUrl}`);

    return this._request({
      hostname: this.baseUrl,
      path: '/mpesa/stkpush/v1/processrequest',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);
  }

  /**
   * Query STK Push status (check if user has entered PIN)
   */
  async stkQuery(checkoutRequestID) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.getPassword();

    const payload = JSON.stringify({
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID
    });

    return this._request({
      hostname: this.baseUrl,
      path: '/mpesa/stkpushquery/v1/query',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);
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
