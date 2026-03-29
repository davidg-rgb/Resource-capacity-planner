'use client';

import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-outline mb-4 flex items-center gap-2 text-xs font-medium"
    >
      {segments.map((segment, i) => (
        <span key={segment} className="flex items-center gap-2">
          {i > 0 && <span className="material-symbols-outlined text-sm">chevron_right</span>}
          <span
            className={
              i === segments.length - 1
                ? 'text-on-surface capitalize'
                : 'hover:text-primary cursor-pointer capitalize'
            }
          >
            {segment.replace(/-/g, ' ')}
          </span>
        </span>
      ))}
    </nav>
  );
}
