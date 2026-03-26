import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function DashboardPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Key capacity metrics and departmental overview.
      </p>
    </>
  );
}
