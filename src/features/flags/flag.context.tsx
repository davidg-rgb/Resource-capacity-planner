'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { FeatureFlags } from './flag.types';

const DEFAULT_FLAGS: FeatureFlags = {
  dashboards: false,
  pdfExport: false,
  alerts: false,
  onboarding: false,
};

const FlagContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FlagProvider({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}

export function useFlags(): FeatureFlags {
  return useContext(FlagContext);
}
