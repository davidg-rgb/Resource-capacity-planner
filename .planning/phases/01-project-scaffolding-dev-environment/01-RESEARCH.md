# Phase 1: Project Scaffolding & Dev Environment - Research

**Researched:** 2026-03-26
**Domain:** Next.js 16 project scaffolding, CI/CD, environment validation, dev tooling
**Confidence:** HIGH

## Summary

Phase 1 creates a running Next.js 16 application with TypeScript, Tailwind CSS 4, ESLint, Prettier, CI pipeline, and environment variable validation -- deployed to Vercel. This is a greenfield scaffolding phase with zero external service dependencies beyond Vercel and GitHub.

The primary technical decisions are already locked by the STACK.md research and ARCHITECTURE.md blueprint. The key subtleties are: (1) Next.js 16 renames `middleware.ts` to `proxy.ts` and runs on Node.js runtime instead of Edge, (2) Tailwind CSS 4 uses CSS-first configuration with `@theme` instead of `tailwind.config.js`, (3) TypeScript 6.0 is now available but introduces breaking changes -- recommend pinning to 5.7.x for ecosystem stability, and (4) environment validation via `@t3-oss/env-nextjs` with Zod fulfills FOUND-09.

**Primary recommendation:** Use `pnpm create next-app` with TypeScript, Tailwind, ESLint, App Router, and Turbopack defaults. Layer on Prettier, Husky, lint-staged, and `@t3-oss/env-nextjs` manually. Set up GitHub Actions CI and Vercel deployment.

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                   | Research Support                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FOUND-03 | Next.js 16 project setup with App Router, TypeScript, Tailwind CSS 4          | `create-next-app` 16.2.1 scaffolds all three by default. Turbopack is the default bundler. `proxy.ts` replaces `middleware.ts`. Tailwind 4 uses CSS-first `@theme` config.    |
| FOUND-09 | Environment configuration -- all env vars documented and validated at startup | `@t3-oss/env-nextjs` 0.13.11 + Zod 4.3.6 validates env at build time and runtime. ARCHITECTURE.md Section 11.2 lists all 20 env vars. `.env.example` template documents them. |

</phase_requirements>

## Standard Stack

### Core

| Library           | Version | Purpose                                    | Why Standard                                                                                                                                                                                   |
| ----------------- | ------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next              | 16.2.1  | Full-stack React framework with App Router | Latest stable, Turbopack default, security patches                                                                                                                                             |
| react / react-dom | 19.x    | UI library                                 | Required by Next.js 16                                                                                                                                                                         |
| typescript        | 5.7.x   | Type safety                                | TS 6.0 has breaking changes (removed `moduleResolution: classic`, mandatory strict mode). Pin to 5.7 for ecosystem compatibility. Upgrade to 6.x in later phase when all deps confirm support. |
| tailwindcss       | 4.2.2   | Utility-first CSS                          | CSS-first config with `@theme`, no `tailwind.config.js` needed                                                                                                                                 |
| zod               | 4.3.6   | Schema validation                          | Env var validation, later used for API schemas. Zod 4 has better perf and smaller bundle.                                                                                                      |

### Supporting

| Library                     | Version | Purpose                                   | When to Use                                                               |
| --------------------------- | ------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| @t3-oss/env-nextjs          | 0.13.11 | Type-safe environment variable validation | Fulfills FOUND-09. Validates at build + runtime. Supports Zod 4.          |
| eslint                      | 10.1.0  | Linting                                   | Flat config format (ESLint 9+). Next.js 16 includes `eslint-config-next`. |
| eslint-config-next          | 16.2.1  | Next.js-specific lint rules               | Catches Image, Link, font, metadata issues                                |
| prettier                    | 3.8.1   | Code formatting                           | Consistent formatting across project                                      |
| prettier-plugin-tailwindcss | latest  | Tailwind class sorting                    | Auto-sorts utility classes                                                |
| husky                       | 9.1.7   | Git hooks                                 | Pre-commit hook runs lint + format                                        |
| lint-staged                 | 16.4.0  | Staged file linting                       | Only lint changed files on commit                                         |
| @types/node                 | latest  | Node.js type definitions                  | Required for server-side code                                             |
| @types/react                | latest  | React type definitions                    | Required by TypeScript                                                    |
| @types/react-dom            | latest  | React DOM type definitions                | Required by TypeScript                                                    |

### Alternatives Considered

