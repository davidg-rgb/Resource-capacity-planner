'use client';

import Link from 'next/link';
import { FileInput, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function HeatMapActions() {
  const t = useTranslations('heatMap');
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/input"
        className="bg-primary text-on-primary inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
      >
        <FileInput size={14} />
        {t('planHours')}
      </Link>
      <Link
        href="/data"
        className="border-primary text-primary hover:bg-primary/5 inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors"
      >
        <Upload size={14} />
        {t('importFromExcel')}
      </Link>
    </div>
  );
}
