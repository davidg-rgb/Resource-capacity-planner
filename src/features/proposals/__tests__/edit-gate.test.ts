// v5.0 — Phase 39: TC-PS-001..010 for resolveEditGate().
import { describe, test, expect } from 'vitest';
import { resolveEditGate, type EditGateTargetPerson } from '../edit-gate';
import type { Persona } from '@/features/personas/persona.types';

const DEPT_A = '11111111-1111-4111-8111-111111111111';
const DEPT_B = '22222222-2222-4222-8222-222222222222';

const target = (departmentId: string): EditGateTargetPerson => ({
  id: 'person-1',
  departmentId,
});

const pm = (homeDepartmentId: string): Persona => ({
  kind: 'pm',
  personId: 'pm-1',
  displayName: 'PM',
  homeDepartmentId,
});

const lineMgr = (departmentId: string): Persona => ({
  kind: 'line-manager',
  departmentId,
  displayName: 'LM',
});

const staff: Persona = { kind: 'staff', personId: 's-1', displayName: 'S' };
const rd: Persona = { kind: 'rd', displayName: 'RD' };
const admin: Persona = { kind: 'admin', displayName: 'Admin' };

const CURRENT = '2026-04';
const FUTURE = '2026-06';
const PAST = '2026-01';

describe('resolveEditGate', () => {
  test('TC-PS-001: pm in-dept current/future month → direct', () => {
    expect(
      resolveEditGate({
        persona: pm(DEPT_A),
        targetPerson: target(DEPT_A),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('direct');
  });

  test('TC-PS-002: pm out-of-dept current/future month → proposal', () => {
    expect(
      resolveEditGate({
        persona: pm(DEPT_A),
        targetPerson: target(DEPT_B),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('proposal');
  });

  test('TC-PS-003: pm in-dept historic month → historic-warn-direct', () => {
    expect(
      resolveEditGate({
        persona: pm(DEPT_A),
        targetPerson: target(DEPT_A),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('historic-warn-direct');
  });

  test('TC-PS-004: pm out-of-dept historic month → historic-warn-proposal', () => {
    expect(
      resolveEditGate({
        persona: pm(DEPT_A),
        targetPerson: target(DEPT_B),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('historic-warn-proposal');
  });

  test('TC-PS-005: line-manager in own dept → direct (PROP-08)', () => {
    expect(
      resolveEditGate({
        persona: lineMgr(DEPT_A),
        targetPerson: target(DEPT_A),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('direct');
  });

  test('TC-PS-006: line-manager out-of-dept → proposal', () => {
    expect(
      resolveEditGate({
        persona: lineMgr(DEPT_A),
        targetPerson: target(DEPT_B),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('proposal');
  });

  test('TC-PS-007: line-manager in own dept historic month → historic-warn-direct', () => {
    expect(
      resolveEditGate({
        persona: lineMgr(DEPT_A),
        targetPerson: target(DEPT_A),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('historic-warn-direct');
  });

  test('TC-PS-008: staff persona → blocked regardless', () => {
    expect(
      resolveEditGate({
        persona: staff,
        targetPerson: target(DEPT_A),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('blocked');
    expect(
      resolveEditGate({
        persona: staff,
        targetPerson: target(DEPT_A),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('blocked');
  });

  test('TC-PS-009: rd persona → blocked (read-only per §2.2, ADR-004)', () => {
    expect(
      resolveEditGate({
        persona: rd,
        targetPerson: target(DEPT_A),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('blocked');
    expect(
      resolveEditGate({
        persona: rd,
        targetPerson: target(DEPT_A),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('blocked');
  });

  test('TC-PS-010: admin persona → direct (historic-warn-direct in past)', () => {
    expect(
      resolveEditGate({
        persona: admin,
        targetPerson: target(DEPT_A),
        month: FUTURE,
        currentMonth: CURRENT,
      }),
    ).toBe('direct');
    expect(
      resolveEditGate({
        persona: admin,
        targetPerson: target(DEPT_A),
        month: PAST,
        currentMonth: CURRENT,
      }),
    ).toBe('historic-warn-direct');
  });
});
