/**
 * Fuzzy name matcher for the v5.0 Excel import preview (IMP-07).
 *
 * Pure function. No DB access — callers pass the candidate list (people or
 * projects already loaded for the tenant). Returns a discriminated union
 * consumed by Plan 38-02 (commit) and Plan 38-03 (preview suggestion UI).
 *
 * Thresholds:
 *   - exact (case-insensitive, comma-swap aware) → kind:'exact'
 *   - single candidate > 0.85 AND next best < 0.85 → kind:'fuzzy'
 *   - two or more candidates > 0.70 → kind:'ambiguous' (top 3)
 *   - otherwise → kind:'none'
 */

import stringSimilarity from 'string-similarity';

/**
 * Levenshtein edit distance. Small strings only (names) — O(n*m) is fine.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Composite similarity in [0,1] combining:
 *   - Dice coefficient (string-similarity) — strong on typos in long strings
 *   - Levenshtein ratio — strong on 1-character typos
 *   - Token-prefix boost — input is a whole leading token of candidate
 *     (e.g. "Jon" → "Jon Smith"). Scores 0.75 so it flags as ambiguous
 *     when multiple candidates share the prefix.
 */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dice = stringSimilarity.compareTwoStrings(a, b);
  const dist = levenshtein(a, b);
  const lev = 1 - dist / Math.max(a.length, b.length);
  let score = Math.max(dice, lev);

  // Token-prefix boost (case-sensitive on already-normalized forms).
  const aTokens = a.split(' ');
  const bTokens = b.split(' ');
  if (aTokens.length === 1 && bTokens.length > 1 && bTokens[0] === aTokens[0]) {
    score = Math.max(score, 0.75);
  } else if (bTokens.length === 1 && aTokens.length > 1 && aTokens[0] === bTokens[0]) {
    score = Math.max(score, 0.75);
  }
  return score;
}

export interface Candidate {
  id: string;
  name: string;
}

export interface CandidateMatch {
  id: string;
  name: string;
  confidence: number;
}

export type MatchResult =
  | { kind: 'exact'; id: string; name: string }
  | { kind: 'fuzzy'; id: string; name: string; confidence: number }
  | { kind: 'ambiguous'; candidates: CandidateMatch[] }
  | { kind: 'none' };

const FUZZY_THRESHOLD = 0.85;
const AMBIGUOUS_THRESHOLD = 0.7;

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** "Svensson, Erik" → "Erik Svensson". Non-matching inputs returned unchanged. */
function commaSwap(s: string): string {
  const m = s.match(/^([^,]+),\s*(.+)$/);
  if (!m) return s;
  return `${m[2].trim()} ${m[1].trim()}`;
}

interface MatchOptions {
  /** Apply "Svensson, Erik" ↔ "Erik Svensson" normalization. Default true (person names). */
  commaSwap: boolean;
}

function matchInternal(
  input: string,
  candidates: ReadonlyArray<Candidate>,
  opts: MatchOptions,
): MatchResult {
  if (!input || candidates.length === 0) return { kind: 'none' };

  const rawNormalized = normalize(input);
  const swappedNormalized = opts.commaSwap ? normalize(commaSwap(input)) : rawNormalized;
  const inputForms = Array.from(new Set([rawNormalized, swappedNormalized]));

  // Pass 1: exact (case-insensitive, both forms).
  for (const c of candidates) {
    const cn = normalize(c.name);
    const cnSwapped = opts.commaSwap ? normalize(commaSwap(c.name)) : cn;
    for (const f of inputForms) {
      if (f === cn || f === cnSwapped) {
        return { kind: 'exact', id: c.id, name: c.name };
      }
    }
  }

  // Pass 2: similarity scores (max over input × candidate × swapped variants).
  const scored: CandidateMatch[] = candidates.map((c) => {
    const cn = normalize(c.name);
    const cnSwapped = opts.commaSwap ? normalize(commaSwap(c.name)) : cn;
    let best = 0;
    for (const f of inputForms) {
      const s1 = similarity(f, cn);
      const s2 = similarity(f, cnSwapped);
      if (s1 > best) best = s1;
      if (s2 > best) best = s2;
    }
    return { id: c.id, name: c.name, confidence: best };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored[0];
  const second = scored[1];

  if (top.confidence > FUZZY_THRESHOLD) {
    // Unique fuzzy winner → fuzzy. Otherwise the fuzzy isn't unique → ambiguous.
    if (!second || second.confidence < FUZZY_THRESHOLD) {
      return { kind: 'fuzzy', id: top.id, name: top.name, confidence: top.confidence };
    }
    return {
      kind: 'ambiguous',
      candidates: scored.filter((c) => c.confidence > AMBIGUOUS_THRESHOLD).slice(0, 3),
    };
  }

  if (top.confidence > AMBIGUOUS_THRESHOLD && second && second.confidence > AMBIGUOUS_THRESHOLD) {
    return {
      kind: 'ambiguous',
      candidates: scored.filter((c) => c.confidence > AMBIGUOUS_THRESHOLD).slice(0, 3),
    };
  }

  return { kind: 'none' };
}

export function matchPersonName(input: string, candidates: ReadonlyArray<Candidate>): MatchResult {
  return matchInternal(input, candidates, { commaSwap: true });
}

export function matchProjectName(input: string, candidates: ReadonlyArray<Candidate>): MatchResult {
  return matchInternal(input, candidates, { commaSwap: false });
}
