'use client';

import Link from 'next/link';
import { FileInput, Upload } from 'lucide-react';

export function HeatMapActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/input"
        className="bg-primary text-on-primary inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
      >
        <FileInput size={14} />
        Planera timmar
      </Link>
      <Link
        href="/data"
        className="border-primary text-primary hover:bg-primary/5 inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors"
      >
        <Upload size={14} />
        Importera från Excel
      </Link>
    </div>
  );
}
