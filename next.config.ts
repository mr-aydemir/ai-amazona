import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
        pathname: '/f/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.dsmcdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Avoid importing webpack types to prevent build-time type resolution errors.
  webpack: (config: any) => {
    // Prevent bundling errors from optional 'electron' dependency inside translatte/got
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
    }
    return config
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
