'use client';

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
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Input', href: '/input', icon: FileInput },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Data', href: '/data', icon: Database },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-outline-variant/15 bg-surface px-6">
      {/* Left: App title */}
      <Link href="/input" className="font-headline text-2xl font-semibold tracking-tighter text-primary">
        Nordic Capacity
      </Link>

      {/* Center: Nav items */}
      <nav className="ml-12 flex items-center gap-1">
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

      {/* Right: Search, notifications, settings, user */}
      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
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
          className="rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container-high"
        >
          <Settings size={18} />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
