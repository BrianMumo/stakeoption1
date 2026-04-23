/**
 * Email Service — Branded transactional emails for StakeOption.
 *
 * Uses Nodemailer with SMTP (Gmail, SendGrid, Mailgun, etc.).
 * Falls back silently if SMTP is not configured (dev mode).
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// ── SMTP Transport ──
let transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isConfigured()) {
    console.log('[Email] SMTP not configured — emails will be skipped');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log(`[Email] SMTP configured: ${process.env.SMTP_HOST}`);
  return transporter;
}

const FROM = process.env.SMTP_FROM || 'StakeOption <noreply@stakeoption.com>';

// ── Base HTML Layout ──
function baseLayout(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StakeOption</title>
</head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="display:inline-block;width:44px;height:44px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:12px;line-height:44px;text-align:center;">
        <span style="color:white;font-size:22px;font-weight:900;">S</span>
      </div>
      <div style="margin-top:10px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">StakeOption</div>
    </div>

    <!-- Content Card -->
    <div style="background:#111827;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px 28px;margin-bottom:24px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="color:#4b5563;font-size:12px;margin:0 0 8px;">
        © ${new Date().getFullYear()} StakeOption. All rights reserved.
      </p>
      <p style="color:#374151;font-size:11px;margin:0;line-height:1.6;">
        Risk Warning: Trading involves significant risk of loss.<br>
        Past performance is not indicative of future results.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send helper (non-blocking, never throws) ──
async function sendMail(to, subject, html) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email] Skipped (not configured): "${subject}" → ${to}`);
    return false;
  }

  try {
    await transport.sendMail({ from: FROM, to, subject, html });
    console.log(`[Email] Sent: "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed: "${subject}" → ${to}:`, err.message);
    return false;
  }
}

// ══════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════

/**
 * Welcome email — sent on registration.
 */
async function sendWelcomeEmail(email, username) {
  const subject = 'Welcome to StakeOption! 🚀';
  const html = baseLayout(`
    <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Welcome, ${username}! 👋</h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Your trading account has been created successfully. You're all set to start trading on StakeOption.
    </p>

    <!-- Feature highlights -->
    <div style="background:#0d1117;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="margin-bottom:16px;">
        <span style="color:#38bdf8;font-weight:700;font-size:14px;">💰 $5,000 Demo Balance</span>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Practice risk-free with virtual funds before going live.</p>
      </div>
      <div style="margin-bottom:16px;">
        <span style="color:#10b981;font-weight:700;font-size:14px;">⚡ Instant Execution</span>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Sub-second trade execution with no delays or requotes.</p>
      </div>
      <div>
        <span style="color:#818cf8;font-weight:700;font-size:14px;">📊 100+ Trading Assets</span>
        <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Access forex, crypto, stocks, and commodities 24/7.</p>
      </div>
    </div>

    <a href="https://stakeoption.com/trade" style="display:block;text-align:center;background:linear-gradient(135deg,#38bdf8,#818cf8);color:white;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;margin-bottom:16px;">
      Start Trading Now →
    </a>

    <p style="color:#4b5563;font-size:12px;text-align:center;margin:0;">
      If you didn't create this account, please ignore this email.
    </p>
  `);

  return sendMail(email, subject, html);
}

/**
 * Deposit confirmation email.
 */
async function sendDepositEmail(email, username, { amount, currency = 'USD', method = 'M-Pesa', status = 'completed', reference = '' }) {
  const statusColor = status === 'completed' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#f43f5e';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const subject = status === 'completed'
    ? `Deposit Confirmed — $${amount.toFixed(2)} 💰`
    : `Deposit ${statusLabel} — $${amount.toFixed(2)}`;

  const html = baseLayout(`
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px;">Deposit ${statusLabel}</h1>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">
      ${status === 'completed' ? 'Your funds have been credited to your account.' : 'Your deposit is being processed.'}
    </p>

    <!-- Transaction details -->
    <div style="background:#0d1117;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Amount</td>
          <td style="color:#ffffff;font-size:15px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">$${amount.toFixed(2)} ${currency}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Payment Method</td>
          <td style="color:#e5e7eb;font-size:14px;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${method}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Status</td>
          <td style="text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}20;color:${statusColor};">${statusLabel}</span>
          </td>
        </tr>
        ${reference ? `
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;">Reference</td>
          <td style="color:#9ca3af;font-size:13px;text-align:right;padding:8px 0;font-family:monospace;">${reference}</td>
        </tr>` : ''}
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
      Date: ${new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </p>
  `);

  return sendMail(email, subject, html);
}

/**
 * Withdrawal confirmation/notification email.
 */
async function sendWithdrawalEmail(email, username, { amount, phone = '', method = 'M-Pesa', status = 'pending', reference = '' }) {
  const statusColor = status === 'completed' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#f43f5e';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const maskedPhone = phone ? phone.slice(0, 4) + '****' + phone.slice(-3) : '';

  const subject = status === 'completed'
    ? `Withdrawal Sent — $${amount.toFixed(2)} ✅`
    : status === 'failed'
      ? `Withdrawal Failed — $${amount.toFixed(2)}`
      : `Withdrawal Processing — $${amount.toFixed(2)}`;

  const html = baseLayout(`
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px;">Withdrawal ${statusLabel}</h1>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">
      ${status === 'completed' ? 'Your funds have been sent successfully.' : status === 'failed' ? 'Your withdrawal could not be processed. The funds have been returned to your account.' : 'Your withdrawal is being processed.'}
    </p>

    <!-- Transaction details -->
    <div style="background:#0d1117;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Amount</td>
          <td style="color:#ffffff;font-size:15px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">$${amount.toFixed(2)}</td>
        </tr>
        ${maskedPhone ? `
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Sent To</td>
          <td style="color:#e5e7eb;font-size:14px;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${maskedPhone}</td>
        </tr>` : ''}
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Method</td>
          <td style="color:#e5e7eb;font-size:14px;text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${method}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Status</td>
          <td style="text-align:right;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}20;color:${statusColor};">${statusLabel}</span>
          </td>
        </tr>
        ${reference ? `
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:8px 0;">Reference</td>
          <td style="color:#9ca3af;font-size:13px;text-align:right;padding:8px 0;font-family:monospace;">${reference}</td>
        </tr>` : ''}
      </table>
    </div>

    ${status === 'failed' ? `
    <div style="background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2);border-radius:10px;padding:14px;margin-bottom:16px;">
      <p style="color:#f43f5e;font-size:13px;margin:0;text-align:center;">
        ⚠️ Your balance has been automatically restored. No funds were deducted.
      </p>
    </div>` : ''}

    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
      Date: ${new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </p>
  `);

  return sendMail(email, subject, html);
}

module.exports = {
  isConfigured,
  sendWelcomeEmail,
  sendDepositEmail,
  sendWithdrawalEmail,
};
