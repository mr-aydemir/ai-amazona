import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // `standalone` is only needed for the Docker/Cloud Run image; Vercel builds its own output.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
  // Runtime files read via fs at process.cwd() must be traced into the standalone build.
  outputFileTracingIncludes: {
    '/**': ['./src/emails/**/*', './public/images/etbis-logo.png', './public/images/etbis-text.png'],
  },

  // The query compiler is used instead of the native Prisma engine; keep engine
  // binaries and the Prisma CLI out of every serverless function bundle.
  outputFileTracingExcludes: {
    '/**': [
      'node_modules/@prisma/engines/**',
      'node_modules/prisma/**',
      'node_modules/.prisma/client/query-engine-*',
      'node_modules/.prisma/client/libquery_engine-*',
      'node_modules/.prisma/client/schema-engine-*',
      'node_modules/.prisma/client/*.tmp*',
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