| Instead of         | Could Use         | Tradeoff                                                                                                                                                                                      |
| ------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript 5.7     | TypeScript 6.0    | TS 6 removes `moduleResolution: classic`, deprecates ES3/ES5 targets, changes `types` defaults. Ecosystem (Drizzle, Clerk, AG Grid) may not all be validated against TS 6 yet. Upgrade later. |
| ESLint + Prettier  | Biome 2.x         | Biome is 10-25x faster but lacks `eslint-plugin-next` rules. Not worth the tradeoff for this project.                                                                                         |
| @t3-oss/env-nextjs | Manual validation | t3-env is battle-tested, integrates with build pipeline, catches issues at deploy time instead of runtime.                                                                                    |

**Installation:**

```bash
pnpm create next-app nordic-capacity --typescript --tailwind --eslint --app --turbopack --use-pnpm
cd nordic-capacity
pnpm add zod @t3-oss/env-nextjs
pnpm add -D prettier prettier-plugin-tailwindcss husky lint-staged @types/node
```

**Version verification:** All versions verified against npm registry on 2026-03-26.

## Architecture Patterns

### Recommended Project Structure (Phase 1 Only)

Phase 1 creates the skeleton. Most directories will be empty or contain placeholder files. Only the scaffolding, config, and env validation need to be functional.

```
nordic-capacity/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint + type-check + build on PR
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout: fonts, Tailwind global CSS
│   │   └── page.tsx                  # Blank placeholder page
│   ├── lib/
│   │   └── env.ts                    # @t3-oss/env-nextjs configuration
│   └── proxy.ts                      # Next.js 16 proxy file (was middleware.ts)
├── public/                           # Static assets
├── .env.example                      # All env vars documented with descriptions
├── .env.local                        # Local dev env vars (git-ignored)
├── .eslintrc.json                    # OR eslint.config.mjs (flat config)
├── .prettierrc                       # Prettier config
├── .prettierignore                   # Prettier ignore patterns
├── next.config.ts                    # Next.js config (TypeScript native)
├── tsconfig.json                     # TypeScript config
├── package.json                      # Scripts: dev, build, lint, format, typecheck
└── pnpm-lock.yaml                    # Lockfile
```

### Pattern 1: proxy.ts Instead of middleware.ts (Next.js 16 Breaking Change)

**What:** Next.js 16 renames `middleware.ts` to `proxy.ts`. The proxy runs on Node.js runtime (not Edge). This is a significant change from Next.js 15.

**When to use:** Always in Next.js 16 projects. The `middleware.ts` filename still works but is deprecated and will be removed.

**Example:**

```typescript
// src/proxy.ts (was middleware.ts in Next.js 15)
// Phase 1: minimal -- just export config. Clerk auth added in Phase 3.
export { default } from 'next/proxy';

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Source:** [Next.js 16 middleware to proxy migration](https://nextjs.org/docs/messages/middleware-to-proxy)

### Pattern 2: Tailwind CSS 4 CSS-First Configuration

**What:** Tailwind 4 eliminates `tailwind.config.js`. All customization happens in CSS using `@theme`.

**When to use:** All styling configuration.

**Example:**

```css
/* src/app/globals.css */
@import 'tailwindcss';

@theme {
  /* Nordic Precision design tokens from ARCHITECTURE.md */
  --color-primary: #496173;
  --color-surface: #fafcff;
  --color-surface-container: #eef1f6;
  --color-surface-container-low: #f3f5fa;
  --color-error: #ba1a1a;
  --color-outline-variant: #c3c7cf;

  --font-headline: 'Manrope', sans-serif;
  --font-body: 'Inter', sans-serif;

  --radius-sm: 2px;
  --radius-md: 6px;
}
```

### Pattern 3: Environment Variable Validation with @t3-oss/env-nextjs

**What:** Type-safe env var validation at build time and runtime. Crashes the build if required vars are missing.

**When to use:** FOUND-09 requires this. Every env var from ARCHITECTURE.md Section 11.2 must be declared and validated.

**Example:**

```typescript
// src/lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    PLATFORM_ADMIN_SECRET: z.string().min(64),
    SENTRY_DSN: z.string().url().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/input'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/onboarding'),
  },
  // For Next.js >= 13.4.4
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  },
});
```

**Important:** Import `env` in `next.config.ts` to trigger build-time validation:

```typescript
// next.config.ts
import './src/lib/env.ts';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};
export default nextConfig;
```

### Pattern 4: ESLint Flat Config for Next.js 16

**What:** ESLint 9+ uses flat config format. Next.js 16 ships with `eslint-config-next` that supports it.

**Example:**

```javascript
// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Project-specific overrides
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

