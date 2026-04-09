// Next.js 16 proxy file (was middleware.ts in Next.js 15)
// Clerk auth with platform admin route exclusion.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health(.*)',
  '/api/webhooks(.*)',
  '/platform(.*)',
  '/api/platform(.*)',
]);

export const proxy = clerkMiddleware(async (auth, request) => {
  // E2E bypass — ADR-004: personas are UX shortcuts, not security boundaries.
  // In NODE_ENV=test or with E2E_TEST=1, Playwright drives the app against an
  // ephemeral `nc_e2e` database with dummy data. Production never sets these
  // envs (enforced by ci.yml and vercel build environment), so this bypass
  // is unreachable in prod. Defense in depth: /api/test/seed (Plan 47-04)
  // has its own NODE_ENV=production throw at module import time.
  if (process.env.NODE_ENV === 'test' || process.env.E2E_TEST === '1') {
    return;
  }
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
