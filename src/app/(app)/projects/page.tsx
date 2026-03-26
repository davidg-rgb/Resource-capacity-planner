import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function ProjectsPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
        Projects
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Manage projects and programs across your organization.
      </p>
    </>
  );
}