export default eslintConfig;
```

### Anti-Patterns to Avoid

- **Creating `tailwind.config.js`:** Tailwind 4 does not need this file. Use `@theme` in CSS. A config file will cause confusion.
- **Using `middleware.ts`:** Deprecated in Next.js 16. Use `proxy.ts` from the start.
- **Hardcoding env vars:** Every env var must go through `@t3-oss/env-nextjs`. Never use `process.env.X` directly.
- **Using `npm` instead of `pnpm`:** The project uses pnpm. Lock file format matters.
- **Skipping TypeScript strict mode:** `strict: true` must be in `tsconfig.json` from day one.

## Don't Hand-Roll

| Problem            | Don't Build                               | Use Instead                          | Why                                                                       |
| ------------------ | ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| Env var validation | Manual `if (!process.env.X) throw` checks | `@t3-oss/env-nextjs` + Zod           | Build-time + runtime validation, type inference, client/server separation |
| CSS class sorting  | Manual ordering conventions               | `prettier-plugin-tailwindcss`        | Automatic, consistent, zero effort                                        |
| Pre-commit checks  | Manual `git diff` scripts                 | Husky + lint-staged                  | Standard, well-tested, fast (only staged files)                           |
| CI pipeline        | Custom shell scripts                      | GitHub Actions with official actions | `actions/setup-node`, `actions/cache` handle caching and setup            |

## Common Pitfalls

### Pitfall 1: TypeScript 6.0 Breaking Changes

**What goes wrong:** Installing the latest TypeScript (6.0.2) causes `moduleResolution` errors, missing type definitions, and build failures with older libraries.
**Why it happens:** TS 6 removes `moduleResolution: classic`, changes `types` array defaults to empty, and enforces strict mode unconditionally.
**How to avoid:** Pin `typescript` to `~5.7.0` in `package.json`. The STACK.md research also recommends 5.x.
**Warning signs:** Errors about missing globals (`setTimeout`, `console`), unexpected strict mode behavior.

### Pitfall 2: proxy.ts vs middleware.ts Confusion

**What goes wrong:** Creating `middleware.ts` works but logs deprecation warnings. Documentation and examples may still reference the old name.
**Why it happens:** Next.js 16 renamed the file but maintains backwards compatibility temporarily.
**How to avoid:** Use `proxy.ts` from the start. Set up the file in the scaffolding task.
**Warning signs:** Console warnings about deprecated middleware filename.

### Pitfall 3: Tailwind 4 Configuration Confusion

**What goes wrong:** Developer creates `tailwind.config.ts` and wonders why customizations don't apply, or finds conflicting config approaches.
**Why it happens:** Tailwind 4 changed to CSS-first configuration. Most tutorials and AI training data reference Tailwind 3's JavaScript config.
**How to avoid:** Use `@theme` directive in `globals.css` for all customization. Do not create any Tailwind config file.
**Warning signs:** Duplicate token definitions, config file that seems to have no effect.

### Pitfall 4: env.ts Not Imported in next.config.ts

**What goes wrong:** Environment validation only runs at runtime, not build time. Missing vars slip through to production.
**Why it happens:** `@t3-oss/env-nextjs` needs to be imported as a side effect in `next.config.ts` to validate during `next build`.
**How to avoid:** Add `import "./src/lib/env.ts"` as the first line of `next.config.ts`.
**Warning signs:** Successful builds with missing env vars. Runtime crashes in production.

### Pitfall 5: Vercel Environment Variables Not Set

**What goes wrong:** Build passes locally but fails on Vercel because env vars aren't configured in the Vercel dashboard.
**Why it happens:** `.env.local` exists locally but isn't deployed. Vercel needs vars set in its dashboard or CLI.
**How to avoid:** Phase 1 `.env.example` must document every var. For Phase 1 (no DB, no Clerk yet), use `.optional()` on vars not yet needed. Add a Vercel setup task.
**Warning signs:** Vercel build fails with Zod validation errors about missing environment variables.

### Pitfall 6: pnpm Not Detected by Vercel

**What goes wrong:** Vercel defaults to npm, ignoring pnpm-lock.yaml and causing dependency resolution issues.
**Why it happens:** Vercel auto-detects package manager from lock file, but sometimes needs explicit configuration.
**How to avoid:** Add `"packageManager": "pnpm@9.x.x"` to `package.json` (corepack format). Alternatively, set the Vercel project to use pnpm explicitly.
**Warning signs:** Vercel using npm install instead of pnpm install. Different dependency tree in production.

## Code Examples

### GitHub Actions CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Format check
        run: pnpm format:check

      - name: Build
        run: pnpm build
        env:
          # Provide dummy values for build-time env validation
          DATABASE_URL: 'postgresql://dummy:dummy@localhost:5432/dummy'
          CLERK_SECRET_KEY: 'sk_test_dummy'
          CLERK_WEBHOOK_SECRET: 'whsec_dummy'
          PLATFORM_ADMIN_SECRET: 'a]dummy-secret-that-is-at-least-sixty-four-characters-long-for-validation'
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_dummy'
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}
```

