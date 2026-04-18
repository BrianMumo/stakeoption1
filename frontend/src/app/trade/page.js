'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SocketProvider } from '@/contexts/SocketContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TradeProvider } from '@/contexts/TradeContext';
import TradingPage from './TradingPage';

function AuthGate({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0e17',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(33,150,243,0.2)',
            borderTopColor: '#2196F3',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ opacity: 0.6, fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}

export default function TradePage() {
  return (
    <AuthGate>
      <AuthProvider>
        <SocketProvider>
          <TradeProvider>
            <TradingPage />
          </TradeProvider>
        </SocketProvider>
      </AuthProvider>
    </AuthGate>
  );
}
