'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTION_LABELS: Record<string, string> = {
  input: 'Input',
  team: 'Team',
  projects: 'Projects',
  data: 'Data',
  dashboard: 'Dashboard',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = SECTION_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && <span className="text-outline">/</span>}
            {item.isLast ? (
              <span className="text-primary">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-outline hover:text-primary">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
