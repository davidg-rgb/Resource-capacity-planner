import { Suspense } from 'react';
import Link from 'next/link';
import { Upload, FileDown } from 'lucide-react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { FlatTable } from '@/components/flat-table/flat-table';

export default function DataPage() {
  return (
    <>
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-on-surface text-3xl font-bold tracking-tight">
            Data Management
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            View, filter, and export allocation data.
          </p>
        </div>
        {/* Action bar: Import + template downloads */}
        <div className="flex items-center gap-3">
          <Link
            href="/data/import"
            className="bg-primary text-on-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <a
            href="/api/import/templates?format=flat"
            download
            className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            Flat template
          </a>
          <a
            href="/api/import/templates?format=pivot"
            download
            className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            Pivot template
          </a>
        </div>
      </div>

      {/* Flat table as primary content */}
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="text-on-surface-variant py-12 text-center text-sm">
              Loading allocations...
            </div>
          }
        >
          <FlatTable />
        </Suspense>
      </div>
    </>
  );
}
