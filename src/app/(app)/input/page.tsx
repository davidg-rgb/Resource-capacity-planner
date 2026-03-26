import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function InputPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Person Input
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Select a person from the sidebar to view and edit their allocation grid.
      </p>
    </>
  );
}
