'use client';

/**
 * Grid footer with status legend and action bar.
 * Matches creative-direction/04-person-input-form.html footer section.
 */
export function GridFooter() {
  return (
    <div className="border-outline-variant/15 bg-surface-container-lowest flex items-center justify-between border-t px-8 py-4">
      {/* Status legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-on-secondary-container h-2 w-2 rounded-full" />
          <span className="text-outline text-[11px] font-medium tracking-wider uppercase">
            Pa spar
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-outline-variant h-2 w-2 rounded-full" />
          <span className="text-outline text-[11px] font-medium tracking-wider uppercase">
            Varning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-error h-2 w-2 rounded-full" />
          <span className="text-outline text-[11px] font-medium tracking-wider uppercase">
            Overbelagd
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-primary hover:bg-surface-container-low rounded-sm px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors"
        >
          Angra andringar
        </button>
        <button
          type="button"
          className="bg-primary text-on-primary rounded-sm px-8 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-90"
        >
          Spara
        </button>
      </div>
    </div>
  );
}
