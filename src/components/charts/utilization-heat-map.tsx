'use client';

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

interface DeptRow {
  department: string;
  values: number[];
}

const DEMO_DATA: DeptRow[] = [
  { department: 'Electronics', values: [94, 98, 91, 88, 78, 64] },
  { department: 'Drivetrain', values: [86, 89, 90, 85, 82, 76] },
  { department: 'Testing', values: [62, 58, 52, 28, 24, 18] },
  { department: 'Software', values: [92, 92, 91, 93, 90, 88] },
];

function getCellClasses(value: number): string {
  if (value > 95) return 'bg-error text-white';
  if (value >= 85) return 'bg-primary text-white';
  if (value >= 70) return 'bg-primary/60 text-white';
  if (value >= 60) return 'bg-primary/40 text-white';
  return 'bg-surface-container-high text-outline-variant';
}

export function UtilizationHeatMap() {
  return (
    <div className="bg-surface-container-lowest border-primary rounded-sm border-l-4 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="font-headline text-sm font-semibold">Departmental Utilization Heat Map</h4>
        <div className="text-outline flex items-center gap-4 text-[10px] font-medium">
          <div className="flex items-center gap-1">
            <div className="bg-surface-container-high h-2 w-2 rounded-full"></div>
            &lt; 60%
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-primary/40 h-2 w-2 rounded-full"></div>
            60-85%
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-primary h-2 w-2 rounded-full"></div>
            85-95%
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-error h-2 w-2 rounded-full"></div>
            &gt; 95%
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="font-body w-full text-left text-xs">
          <thead>
            <tr className="text-outline tracking-wider uppercase">
              <th className="pb-4 font-semibold">Department</th>
              {MONTHS.map((m) => (
                <th key={m} className="pb-4 text-center font-semibold">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-outline-variant/10 divide-y">
            {DEMO_DATA.map((row) => (
              <tr
                key={row.department}
                className="hover:bg-surface-container-low group transition-colors"
              >
                <td className="text-on-surface py-4 font-medium">{row.department}</td>
                {row.values.map((val, i) => (
                  <td key={i} className="p-2">
                    <div
                      className={`flex h-10 items-center justify-center rounded-sm text-xs font-bold tabular-nums ${getCellClasses(val)}`}
                    >
                      {val}%
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
