'use client';

import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-on-surface-variant">
      {segments.map((segment, i) => (
        <span key={segment}>
          {i > 0 && <span className="mx-1">/</span>}
          <span className="capitalize">{segment}</span>
        </span>
      ))}
    </nav>
  );
}
