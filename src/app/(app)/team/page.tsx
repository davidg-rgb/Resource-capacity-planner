import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function TeamPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Team Overview
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        View team capacity across all departments and disciplines.
      </p>
    </>
  );
}
