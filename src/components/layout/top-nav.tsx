'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  Search,
  Bell,
  Settings,
  FileInput,
  Users,
  FolderKanban,
  Database,
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  FlaskConical,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { AlertBadge } from '@/components/alerts/alert-badge';
import { PersonaSwitcher } from '@/components/persona/persona-switcher';
import { PendingWishChip } from '@/components/persona/pending-wish-chip';
import { NotificationBell } from '@/components/persona/notification-bell';
import { useFlags } from '@/features/flags/flag.context';
import type { FlagName } from '@/features/flags/flag.types';
import { usePersona } from '@/features/personas/persona.context';
import type { PersonaKind } from '@/features/personas/persona.types';

// v6.0 — Phase 53 / Plan 53-02 (POLISH-02 / D-03 LITERAL): NavItemDef extended
// with `visibleFor?: PersonaKind[]`. When `uiV6Polish=true`, items with
// `visibleFor` set are filtered out for personas not in the list. When the
// flag is OFF, `visibleFor` is a no-op (flag-off parity preserved).
interface NavItemDef {
  labelKey: string;
  descKey: string;
  href: string;
  icon: LucideIcon;
  flag?: FlagName;
  /** v6 Polish (D-03) — undefined = visible for all personas */
  visibleFor?: PersonaKind[];
}

