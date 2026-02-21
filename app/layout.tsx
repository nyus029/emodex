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
      <body className="antialiased bg-light-gray">
        <div className="flex flex-col h-screen overflow-hidden overscroll-none">
          <div className="shrink-0">
            <Header />
          </div>
          <main className="grow overflow-y-auto">{children}</main>
          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
