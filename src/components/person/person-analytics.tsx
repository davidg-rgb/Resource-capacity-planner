'use client';

/**
 * Bento-grid analytics section below the allocation grid.
 * 3 cards: Allocation Trend, Project Distribution, Capacity Insight.
 * Matches creative-direction/04-person-input-form.html analytics section.
 */
export function PersonAnalytics() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* Card 1: Total Allocation Trend (4/12 cols) */}
      <div className="bg-surface-container-lowest border-outline-variant/10 flex flex-col justify-between rounded-sm border p-6 shadow-sm md:col-span-4">
        <div>
          <h4 className="text-outline mb-4 text-xs font-bold tracking-widest uppercase">
            Allokeringstrend
          </h4>
          <div className="flex h-24 w-full items-end gap-2 px-2">
            <div className="bg-primary/20 h-[60%] w-full" />
            <div className="bg-primary/20 h-[70%] w-full" />
            <div className="bg-primary/20 h-[65%] w-full" />
            <div className="bg-primary h-[85%] w-full" />
            <div className="bg-error h-[95%] w-full" />
            <div className="bg-primary/20 h-[80%] w-full" />
            <div className="bg-primary/20 h-[60%] w-full" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-outline text-xs font-medium">Prognos</span>
          <span className="text-error text-sm font-bold">+12% Topp</span>
        </div>
      </div>

      {/* Card 2: Project Distribution (5/12 cols) */}
      <div className="bg-surface-container-lowest border-outline-variant/10 rounded-sm border p-6 shadow-sm md:col-span-5">
        <h4 className="text-outline mb-4 text-xs font-bold tracking-widest uppercase">
          Projektfordelning
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-on-surface w-16 text-xs font-medium">Atlas</span>
            <div className="bg-surface-container-low h-2 flex-1 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-[65%]" />
            </div>
            <span className="text-primary text-xs font-bold tabular-nums">65%</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-on-surface w-16 text-xs font-medium">Vega</span>
            <div className="bg-surface-container-low h-2 flex-1 overflow-hidden rounded-full">
              <div className="bg-primary-fixed-dim h-full w-[25%]" />
            </div>
            <span className="text-primary text-xs font-bold tabular-nums">25%</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-on-surface w-16 text-xs font-medium">Nova</span>
            <div className="bg-surface-container-low h-2 flex-1 overflow-hidden rounded-full">
              <div className="bg-secondary-fixed-dim h-full w-[10%]" />
            </div>
            <span className="text-primary text-xs font-bold tabular-nums">10%</span>
          </div>
        </div>
      </div>

      {/* Card 3: Capacity Insight (3/12 cols) */}
      <div className="bg-primary text-on-primary flex flex-col justify-between rounded-sm p-6 shadow-sm md:col-span-3">
        <div>
          <span className="material-symbols-outlined mb-2">lightbulb</span>
          <h4 className="text-xs font-bold tracking-widest uppercase opacity-80">
            Kapacitetsinsikt
          </h4>
          <p className="mt-2 text-sm leading-relaxed font-medium">
            Maj 2026 overskrider malet med 30h pa grund av overlapp i Atlas &amp; Nova.
          </p>
        </div>
        <button
          type="button"
          className="mt-4 text-left text-[11px] font-bold tracking-widest uppercase underline underline-offset-4"
        >
          Justera allokering
        </button>
      </div>
    </div>
  );
}
