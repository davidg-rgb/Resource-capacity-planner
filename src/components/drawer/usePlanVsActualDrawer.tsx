'use client';

/**
 * v5.0 — Phase 37-02: tiny React-context store for the PlanVsActualDrawer.
 *
 * Mirrors the persona.context pattern (no new state-management dep).
 * Persona screens wrap their tree in <PlanVsActualDrawerProvider> and call
 * usePlanVsActualDrawer() to open/close the drawer. Cells fire open(ctx)
 * with the (person, project, month) tuple plus display labels.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Drawer view mode discriminant (Phase 42 D-17 / UX-V5-09).
 *
 * - 'daily' (Phase 37 original): single (person, project, month) — drawer renders
 *   per-day rows for that one person on that one project.
 * - 'project-person-breakdown' (Phase 42): R&D drill from a project-row cell with
 *   no person — drawer renders per-person rows for that project-month. `personId`
 *   MUST be null in this mode.
 */
export type DrawerMode = 'daily' | 'project-person-breakdown';

export interface DrawerContext {
  /** null only in 'project-person-breakdown' mode (R&D drill). */
  personId: string | null;
  projectId: string;
  monthKey: string;
  /** Empty string allowed in 'project-person-breakdown' mode. */
  personName: string;
  projectName: string;
  monthLabel: string;
  mode: DrawerMode;
}

interface PlanVsActualDrawerStore {
  isOpen: boolean;
  context: DrawerContext | null;
  open: (ctx: DrawerContext) => void;
  close: () => void;
}

const Ctx = createContext<PlanVsActualDrawerStore | null>(null);

export function PlanVsActualDrawerProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<DrawerContext | null>(null);

  const open = useCallback((ctx: DrawerContext) => setContext(ctx), []);
  const close = useCallback(() => setContext(null), []);

  const value = useMemo<PlanVsActualDrawerStore>(
    () => ({
      isOpen: context !== null,
      context,
      open,
      close,
    }),
    [context, open, close],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanVsActualDrawer(): PlanVsActualDrawerStore {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('usePlanVsActualDrawer must be used inside PlanVsActualDrawerProvider');
  }
  return ctx;
}
