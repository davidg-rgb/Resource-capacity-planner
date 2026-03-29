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
  ShieldCheck,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { AlertBadge } from '@/components/alerts/alert-badge';
import { useFlags } from '@/features/flags/flag.context';
import type { FlagName } from '@/features/flags/flag.types';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  flag?: FlagName;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Input', href: '/input', icon: FileInput },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Data', href: '/data', icon: Database },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, flag: 'dashboards' },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle, flag: 'alerts' },
  { label: 'Admin', href: '/admin/disciplines', icon: ShieldCheck },
  { label: 'Members', href: '/admin/members', icon: Users },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const flags = useFlags();
  const visibleItems = NAV_ITEMS.filter((item) => !item.flag || flags[item.flag]);

  return (
    <>
      <header className="border-outline-variant/15 bg-surface sticky top-0 z-50 flex h-14 items-center border-b px-4 md:px-6">
        {/* Left: Hamburger (mobile) + App title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="text-on-surface-variant hover:bg-surface-container-high rounded-sm p-1.5 lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            href="/input"
            className="font-headline text-primary text-xl font-semibold tracking-tighter"
          >
            Nordic Capacity
          </Link>
        </div>

        {/* Center: Nav items — hidden below lg */}
        <nav className="ml-12 hidden items-center gap-6 lg:flex">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-headline text-sm tracking-tight transition-colors ${
                  isActive
                    ? 'border-primary text-primary border-b-2 pb-1 font-bold'
                    : 'hover:text-primary text-slate-500'
                }`}
              >
                {item.label}
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
              placeholder="Global Search"
              className="bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-primary w-64 rounded-sm py-1.5 pr-4 pl-9 text-xs focus:ring-1 focus:outline-none"
            />
          </div>
          {flags.alerts && (
            <Link
              href="/alerts"
              aria-label="Capacity alerts"
              title="Capacity alerts"
              className="text-on-surface-variant hover:bg-surface-container-low relative rounded-full p-2"
            >
              <Bell size={18} />
              <AlertBadge />
            </Link>
          )}
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
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
                  placeholder="Global Search"
                  className="bg-surface-container-low text-on-surface placeholder:text-outline focus:ring-primary w-full rounded-sm py-1.5 pr-4 pl-9 text-xs focus:ring-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 space-y-1 p-3">
              {visibleItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
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
                    {item.label}
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
