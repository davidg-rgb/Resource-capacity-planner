'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { AllocationTrendsChart } from '@/components/project-view/allocation-trends-chart';
import { DisciplineDistribution } from '@/components/project-view/discipline-distribution';
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

  // Derived stats
  const totalHours =
    data?.people.reduce(
      (sum, p) => sum + (data.months ?? []).reduce((ms, m) => ms + (p.months[m] ?? 0), 0),
      0,
    ) ?? 0;

  const uniqueDisciplines = [...new Set((data?.people ?? []).map((p) => p.discipline))];

  return (
    <>
      <Breadcrumbs />

      {/* Project Header */}
      <section className="py-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            {data?.programName && (
              <div className="mb-1 flex items-center gap-2">
                <span className="text-outline text-xs font-semibold tracking-widest uppercase">
                  Program
                </span>
                <span className="text-primary bg-primary-container rounded-sm px-2 py-0.5 text-xs font-bold">
                  {data.programName}
                </span>
              </div>
            )}
            <h1 className="font-headline text-on-surface text-4xl font-extrabold tracking-tight">
              {data?.projectName ?? 'Projektbemanning'}
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-2xl text-sm">
              Allokerade personer och timmar per manad
            </p>
          </div>

          {data && (
            <div className="flex gap-4">
              {/* Total Hours card */}
              <div className="bg-surface-container-lowest min-w-[160px] rounded-sm p-5 shadow-[0_4px_20px_-4px_rgba(42,52,55,0.06)]">
                <p className="text-outline mb-1 text-[10px] font-bold tracking-wider uppercase">
                  Totala Timmar
                </p>
                <p className="font-tabular text-on-surface text-2xl font-bold">
                  {totalHours.toLocaleString()}{' '}
                  <span className="text-outline text-sm font-medium">tim</span>
                </p>
              </div>

              {/* Assigned card */}
              <div className="bg-surface-container-lowest min-w-[160px] rounded-sm p-5 shadow-[0_4px_20px_-4px_rgba(42,52,55,0.06)]">
                <p className="text-outline mb-1 text-[10px] font-bold tracking-wider uppercase">
                  Tilldelade
                </p>
                <p className="font-tabular text-on-surface text-2xl font-bold">
                  {data.people.length}{' '}
                  <span className="text-outline text-sm font-medium">personer</span>
                </p>
              </div>

              {/* Disciplines card */}
              <div className="bg-surface-container-lowest min-w-[160px] rounded-sm p-5 shadow-[0_4px_20px_-4px_rgba(42,52,55,0.06)]">
                <p className="text-outline mb-1 text-[10px] font-bold tracking-wider uppercase">
                  Discipliner
                </p>
                <div className="mt-1 flex gap-1">
                  {uniqueDisciplines.map((d) => {
                    const color =
                      d === 'SW'
                        ? 'bg-primary'
                        : d === 'Mek'
                          ? 'bg-outline'
                          : d === 'Elnik'
                            ? 'bg-tertiary'
                            : 'bg-secondary';
                    return (
                      <span key={d} className={`${color} h-2.5 w-2.5 rounded-full`} title={d} />
                    );
                  })}
                </div>
                <p className="text-on-surface-variant mt-1 text-xs font-medium">
                  {uniqueDisciplines.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container mt-4 rounded-md p-3 text-sm">
          Kunde inte ladda projektbemanning: {error.message}
        </div>
      )}

      {data && (
        <section className="pb-12">
          {/* Data Grid */}
          <div className="bg-surface-container-lowest overflow-hidden rounded-sm border border-[#a9b4b7]/15">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="text-outline bg-surface-container-low sticky left-0 z-10 w-64 border-r border-[#a9b4b7]/10 px-6 py-4 text-[11px] font-bold tracking-wider uppercase">
                      Teammedlem
                    </th>
                    {data.months.map((m) => (
                      <th
                        key={m}
                        className="text-outline px-6 py-4 text-right text-[11px] font-bold tracking-wider whitespace-nowrap uppercase"
                      >
                        {formatMonthHeader(m)}
                      </th>
                    ))}
                    <th className="text-outline bg-primary/5 px-6 py-4 text-right text-[11px] font-bold tracking-wider uppercase">
                      Totalt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a9b4b7]/10">
                  <ProjectStaffingGrid people={data.people} months={data.months} />
                </tbody>
                <tfoot>
                  <ProjectSummaryRow people={data.people} months={data.months} />
                </tfoot>
              </table>
            </div>
          </div>

          {/* Visualization Panels */}
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <AllocationTrendsChart people={data.people} months={data.months} />
            <DisciplineDistribution people={data.people} months={data.months} />
          </div>
        </section>
      )}

      <div className="mt-6">
        <Link href="/projects" className="text-primary text-sm hover:underline">
          Tillbaka till projekt
        </Link>
      </div>
    </>
  );
}
