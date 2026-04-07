'use client';

/**
 * v5.0 — Phase 38 / Plan 38-03 (WIZ-01): useImportWizard hook.
 *
 * useReducer-based state machine for the Line Manager import wizard. No new
 * state-management dep — mirrors the lightweight pattern used by
 * use-actuals-cell.ts and the persona context.
 *
 * The hook is fetcher-injectable so component tests can drive it without
 * touching the network.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type { PreviewResult } from '../actuals-import.types';

import {
  INITIAL_WIZARD_STATE,
  type NameResolution,
  type WizardError,
  type WizardState,
  type WizardStep,
} from './import-wizard.types';

// ---------- Fetcher contract -----------------------------------------------

export type WizardFetcher = {
  parse(file: File): Promise<{ sessionId: string }>;
  preview(sessionId: string): Promise<PreviewResult>;
  commit(
    sessionId: string,
    body: {
      overrideManualEdits: boolean;
      overrideUnrolledImports: boolean;
      nameOverrides?: {
        persons?: Record<string, string>;
        projects?: Record<string, string>;
      };
    },
  ): Promise<{ batchId: string; rowsInserted: number; rowsUpdated: number }>;
  rollback(
    batchId: string,
  ): Promise<{ batchId: string; rowsDeleted: number; rowsRestored: number }>;
};

// ---------- HTTP fetcher (default) -----------------------------------------

async function readError(res: Response): Promise<WizardError> {
  let code = 'GENERIC';
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    /* ignore */
  }
  return { code, message };
}

class WizardHttpError extends Error {
  constructor(public readonly wizardError: WizardError) {
    super(wizardError.message);
  }
}

