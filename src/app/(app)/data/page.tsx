import { Suspense } from 'react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { FlatTable } from '@/components/flat-table/flat-table';

export default function DataPage() {
  return (
    <>
      <Breadcrumbs />
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-headline text-on-surface text-3xl font-bold tracking-tight">
              Resursdata och export
            </h1>
            <p className="text-on-surface-variant font-body mt-1 text-sm">
              Granska och filtrera detaljerad allokeringsdata.
            </p>
          </div>
        </div>
      </div>

      {/* Flat table as primary content */}
      <Suspense
        fallback={
          <div className="text-on-surface-variant py-12 text-center text-sm">
            Laddar allokeringar...
          </div>
        }
      >
        <FlatTable />
      </Suspense>
    </>
  );
}
