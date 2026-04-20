---
phase: 50
slug: persona-aware-landing-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` (root) + `e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test <pattern>` |
| **Full suite command** | `pnpm test && pnpm playwright test` |
| **Estimated runtime** | Quick: <10s per file · Full Vitest: ~2min · Full E2E: ~5min |

---

## Sampling Rate

- **After every task commit:** `pnpm test <changed-file-pattern>` (fast Vitest run for affected files)
- **After every plan wave:** `pnpm test && pnpm lint` (full Vitest + ESLint, <2 min)
- **Before `/gsd-verify-work`:** `pnpm test && pnpm playwright test` (full suite, ≤5 min)
- **Max feedback latency:** ~10 seconds per task commit

---

## Per-NAV Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| NAV-01 | Root `/` redirects to persona landing when flag on | unit + E2E | `pnpm test src/app` | ⚠ verify first | ⬜ pending |
| NAV-02 | SECTION_NAV persona-scoped items for 5 personas | unit | `pnpm test src/components/layout` | ⚠ verify first | ⬜ pending |
| NAV-03 | Breadcrumb "Home" link resolves to persona landing | unit | `pnpm test src/components/layout` | ⚠ verify first | ⬜ pending |
| NAV-04 | Persona switcher grouped select with edge cases | unit | `pnpm test src/components/persona/__tests__/persona-switcher.test.tsx` | ✅ (existing) | ⬜ pending |
| NAV-05 | 18 i18n keys in sv.json + en.json | unit | `jq` verification | N/A (jq check) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `src/components/persona/__tests__/persona-switcher.test.tsx` exists (Phase 49 confirmed)
- [ ] Verify `src/components/layout/__tests__/side-nav.test.tsx` exists — if missing, add covering persona-scoped sections
- [ ] Verify feature flag infrastructure test file exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual sidebar layout per persona | NAV-02 | Layout correctness requires visual inspection | Sign in, switch personas, verify sidebar items match spec |
| Breadcrumb "Home" navigates correctly | NAV-03 | Navigation flow is best verified in browser | Click Home breadcrumb from each persona's subpage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
