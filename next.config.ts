import type { NextConfig } from 'next';
// `next-pwa` does not provide TypeScript declarations.
// @ts-expect-error - untyped package
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