export const httpFetcher: WizardFetcher = {
  async parse(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/v5/imports/parse', { method: 'POST', body: fd });
    if (!res.ok) throw new WizardHttpError(await readError(res));
    const json = (await res.json()) as { sessionId: string };
    return { sessionId: json.sessionId };
  },
  async preview(sessionId) {
    const res = await fetch(`/api/v5/imports/${sessionId}/preview`);
    if (!res.ok) throw new WizardHttpError(await readError(res));
    return (await res.json()) as PreviewResult;
  },
  async commit(sessionId, body) {
    const res = await fetch(`/api/v5/imports/${sessionId}/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new WizardHttpError(await readError(res));
    return (await res.json()) as {
      batchId: string;
      rowsInserted: number;
      rowsUpdated: number;
    };
  },
  async rollback(batchId) {
    const res = await fetch(`/api/v5/imports/batches/${batchId}/rollback`, {
      method: 'POST',
    });
    if (!res.ok) throw new WizardHttpError(await readError(res));
    return (await res.json()) as {
      batchId: string;
      rowsDeleted: number;
      rowsRestored: number;
    };
  },
};

// ---------- Reducer ---------------------------------------------------------

type Action =
  | { type: 'loading'; loading: boolean }
  | { type: 'error'; error: WizardError | null; step?: WizardStep }
  | { type: 'parsed'; sessionId: string }
  | { type: 'preview'; preview: PreviewResult }
  | { type: 'set-resolution'; resolution: NameResolution }
  | { type: 'toggle-override-manual' }
  | { type: 'toggle-override-prior-batch' }
  | { type: 'goto'; step: WizardStep }
  | {
      type: 'committed';
      batchId: string;
      committedAt: string;
      rowsInserted: number;
      rowsUpdated: number;
    }
  | { type: 'reset' };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: action.loading };
    case 'error':
      return {
        ...state,
        isLoading: false,
        error: action.error,
        step: action.step ?? state.step,
      };
    case 'parsed':
      return { ...state, sessionId: action.sessionId, error: null };
    case 'preview':
      return {
        ...state,
        preview: action.preview,
        resolutions: [],
        step: 'preview',
        isLoading: false,
        error: null,
      };
    case 'set-resolution': {
      const others = state.resolutions.filter(
        (r) => !(r.input === action.resolution.input && r.kind === action.resolution.kind),
      );
      return { ...state, resolutions: [...others, action.resolution] };
    }
    case 'toggle-override-manual':
      return { ...state, overrideManualEdits: !state.overrideManualEdits };
    case 'toggle-override-prior-batch':
      return { ...state, overrideUnrolledImports: !state.overrideUnrolledImports };
    case 'goto':
      return { ...state, step: action.step, error: null };
    case 'committed':
      return {
        ...state,
        committedBatchId: action.batchId,
        committedAt: action.committedAt,
        rowsInserted: action.rowsInserted,
        rowsUpdated: action.rowsUpdated,
        step: 'result',
        isLoading: false,
        error: null,
      };
    case 'reset':
      return { ...INITIAL_WIZARD_STATE };
    default:
      return state;
  }
}

// ---------- Error → step routing -------------------------------------------

function mapErrorToStep(code: string, current: WizardStep): WizardStep {
  if (
    code === 'ERR_US_WEEK_HEADERS' ||
    code === 'US_WEEK_DETECTED' ||
    code === 'ERR_UNKNOWN_LAYOUT' ||
    code === 'UNSUPPORTED_FILE_TYPE'
  ) {
    return 'upload';
  }
  if (code === 'PRIOR_BATCH_ACTIVE') return 'confirm';
  if (code === 'UNRESOLVED_NAMES') return 'unmatched';
  return current;
}

// ---------- Hook ------------------------------------------------------------

export type UseImportWizardOptions = {
  fetcher?: WizardFetcher;
  /** Allow tests to inject a deterministic clock. */
  now?: () => Date;
};

export function useImportWizard(options: UseImportWizardOptions = {}) {
  const fetcher = options.fetcher ?? httpFetcher;
  const optionsNow = options.now;
  const now = useMemo(() => optionsNow ?? (() => new Date()), [optionsNow]);
  const [state, dispatch] = useReducer(reducer, INITIAL_WIZARD_STATE);
  // Latest sessionId for callbacks (avoids stale-closure on rapid sequences).
  const sessionRef = useRef<string | null>(null);
  useEffect(() => {
    sessionRef.current = state.sessionId;
  }, [state.sessionId]);

  const handleError = useCallback((err: unknown, step: WizardStep) => {
    const wizardError: WizardError =
      err instanceof WizardHttpError
        ? err.wizardError
        : { code: 'GENERIC', message: err instanceof Error ? err.message : 'Unknown error' };
    dispatch({
      type: 'error',
      error: wizardError,
      step: mapErrorToStep(wizardError.code, step),
    });
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        dispatch({
          type: 'error',
          error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'fileTypeError' },
          step: 'upload',
        });
        return;
      }
      dispatch({ type: 'loading', loading: true });
      try {
        const { sessionId } = await fetcher.parse(file);
        dispatch({ type: 'parsed', sessionId });
        const preview = await fetcher.preview(sessionId);
        dispatch({ type: 'preview', preview });
      } catch (err) {
        handleError(err, 'upload');
      }
    },
    [fetcher, handleError],
  );

  const reloadPreview = useCallback(async () => {
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    dispatch({ type: 'loading', loading: true });
    try {
      const preview = await fetcher.preview(sessionId);
      dispatch({ type: 'preview', preview });
    } catch (err) {
      handleError(err, 'preview');
    }
  }, [fetcher, handleError]);

  const setResolution = useCallback((resolution: NameResolution) => {
    dispatch({ type: 'set-resolution', resolution });
  }, []);

  const toggleOverrideManual = useCallback(() => {
    dispatch({ type: 'toggle-override-manual' });
  }, []);

  const toggleOverridePriorBatch = useCallback(() => {
    dispatch({ type: 'toggle-override-prior-batch' });
  }, []);

  const goTo = useCallback((step: WizardStep) => {
    dispatch({ type: 'goto', step });
  }, []);

  const commit = useCallback(async () => {
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    dispatch({ type: 'loading', loading: true });
    try {
      const persons: Record<string, string> = {};
      const projects: Record<string, string> = {};
      for (const r of state.resolutions) {
        if (!r.resolvedId) continue;
        if (r.kind === 'person') persons[r.input] = r.resolvedId;
        else projects[r.input] = r.resolvedId;
      }
      const result = await fetcher.commit(sessionId, {
        overrideManualEdits: state.overrideManualEdits,
        overrideUnrolledImports: state.overrideUnrolledImports,
        nameOverrides:
          Object.keys(persons).length || Object.keys(projects).length
            ? { persons, projects }
            : undefined,
      });
      dispatch({
        type: 'committed',
        batchId: result.batchId,
        committedAt: now().toISOString(),
        rowsInserted: result.rowsInserted,
        rowsUpdated: result.rowsUpdated,
      });
    } catch (err) {
      handleError(err, 'confirm');
    }
  }, [
    fetcher,
    handleError,
    now,
    state.overrideManualEdits,
    state.overrideUnrolledImports,
    state.resolutions,
  ]);

  const rollback = useCallback(async () => {
    if (!state.committedBatchId) return;
    dispatch({ type: 'loading', loading: true });
    try {
      await fetcher.rollback(state.committedBatchId);
      dispatch({
        type: 'error',
        error: { code: 'ROLLED_BACK', message: 'rollbackSuccess' },
        step: 'result',
      });
    } catch (err) {
      handleError(err, 'result');
    }
  }, [fetcher, handleError, state.committedBatchId]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const unmatchedResolved = useMemo(() => {
    const unmatched = state.preview?.unmatchedNames ?? [];
    if (unmatched.length === 0) return true;
    return unmatched.every((u) =>
      state.resolutions.some(
        (r) =>
          r.input === u.input &&
          r.kind === u.kind &&
          (r.resolvedId !== null || r.action === 'mark-new'),
      ),
    );
  }, [state.preview, state.resolutions]);

  return {
    state,
    actions: {
      uploadFile,
      reloadPreview,
      setResolution,
      toggleOverrideManual,
      toggleOverridePriorBatch,
      goTo,
      commit,
      rollback,
      reset,
    },
    derived: { unmatchedResolved },
  };
}
