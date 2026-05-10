// v5.0 — CONS-P1-11: canonical mutating-verb regex shared between the
// `nordic/require-change-log` ESLint rule (require-change-log.js) and the
// mutations-manifest codegen (scripts/generate-mutations-manifest.ts).
//
// Both consumers MUST recognise the same set of prefixes — otherwise lint
// can pass for an export the codegen never includes in the manifest, or the
// codegen lists exports the rule never inspects, breaking the
// change-log-invariants chain.
//
// Format: a JS regex literal (CommonJS export) so the .js ESLint rule can
// require() it as-is, and the .ts codegen can `import` it via TS interop.
//
// Add new mutating prefixes here ONLY — do NOT inline a copy in either
// consumer.
'use strict';

// MED-03 (2026-05-10): added `execute|promote|apply|cancel|stage|parseAndStage`
// because executeImport / promoteAllocations / cancelStaged / parseAndStageActuals
// each mutate domain tables but did not match the prior regex, so the
// require-change-log lint rule silently ignored them. HI-01 / HI-02 fixed
// the missing recordChange calls in those specific functions; this regex
// expansion makes future verbs in the same family fail-loud at lint time.
const MUTATION_PREFIX_REGEX =
  /^(create|update|delete|edit|submit|resubmit|approve|reject|commit|rollback|upsert|archive|withdraw|patch|execute|promote|apply|cancel|stage|parseAndStage|bulk[A-Z]|batch[A-Z])/;

module.exports = { MUTATION_PREFIX_REGEX };
