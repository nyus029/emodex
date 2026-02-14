import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    apple: '/apple-icon',
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
