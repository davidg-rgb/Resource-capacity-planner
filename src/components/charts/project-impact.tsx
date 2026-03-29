interface Project {
  name: string;
  subtitle: string;
}

const DEMO_DATA: Project[] = [
  { name: 'Autonomous Core', subtitle: 'Resource Heavy \u00b7 Priority 1' },
  { name: 'Drivetrain Refresh', subtitle: 'Optimized \u00b7 Priority 2' },
];

export function ProjectImpact() {
  return (
    <div className="bg-surface-container-lowest rounded-sm p-6">
      <h4 className="font-headline mb-4 text-sm font-semibold">Project Impact</h4>
      <div className="space-y-4">
        {DEMO_DATA.map((project) => (
          <div
            key={project.name}
            className="bg-surface hover:bg-surface-container-low border-outline-variant/20 flex cursor-pointer items-center justify-between rounded border-l-2 p-3 transition-colors"
          >
            <div>
              <p className="text-xs font-semibold">{project.name}</p>
              <p className="text-outline text-[10px]">{project.subtitle}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
          </div>
        ))}
      </div>
    </div>
  );
}
