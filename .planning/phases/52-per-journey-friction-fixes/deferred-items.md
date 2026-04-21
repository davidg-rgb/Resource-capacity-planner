# Phase 52 Deferred Items

## Pre-existing out-of-scope issues discovered during Wave 0

### side-nav.test.tsx: Missing `PERSONA_SECTION_NAV` export

- **Discovered during:** 52-01 Task 1 typecheck
- **File:** `src/components/layout/__tests__/side-nav.test.tsx:12`
- **Error:** `TS2305: Module '"../side-nav"' has no exported member 'PERSONA_SECTION_NAV'.`
- **Origin:** Pre-existing before plan 52-01 (confirmed via `git stash` + typecheck).
  Likely introduced in Phase 50-02 (`feat(50-02): persona-keyed sidebar nav...`) — symbol
  renamed/removed without updating the test.
- **Not fixed in 52-01:** outside plan scope (flag + click-tracker infrastructure only).
- **Recommended owner:** Phase 53 (Chrome polish) or a targeted sidebar follow-up.
