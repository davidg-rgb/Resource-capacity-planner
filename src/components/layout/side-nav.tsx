'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface NavItemDef {
  labelKey: string;
  href: string;
  icon: string;
}

interface NavSectionDef {
  headingKey?: string;
  items: NavItemDef[];
}

function MaterialIcon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined text-lg ${className}`}>{name}</span>;
}

const SECTION_NAV: Record<string, NavSectionDef[]> = {
  '/input': [
    {
      headingKey: 'staff',
      items: [{ labelKey: 'allStaff', href: '/input', icon: 'group' }],
    },
  ],
  '/team': [
    {
      headingKey: 'team',
      items: [{ labelKey: 'teamOverview', href: '/team', icon: 'group' }],
    },
  ],
  '/projects': [
    {
      headingKey: 'projects',
      items: [{ labelKey: 'allProjects', href: '/projects', icon: 'flag' }],
    },
  ],
  '/data': [
    {
      headingKey: 'data',
      items: [{ labelKey: 'export', href: '/data', icon: 'description' }],
    },
  ],
  '/dashboard': [
    {
      headingKey: 'overview',
      items: [
        { labelKey: 'kpiDashboard', href: '/dashboard', icon: 'bar_chart' },
        { labelKey: 'projectDashboard', href: '/dashboard/projects', icon: 'folder_open' },
        { labelKey: 'teamLoad', href: '/dashboard/team', icon: 'groups' },
      ],
    },
  ],
  '/scenarios': [
    {
      headingKey: 'scenarios',
      items: [{ labelKey: 'allScenarios', href: '/scenarios', icon: 'science' }],
    },
  ],
  '/admin': [
    {
      headingKey: 'referenceData',
      items: [
        { labelKey: 'disciplines', href: '/admin/disciplines', icon: 'category' },
        { labelKey: 'departments', href: '/admin/departments', icon: 'corporate_fare' },
        { labelKey: 'programs', href: '/admin/programs', icon: 'flag' },
      ],
    },
  ],
};

function getSectionKey(pathname: string): string {
  const match = pathname.match(/^\/([^/]+)/);
  return match ? `/${match[1]}` : '/dashboard';
}

export function SideNav() {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const sectionKey = getSectionKey(pathname);
  const sections = SECTION_NAV[sectionKey] ?? SECTION_NAV['/dashboard']!;

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
            {section.headingKey && (
              <p className="font-headline text-outline mb-2 px-3 text-xs font-semibold tracking-widest uppercase">
                {t(section.headingKey)}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/dashboard/team'
                    ? pathname.startsWith('/dashboard/team')
                    : item.href === '/dashboard/projects'
                      ? pathname.startsWith('/dashboard/projects')
                      : pathname === item.href;
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
                      {t(item.labelKey)}
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
          {t('newEntry')}
        </button>
        <div className="space-y-1">
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary flex items-center gap-2 px-1 text-xs transition-colors"
          >
            <MaterialIcon name="help_outline" className="!text-base" />
            {t('help')}
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary flex items-center gap-2 px-1 text-xs transition-colors"
          >
            <MaterialIcon name="archive" className="!text-base" />
            {t('archive')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
