'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePersona } from '@/features/personas/persona.context';
import { useFlags } from '@/features/flags/flag.context';
import type { PersonaKind } from '@/features/personas/persona.types';

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

/* ── Legacy route-based nav (flag off) ───────────────────────────── */

const LEGACY_SECTION_NAV: Record<string, NavSectionDef[]> = {
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

/* ── Persona-keyed nav (uiV6Landing flag on) ─────────────────────── */

export const PERSONA_SECTION_NAV: Record<PersonaKind, NavSectionDef[]> = {
  pm: [
    {
      headingKey: 'personaSections.pm',
      items: [
        { labelKey: 'personaSections.pmHome', href: '/pm', icon: 'home' },
        { labelKey: 'personaSections.pmProjects', href: '/pm/projects', icon: 'folder_open' },
        { labelKey: 'personaSections.pmWishes', href: '/pm/wishes', icon: 'star' },
      ],
    },
  ],
  'line-manager': [
    {
      headingKey: 'personaSections.lineManager',
      items: [
        { labelKey: 'personaSections.lmOverview', href: '/line-manager', icon: 'dashboard' },
        {
          labelKey: 'personaSections.lmTimeline',
          href: '/line-manager/timeline',
          icon: 'calendar_month',
        },
        {
          labelKey: 'personaSections.lmApprovalQueue',
          href: '/line-manager/approval-queue',
          icon: 'task_alt',
        },
        {
          labelKey: 'personaSections.lmImportActuals',
          href: '/line-manager/import-actuals',
          icon: 'upload_file',
        },
      ],
    },
  ],
  staff: [
    {
      headingKey: 'personaSections.staff',
      items: [{ labelKey: 'personaSections.staffSchedule', href: '/staff', icon: 'event_note' }],
    },
  ],
  rd: [
    {
      headingKey: 'personaSections.rd',
      items: [
        { labelKey: 'personaSections.rdPortfolio', href: '/rd', icon: 'analytics' },
        { labelKey: 'personaSections.rdAlerts', href: '/alerts', icon: 'warning' },
      ],
    },
  ],
  admin: [
    {
      headingKey: 'personaSections.adminMain',
      items: [
        { labelKey: 'personaSections.changeLog', href: '/admin', icon: 'history' },
        { labelKey: 'personaSections.adminPeople', href: '/admin/people', icon: 'group' },
        { labelKey: 'personaSections.adminProjects', href: '/admin/projects', icon: 'flag' },
        // v6.0 audit-r2 / R2-P1-09 (P1-101 / K12): Members relocated from
        // top-nav (where it duplicated /admin/people surface) into the admin
        // sidebar's referenceData group, matching UI-RESTRUCTURE-PLAN-v2.md
        // K12: "top-nav removes Medlemmar; moves to admin sidebar".
        { labelKey: 'referenceData', href: '/admin/disciplines', icon: 'category' },
        { labelKey: 'departments', href: '/admin/departments', icon: 'corporate_fare' },
        { labelKey: 'programs', href: '/admin/programs', icon: 'flag' },
        { labelKey: 'personaSections.adminMembers', href: '/admin/members', icon: 'badge' },
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
  const tShell = useTranslations('appShell');
  const flags = useFlags();
  const { persona } = usePersona();

  // Dual-mode: persona-keyed when flag on, route-based when off (per D-04)
  let sections: NavSectionDef[];
  if (flags.uiV6Landing) {
    sections = PERSONA_SECTION_NAV[persona.kind] ?? PERSONA_SECTION_NAV['admin'];
  } else {
    const sectionKey = getSectionKey(pathname);
    sections = LEGACY_SECTION_NAV[sectionKey] ?? LEGACY_SECTION_NAV['/dashboard']!;
  }

  return (
    <aside className="border-outline-variant/15 bg-surface-container-low fixed top-14 left-0 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-sm">
          <span className="font-headline text-on-primary text-xs font-bold">NP</span>
        </div>
        <div>
          <p className="font-headline text-on-surface text-sm font-semibold tracking-tight">
            {tShell('brand')}
          </p>
          <p className="text-outline text-[10px] tracking-widest uppercase">
            {tShell('designSystem')}
          </p>
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
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'));
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

      {/* Footer — R2-P1-03 (D-CR-104): removed dead "New Entry" button (no
          onClick / no form context) and "Archive" link (no /archive route
          exists; misleading affordance). "Help" link now points at the real
          /help route instead of href="#" (which Next treats as a same-page
          anchor and dirties history). */}
      <div className="border-outline-variant/15 border-t p-4">
        <div className="space-y-1">
          <Link
            href="/help"
            className="text-on-surface-variant hover:text-primary flex items-center gap-2 px-1 text-xs transition-colors"
          >
            <MaterialIcon name="help_outline" className="!text-base" />
            {t('help')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
