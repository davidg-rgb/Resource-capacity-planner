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
      items: [
        { label: 'All People', href: '/input' },
      ],
    },
  ],
  '/team': [
    {
      heading: 'Team',
      items: [
        { label: 'Overview', href: '/team' },
      ],
    },
  ],
  '/projects': [
    {
      heading: 'Projects',
      items: [
        { label: 'All Projects', href: '/projects' },
      ],
    },
  ],
  '/data': [
    {
      heading: 'Data',
      items: [
        { label: 'Import', href: '/data' },
      ],
    },
  ],
  '/dashboard': [
    {
      heading: 'Dashboard',
      items: [
        { label: 'Overview', href: '/dashboard' },
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
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-outline-variant/15 bg-surface-container-low">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
          <LayoutDashboard size={16} className="text-on-primary" />
        </div>
        <div>
          <p className="font-headline text-sm font-semibold tracking-tight text-on-surface">
            Resource Planner
          </p>
          <p className="text-xs text-on-surface-variant">Nordic Precision</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            {section.heading && (
              <p className="mb-2 px-3 font-headline text-xs font-semibold uppercase tracking-widest text-outline">
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
                          ? 'bg-surface-container-high font-semibold text-primary'
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
      <div className="border-t border-outline-variant/15 p-3">
        <button
          type="button"
          className="w-full rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90"
        >
          New Entry
        </button>
      </div>
    </aside>
  );
}
