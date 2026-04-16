'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAdminLoggedIn, getAdminUser, adminLogout } from '@/lib/adminApi';
import './admin.css';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true);
      return;
    }
    if (!isAdminLoggedIn()) {
      router.replace('/admin/login');
      return;
    }
    setUser(getAdminUser());
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/trades', label: 'Trades', icon: '📈' },
    { href: '/admin/transactions', label: 'Transactions', icon: '💳' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="aGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <path d="M16 2L28 8v8c0 7.732-5.373 14.953-12 16C9.373 30.953 4 23.732 4 16V8l12-6z" fill="url(#aGrad)" opacity="0.9" />
              <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="admin-brand-name">StakeOption</div>
              <div className="admin-brand-label">ADMIN PANEL</div>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className="admin-user-name">{user?.username || 'Admin'}</div>
              <div className="admin-user-email">{user?.email || ''}</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={adminLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
