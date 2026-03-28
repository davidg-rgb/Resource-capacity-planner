import Link from 'next/link';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}

export function KPICard({ title, value, subtitle, href }: KPICardProps) {
  const content = (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-6">
      <p className="font-headline text-xs font-semibold uppercase tracking-widest text-outline">
        {title}
      </p>
      <p className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-shadow hover:shadow-md">
      {content}
    </Link>
  ) : (
    content
  );
}
