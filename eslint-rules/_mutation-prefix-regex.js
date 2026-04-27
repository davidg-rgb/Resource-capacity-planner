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

const MUTATION_PREFIX_REGEX =
  /^(create|update|delete|edit|submit|resubmit|approve|reject|commit|rollback|upsert|archive|withdraw|patch|bulk[A-Z]|batch[A-Z])/;

module.exports = { MUTATION_PREFIX_REGEX };
