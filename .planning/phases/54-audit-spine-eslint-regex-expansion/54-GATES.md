---
phase: 54
updated: 2026-05-28T17:55:00.000Z
overrides:
  - gate: "regression"
    reason: "The only failing suite (src/app/api/v5/imports/__tests__/imports.api.test.ts) throws at import on missing test env vars (createEnv validation), not a runtime failure. It failed identically in the pre-Phase-54 baseline, so it is NOT a regression introduced by this phase. All 1094 other tests pass, including every prior-phase register/contract suite. Tracked as a dev-env harness gap for Phase 58 (QUAL-04..06)."
    accepted_by: "david"
    accepted_at: "2026-05-28T13:17:14.177Z"
---

# Execution Gate Overrides

Auditable record of execution-phase quality gates that were intentionally accepted past a
failure, with a reason and an owner — the same escape the verifier uses for must-haves. Each
entry means: for this phase, the named gate was allowed to fail knowingly.

See `~/.claude/scripts/README.md` and `~/.claude/definition-of-done.md`.

## Removed overrides

- **`dependency_audit`** — removed 2026-05-28. The 2 critical / 14 high / 14 moderate
  / 3 low vulnerabilities that forced the original override were fully remediated in a
  dedicated dependency-security pass (commits `382e11e`, `8b61bbe`, `37a8cba`, `43ae35c`,
  `013a9df`, `9dca2e4`). `pnpm audit --audit-level=high` now exits 0 and the
  `dependency_audit` gate passes on its own — the engine reports
  `shouldFail: false`, verdict `pass`. The override is no longer needed.
  The `regression` override above stays until Phase 58 fixes the `imports.api`
  env-harness suite (QUAL-04..06).
