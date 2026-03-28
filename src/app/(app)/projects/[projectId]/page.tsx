'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ProjectStaffingGrid } from '@/components/project-view/project-staffing-grid';
import { ProjectSummaryRow } from '@/components/project-view/project-summary-row';
import { useProjectStaffing } from '@/hooks/use-project-staffing';
import { getCurrentMonth, generateMonthRange, formatMonthHeader } from '@/lib/date-utils';

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const monthFrom = getCurrentMonth();
  const monthRange = generateMonthRange(monthFrom, 12);
  const monthTo = monthRange[monthRange.length - 1];

  const { data, isLoading, error } = useProjectStaffing(projectId, monthFrom, monthTo);

  return (
    <>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="font-headline text-on-surface text-3xl font-semibold tracking-tight">
          {data?.projectName ?? 'Project Staffing'}
        </h1>
        <p className="text-on-surface-variant mt-1 text-sm">Allocated people and hours per month</p>
      </div>

      {isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container mt-4 rounded-md p-3 text-sm">
          Failed to load project staffing: {error.message}
        </div>
      )}

      {data && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-outline-variant text-on-surface-variant border-b">
                <th className="font-headline px-3 py-2 font-medium">Person</th>
                {data.months.map((m) => (
                  <th
                    key={m}
                    className="font-headline text-on-surface-variant px-2 py-2 text-center font-medium whitespace-nowrap"
                  >
                    {formatMonthHeader(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-outline-variant divide-y">
              <ProjectStaffingGrid people={data.people} months={data.months} />
            </tbody>
            <tfoot>
              <ProjectSummaryRow people={data.people} months={data.months} />
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link href="/projects" className="text-primary text-sm hover:underline">
          Back to Projects
        </Link>
      </div>
    </>
  );
}
