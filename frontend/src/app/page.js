'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const TICKER_ASSETS = [
  { name: 'BTC/USD', price: '67,432.18', change: '+2.14%', up: true },
  { name: 'ETH/USD', price: '3,521.44', change: '+1.87%', up: true },
  { name: 'AAPL', price: '198.52', change: '+0.63%', up: true },
  { name: 'TSLA', price: '241.37', change: '-1.22%', up: false },
  { name: 'GOOGL', price: '176.89', change: '+0.94%', up: true },
  { name: 'EUR/USD', price: '1.0847', change: '-0.12%', up: false },
  { name: 'Gold', price: '2,381.50', change: '+0.78%', up: true },
  { name: 'AMZN', price: '186.43', change: '+1.35%', up: true },
  { name: 'META', price: '505.12', change: '+0.52%', up: true },
  { name: 'MSFT', price: '425.22', change: '-0.31%', up: false },
];

const TESTIMONIALS = [
  {
    name: 'Michael R.',
    role: 'Day Trader',
    text: 'StakeOption completely changed how I trade. The interface is lightning fast and the charts are incredibly smooth. Best platform I\'ve used in years.',
    avatar: '🟦',
    stars: 5,
    color: '#38bdf8',
  },
  {
    name: 'Sarah K.',
    role: 'Crypto Investor',
    text: 'Started with the demo account and was trading confidently within a week. The $5,000 demo balance gave me real practice without any risk.',
    avatar: '🟪',
    stars: 5,
    color: '#818cf8',
  },
  {
    name: 'David L.',
    role: 'Swing Trader',
    text: 'The auto-trader feature is a game changer. I set my strategy and it executes perfectly. Withdrawals are processed faster than any other platform.',
    avatar: '🟩',
    stars: 5,
    color: '#10b981',
  },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className={styles.page}>
      {/* ========== NAVBAR ========== */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <button className={styles.hamburger} aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={styles.chatLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Online chat
          </span>
        </div>

        <Link href="/" className={styles.navLogo}>
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8"/>
                <stop offset="100%" stopColor="#818cf8"/>
              </linearGradient>
            </defs>
            <path d="M16 2L28 8v8c0 7.732-5.373 14.953-12 16C9.373 30.953 4 23.732 4 16V8l12-6z" fill="url(#navLogoGrad)" opacity="0.9"/>
            <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.navBrand}>StakeOption</span>
        </Link>

        {isLoggedIn ? (
          <Link href="/trade" className={styles.navCta}>
            Trade Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ) : (
          <div className={styles.navAuthButtons}>
            <Link href="/login" className={styles.navLoginBtn}>Sign in</Link>
            <Link href="/register" className={styles.navRegisterBtn}>
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          </div>
        )}
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className={styles.hero}>
        {/* Animated orbs */}
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroOrb3} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Live markets — Trade 24/7
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleGradient}>Smart Trading</span>
            <br />
            Made Simple
          </h1>
          <p className={styles.heroSubtitle}>
            Access 100+ global assets with real-time charts, instant execution, and professional tools — all in one platform.
          </p>

          <div className={styles.heroLogos}>
            <div className={styles.logoCircle} style={{background: '#1877F2'}}>
              <span style={{fontWeight: 800, fontSize: '16px'}}>f</span>
            </div>
            <div className={styles.logoCircle} style={{background: '#FFC72C'}}>
              <span style={{fontWeight: 800, fontSize: '14px', color: '#D52B1E'}}>M</span>
            </div>
            <div className={styles.logoCircle} style={{background: '#E31937'}}>
              <span style={{fontWeight: 800, fontSize: '14px'}}>T</span>
            </div>
            <div className={styles.logoCircle} style={{background: '#4285F4'}}>
              <span style={{fontWeight: 800, fontSize: '14px'}}>G</span>
            </div>
            <div className={styles.logoCircle} style={{background: '#555'}}>
              <span style={{fontWeight: 800, fontSize: '16px'}}>⌘</span>
            </div>
            <span className={styles.assetCount}>+100 assets</span>
          </div>

          <div className={styles.heroActions}>
            {isLoggedIn ? (
              <Link href="/trade" className={styles.heroCta}>
                Trade Now
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ) : (
              <>
                <Link href="/register" className={styles.heroDemoBtn} id="hero-try-demo">
                  Start Free Demo
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
                <Link href="/login" className={styles.heroSecondaryBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Hero Visual: Animated Chart */}
        <div className={styles.heroVisual}>
          {/* Floating cards */}
          <div className={`${styles.floatingCard} ${styles.floatingCard1}`}>
            <div className={styles.floatingLabel}>Profit</div>
            <div className={styles.floatingValue}>+$1,247.80</div>
          </div>
          <div className={`${styles.floatingCard} ${styles.floatingCard2}`}>
            <div className={styles.floatingPill}>
              <span className={styles.floatingPillGreen}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </span>
              <span style={{color: '#10b981', fontWeight: 700}}>Win Rate 87%</span>
            </div>
          </div>
          <div className={`${styles.floatingCard} ${styles.floatingCard3}`}>
            <div className={styles.floatingLabel}>Active Trades</div>
            <div style={{fontSize: '16px', fontWeight: 800, color: '#38bdf8'}}>24</div>
          </div>

          <div className={styles.heroChartContainer}>
            <div className={styles.heroChartHeader}>
              <div className={styles.heroChartAsset}>
                <div className={styles.heroChartDot} />
                <span className={styles.heroChartName}>BTC / USD</span>
              </div>
              <span className={styles.heroChartPrice}>$67,432.18</span>
            </div>
            <svg className={styles.heroChartSvg} viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8"/>
                  <stop offset="50%" stopColor="#818cf8"/>
                  <stop offset="100%" stopColor="#10b981"/>
                </linearGradient>
                <linearGradient id="heroAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.15)"/>
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0)"/>
                </linearGradient>
              </defs>
              <path
                className={styles.heroChartArea}
                d="M0,140 Q25,130 50,120 T100,100 T150,115 T200,80 T250,90 T300,60 T350,75 T400,45 T450,55 T500,30 L500,200 L0,200 Z"
              />
              <path
                className={styles.heroChartLine}
                d="M0,140 Q25,130 50,120 T100,100 T150,115 T200,80 T250,90 T300,60 T350,75 T400,45 T450,55 T500,30"
              />
              {/* Grid lines */}
              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              {/* Current price dot */}
              <circle cx="500" cy="30" r="4" fill="#10b981">
                <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="500" cy="30" r="8" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3">
                <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
        </div>
      </section>

      {/* ========== LIVE TICKER ========== */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER_ASSETS, ...TICKER_ASSETS].map((asset, i) => (
            <div key={i} className={styles.tickerItem}>
              <span className={styles.tickerName}>{asset.name}</span>
              <span className={styles.tickerPrice}>{asset.price}</span>
              <span className={`${styles.tickerChange} ${asset.up ? styles.tickerUp : styles.tickerDown}`}>
                {asset.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========== WHY STAKEOPTION ========== */}
      <section className={styles.section}>
        <span className={styles.sectionTag}>Why StakeOption</span>
        <h2 className={styles.sectionTitle}>Built for Modern Traders</h2>
        <p className={styles.sectionSubtitle}>
          Everything you need to trade confidently — from advanced charting to instant withdrawals.
        </p>

        <div className={styles.whyGrid}>
          <div className={styles.whyCard} style={{'--card-accent': '#38bdf8'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(56, 189, 248, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Real-Time Charts</h3>
            <p className={styles.whyDesc}>Professional-grade candlestick and area charts with multiple timeframes and technical indicators.</p>
          </div>

          <div className={styles.whyCard} style={{'--card-accent': '#818cf8'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(129, 140, 248, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Instant Execution</h3>
            <p className={styles.whyDesc}>Trade with sub-second execution speeds. No delays, no requotes — just pure performance.</p>
          </div>

          <div className={styles.whyCard} style={{'--card-accent': '#10b981'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(16, 185, 129, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Bank-Grade Security</h3>
            <p className={styles.whyDesc}>256-bit SSL encryption with segregated client funds. Your money is always protected.</p>
          </div>

          <div className={styles.whyCard} style={{'--card-accent': '#f59e0b'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(245, 158, 11, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Fast Withdrawals</h3>
            <p className={styles.whyDesc}>Get your funds in minutes, not days. We support 20+ payment methods including crypto.</p>
          </div>

          <div className={styles.whyCard} style={{'--card-accent': '#f43f5e'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(244, 63, 94, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10"/>
                <path d="M18 20V4"/>
                <path d="M6 20v-4"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Auto Trader</h3>
            <p className={styles.whyDesc}>Set your strategy and let our AI-powered auto trader execute trades 24/7 while you sleep.</p>
          </div>

          <div className={styles.whyCard} style={{'--card-accent': '#06b6d4'}}>
            <div className={styles.whyIcon} style={{background: 'rgba(6, 182, 212, 0.1)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className={styles.whyTitle}>Demo Account</h3>
            <p className={styles.whyDesc}>Practice risk-free with $5,000 virtual balance. Master your strategy before going live.</p>
          </div>
        </div>
      </section>

      {/* ========== LIVE STATS ========== */}
      <section className={styles.statsSection}>
        <div style={{textAlign: 'center', marginBottom: '56px'}}>
          <span className={styles.sectionTag}>Platform Stats</span>
          <h2 className={styles.sectionTitle}>Trusted by Millions</h2>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>70M+</div>
            <div className={styles.statLabel}>Active Traders</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>$2.8B</div>
            <div className={styles.statLabel}>Monthly Volume</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>100+</div>
            <div className={styles.statLabel}>Trading Assets</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>48</div>
            <div className={styles.statLabel}>Countries</div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className={styles.section}>
        <span className={styles.sectionTag}>Get Started</span>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>
          Start trading in under 2 minutes. No complicated setup required.
        </p>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber} style={{background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'}}>1</div>
            <h3 className={styles.stepTitle}>Create Account</h3>
            <p className={styles.stepDesc}>Sign up in seconds with just your email. Get instant access to your $5,000 demo account.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber} style={{background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8'}}>2</div>
            <h3 className={styles.stepTitle}>Choose & Trade</h3>
            <p className={styles.stepDesc}>Pick from 100+ assets. Analyze the chart, set your trade amount and expiry, then execute.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber} style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>3</div>
            <h3 className={styles.stepTitle}>Earn & Withdraw</h3>
            <p className={styles.stepDesc}>Collect your profits and withdraw instantly to your bank card, e-wallet, or crypto wallet.</p>
          </div>
        </div>
      </section>

      {/* ========== FOR ALL DEVICES ========== */}
      <section className={styles.section}>
        <span className={styles.sectionTag}>Cross Platform</span>
        <h2 className={styles.sectionTitle}>Trade Anywhere</h2>
        <p className={styles.sectionSubtitle}>
          Seamless experience across all your devices. Start on desktop, continue on mobile.
        </p>
        <div className={styles.deviceGrid}>
          {[
            { icon: '🤖', name: 'Android', desc: '4.4 and higher' },
            { icon: '🍎', name: 'iOS', desc: '8.2 and higher' },
            { icon: '🪟', name: 'Windows', desc: 'XP and higher' },
            { icon: '💻', name: 'MacOS', desc: 'Mavericks and higher' },
          ].map((d) => (
            <div key={d.name} className={styles.deviceCard}>
              <span className={styles.deviceIcon}>{d.icon}</span>
              <span className={styles.deviceName}>{d.name}</span>
              <span className={styles.deviceDesc}>{d.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className={styles.testimonialsSection}>
        <div style={{textAlign: 'center', marginBottom: '56px'}}>
          <span className={styles.sectionTag}>Reviews</span>
          <h2 className={styles.sectionTitle}>What Traders Say</h2>
          <p className={styles.sectionSubtitle}>
            Join thousands of satisfied traders who chose StakeOption as their primary platform.
          </p>
        </div>

        <div className={styles.testimonialGrid}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>
                {[...Array(t.stars)].map((_, j) => (
                  <span key={j} className={styles.star}>★</span>
                ))}
              </div>
              <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar} style={{background: t.color}}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className={styles.testimonialName}>{t.name}</div>
                  <div className={styles.testimonialRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== TRUSTED ========== */}
      <section className={styles.section}>
        <div className={styles.trustedHeader}>
          <div className={styles.trustedShield}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8"/>
                  <stop offset="100%" stopColor="#818cf8"/>
                </linearGradient>
              </defs>
              <path d="M16 2L28 8v8c0 7.732-5.373 14.953-12 16C9.373 30.953 4 23.732 4 16V8l12-6z" fill="url(#shieldGrad)" opacity="0.9"/>
              <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className={styles.trustedTitle}>Trusted & Regulated</h2>
        </div>
        <p className={styles.trustedDesc}>
          StakeOption is a leader in the online trading industry.
          <br />
          We are trusted by more than 70,000,000 clients worldwide.
        </p>
        <div className={styles.trustedGrid}>
          <div className={styles.awardCard}>
            <div className={styles.awardIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7"/>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
            </div>
            <h4 className={styles.awardTitle}>Best Trading Platform</h4>
            <p className={styles.awardDesc}>Award winner at China Trading Expo<br/>Shenzhen, 6-7 May 2017</p>
          </div>
          <div className={styles.awardCard}>
            <div className={styles.awardIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h4 className={styles.awardTitle}>Most Secure Platform</h4>
            <p className={styles.awardDesc}>256-bit SSL encryption<br/>Funds security guaranteed</p>
          </div>
          <div className={styles.awardCard}>
            <div className={styles.awardIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h4 className={styles.awardTitle}>Top Rated Platform</h4>
            <p className={styles.awardDesc}>4.9 stars average rating<br/>Rated by 50,000+ traders</p>
          </div>
        </div>
        <Link href="/register" className={styles.seeMoreBtn}>
          Learn More
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </section>

      {/* ========== GLOBAL TRADING ========== */}
      <section className={styles.globalSection}>
        <div className={styles.globalHeader}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <h2 className={styles.globalTitle}>Global Trading Platform</h2>
        </div>

        <div className={styles.statsGrid} style={{marginBottom: '32px'}}>
          {[
            { value: '$10', label: 'Minimum Deposit' },
            { value: '$1', label: 'Minimum Trade' },
            { value: '0%', label: 'Commissions' },
            { value: '0%', label: 'Fees' },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statValue} style={{fontSize: '28px'}}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        <p className={styles.globalSubtext}>People from 48 countries trade at StakeOption</p>
      </section>

      {/* ========== FINAL CTA ========== */}
      {!isLoggedIn && (
        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>
            Ready to Start Trading?
          </h2>
          <p className={styles.ctaSubtitle}>
            Open a free demo account with $5,000 virtual balance. No credit card required.
          </p>
          <Link href="/register" className={styles.ctaBtn} id="cta-start-trading">
            Create Free Account
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </section>
      )}

      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandCol}>
              <div className={styles.footerBrand}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8"/>
                      <stop offset="100%" stopColor="#818cf8"/>
                    </linearGradient>
                  </defs>
                  <path d="M16 2L28 8v8c0 7.732-5.373 14.953-12 16C9.373 30.953 4 23.732 4 16V8l12-6z" fill="url(#footerGrad)" opacity="0.6"/>
                  <path d="M11 16l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>StakeOption</span>
              </div>
              <p className={styles.footerBrandDesc}>
                Professional trading platform with advanced tools, real-time data, and institutional-grade security.
              </p>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Trading</div>
              <a href="#">Features</a>
              <a href="#">Account Types</a>
              <a href="#">Auto Trader</a>
              <a href="#">Assets</a>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Education</div>
              <a href="#">How to Trade</a>
              <a href="#">Strategies</a>
              <a href="#">Tutorials</a>
              <a href="#">FAQ</a>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Company</div>
              <a href="#">About Us</a>
              <a href="#">Contact</a>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerText}>
              Risk Warning: Trading involves significant risk. Past performance is not indicative of future results.
            </p>
            <p className={styles.footerCopy}>© 2024 StakeOption. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
