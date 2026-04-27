# Next-session handoff — Neon MCP setup + prod migrations

**Created:** 2026-04-28
**For:** next session (probably 2026-04-29)
**Goal:** wire up Neon MCP so Claude can execute SQL against prod Neon, then run the 4 outstanding migrations from `SESSION-2026-04-28-prod-migrations.md`.

This doc is **the first thing to do next session.** It supersedes the "Pending: prod migration session" step in `HANDOFF-2026-04-28.md`.

---

## Why MCP over `psql`/`neonctl`

- **Persistent across sessions.** Once configured, every future Claude session in this project has Neon access. No re-pasting credentials, no shell-history exposure.
- **Scoped credentials.** A Neon API key can be project-scoped, so the blast radius is one project (the resource-capacity-planner one), not the whole org.
- **Auditable.** Every SQL execution shows up as a tool-call in the transcript. Easier to review than ad-hoc `psql` blocks.
- **Reusable for the recurring audit (option 3 from main handoff).** A scheduled audit agent can query the prod schema/data via the same MCP without needing prompt-time secrets.

---

## Step 1 — Get a Neon API key (you do this in the Neon console)

1. Log in to [console.neon.tech](https://console.neon.tech).
2. Top-right avatar → **Account settings** → **API keys**.
3. Click **Create new API key**.
4. Name it: `claude-mcp-resource-planner` (or similar).
5. Scope:
   - **If your Neon plan supports project-scoped keys** (Pro+): scope to the resource-capacity-planner project only.
   - **If only account-scoped keys are available** (Free/Launch): account-scoped is fine; the MCP commands we'll use are bounded to the project we tell it about.
6. Copy the key value. **You only see it once.** Paste into a password manager OR keep the browser tab open until step 4 below.

**Don't paste the key into chat.** I'll read it from the MCP config in step 4, not from your messages.

---

## Step 2 — Confirm the Neon project ID

In the Neon console, navigate to the project. The URL looks like:
```
https://console.neon.tech/app/projects/<PROJECT-ID>
```

`<PROJECT-ID>` is a string like `dawn-frost-12345678`. Copy it; we'll need it in step 4.

Also note the **default branch** name. Usually `main` or `production` — confirm whichever points at the prod data.

---

## Step 3 — Find the Neon MCP server package

Neon publishes their official MCP server. As of 2026-04, the package is:

```
@neondatabase/mcp-server-neon
```

(If the name has changed by next session, search Neon docs for "MCP" or check `https://neon.tech/docs/ai/neon-mcp-server`. The transport is stdio.)

You don't install it — Claude Code's MCP runner uses `npx` or `pnpm dlx` to fetch it on demand.

---

## Step 4 — Configure Claude Code MCP

Two scopes to choose from:

### Option A — Project-scoped (recommended)

Add to `D:\Kod Projekt\Resurs & Projektplanering\.mcp.json` (create the file if it doesn't exist):

```json
{
  "mcpServers": {
    "neon": {
      "command": "pnpm",
      "args": ["dlx", "@neondatabase/mcp-server-neon"],
      "env": {
        "NEON_API_KEY": "<paste-the-key-here>"
      }
    }
  }
}
```

This keeps the MCP available only when working in this project. The `.mcp.json` file is committed by default (Claude Code reads it from working dir) — **add it to `.gitignore` first** so the API key doesn't land in the repo:

```bash
echo ".mcp.json" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .mcp.json (contains Neon API key)"
```

### Option B — User-scoped (works in every project)

Add to `C:\Users\david\.claude.json` (or wherever your Claude Code user config lives) under the `mcpServers` key. Same shape as above. Use this if you want Neon access across all projects on this machine.

**Recommended:** Option A. It scopes the credential to this repo and makes ownership obvious if the laptop changes hands.

---

## Step 5 — Restart Claude Code

MCP servers are loaded at session start. Quit and relaunch Claude Code (or just start a new session in this project). Open the new session with:

> "Read `.planning/HANDOFF-NEON-MCP-SETUP.md` and continue from Step 6."

---

## Step 6 — Verify the MCP loaded

In the new session, the MCP tools appear with the prefix `mcp__neon__`. I'll check by running:

- `mcp__neon__list_projects` (or equivalent — exact tool names depend on the MCP server version)
- Pick the resource-capacity-planner project
- `mcp__neon__list_branches` to confirm I see the prod branch

If the tools don't appear:
- Check `.mcp.json` JSON syntax (one missing comma kills the file)
- Check the API key is valid (try it via `curl https://console.neon.tech/api/v2/projects -H "Authorization: Bearer $NEON_API_KEY"` from a terminal)
- Check `pnpm dlx @neondatabase/mcp-server-neon --help` runs cleanly outside Claude

---

## Step 7 — Dry-run on a Neon branch

**Before touching prod**, create a Neon branch from prod and apply the 4 migrations there. Neon branches are zero-cost copy-on-write — perfect for verifying migrations don't break before applying to main.

```
mcp__neon__create_branch({ project_id, parent: "main", name: "audit-r4-dry-run-2026-04-29" })
```

Then run the 4 SQL blocks from `.planning/runbooks/SESSION-2026-04-28-prod-migrations.md` against the new branch via the MCP's `run_sql` tool. Confirm:
- Pre-counts captured
- Post-counts are 0 for all 3 polish migrations
- CHECK constraint exists after migration 4
- Idempotence re-run shows 0 row updates

If anything fails, debug on the branch (no prod impact). Once green, delete the branch and proceed to Step 8.

---

## Step 8 — Apply to prod

With dry-run green, point the MCP at the prod branch and run the same 4 SQL blocks. Same verification queries. Capture the result table.

After execution, I'll close out the audit trail:
- `.planning/phases/53-chrome-polish/53-HUMAN-UAT.md` Test 3 → `pass` with date + operator
- `.planning/STATE.md` Deferred Items → drop the prod-DB-rowcount row
- `.planning/MILESTONES.md` v6.0 entry → "Test 3 closure 2026-04-29"

---

## Step 9 — Set up the recurring audit (option 3 from main handoff)

With Neon MCP in place, the recurring audit (option 3b from `HANDOFF-2026-04-28.md`) can include a schema-drift check against prod, not just the source code. Worth adding to the audit prompt:

> "Round 0 (NEW): query prod schema via mcp__neon__describe_table for each table in `src/db/schema.ts`. Compare column types/constraints to the Drizzle schema. Flag any drift as P0."

This catches the case where someone applies a migration via Neon console but forgets to commit the corresponding Drizzle change.

Trigger this with:

```
/schedule create
- name: pre-ship-audit
- cadence: every 2 weeks
- task: "Run a 1-round code-vs-architecture audit. Spawn 4 parallel scanners (ARCHITECTURE.md / v5.0-ARCHITECTURE.md / current-milestone-plan / gsd-code-reviewer) plus a Round-0 schema-drift check via mcp__neon__describe_table. If 0 P0+P1 findings, post a one-line OK to chat and exit. If P0+P1 found, post the consolidated findings file path and stop without fixing."
```

---

## Security checklist for next session

- [ ] `.mcp.json` is in `.gitignore` BEFORE the API key is pasted
- [ ] Neon API key is project-scoped if your plan allows
- [ ] After this session's verification, rotate the API key only if the key was exposed in chat — otherwise it can stay
- [ ] Confirm Vercel's `DATABASE_URL` env var has NOT been changed by this work (we're using the Neon API, not the connection string — they're separate credentials)
- [ ] If you want a paranoid setup: create a second Neon API key with read-only project access for the recurring audit, and keep the read/write key only for migration sessions

---

## What I will NOT touch automatically next session

Even with MCP access, I won't:
- Drop tables, drop columns, or run destructive ALTER TABLE without explicit confirmation per command
- Change the prod branch's connection string
- Create or delete Neon projects (only branches)
- Apply migrations directly to prod without a green dry-run on a branch first

These limits are self-imposed; please push back if I drift.

---

## Recommended opener for next session

> "Read `.planning/HANDOFF-NEON-MCP-SETUP.md`. I've completed Steps 1-5 (Neon API key created, .mcp.json configured, .gitignore updated, Claude restarted). Verify the MCP loaded and walk through Steps 6-8 with me — dry-run on a branch, then prod, then close out the audit trail."

If you didn't complete Steps 1-5 yet, just paste:

> "Read `.planning/HANDOFF-NEON-MCP-SETUP.md` and walk me through Step 1."

I'll guide each step interactively.
