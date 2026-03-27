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
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Input', href: '/input', icon: FileInput },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Data', href: '/data', icon: Database },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Admin', href: '/admin/disciplines', icon: ShieldCheck },
  { label: 'Members', href: '/admin/members', icon: Users },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-outline-variant/15 bg-surface px-4 md:px-6">
        {/* Left: Hamburger (mobile) + App title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container-high lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/input" className="font-headline text-2xl font-semibold tracking-tighter text-primary">
            Nordic Capacity
          </Link>
        </div>

        {/* Center: Nav items — hidden below lg */}
        <nav className="ml-12 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-4 font-headline text-sm tracking-tight transition-colors ${
                  isActive
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-primary'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search (hidden on small), notifications, settings, user */}
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-sm bg-surface-container-low py-1.5 pl-9 pr-4 text-xs text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container-high"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            className="hidden rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container-high sm:block"
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
          <nav className="relative z-10 flex max-h-[calc(100vh-3.5rem)] w-72 flex-col overflow-y-auto border-r border-outline-variant/15 bg-surface shadow-lg">
            {/* Search (shown in mobile drawer) */}
            <div className="border-b border-outline-variant/15 p-4 md:hidden">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-sm bg-surface-container-low py-1.5 pl-9 pr-4 text-xs text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-surface-container-high font-semibold text-primary'
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
