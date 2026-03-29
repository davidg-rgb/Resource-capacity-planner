export function StrategicAlerts() {
  return (
    <div className="mt-8">
      <h4 className="font-headline mb-4 text-sm font-semibold">Strategic Alerts</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-error-container/10 border-error/10 flex items-start gap-4 rounded-sm border p-4">
          <span className="material-symbols-outlined text-error">warning</span>
          <div>
            <p className="text-on-error-container text-xs font-semibold">
              Critical Load: Electronics
            </p>
            <p className="text-error mt-0.5 text-[11px]">
              Electronics team over 90% in Apr-May. Milestone &apos;Alpha-V2&apos; at risk.
            </p>
          </div>
        </div>
        <div className="bg-surface-container-high flex items-start gap-4 rounded-sm p-4">
          <span className="material-symbols-outlined text-outline">trending_down</span>
          <div>
            <p className="text-on-surface text-xs font-semibold">Under-utilization: Testing</p>
            <p className="text-outline mt-0.5 text-[11px]">
              Testing drops below 30% from Jul. Reassignment recommended.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
