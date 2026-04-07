import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
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
]);

export default eslintConfig;
