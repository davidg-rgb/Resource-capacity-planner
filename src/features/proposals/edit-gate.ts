// v5.0 — Phase 39 / PROP-03 + PROP-08: pure edit-gate decision helper.
// Given a persona, a target person's live department, and a month, decide
// whether the caller can edit directly, must go through proposal flow,
// should see a historic-warn modal, or is outright blocked.
//
// PURE: no DB, no I/O, no clock. Caller supplies currentMonth.
// See ADR-008 / ADR-008b in .planning/v5.0-ARCHITECTURE.md.

import type { Persona } from '@/features/personas/persona.types';
import type { EditGateDecision } from './proposal.types';

export interface EditGateTargetPerson {
  id: string;
  departmentId: string;
}

export interface EditGateInput {
  persona: Persona;
  targetPerson: EditGateTargetPerson;
  /** 'YYYY-MM' — month the caller wants to edit. */
  month: string;
  /** 'YYYY-MM' — caller-provided "now" month; pure helper does not read clocks. */
  currentMonth: string;
}

export function resolveEditGate(input: EditGateInput): EditGateDecision {
  const { persona, targetPerson, month, currentMonth } = input;
  // Lexical compare works for 'YYYY-MM'.
  const isHistoric = month < currentMonth;

  // Staff and R&D are read-only in v5.0 (§2.2, ADR-004 clarification).
  if (persona.kind === 'staff' || persona.kind === 'rd') return 'blocked';

  let base: 'direct' | 'proposal';
  if (persona.kind === 'pm') {
    base =
      persona.homeDepartmentId !== undefined &&
      targetPerson.departmentId === persona.homeDepartmentId
        ? 'direct'
        : 'proposal';
  } else if (persona.kind === 'line-manager') {
    base = targetPerson.departmentId === persona.departmentId ? 'direct' : 'proposal';
  } else {
    // admin — read-write everywhere.
    base = 'direct';
  }

  if (!isHistoric) return base;
  return base === 'direct' ? 'historic-warn-direct' : 'historic-warn-proposal';
}
