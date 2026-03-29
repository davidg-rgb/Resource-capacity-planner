'use client';

interface Discipline {
  name: string;
  label: string;
  percent: number;
  available: number;
  assigned: number;
  dotColor: string;
  barColor: string;
}

const DEMO_DATA: Discipline[] = [
  {
    name: 'SW',
    label: 'SW (Software)',
    percent: 91,
    available: 84,
    assigned: 76.4,
    dotColor: 'bg-primary',
    barColor: 'bg-primary',
  },
  {
    name: 'HW',
    label: 'HW (Hardware)',
    percent: 97,
    available: 52,
    assigned: 50.4,
    dotColor: 'bg-error',
    barColor: 'bg-error',
  },
  {
    name: 'Mek',
    label: 'Mek (Mechanical)',
    percent: 64,
    available: 68,
    assigned: 43.5,
    dotColor: 'bg-outline',
    barColor: 'bg-outline',
  },
];

export function DisciplineProgress() {
  return (
    <div className="bg-surface-container-low border-primary/20 rounded-sm border-t-2 p-6">
      <h4 className="font-headline mb-6 text-sm font-semibold">Discipline Utilization</h4>
      <div className="space-y-8">
        {DEMO_DATA.map((d) => (
          <div key={d.name}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${d.dotColor}`}></span>
                <span className="font-body text-xs font-semibold">{d.label}</span>
              </div>
              <span className="text-xs font-bold tabular-nums">{d.percent}%</span>
            </div>
            <div className="bg-surface-container-highest h-1.5 w-full overflow-hidden rounded-full">
              <div className={`h-full ${d.barColor}`} style={{ width: `${d.percent}%` }}></div>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-outline text-[10px] font-medium">{d.available} Available</span>
              <span className="text-outline text-[10px] font-medium">{d.assigned} Assigned</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
