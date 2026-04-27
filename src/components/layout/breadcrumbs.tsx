'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePersona } from '@/features/personas/persona.context';
import { useFlags } from '@/features/flags/flag.context';
import { getLandingRoute } from '@/features/personas/persona.routes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumbs() {
  const pathname = usePathname();
  const flags = useFlags();
  const { persona } = usePersona();
  // Filter out UUID segments (shown contextually by the page instead)
  const segments = pathname.split('/').filter((s) => s && !UUID_RE.test(s));

  const showHome = flags.uiV6Landing;
  const homeHref = showHome ? getLandingRoute(persona) : undefined;

  // CONS-P0-03 / D-CR-06: empty pathname (`/`) renders a bare Home anchor when
  // flag is OFF too — previously the nav rendered empty.
  const showBareHome = !showHome && segments.length === 0;

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-outline mb-4 flex items-center gap-2 text-xs font-medium"
    >
      {showHome && (
        <>
          <Link href={homeHref!} className="hover:text-primary capitalize">
            Home
          </Link>
          {segments.length > 0 && (
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          )}
        </>
      )}
      {showBareHome && (
        <Link href="/" className="hover:text-primary capitalize">
          Home
        </Link>
      )}
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const href = '/' + segments.slice(0, i + 1).join('/');
        // CONS-P0-03 / D-CR-06: key includes index to avoid React duplicate-key
        // collisions on paths with repeated segments (e.g. /admin/admin).
        return (
          <span key={`${i}-${segment}`} className="flex items-center gap-2">
            {i > 0 && <span className="material-symbols-outlined text-sm">chevron_right</span>}
            {isLast ? (
              <span className="text-on-surface capitalize">{segment.replace(/-/g, ' ')}</span>
            ) : (
              <Link href={href} className="hover:text-primary capitalize">
                {segment.replace(/-/g, ' ')}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
