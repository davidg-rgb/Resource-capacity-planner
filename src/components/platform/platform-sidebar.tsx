'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Users,
} from 'lucide-react';

interface PlatformSidebarProps {
  adminName?: string;
  adminEmail?: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  { label: 'Tenants', href: '/platform/tenants', icon: Building2 },
  { label: 'Subscriptions', href: '/platform/subscriptions', icon: CreditCard },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Audit Log', href: '/platform/audit', icon: FileText },
  { label: 'Announcements', href: '/platform/announcements', icon: Megaphone },
] as const;

export function PlatformSidebar({ adminName, adminEmail }: PlatformSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string): boolean {
    if (href === '/platform') return pathname === '/platform';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await fetch('/api/platform/auth/logout', { method: 'POST' });
    router.push('/platform/login');
  }

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-4 py-5">
        <h1 className="font-headline text-lg font-semibold tracking-tight">Platform Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        {adminName && (
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-white">{adminName}</p>
            {adminEmail && (
              <p className="truncate text-xs text-slate-400">{adminEmail}</p>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
