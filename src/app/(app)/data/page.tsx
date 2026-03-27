import Link from 'next/link';
import { Upload, FileDown } from 'lucide-react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default function DataPage() {
  return (
    <>
      <Breadcrumbs />
      <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
        Data Management
      </h1>
      <p className="text-on-surface-variant mt-2 text-sm">
        Import, export, and manage allocation data.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {/* Import action */}
        <div className="flex items-start gap-4">
          <Link
            href="/data/import"
            className="bg-primary text-on-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import data
          </Link>
        </div>

        {/* Template downloads */}
        <div>
          <h2 className="text-on-surface text-sm font-medium">Download templates</h2>
          <p className="text-on-surface-variant mt-1 text-xs">
            Use these templates to prepare your data for import.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <a
              href="/api/import/templates?format=flat"
              download
              className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              Flat format (.xlsx)
            </a>
            <a
              href="/api/import/templates?format=pivot"
              download
              className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
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
