'use client';

// v6.0 — Phase 52 / Plan 52-04 (RD-02 / D-09 / Q3): OvercommitDialog.
//
// Opens when a red overcommit cell on /rd is clicked (cell.state === 'over').
// Two labeled sections:
//   1. "Bidragande projekt" — projects contributing to the overcommit
//   2. "Mest överbokade personer" — people with the largest overbook delta
//
// Each row is a next/link with `data-clicks="true"` so journey 4B's click
// counter picks up navigation away from the dialog.
//
// Consumes `GET /api/v5/capacity/breakdown?scope=department&scopeId=<dept>&monthKey=<YYYY-MM>`
// — specifically the additive `projects[]` + `people[]` fields shipped in this
// plan (52-04). Response `rows[]` is ignored here (legacy back-compat field).
//
// Dialog shell follows the hand-rolled `<div role="dialog" fixed inset-0>`
// pattern from `historic-edit-dialog.tsx` — the codebase has no shadcn Dialog
// primitive (verified in Phase 40 D-14).

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { FocusTrap } from 'focus-trap-react';

import type { OvercommitPerson, OvercommitProject } from '@/features/capacity/capacity.types';

export interface OvercommitDialogProps {
  open: boolean;
  onClose: () => void;
  /** Currently only 'department' is wired — D-09 scoped the dialog to
   *  red-cell clicks on /rd's portfolio grid. */
  scope: 'department' | 'project';
  scopeId: string;
  /** 'YYYY-MM' — passed to the breakdown endpoint AND embedded in per-person
   *  drill-down link targets. */
  monthKey: string;
}

export interface OvercommitBreakdownResponse {
  projects: OvercommitProject[];
  people: OvercommitPerson[];
  rows?: unknown; // back-compat, unused by the dialog
}

async function fetchBreakdown(
  scope: OvercommitDialogProps['scope'],
  scopeId: string,
  monthKey: string,
): Promise<OvercommitBreakdownResponse> {
  const url =
    `/api/v5/capacity/breakdown?scope=${encodeURIComponent(scope)}` +
    `&scopeId=${encodeURIComponent(scopeId)}&monthKey=${encodeURIComponent(monthKey)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`capacity-breakdown ${res.status}`);
  return (await res.json()) as OvercommitBreakdownResponse;
}

export function OvercommitDialog(props: OvercommitDialogProps) {
  const { open, onClose, scope, scopeId, monthKey } = props;
  const t = useTranslations('v5.rd.overcommitDialog');

  const { data } = useQuery({
    queryKey: ['capacity-breakdown', scope, scopeId, monthKey],
    queryFn: () => fetchBreakdown(scope, scopeId, monthKey),
    enabled: open && !!scopeId,
  });

  // ESC dismiss — mirrors historic-edit-dialog.tsx lifecycle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const projects = data?.projects ?? [];
  const people = data?.people ?? [];

  // v6.0 — Phase 52 / Plan 52-REVIEW-FIX WR-01: wrap panel in <FocusTrap>
  // so Tab cycling stays inside the dialog while it is open (mirrors
  // `Drawer.tsx` / `PlanVsActualDrawer` pattern). `allowOutsideClick` is
  // true so the backdrop-click handler below still fires (the trap would
  // otherwise swallow the click → close would never run).
  return (
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        clickOutsideDeactivates: false,
        escapeDeactivates: false,
        fallbackFocus: '[data-testid="overcommit-close"]',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        data-testid="overcommit-dialog"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-surface w-full max-w-2xl rounded-lg p-6 shadow-xl">
          <h2 className="font-headline mb-4 text-lg font-semibold">{t('title')}</h2>

          <section
            aria-labelledby="overcommit-projects-heading"
            data-testid="overcommit-section-projects"
            className="mt-2"
          >
            <h3 id="overcommit-projects-heading" className="mb-2 text-sm font-semibold">
              {t('projects')}
            </h3>
            {projects.length === 0 ? (
              <p className="text-on-surface-variant text-sm">{t('noProjects')}</p>
            ) : (
              <ul className="space-y-1">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      data-clicks="true"
                      data-testid={`overcommit-project-${p.id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      {t('projectRowLabel', {
                        name: p.name,
                        hours: p.plannedHours.toFixed(0),
                        pct: Math.round(p.pctOfOvercommit * 100),
                      })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="overcommit-people-heading"
            data-testid="overcommit-section-people"
            className="mt-4"
          >
            <h3 id="overcommit-people-heading" className="mb-2 text-sm font-semibold">
              {t('people')}
            </h3>
            {people.length === 0 ? (
              <p className="text-on-surface-variant text-sm">{t('noPeople')}</p>
            ) : (
              <ul className="space-y-1">
                {people.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/staff/${p.id}?month=${monthKey}`}
                      data-clicks="true"
                      data-testid={`overcommit-person-${p.id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      {t('personRowLabel', {
                        name: p.name,
                        planned: p.plannedHours.toFixed(0),
                        capacity: p.capacityHours.toFixed(0),
                        delta: p.deltaHours >= 0 ? `+${p.deltaHours}` : `${p.deltaHours}`,
                      })}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              data-testid="overcommit-close"
              className="rounded border px-3 py-1 text-sm"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
