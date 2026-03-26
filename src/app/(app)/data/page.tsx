import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function DataPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Data Management
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Import, export, and manage allocation data.
      </p>
    </>
  );
}
