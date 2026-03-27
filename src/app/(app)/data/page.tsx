import Link from 'next/link';
import { Upload, FileDown } from 'lucide-react';

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

      <div className="mt-6 flex flex-col gap-6">
        {/* Import action */}
        <div className="flex items-start gap-4">
          <Link
            href="/data/import"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Import data
          </Link>
        </div>

        {/* Template downloads */}
        <div>
          <h2 className="text-sm font-medium text-on-surface">Download templates</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Use these templates to prepare your data for import.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <a
              href="/api/import/templates?format=flat"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              <FileDown className="h-3.5 w-3.5" />
              Flat format (.xlsx)
            </a>
            <a
              href="/api/import/templates?format=pivot"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              <FileDown className="h-3.5 w-3.5" />
              Pivot format (.xlsx)
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
