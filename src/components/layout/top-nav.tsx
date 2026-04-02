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
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { AlertBadge } from '@/components/alerts/alert-badge';
import { useFlags } from '@/features/flags/flag.context';
import type { FlagName } from '@/features/flags/flag.types';

interface NavItemDef {
  labelKey: string;
  descKey: string;
  href: string;
  icon: LucideIcon;
  flag?: FlagName;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    labelKey: 'teamLoad',
    descKey: 'teamLoadDesc',
    href: '/dashboard/team',
    icon: LayoutDashboard,
    flag: 'dashboards',
  },
  { labelKey: 'planHours', descKey: 'planHoursDesc', href: '/input', icon: FileInput },
  { labelKey: 'projects', descKey: 'projectsDesc', href: '/projects', icon: FolderKanban },
  {
    labelKey: 'overview',
    descKey: 'overviewDesc',
    href: '/dashboard',
    icon: BarChart3,
    flag: 'dashboards',
  },
  {
    labelKey: 'projectDashboard',
    descKey: 'projectDashboardDesc',
    href: '/dashboard/projects',
    icon: FolderKanban,
    flag: 'dashboards',
  },
  {
    labelKey: 'scenarios',
    descKey: 'scenariosDesc',
    href: '/scenarios',
    icon: FlaskConical,
    flag: 'scenarios',
  },
  {
    labelKey: 'warnings',
    descKey: 'warningsDesc',
    href: '/alerts',
    icon: AlertTriangle,
    flag: 'alerts',
  },
  { labelKey: 'staff', descKey: 'staffDesc', href: '/team', icon: Users },
  { labelKey: 'export', descKey: 'exportDesc', href: '/data', icon: Database },
  { labelKey: 'admin', descKey: 'adminDesc', href: '/admin/disciplines', icon: ShieldCheck },
  { labelKey: 'members', descKey: 'membersDesc', href: '/admin/members', icon: Users },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const flags = useFlags();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const visibleItems = NAV_ITEMS.filter((item) => !item.flag || flags[item.flag]);

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
                title={t(item.descKey)}
                className={`font-headline text-sm tracking-tight transition-colors ${
                  isActive
                    ? 'border-primary text-primary border-b-2 pb-1 font-bold'
                    : 'hover:text-primary text-on-surface-variant'
                }`}
              >
                {t(item.labelKey)}
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
          {flags.alerts && (
            <Link
              href="/alerts"
              aria-label={tc('capacityAlerts')}
              title={tc('capacityAlerts')}
              className="text-on-surface-variant hover:bg-surface-container-low relative rounded-full p-2"
            >
              <Bell size={18} />
              <AlertBadge />
            </Link>
          )}
          <button
            type="button"
            aria-label={tc('settings')}
            title={tc('settings')}
            className="text-on-surface-variant hover:bg-surface-container-low hidden rounded-full p-2 sm:block"
          >
            <Settings size={18} />
          </button>
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
                      <span className="block">{t(item.labelKey)}</span>
                      <span className="text-outline block text-[11px] font-normal">
                        {t(item.descKey)}
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
