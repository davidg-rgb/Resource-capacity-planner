import Link from 'next/link';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  badge?: string;
  variant?: 'primary' | 'error' | 'outline';
}

const BORDER_VARIANT: Record<string, string> = {
  primary: 'border-primary/10',
  error: 'border-error/20',
  outline: 'border-outline/20',
};

export function KPICard({
  title,
  value,
  subtitle,
  href,
  badge,
  variant = 'primary',
}: KPICardProps) {
  const borderClass = BORDER_VARIANT[variant] ?? BORDER_VARIANT.primary;

  const content = (
    <div
      className={`bg-surface-container-lowest flex flex-col justify-between rounded-sm border-b-2 p-6 ${borderClass}`}
    >
      <span className="font-body text-outline-variant text-xs font-semibold tracking-wider uppercase">
        {title}
      </span>
      <div className="mt-4 flex items-end justify-between">
        <span
          className={`font-headline text-3xl leading-none font-bold tabular-nums ${
            variant === 'error'
              ? 'text-error'
              : variant === 'outline'
                ? 'text-on-surface-variant'
                : 'text-primary'
          }`}
        >
          {value}
        </span>
        {badge && (
          <span
            className={
              variant === 'error'
                ? 'bg-error-container/20 text-error rounded-full px-2 py-0.5 text-[10px]'
                : 'bg-secondary-container text-on-secondary-fixed rounded-full px-2 py-0.5 text-[10px]'
            }
          >
            {badge}
          </span>
        )}
        {!badge && subtitle && (
          <span className="text-on-secondary-container text-[10px] font-medium">{subtitle}</span>
        )}
      </div>
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
