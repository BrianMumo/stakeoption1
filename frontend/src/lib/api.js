/**
 * StakeOption — REST API helpers
 */

import { API_BASE } from './constants';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: getHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Auth
export async function register(email, username, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password }),
  });
}

export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// User
export async function getProfile() {
  return request('/api/user/profile');
}

export async function getBalance() {
  return request('/api/user/balance');
}

// Trades
export async function getTradeHistory(limit = 50) {
  return request(`/api/trades/history?limit=${limit}`);
}

export async function getActiveTrades() {
  return request('/api/trades/active');
}

// Finances
export async function initiateDeposit(phone, amount) {
  return request('/api/finances/deposit', {
    method: 'POST',
    body: JSON.stringify({ phone, amount }),
  });
}

export async function initiateWithdrawal(phone, amount) {
  return request('/api/finances/withdraw', {
    method: 'POST',
    body: JSON.stringify({ phone, amount }),
  });
}

export async function getTransactions(limit = 50) {
  return request(`/api/finances/transactions?limit=${limit}`);
}

export async function getTransactionStatus(txId) {
  return request(`/api/finances/transaction/${txId}`);
}
