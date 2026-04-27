import './src/lib/env.ts';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // audit-r1 / D-CR-16: /team, /projects targets are mid-rollout per the
      // v6.0 nav plan — keep them as 307 (permanent: false) so search
      // engines and CDN caches don't pin the destination prematurely.
      // /wishes is stable — keep 308.
      { source: '/team', destination: '/admin/people', permanent: false },
      { source: '/team/:path*', destination: '/admin/people/:path*', permanent: false },
      { source: '/projects', destination: '/admin/projects', permanent: false },
      { source: '/wishes', destination: '/pm/wishes', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
