import './src/lib/env.ts';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/team', destination: '/admin/people', permanent: true },
      { source: '/team/:path*', destination: '/admin/people/:path*', permanent: true },
      { source: '/projects', destination: '/admin/projects', permanent: true },
      { source: '/wishes', destination: '/pm/wishes', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
