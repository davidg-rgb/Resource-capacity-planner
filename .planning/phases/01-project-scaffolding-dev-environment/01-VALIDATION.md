---
phase: 1
slug: project-scaffolding-dev-environment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (Phase 1 has no testable logic — Vitest added in Phase 2) |
| **Config file** | None — Wave 0 installs CI pipeline |
| **Quick run command** | `pnpm lint && pnpm typecheck` |
| **Full suite command** | `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint && pnpm typecheck`
- **After every plan wave:** Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green + Vercel preview deployment succeeds
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-03 | CI | `pnpm build` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-03 | CI | `pnpm lint` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-03 | CI | `pnpm typecheck` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | FOUND-03 | CI | `pnpm format:check` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | FOUND-09 | CI | `pnpm build` (missing env = fail) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/ci.yml` — CI pipeline (core deliverable)
- [ ] `src/lib/env.ts` — env validation config (core deliverable)
- [ ] `.env.example` — env documentation (core deliverable)

*All gaps are core phase deliverables, not pre-existing infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `pnpm dev` shows blank page at localhost:3000 | FOUND-03 | Requires running dev server | Run `pnpm dev`, open browser to localhost:3000 |
| Vercel preview deployment succeeds | FOUND-03 | Requires Vercel project linkage | Push to branch, verify preview URL loads |
| All env vars documented in .env.example | FOUND-09 | Cross-reference against ARCHITECTURE.md 11.2 | Compare `.env.example` keys against Section 11.2 list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