### .env.example (FOUND-09)

```bash
# =============================================================================
# Nordic Capacity - Environment Variables
# =============================================================================
# Copy to .env.local and fill in values for local development.
# All required vars are validated at build time via @t3-oss/env-nextjs.
# =============================================================================

# --- Database (Neon PostgreSQL) ---
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/nordic_capacity?sslmode=require"

# --- Clerk Authentication ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# --- Clerk Routes ---
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/input"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# --- Application ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# --- Platform Admin (Separate from Clerk) ---
PLATFORM_ADMIN_SECRET="generate-a-64-char-random-string-here-use-openssl-rand-base64-48"

# --- Monitoring (optional in development) ---
SENTRY_DSN=""

# --- Optional Tuning ---
# IMPORT_MAX_FILE_SIZE_MB=10
# IMPORT_SESSION_TTL_HOURS=24
# AUTOSAVE_DEBOUNCE_MS=300
# PLATFORM_ADMIN_TOKEN_EXPIRY=8h
# IMPERSONATION_MAX_DURATION_MINUTES=60
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Husky + lint-staged Setup

```json
// package.json (partial)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

```bash
# Setup commands (run after pnpm install)
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```

## State of the Art

| Old Approach            | Current Approach           | When Changed                | Impact                                                               |
| ----------------------- | -------------------------- | --------------------------- | -------------------------------------------------------------------- |
| `middleware.ts` (Edge)  | `proxy.ts` (Node.js)       | Next.js 16.0 (Oct 2025)     | Must use `proxy.ts` filename. Node.js runtime gives full API access. |
| `tailwind.config.js`    | CSS `@theme` directive     | Tailwind CSS 4.0 (Jan 2025) | No config file needed. Theme in CSS.                                 |
| ESLint `.eslintrc.json` | `eslint.config.mjs` (flat) | ESLint 9.0 (2024)           | Flat config is default. Next.js 16 supports it.                      |
| TypeScript 5.x          | TypeScript 6.0 available   | Feb 2026                    | TS 6 has breaking changes. Pin to 5.7 for now.                       |
| `@clerk/nextjs` v6      | `@clerk/nextjs` v7         | 2026                        | v7 is latest. Check compatibility before installing.                 |

**Deprecated/outdated:**

- `middleware.ts` filename: Use `proxy.ts` instead
- `tailwind.config.js`: Use `@theme` in CSS instead
- TypeScript `moduleResolution: classic`: Removed in TS 6, already not recommended in TS 5
- `.eslintrc.json`: Flat config (`eslint.config.mjs`) is the new default

## Open Questions

