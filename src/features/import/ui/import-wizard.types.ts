/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): import wizard client-state types.
 *
 * Mirrors the server-side PreviewResult / CommitResult shapes from
 * actuals-import.types.ts but kept on the client side so the wizard hook
 * can compile without dragging server-only modules into the bundle.
 */

import type { PreviewResult } from '../actuals-import.types';

export type WizardStep = 'upload' | 'preview' | 'unmatched' | 'confirm' | 'result';

export type ResolutionAction = 'fuzzy-accept' | 'manual-pick' | 'mark-new';

export type NameResolution = {
  input: string;
  kind: 'person' | 'project';
  resolvedId: string | null;
  action: ResolutionAction;
};

export type WizardError = {
  code: string;
  message: string;
};

export type WizardState = {
  step: WizardStep;
  sessionId: string | null;
  preview: PreviewResult | null;
  resolutions: NameResolution[];
  overrideManualEdits: boolean;
  overrideUnrolledImports: boolean;
  committedBatchId: string | null;
  committedAt: string | null;
  rowsInserted: number;
  rowsUpdated: number;
  error: WizardError | null;
  isLoading: boolean;
};

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 'upload',
  sessionId: null,
  preview: null,
  resolutions: [],
  overrideManualEdits: false,
  overrideUnrolledImports: false,
  committedBatchId: null,
  committedAt: null,
  rowsInserted: 0,
  rowsUpdated: 0,
  error: null,
  isLoading: false,
};
