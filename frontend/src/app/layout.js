import './globals.css';

export const metadata = {
  title: 'StakeOption — Smart Options Trading Platform',
  description: 'Trade binary options on forex, crypto, and commodities with live charts and instant execution. Start with a $5,000 demo account.',
  keywords: 'options trading, binary options, forex, crypto, trading platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
