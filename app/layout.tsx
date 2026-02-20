import type { Metadata, Viewport } from 'next';
import './globals.css';

import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  applicationName: 'Emodex',
  title: 'Emodex',
  description: 'AI-powered emotion journaling and insights app.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Emodex',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <main className="pt-45">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
