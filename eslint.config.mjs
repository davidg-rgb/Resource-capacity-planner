import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import nordic from './eslint-rules/index.js';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  // eslint-rules/ is CommonJS; TS rules about require() do not apply there.
  {
    files: ['eslint-rules/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // FOUND-V5-04: universal change_log enforcement.
  // Phase 35 include list — later v5 feature dirs MUST extend BOTH this list
  // AND the INCLUDE constant in scripts/generate-mutations-manifest.ts. Keep
  // them in sync; drift between the eslint rule and the codegen is a footgun.
  {
    files: [
      'src/features/change-log/**/*.service.ts',
      'src/features/actuals/**/*.service.ts',
      'src/features/import/**/*.service.ts',
      // v5.0 — Phase 43 / Plan 43-01: admin register coverage (ADM-03).
      'src/features/admin/**/*.service.ts',
    ],
    plugins: { nordic },
    rules: { 'nordic/require-change-log': 'error' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // FOUND-V5-01: lib/time/ is the sole source of truth for ISO week math and
  // day-of-week decisions. Block direct date-fns week helpers and Date#getDay()
  // outside lib/time/. (TC-CAL-008)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/time/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'date-fns',
              message:
                "Import week/date helpers from '@/lib/time' instead. date-fns week APIs default to US conventions; lib/time enforces ISO 8601.",
            },
            {
              name: 'date-fns/getWeek',
              message: "Use getISOWeek from '@/lib/time'.",
            },
            {
              name: 'date-fns/getISOWeek',
              message: "Use getISOWeek from '@/lib/time'.",
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='getDay']",
          message:
            "Do not use Date#getDay() for day-of-week decisions outside lib/time/. Use helpers from '@/lib/time'. (Sunday=0 trap; ISO weeks start Monday.)",
        },
      ],
    },
  },
  // FOUND-V5-05: v5 component/screen folders must not contain hardcoded
  // user-facing text. Use useTranslations('v5.*') with a key from
  // '@/messages/keys'. Escape hatch: add
  // `// eslint-disable-next-line no-restricted-syntax -- @i18n-allow-literal <reason>`
  // immediately above the line.
  // This block is placed AFTER the broader src/** block so its rule overrides
  // the getDay-only rule for the v5 file globs (later wins in flat config).
  {
    files: [
      'src/app/pm/**/*.{ts,tsx}',
      'src/app/line-manager/**/*.{ts,tsx}',
      'src/app/staff/**/*.{ts,tsx}',
      'src/app/rd/**/*.{ts,tsx}',
      'src/app/admin/**/*.{ts,tsx}',
      'src/components/timeline/**/*.{ts,tsx}',
      'src/components/approval/**/*.{ts,tsx}',
      'src/components/drawer/**/*.{ts,tsx}',
      'src/components/dialogs/**/*.{ts,tsx}',
      'src/components/persona/**/*.{ts,tsx}',
    ],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='getDay']",
          message:
            "Do not use Date#getDay() for day-of-week decisions outside lib/time/. Use helpers from '@/lib/time'. (Sunday=0 trap; ISO weeks start Monday.)",
        },
        {
          selector: 'JSXText[value=/[\\p{L}]/u]',
          message:
            "v5 components must not contain hardcoded user-facing text. Use useTranslations('v5.*') with a key from '@/messages/keys'. Escape hatch: // eslint-disable-next-line no-restricted-syntax -- @i18n-allow-literal <reason>",
        },
      ],
    },
  },
  // v5.0 — Phase 44 / Plan 44-02 (API-V5-01): AppError taxonomy guard.
  // Forbid `throw new Error(...)` inside v5 API routes and feature services.
  // Every error path must flow through a typed AppError subclass from
  // '@/lib/errors' so the documented error-code wire contract is preserved.
  {
    files: ['src/app/api/v5/**/*.ts', 'src/features/**/*.service.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ThrowStatement[argument.type='NewExpression'][argument.callee.name='Error']",
          message:
            "Throw AppError subclasses from '@/lib/errors', not raw Error. v5 API contract requires typed error codes.",
        },
      ],
    },
  },
]);

export default eslintConfig;
