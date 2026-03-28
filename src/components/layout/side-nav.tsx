'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const SECTION_NAV: Record<string, NavSection[]> = {
  '/input': [
    {
      heading: 'People',
      items: [{ label: 'All People', href: '/input' }],
    },
  ],
  '/team': [
    {
      heading: 'Team',
      items: [{ label: 'Overview', href: '/team' }],
    },
  ],
  '/projects': [
    {
      heading: 'Projects',
      items: [{ label: 'All Projects', href: '/projects' }],
    },
  ],
  '/data': [
    {
      heading: 'Data',
      items: [{ label: 'Import', href: '/data' }],
    },
  ],
  '/dashboard': [
    {
      heading: 'Dashboard',
      items: [{ label: 'Overview', href: '/dashboard' }],
    },
  ],
  '/admin': [
    {
      heading: 'Reference Data',
      items: [
        { label: 'Disciplines', href: '/admin/disciplines' },
        { label: 'Departments', href: '/admin/departments' },
        { label: 'Programs', href: '/admin/programs' },
      ],
    },
  ],
};

function getSectionKey(pathname: string): string {
  const match = pathname.match(/^\/([^/]+)/);
  return match ? `/${match[1]}` : '/input';
}

export function SideNav() {
  const pathname = usePathname();
  const sectionKey = getSectionKey(pathname);
  const sections = SECTION_NAV[sectionKey] ?? SECTION_NAV['/input']!;

  return (
    <aside className="border-outline-variant/15 bg-surface-container-low fixed top-14 left-0 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-sm">
          <LayoutDashboard size={16} className="text-on-primary" />
        </div>
        <div>
          <p className="font-headline text-on-surface text-sm font-semibold tracking-tight">
            Resource Planner
          </p>
          <p className="text-on-surface-variant text-xs">Nordic Precision</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            {section.heading && (
              <p className="font-headline text-outline mb-2 px-3 text-xs font-semibold tracking-widest uppercase">
                {section.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-sm px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-surface-container-high text-primary font-semibold'
                          : 'text-on-surface-variant hover:bg-surface-container-high/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-outline-variant/15 border-t p-3">
        <button
          type="button"
          className="bg-primary text-on-primary w-full rounded-sm px-4 py-2 text-xs font-semibold hover:opacity-90"
        >
          New Entry
        </button>
      </div>
    </aside>
  );
}
