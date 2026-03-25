# Stack Research

> Researched: 2026-03-25
> Context: Multi-tenant SaaS resource capacity planner for engineering teams (Nordic Capacity)

## Recommended Stack

| Layer | ARCHITECTURE.md Choice | Recommended (March 2026) | Version | Confidence | Action |
|-------|----------------------|--------------------------|---------|------------|--------|
| Framework | Next.js 15 | **Next.js 16.2** | 16.2.x | HIGH | Upgrade |
| Language | TypeScript 5.x | TypeScript 5.x | 5.7+ | HIGH | Keep |
| Database | PostgreSQL 16 on Neon | PostgreSQL 17 on Neon | 17 | HIGH | Upgrade |
| ORM | Drizzle 0.35+ | Drizzle 0.45.x (stable) | 0.45.1 | HIGH | Upgrade, skip v1 beta |
| Auth | Clerk | Clerk (@clerk/nextjs v6) | 6.x | HIGH | Keep |
| Grid | AG Grid Community 32.x | **AG Grid Community 35.x** | 35.2.0 | HIGH | Upgrade |
| Styling | Tailwind CSS 4.x | Tailwind CSS 4.x | 4.1+ | HIGH | Keep |
| State | TanStack Query 5.x | TanStack Query 5.x | 5.95.0 | HIGH | Keep |
| Validation | Zod 3.x | **Zod 4.x** | 4.3.6 | HIGH | Upgrade |
| Excel | SheetJS 0.20+ | SheetJS 0.20.3 (CDN) | 0.20.3 | MEDIUM | Keep, install from CDN |
| Monitoring | Sentry | Sentry (@sentry/nextjs) | latest | HIGH | Keep |
| Hosting | Vercel Pro | Vercel Pro | - | HIGH | Keep |
| CI/CD | GitHub Actions | GitHub Actions | - | HIGH | Keep |
| Linting | (not specified) | **Biome 2.x** or ESLint 9 | 2.3 / 9.x | MEDIUM | Add |
| Testing | (not specified) | **Vitest + Playwright** | latest | HIGH | Add |

## Validation Notes

### Next.js: Upgrade to 16.2 (was 15)

Next.js 16.0 was released October 2025, with 16.2 following in March 2026. **Next.js 15 is now two major versions behind.**

Key reasons to upgrade:
- **Turbopack stable** for both dev and production builds (now the default bundler). ~400% faster `next dev` startup in 16.2.
- **PPR (Partial Pre-Rendering)** is production-ready with cache components.
- **React 19.2** integration with View Transitions and Activity features.
- **Security**: CVE-2025-29927 (critical) requires Next.js 15.2.3+ minimum. CVE-2025-66478 in December 2025. Staying on latest is safest.

Breaking changes from 15 to 16:
- All async request APIs (`cookies()`, `headers()`, `params`, `searchParams`) now **must** be awaited; synchronous access fully removed.
- `middleware.ts` filename deprecated, renamed to `proxy.ts`.
- Automated codemods available: `npx @next/codemod@latest upgrade`.

### TypeScript 5.x: Keep

TypeScript 5.7+ is current and stable. No version change needed. Ensure `strict: true` in tsconfig.

### PostgreSQL on Neon: Upgrade to PG 17

Neon supports PostgreSQL 17 (and is adding 18 support). PG 17 offers better JSON handling and improved query planner. After the Databricks acquisition (May 2025), Neon dropped storage pricing from $1.75 to $0.35/GB-month and doubled free-tier compute. Very favorable economics.

### Drizzle ORM: Use 0.45.x, Skip v1 Beta

Drizzle v1.0.0-beta.2 was released February 2025 but is **explicitly beta** with known breakage. The stable branch is at 0.45.1 (December 2025). Use this.

