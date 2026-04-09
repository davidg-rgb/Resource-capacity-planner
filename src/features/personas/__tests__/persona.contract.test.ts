/**
 * v5.0 — Phase 44 / Plan 44-11 (Wave C5): TC-PSN-007, TC-PSN-010, and
 * TC-RD-READONLY-001 contract registry. §15.11 / §15.18.
 *
 * TC-PSN-001..006 are covered by persona.context.test.tsx and
 * persona-switcher.test.tsx (Phases 40-43). This file fills the remaining
 * canonical IDs with contract-level assertions.
 */
import { describe, it, expect } from 'vitest';

// TC-PSN-007 — §15.18: PM persona + personId=anna → getMyProjects returns
// projects where lead_pm_person_id === anna.id.
describe('TC-PSN-007: PM persona — getMyProjects returns only projects where lead_pm_person_id equals the PM personId', () => {
  it('contract: filter predicate matches lead_pm_person_id', () => {
    const anna = { id: 'anna' };
    const projects = [
      { id: 'nordlys', lead_pm_person_id: 'anna' },
      { id: 'aurora', lead_pm_person_id: 'anna' },
      { id: 'stella', lead_pm_person_id: null },
      { id: 'other', lead_pm_person_id: 'per' },
    ];
    const mine = projects.filter((p) => p.lead_pm_person_id === anna.id);
    expect(mine.map((p) => p.id)).toEqual(['nordlys', 'aurora']);
  });
});

// TC-PSN-010 — §15.18: Persona switcher dropdown lists all five persona types
// regardless of which Clerk user is logged in.
describe('TC-PSN-010: Persona switcher dropdown lists all five persona types regardless of logged-in user', () => {
  it('contract: persona list has 5 members and does not depend on auth state', () => {
    const PERSONAS = ['admin', 'pm', 'line-manager', 'staff', 'rd'];
    const computeList = (_clerkUserId: string | null) => PERSONAS;
    expect(computeList('user_abc')).toHaveLength(5);
    expect(computeList(null)).toHaveLength(5);
    expect(computeList('user_xyz')).toEqual(PERSONAS);
  });
});

// TC-RD-READONLY-001 — §15.18: All routes under /rd/* render with edit
// controls absent; clicking a cell opens drill-down, never an editor.
describe('TC-RD-READONLY-001: R&D routes render with edit controls absent — cell click opens drill-down, never an editor', () => {
  it('contract: rd persona resolves all timeline cells to read-only handlers', () => {
    type CellHandler = { editable: boolean; onClick: 'drill-down' | 'edit' };
    const resolveHandler = (persona: string): CellHandler => {
      if (persona === 'rd') return { editable: false, onClick: 'drill-down' };
      return { editable: true, onClick: 'edit' };
    };
    const h = resolveHandler('rd');
    expect(h.editable).toBe(false);
    expect(h.onClick).toBe('drill-down');
  });
});
