---
phase: 56
updated: 2026-05-31T12:18:15.600Z
overrides:
  - gate: "regression"
    reason: "The only failing suite (src/app/api/v5/imports/__tests__/imports.api.test.ts) throws at import on missing test env vars (createEnv validation in src/lib/env.ts), not a runtime failure. Verified identical to the pre-Phase-56 baseline at session start (1095 passed, same single suite failing) and after Phase 56 (1101 passed, same single suite failing) — NOT a regression introduced by this phase. Same env-harness gap Phase 54 overrode; tracked for Phase 58 (QUAL-04..06)."
    accepted_by: "david"
    accepted_at: "2026-05-31T12:18:15.599Z"
---

# Execution Gate Overrides

Auditable record of execution-phase quality gates that were intentionally accepted past a
failure, with a reason and an owner — the same escape the verifier uses for must-haves. Each
entry means: for this phase, the named gate was allowed to fail knowingly.

See `~/.claude/scripts/README.md` and `~/.claude/definition-of-done.md`.