Key improvements since 0.35:
- Schema introspection reduced from 10s to <1s.
- Validator packages consolidated into drizzle-orm (no separate `drizzle-zod` peer dep needed).
- Identity columns now preferred over serial (PostgreSQL best practice).
- Migration folder structure changed in v1 beta -- avoid until stable.

**Action**: Pin to `drizzle-orm@^0.45.0` and `drizzle-kit@^0.30.0`. Monitor v1 stable release.

### Clerk: Keep, Use @clerk/nextjs v6

@clerk/nextjs v6 is mature and purpose-built for Next.js 15+. Key notes:
- Requires Next.js 15.2.8+ and Node.js 20.9.0+.
- `auth()` is now async (aligns with Next.js async APIs).
- `ClerkProvider` no longer forces dynamic rendering by default -- enables PPR.
- Custom roles and permissions for organizations are **still in Beta**.
- **Platform scenario** (multiple isolated apps per customer) is not yet supported -- not needed for this project.
- The organization_id stored alongside every resource in the DB is the correct multi-tenant pattern.

### AG Grid: Upgrade to 35.x (was 32.x)

AG Grid is now at 35.2.0. Version 32 is three major versions behind. Notable changes:
- v33 had **significant breaking changes** (modularization, reduced bundle size).
- v35 adds filtering named date ranges, formula editor, BigInt support.
- **Codemods available** from v31+ to automate migration.
- Community edition includes: cell editing, clipboard, keyboard nav, sorting, filtering, pagination, custom cell renderers, theming -- sufficient for this project's needs.

**Community vs Enterprise**: Enterprise adds Row Grouping, Pivoting, Master/Detail, Server-Side Row Model, Integrated Charts, AI Toolkit. For a capacity planning grid with ~500 rows and monthly columns, **Community is sufficient**. The main feature you might eventually want is Excel-style export (Enterprise), but SheetJS handles export separately.

### Tailwind CSS 4.x: Keep

Tailwind v4.0 released January 2025, v4.1 April 2025. Current and stable.
- Ground-up rewrite: 5x faster full builds, 100x faster incremental.
- Uses CSS cascade layers, `@property`, and `color-mix()`.
- Simplified setup: single CSS import, zero config.
- No `tailwind.config.js` needed (CSS-first configuration with `@theme`).

### TanStack Query 5.x: Keep

At v5.95.0 and actively maintained. No v6 on the horizon. Features used in this project (optimistic updates, cache invalidation, server state) are all stable.

### Zod: Upgrade to 4.x (was 3.x)

Zod 4.0 released July 2025, currently at 4.3.6. The `zod` npm package from v3.25.0 includes both Zod 3 and 4 at their respective subpaths, enabling gradual migration.

Zod 4 improvements:
- Significantly better performance and smaller bundle size.
- Drizzle ORM integrates with Zod for schema validation (consolidated in recent Drizzle versions).
- Ecosystem dominance vs alternatives (Valibot, ArkType) means best library support.

### SheetJS: Keep, Install from CDN

SheetJS 0.20.3 is the latest. **Important**: The npm `xlsx` package is stale at 0.18.5 (4 years old). Modern versions are distributed via `https://cdn.sheetjs.com`.

