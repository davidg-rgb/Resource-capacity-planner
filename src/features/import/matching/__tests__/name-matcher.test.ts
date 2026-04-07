import { describe, expect, it } from 'vitest';

import { matchPersonName, matchProjectName } from '../name-matcher';

const people = [
  { id: 'p1', name: 'Anna Andersson' },
  { id: 'p2', name: 'Erik Svensson' },
  { id: 'p3', name: 'Sara Berg' },
];

describe('matchPersonName', () => {
  it('T1: exact match on full name', () => {
    const r = matchPersonName('Anna Andersson', people);
    expect(r).toMatchObject({ kind: 'exact', id: 'p1', name: 'Anna Andersson' });
  });

  it('T2: exact match is case-insensitive', () => {
    const r = matchPersonName('anna andersson', people);
    expect(r).toMatchObject({ kind: 'exact', id: 'p1' });
  });

  it('T3: comma-swap "Svensson, Erik" resolves to exact "Erik Svensson"', () => {
    const r = matchPersonName('Svensson, Erik', [{ id: 'p2', name: 'Erik Svensson' }]);
    expect(r).toMatchObject({ kind: 'exact', id: 'p2' });
  });

  it('T4: typo "Eric Svensson" is a fuzzy match ~0.90', () => {
    const r = matchPersonName('Eric Svensson', [{ id: 'p2', name: 'Erik Svensson' }]);
    expect(r.kind).toBe('fuzzy');
    if (r.kind === 'fuzzy') {
      expect(r.id).toBe('p2');
      expect(r.confidence).toBeGreaterThan(0.85);
    }
  });

  it('T5: "Jon" against two "Jon *" candidates → ambiguous', () => {
    const r = matchPersonName('Jon', [
      { id: 'a', name: 'Jon Smith' },
      { id: 'b', name: 'Jon Doe' },
    ]);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.candidates.length).toBeGreaterThanOrEqual(2);
      expect(r.candidates.length).toBeLessThanOrEqual(3);
    }
  });

  it('T6: nothing close → none', () => {
    const r = matchPersonName('Totally Unknown', [{ id: 'p2', name: 'Erik Svensson' }]);
    expect(r.kind).toBe('none');
  });

  it('T7: empty candidate list → none', () => {
    const r = matchPersonName('Anna Andersson', []);
    expect(r.kind).toBe('none');
  });
});

describe('matchProjectName', () => {
  it('T8: mirrors matchPersonName semantics (exact + fuzzy + none)', () => {
    const projects = [
      { id: 'x', name: 'Atlas' },
      { id: 'y', name: 'Nova' },
    ];
    expect(matchProjectName('Atlas', projects)).toMatchObject({ kind: 'exact', id: 'x' });
    expect(matchProjectName('atlas', projects)).toMatchObject({ kind: 'exact', id: 'x' });
    const fuzzy = matchProjectName('Atlass', projects);
    expect(fuzzy.kind === 'fuzzy' || fuzzy.kind === 'exact').toBe(true);
    expect(matchProjectName('Zenith', projects).kind).toBe('none');
    expect(matchProjectName('Atlas', []).kind).toBe('none');
  });
});
