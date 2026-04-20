export const FLAG_NAMES = ['dashboards', 'pdfExport', 'alerts', 'onboarding', 'scenarios'] as const;
export type FlagName = (typeof FLAG_NAMES)[number];

export interface FeatureFlags {
  dashboards: boolean;
  pdfExport: boolean;
  alerts: boolean;
  onboarding: boolean;
  scenarios: boolean;
}

export const FLAG_ROUTE_MAP: Record<FlagName, string[]> = {
  dashboards: ['/dashboard'],
  pdfExport: [],
  alerts: ['/alerts'],
  onboarding: [],
  scenarios: ['/scenarios'],
};
