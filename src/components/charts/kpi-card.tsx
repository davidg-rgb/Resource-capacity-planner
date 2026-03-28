import Link from 'next/link';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
}

export function KPICard({ title, value, subtitle, href }: KPICardProps) {
  const content = (
    <div className="border-outline-variant/30 bg-surface-container-low rounded-lg border p-6">
      <p className="font-headline text-outline text-xs font-semibold tracking-widest uppercase">
        {title}
      </p>
      <p className="font-headline text-on-surface mt-2 text-3xl font-bold tracking-tight">
        {value}
      </p>
      {subtitle && <p className="text-on-surface-variant mt-1 text-sm">{subtitle}</p>}
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