Install with:
```bash
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

### Sentry: Keep

@sentry/nextjs has mature Next.js integration with a wizard setup (`npx @sentry/wizard@latest -i nextjs`). Supports:
- Server Components error capture via `onRequestError` hook in `instrumentation.ts`.
- Auto-instrumented routes and API calls.
- Session replay and performance tracing.

Minimum Next.js 13.2.0 required (well below our target).

## Integration Considerations

### Next.js 16 + Clerk

- Clerk v6 was built for Next.js 15+ async APIs. The `auth()` helper is async, matching Next.js 16's fully async request APIs.
- `ClerkProvider` supports PPR mode.
- Middleware file rename: If using Clerk's `clerkMiddleware()`, update the filename from `middleware.ts` to `proxy.ts` when on Next.js 16.

### Next.js 16 + Drizzle + Neon

- Use `@neondatabase/serverless` driver (HTTP for queries, WebSocket for transactions).
- For Server Components/Actions, use HTTP driver (faster for single queries).
- For interactive transactions (e.g., bulk import), use WebSocket driver.
- Drizzle's `neon-http` adapter handles this: `import { drizzle } from 'drizzle-orm/neon-http'`.
- Connection pooling: Neon handles this server-side. No pgBouncer needed.

### AG Grid + TanStack Query

- TanStack Query manages server state; AG Grid manages grid state.
- Pattern: Fetch data with `useQuery`, pass to AG Grid's `rowData`. Use `useMutation` + `queryClient.invalidateQueries()` for writes.
- AG Grid's `onCellValueChanged` callback triggers mutations.
- For auto-save on cell blur: use AG Grid's `stopEditing()` callback to trigger a mutation.

### Drizzle + Zod

- Drizzle v0.45 consolidates validator generation. Use `createInsertSchema()` and `createSelectSchema()` from `drizzle-zod` to auto-generate Zod schemas from Drizzle table definitions.
- When upgrading to Zod 4, verify `drizzle-zod` compatibility (should work from Drizzle 0.45+).

### Tailwind CSS 4 + AG Grid

- AG Grid 35 ships with a theming API. Use AG Grid's `--ag-*` CSS custom properties to align with Tailwind's design tokens.
- Tailwind 4's `@theme` directive can define shared tokens consumed by both Tailwind utilities and AG Grid's theme variables.
- AG Grid's default styles may conflict with Tailwind's reset. Use `@layer` to manage specificity.

### SheetJS + Server Components

- Excel parsing must happen server-side (Server Actions or API routes) for validation against the database.
- SheetJS works in Node.js. Import in server-only code: `import * as XLSX from 'xlsx'`.
- For large files, stream parsing is not supported by SheetJS Community. Files are loaded fully into memory. For the target scale (20-500 resources), this is fine.

### Sentry + Next.js 16

- Sentry wraps `next.config.js` via `withSentryConfig()`. Verify compatibility with Next.js 16's config format.
- For Server Components: use `instrumentation.ts` with `onRequestError` hook.
- Turbopack compatibility: Sentry added Turbopack support. Verify latest `@sentry/nextjs` version works with Turbopack production builds.

## Dev Tooling Recommendations

### Testing

| Tool | Purpose | Install |
|------|---------|---------|
| **Vitest** | Unit + component tests | `pnpm add -D vitest @vitejs/plugin-react jsdom` |
| **React Testing Library** | Component test utilities | `pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event` |
| **Playwright** | E2E tests | `pnpm add -D @playwright/test` |
| **MSW** | API mocking | `pnpm add -D msw` |

Notes:
- Vitest cannot test async Server Components directly. Use Playwright for those.
- MSW 2.x for mocking API routes and external services in tests.

### Linting & Formatting

**Option A: Biome (recommended for new projects)**
- 10-25x faster than ESLint + Prettier.
- Single binary, single config file.
- 97% Prettier-compatible formatting.
- **Caveat**: Does not yet support `eslint-plugin-next` or `eslint-plugin-react-hooks` framework-specific rules.

**Option B: ESLint 9 + Prettier (safer for Next.js)**
- Full `eslint-plugin-next` support for Next.js-specific linting.
- `eslint-plugin-react-hooks` catches hooks rule violations.
- More configuration overhead but complete coverage.

**Recommendation**: Use **ESLint 9 + Prettier** for this project. The Next.js-specific linting rules are valuable enough to justify the setup cost, especially for a solo developer where automated catches prevent bugs.

### Other Dev Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (faster, stricter than npm) |
| **Husky + lint-staged** | Pre-commit hooks for linting/formatting |
| **knip** | Find unused dependencies, exports, and files |
| **tsx** | Run TypeScript scripts directly (for seed scripts, etc.) |
| **dotenv-cli** | Manage environment variables for local dev |

### Recommended package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint && tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## What NOT to Use

| Technology | Reason |
|-----------|--------|
| **Prisma** | Heavier than Drizzle, generates client code, slower cold starts on serverless. Drizzle is the correct choice for Neon serverless. |
| **NextAuth / Auth.js** | More DIY than Clerk for multi-tenant org management. Clerk's organization primitives (invites, roles, org switching) would take weeks to replicate. |
| **Redux / Zustand for server state** | TanStack Query handles server state. Only add Zustand if you need complex client-only UI state (unlikely for this app). |
| **Jest** | Vitest is faster, simpler config, native ESM support. Jest requires more setup for TypeScript + ESM. |
| **Cypress** | Playwright is faster, lighter, better DX for E2E. Cypress has larger bundle and slower execution. |
| **AG Grid Enterprise** | $999/dev. Community edition covers all needed features (cell editing, clipboard, keyboard nav, filtering). Excel export handled by SheetJS. |
| **Drizzle v1 beta** | Explicitly unstable. Known breakage. Use 0.45.x stable until v1 GA. |
| **npm `xlsx` package** | Stale at 0.18.5. Install from SheetJS CDN instead (`cdn.sheetjs.com`). |
| **Supabase** | Tempting but adds unnecessary abstraction over Postgres. Neon is purpose-built for serverless Postgres with better Drizzle integration and lower pricing post-Databricks acquisition. |
| **tRPC** | Adds complexity for a solo-dev project. Next.js Server Actions + API routes with Zod validation achieve the same type safety with less abstraction. |
| **Biome (for this project)** | Missing eslint-plugin-next rules. Use ESLint 9 for full Next.js coverage. Revisit when Biome adds framework support. |

## Summary of Required Changes to ARCHITECTURE.md

1. **Next.js**: 15 -> **16.2** (mandatory for security patches and Turbopack perf)
2. **AG Grid**: 32.x -> **35.x** (3 major versions behind, codemods available)
3. **Drizzle ORM**: 0.35+ -> **0.45.x** (significant improvements, stay on stable)
4. **Zod**: 3.x -> **4.x** (released July 2025, better perf and bundle size)
5. **PostgreSQL**: 16 -> **17** on Neon (better JSON, query planner improvements)
6. **SheetJS**: Note CDN installation requirement
7. **Add**: Vitest + Playwright for testing
8. **Add**: ESLint 9 + Prettier for linting/formatting
9. **Add**: pnpm as package manager

Sources:
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16.2 Blog Post](https://nextjs.org/blog/next-16-2)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Drizzle ORM Latest Releases](https://orm.drizzle.team/docs/latest-releases)
- [Drizzle v1 Upgrade Guide](https://orm.drizzle.team/docs/upgrade-v1)
- [Drizzle + Neon Setup](https://orm.drizzle.team/docs/connect-neon)
- [AG Grid Changelog](https://www.ag-grid.com/changelog/)
- [AG Grid Community vs Enterprise](https://www.ag-grid.com/react-data-grid/community-vs-enterprise/)
- [AG Grid Migration Guide](https://www.ag-grid.com/javascript-data-grid/migration/)
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Clerk Next.js v6](https://clerk.com/changelog/2024-10-22-clerk-nextjs-v6)
- [Clerk Multi-Tenant Architecture](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zod v4 Release Notes](https://zod.dev/v4)
- [SheetJS CDN](https://cdn.sheetjs.com/xlsx/)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Neon Serverless Postgres](https://neon.com/)
- [Neon 2025 Updates](https://dev.to/dataformathub/neon-postgres-deep-dive-why-the-2025-updates-change-serverless-sql-5o0)
- [Biome vs ESLint 2026](https://www.pkgpulse.com/blog/biome-vs-eslint-prettier-linting-2026)
- [Vitest vs Jest 2026](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb)
