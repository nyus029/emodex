import type { Metadata, Viewport } from 'next';
import './globals.css';

import LayoutShell from '@/components/layout-shell';

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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-light-gray">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