1. **@clerk/nextjs v7 vs v6**
   - What we know: npm shows @clerk/nextjs is now at 7.0.7. STACK.md recommended v6.
   - What's unclear: Whether v7 has breaking changes from v6 that affect our setup.
   - Recommendation: Phase 1 does not install Clerk (that's Phase 3). Research v7 during Phase 3 research. For now, note the version jump.

2. **TypeScript 5.7 vs 6.0 for Next.js 16**
   - What we know: TS 6 is latest on npm. Next.js 16 probably supports it. TS 6 has breaking changes.
   - What's unclear: Whether `create-next-app` 16.2.1 installs TS 5.x or 6.x by default.
   - Recommendation: Explicitly pin `typescript: "~5.7.0"` in `package.json` after scaffolding. If `create-next-app` installs TS 6, downgrade.

3. **Phase 1 env vars -- which are optional?**
   - What we know: FOUND-09 says "all env vars documented and validated at startup." But Phase 1 has no DB, no Clerk, no Sentry.
   - What's unclear: Should validation fail when these services aren't configured yet?
   - Recommendation: Mark service-specific vars as `.optional()` in Phase 1 env.ts. Override to `.min(1)` (required) when each service is integrated in its respective phase.

## Environment Availability

| Dependency     | Required By         | Available | Version | Fallback                   |
| -------------- | ------------------- | --------- | ------- | -------------------------- |
| Node.js        | Next.js 16          | Yes       | 24.12.0 | --                         |
| pnpm           | Package management  | Yes       | 11.6.2  | --                         |
| Git            | Version control     | Yes       | 2.53.0  | --                         |
| GitHub CLI     | CI/deployment setup | Yes       | 2.83.2  | --                         |
| Vercel account | Deployment          | Unknown   | --      | Must verify account exists |

**Missing dependencies with no fallback:** None detected.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property           | Value                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | Vitest (not installed in Phase 1 -- added in Phase 2)            |
| Config file        | None -- Phase 1 has no testable logic beyond build success       |
| Quick run command  | `pnpm build` (validates TypeScript + env)                        |
| Full suite command | `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build` |

### Phase Requirements to Test Map

| Req ID   | Behavior                                            | Test Type | Automated Command                                  | File Exists?                       |
| -------- | --------------------------------------------------- | --------- | -------------------------------------------------- | ---------------------------------- |
| FOUND-03 | Next.js 16 app runs with App Router + TS + Tailwind | smoke     | `pnpm dev` then `curl localhost:3000`              | N/A -- manual                      |
| FOUND-03 | Build succeeds with zero errors                     | CI        | `pnpm build`                                       | Wave 0: `.github/workflows/ci.yml` |
| FOUND-03 | ESLint passes with zero errors                      | CI        | `pnpm lint`                                        | Wave 0: `.github/workflows/ci.yml` |
| FOUND-03 | TypeScript compiles with zero errors                | CI        | `pnpm typecheck`                                   | Wave 0: `.github/workflows/ci.yml` |
| FOUND-03 | Prettier formatting passes                          | CI        | `pnpm format:check`                                | Wave 0: `.github/workflows/ci.yml` |
| FOUND-09 | Missing required env var causes build failure       | CI        | `pnpm build` (without env vars should fail)        | Wave 0: `src/lib/env.ts`           |
| FOUND-09 | All env vars documented                             | manual    | Review `.env.example` against ARCHITECTURE.md 11.2 | N/A                                |

### Sampling Rate

- **Per task commit:** `pnpm lint && pnpm typecheck`
- **Per wave merge:** `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`
- **Phase gate:** Full CI workflow green + Vercel preview deployment succeeds

### Wave 0 Gaps

- [ ] `.github/workflows/ci.yml` -- CI pipeline (core deliverable of this phase)
- [ ] `src/lib/env.ts` -- env validation config (core deliverable of this phase)
- [ ] `.env.example` -- env documentation (core deliverable of this phase)

_(All gaps are core phase deliverables, not pre-existing infrastructure)_

## Sources

### Primary (HIGH confidence)

- npm registry -- verified all package versions on 2026-03-26
- [Next.js 16 middleware to proxy migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 blog post](https://nextjs.org/blog/next-16)
- [Tailwind CSS v4 release](https://tailwindcss.com/blog/tailwindcss-v4)
- [T3 Env documentation](https://env.t3.gg/docs/nextjs)
- [TypeScript 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [TypeScript 5.x to 6.0 migration guide](https://gist.github.com/privatenumber/3d2e80da28f84ee30b77d53e1693378f)

### Secondary (MEDIUM confidence)

- ARCHITECTURE.md Section 5 (project structure) and Section 11.2 (env vars)
- STACK.md research (2026-03-25)

### Tertiary (LOW confidence)

- @clerk/nextjs v7 compatibility with Next.js 16 (not verified -- deferred to Phase 3)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all versions verified against npm registry, official docs consulted
- Architecture: HIGH - project structure defined in ARCHITECTURE.md, scaffolding is well-understood
- Pitfalls: HIGH - Next.js 16 proxy.ts rename, Tailwind 4 config change, and TS 6 breaking changes are well-documented

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain, 30-day validity)
