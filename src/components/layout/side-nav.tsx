'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

function MaterialIcon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined text-lg ${className}`}>{name}</span>;
}

const SECTION_NAV: Record<string, NavSection[]> = {
  '/input': [
    {
      heading: 'People',
      items: [{ label: 'All People', href: '/input', icon: 'group' }],
    },
  ],
  '/team': [
    {
      heading: 'Team',
      items: [{ label: 'Overview', href: '/team', icon: 'group' }],
    },
  ],
  '/projects': [
    {
      heading: 'Projects',
      items: [{ label: 'All Projects', href: '/projects', icon: 'flag' }],
    },
  ],
  '/data': [
    {
      heading: 'Data',
      items: [{ label: 'Import', href: '/data', icon: 'description' }],
    },
  ],
  '/dashboard': [
    {
      heading: 'Dashboard',
      items: [{ label: 'Overview', href: '/dashboard', icon: 'bar_chart' }],
    },
  ],
  '/admin': [
    {
      heading: 'Reference Data',
      items: [
        { label: 'Disciplines', href: '/admin/disciplines', icon: 'category' },
        { label: 'Departments', href: '/admin/departments', icon: 'corporate_fare' },
        { label: 'Programs', href: '/admin/programs', icon: 'flag' },
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
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-sm">
          <span className="font-headline text-on-primary text-xs font-bold">NP</span>
        </div>
        <div>
          <p className="font-headline text-on-surface text-sm font-semibold tracking-tight">
            Resource Planner
          </p>
          <p className="text-outline text-[10px] tracking-widest uppercase">Nordic Precision</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-4">
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
                      className={`flex items-center gap-3 rounded-sm px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-surface-variant text-primary font-semibold'
                          : 'text-on-surface-variant hover:bg-surface-variant/50'
                      }`}
                    >
                      <MaterialIcon name={item.icon} className={isActive ? 'text-primary' : ''} />
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
      <div className="border-outline-variant/15 border-t p-4">
        <button
          type="button"
          className="bg-primary text-on-primary mb-6 flex w-full items-center justify-center gap-2 rounded-sm py-2.5 text-xs font-semibold hover:opacity-90"
        >
          <MaterialIcon name="add" className="text-on-primary !text-base" />
          New Entry
        </button>
        <div className="space-y-1">
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary flex items-center gap-2 px-1 text-xs transition-colors"
          >
            <MaterialIcon name="help_outline" className="!text-base" />
            Help
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary flex items-center gap-2 px-1 text-xs transition-colors"
          >
            <MaterialIcon name="archive" className="!text-base" />
            Archive
          </Link>
        </div>
      </div>
    </aside>
  );
}
