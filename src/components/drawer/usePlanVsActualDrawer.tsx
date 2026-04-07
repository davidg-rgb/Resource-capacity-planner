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

export interface DrawerContext {
  personId: string;
  projectId: string;
  monthKey: string;
  personName: string;
  projectName: string;
  monthLabel: string;
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