const NAV_ITEMS: NavItemDef[] = [
  {
    labelKey: 'teamLoad',
    descKey: 'teamLoadDesc',
    href: '/dashboard/team',
    icon: LayoutDashboard,
    flag: 'dashboards',
    visibleFor: ['pm', 'line-manager', 'rd', 'admin'],
  },
  {
    labelKey: 'planHours',
    descKey: 'planHoursDesc',
    href: '/input',
    icon: FileInput,
    visibleFor: ['pm', 'line-manager', 'admin'],
  },
  {
    labelKey: 'projects',
    descKey: 'projectsDesc',
    href: '/projects',
    icon: FolderKanban,
    visibleFor: ['pm', 'line-manager', 'rd', 'admin'],
  },
  {
    labelKey: 'overview',
    descKey: 'overviewDesc',
    href: '/dashboard',
    icon: BarChart3,
    flag: 'dashboards',
    visibleFor: ['pm', 'line-manager', 'rd', 'admin'],
  },
  {
    labelKey: 'projectDashboard',
    descKey: 'projectDashboardDesc',
    href: '/dashboard/projects',
    icon: FolderKanban,
    flag: 'dashboards',
    visibleFor: ['pm', 'admin'],
  },
  {
    labelKey: 'scenarios',
    descKey: 'scenariosDesc',
    href: '/scenarios',
    icon: FlaskConical,
    flag: 'scenarios',
    visibleFor: ['admin'],
  },
  {
    labelKey: 'warnings',
    descKey: 'warningsDesc',
    href: '/alerts',
    icon: AlertTriangle,
    flag: 'alerts',
    visibleFor: ['line-manager', 'rd', 'admin'],
  },
  {
    labelKey: 'staff',
    descKey: 'staffDesc',
    href: '/team',
    icon: Users,
    visibleFor: ['admin'],
  },
  {
    labelKey: 'export',
    descKey: 'exportDesc',
    href: '/data',
    icon: Database,
    visibleFor: ['admin'],
  },
  {
    labelKey: 'admin',
    descKey: 'adminDesc',
    href: '/admin/disciplines',
    icon: ShieldCheck,
    visibleFor: ['admin'],
  },
  {
    labelKey: 'members',
    descKey: 'membersDesc',
    href: '/admin/members',
    icon: Users,
    visibleFor: ['admin'],
  },
  // v6.0 Phase 53-02 (POLISH-02 / D-03): Help nav item — visible for ALL
  // personas (no visibleFor). labelKey/descKey are fully-qualified so we can
  // pull them from the flag-scoped v6.polish.nav namespace without
  // duplicating under the root `nav` namespace (Plan 01 Task 2 registered
  // `v6.polish.nav.help` + `v6.polish.nav.helpDesc`).
  {
    labelKey: 'v6.polish.nav.help',
    descKey: 'v6.polish.nav.helpDesc',
    href: '/help',
    icon: HelpCircle,
  },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const flags = useFlags();
  const { persona } = usePersona();
  const t = useTranslations('nav');
  const tRoot = useTranslations();
  const tc = useTranslations('common');
  // v6.0 Phase 53-02 (POLISH-02): flag-gated visibleFor filter.
  // Order is load-bearing: flag gate precedes visibleFor — disabling the
  // `dashboards` feature flag MUST hide dashboard items even for admin
  // (POLISH-02 test 7). When `uiV6Polish=false`, visibleFor is a no-op
  // and the filter collapses to the legacy expression.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.flag && !flags[item.flag]) return false;
    if (flags.uiV6Polish && item.visibleFor && !item.visibleFor.includes(persona.kind)) {
      return false;
    }
    return true;
  });

  // v6.0 Phase 53-02 (POLISH-02): Help item labelKey/descKey are
  // fully-qualified (`v6.polish.nav.help`) to avoid polluting the root `nav`
  // namespace. All other items use the short `nav.*` key. These helpers
  // dispatch based on whether the key contains a dot.
  function label(key: string): string {
    return key.includes('.') ? tRoot(key) : t(key);
  }
  function desc(key: string): string {
    return key.includes('.') ? tRoot(key) : t(key);
  }

  // Precise active detection: /dashboard/team and /dashboard/projects must not match /dashboard
  function isNavActive(href: string): boolean {
    if (href === '/dashboard/team') return pathname.startsWith('/dashboard/team');
    if (href === '/dashboard/projects') return pathname.startsWith('/dashboard/projects');
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/scenarios') return pathname.startsWith('/scenarios');
    return pathname.startsWith(href);
  }

  return (
    <>
      <header className="border-outline-variant/15 bg-surface sticky top-0 z-50 flex h-14 items-center border-b px-4 md:px-6">
        {/* Left: Hamburger (mobile) + App title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={mobileMenuOpen ? tc('closeMenu') : tc('openMenu')}
            className="text-on-surface-variant hover:bg-surface-container-high rounded-sm p-1.5 lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            href="/"
            className="font-headline text-primary text-xl font-semibold tracking-tighter"
          >
            Nordic Capacity
          </Link>
        </div>

        {/* Center: Nav items — hidden below lg */}
        <nav className="ml-12 hidden items-center gap-6 lg:flex">
          {visibleItems.map((item) => {
            const isActive = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={desc(item.descKey)}
                className={`font-headline text-sm tracking-tight transition-colors ${
                  isActive
                    ? 'border-primary text-primary border-b-2 pb-1 font-bold'
                    : 'hover:text-primary text-on-surface-variant'
                }`}
              >
                {label(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search (hidden on small), notifications, settings, user */}
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search size={14} className="text-outline absolute top-1/2 left-3 -translate-y-1/2" />
            <input
              type="text"
              placeholder={tc('search')}
              className="bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-primary w-64 rounded-sm py-1.5 pr-4 pl-9 text-xs focus:ring-1 focus:outline-none"
            />
          </div>
          {/* v6.0 Phase 53-02 (POLISH-01): flag-gated mutual exclusion —
              when uiV6Polish=true, NotificationBell owns the bell slot
              (persona-scoped + badges); when OFF, the legacy Phase 52 link
              renders unchanged (flag-off parity). */}
          {flags.uiV6Polish ? (
            <NotificationBell />
          ) : (
            flags.alerts && (
              <Link
                href="/alerts"
                aria-label={tc('capacityAlerts')}
                title={tc('capacityAlerts')}
                className="text-on-surface-variant hover:bg-surface-container-low relative rounded-full p-2"
              >
                <Bell size={18} />
                <AlertBadge />
              </Link>
            )
          )}
          {/* v6.0 Phase 52 Plan 03 (PM-02): chip renders itself conditionally
              on uiV6PerJourney + PM persona + pending|rejected counts > 0. */}
          <PendingWishChip />
          <button
            type="button"
            aria-label={tc('settings')}
            title={tc('settings')}
            className="text-on-surface-variant hover:bg-surface-container-low hidden rounded-full p-2 sm:block"
          >
            <Settings size={18} />
          </button>
          <PersonaSwitcher />
          <UserButton />
        </div>
      </header>

      {/* Mobile menu overlay — visible below lg when open */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav className="border-outline-variant/15 bg-surface relative z-10 flex max-h-[calc(100vh-3.5rem)] w-72 flex-col overflow-y-auto border-r shadow-lg">
            {/* Search (shown in mobile drawer) */}
            <div className="border-outline-variant/15 border-b p-4 md:hidden">
              <div className="relative">
                <Search
                  size={14}
                  className="text-outline absolute top-1/2 left-3 -translate-y-1/2"
                />
                <input
                  type="text"
                  placeholder={tc('search')}
                  className="bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-primary w-full rounded-sm py-1.5 pr-4 pl-9 text-xs focus:ring-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 space-y-1 p-3">
              {visibleItems.map((item) => {
                const isActive = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-surface-container-high text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-primary'
                    }`}
                  >
                    <Icon size={18} />
                    <div>
                      <span className="block">{label(item.labelKey)}</span>
                      <span className="text-outline block text-[11px] font-normal">
                        {desc(item.descKey)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
