// v5.0 — FOUND-V5-04: RuleTester suite for nordic/require-change-log.
// Lives under src/ so the existing vitest include pattern picks it up.
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('../../../../eslint-rules/require-change-log');

// Wire RuleTester's describe/it into vitest.
// @ts-expect-error — RuleTester exposes these as runtime hooks per eslint docs.
RuleTester.describe = describe;
// @ts-expect-error — see above.
RuleTester.it = it;
// @ts-expect-error — see above.
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('nordic/require-change-log', rule, {
  valid: [
    {
      name: 'mutating export that calls recordChange passes',
      code: `
        export async function createFoo() {
          await recordChange({}, tx);
          return 1;
        }
      `,
    },
    {
      name: '@no-change-log escape hatch with a reason passes',
      code: `
        /** @no-change-log legacy v4 service wrapper; audit deferred to Phase 44 */
        export async function createFoo() {
          return 1;
        }
      `,
    },
    {
      name: 'non-mutating verb is ignored',
      code: `
        export async function fetchFoo() {
          return 1;
        }
      `,
    },
    {
      name: 'sync function is ignored even if name matches mutating verb',
      code: `
        export function createFoo() {
          return 1;
        }
      `,
    },
    {
      name: 'arrow mutating export that calls recordChange passes',
      code: `
        export const updateBar = async () => {
          await recordChange({}, tx);
        };
      `,
    },
  ],
  invalid: [
    {
      name: 'mutating export without recordChange and no escape hatch fails',
      code: `
        export async function createFoo() {
          return 1;
        }
      `,
      errors: [{ messageId: 'missingRecordChange' }],
    },
    {
      name: '@no-change-log without a reason is still reported',
      code: `
        /** @no-change-log */
        export async function createFoo() {
          return 1;
        }
      `,
      errors: [{ messageId: 'escapeHatchNeedsReason' }],
    },
    {
      name: 'arrow mutating export without recordChange fails',
      code: `
        export const deleteBar = async () => {
          return 1;
        };
      `,
      errors: [{ messageId: 'missingRecordChange' }],
    },
  ],
});
