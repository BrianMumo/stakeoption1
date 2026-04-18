const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function adminLogin(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (data.user?.role !== 'admin') throw new Error('Not an admin account');
  localStorage.setItem('admin_token', data.token);
  localStorage.setItem('admin_user', JSON.stringify(data.user));
  return data;
}

export function adminLogout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/admin/login';
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('admin_user');
  return u ? JSON.parse(u) : null;
}

export function isAdminLoggedIn() {
  return !!getAdminToken();
}

export const fetchDashboard = () => adminFetch('/api/admin/dashboard');
export const fetchUsers = () => adminFetch('/api/admin/users');
export const fetchUserDetail = (id) => adminFetch(`/api/admin/users/${id}`);
export const updateUserAdmin = (id, data) => adminFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUserAdmin = (id) => adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
export const fetchTrades = (params = '') => adminFetch(`/api/admin/trades${params ? '?' + params : ''}`);
export const fetchTransactions = (params = '') => adminFetch(`/api/admin/transactions${params ? '?' + params : ''}`);

// M-Pesa Admin
export const fetchMpesaBalance = (refresh = false) => adminFetch(`/api/admin/mpesa/balance${refresh ? '?refresh=true' : ''}`);
export const adminMpesaWithdraw = (phone, amount) => adminFetch('/api/admin/mpesa/withdraw', {
  method: 'POST',
  body: JSON.stringify({ phone, amount }),
});

// User Balance Adjustment
export const adjustUserBalance = (userId, amount, type, reason) => adminFetch(`/api/admin/users/${userId}/adjust-balance`, {
  method: 'PUT',
  body: JSON.stringify({ amount, type, reason }),
});

// Analytics
export const fetchAnalytics = () => adminFetch('/api/admin/analytics');
