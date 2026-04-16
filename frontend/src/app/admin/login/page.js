'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <path d="M16 2L28 8v8c0 7.732-5.373 14.953-12 16C9.373 30.953 4 23.732 4 16V8l12-6z" fill="url(#adminGrad)" opacity="0.9" />
            <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={styles.logoText}>StakeOption</span>
        </div>
        <h1 style={styles.title}>Admin Portal</h1>
        <p style={styles.subtitle}>Sign in to manage the platform</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@stakeoption.com"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1035 50%, #0d0d2b 100%)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: 'rgba(20, 20, 40, 0.8)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: 16,
    padding: '40px 36px',
    width: 400,
    maxWidth: '90vw',
    backdropFilter: 'blur(20px)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 6px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8b8ba7',
    margin: '0 0 28px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#a0a0c0',
    fontWeight: 500,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.2s',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.08)',
    borderRadius: 8,
    border: '1px solid rgba(239,68,68,0.15)',
  },
  button: {
    padding: '13px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.2s',
  },
};
