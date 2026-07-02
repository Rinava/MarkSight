# Implementation Plan: MarkSight → Skill Creator

> Status: **READY FOR APPROVAL.** No code has been written. Plan self‑check passed (see end).
> Planning method: `agent-skills:planning-and-task-breakdown`.
> Scope: **12 tasks across 4 phases** (Task 1 split into 1A/1B to honor the ≤5‑file rule).

## Overview

Add a **Skill Creator** to MarkSight that turns the current Markdown document into a
valid **Agent Skill** — the `SKILL.md` + bundle format that Claude (Claude Code,
claude.ai) and other AI agents ingest. From the editor a user clicks **Create Skill**,
the app auto‑derives the skill metadata from the document, shows a live preview with a
validation status, and lets them **copy the `SKILL.md`**, **download a single `SKILL.md`**,
or **download a packaged `.skill` (zip)** — all 100% in the browser. A later, optional
phase adds an **"Improve with AI"** step (server route via Vercel AI Gateway) that
refines the metadata only when a provider key is configured.

This is delivered as a new export mode that mirrors the existing `ExportToolbar`
(MD / HTML / PDF) pattern. Phases 1–3 keep MarkSight's client‑first behavior intact
(the offline creator works with no network). **Phase 4 adds distribution** so the
result is easy to *add* to Claude: an in‑app **"Add to Claude" install panel** (zero
infra) plus a **remote MCP connector** — a hosted endpoint that exposes packaging as
a tool and can fetch the user's current document via a short‑lived handoff token. A
backend is now in scope (confirmed with the user), so the AI route (Phase 2) and the
MCP server (Phase 4) run as Vercel Functions; the editor itself stays client‑side and
degrades gracefully when the backend is absent.

### What an MCP connector can and cannot do (verified against current docs)

An **MCP server cannot install a `SKILL.md` into Claude's skill registry** — MCP only
exposes **tools / resources / prompts**. Skills are added by *filesystem drop‑in*
(Claude Code `~/.claude/skills/` or project `.claude/skills/`) or *upload* (claude.ai
Settings › Skills, as a `.zip`). Therefore:

- The **install panel** is what makes adding the *generated skill artifact* one/two steps (docs confirm download‑and‑drop / claude.ai‑upload is the lowest‑friction path).
- The **MCP connector** does **not** "add the skill"; it exposes MarkSight's packaging as **tools** Claude can call (`create_skill`, `validate_skill`) and a document handoff (`get_marksight_document`). It is the "Claude reaches into MarkSight" surface, not a skill‑install channel.

### What "ready for Claude or other AIs to receive" means here

The output conforms to the official Agent Skill contract (verified against the
`skill-creator` plugin's `quick_validate.py` and `package_skill.py`):

- A folder `skill-name/` containing a required `SKILL.md`.
- `SKILL.md` = YAML frontmatter + Markdown body.
  - **Required:** `name` (kebab‑case `^[a-z0-9-]+$`, no leading/trailing hyphen, no `--`, ≤ 64 chars), `description` (≤ 1024 chars, **no `<` or `>`**).
  - **Allowed optional:** `license`, `allowed-tools`, `metadata`, `compatibility` (≤ 500 chars). No other top‑level keys permitted.
- Packaged as a `.skill` zip whose entries are namespaced under the folder name (`skill-name/SKILL.md`).

## Source-of-truth references (read before implementing)

- Skill format & validation: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator/` — `SKILL.md`, `scripts/quick_validate.py`, `scripts/package_skill.py`.
- Phase 2 only: the `vercel:ai-sdk` and `vercel:ai-gateway` skills (AI SDK v6 + AI Gateway `"provider/model"` strings). Do **not** hand‑write provider wiring from memory.

## Current-state facts (from code reading)

| Fact | Location | Implication |
|---|---|---|
| Content flows `localStorage` → `ContentContext` → `ExportToolbar` | `src/app/page.tsx:238`, `src/contexts/content-context.tsx` | The Skill Creator reads the same `content` string. Entry point lives next to existing export buttons. |
| Export = in‑browser `Blob` download | `src/components/export-toolbar.tsx:150` (`downloadFile`) | Reuse this exact pattern for `.md` and `.skill` downloads. |
| Radix Dialog primitive present | `src/components/ui/dialog.tsx`, dep `@radix-ui/react-dialog` | Use for the preview modal; already in `optimizePackageImports`. |
| `github-slugger` already a dependency | `src/components/document-outline.tsx:5` | Reuse for the first pass of name slugging (then strict‑sanitize to the skill‑name charset). |
| Analytics via `trackExport(format: 'html'\|'pdf', …)` | `src/lib/analytics.ts:36`, `src/hooks/use-analytics.ts:22` | Add a dedicated `trackSkillCreate` rather than widening the export union. |
| **No test runner** (only `dev`/`build`/`start`/`lint`) | `package.json:8` | Introduce Vitest for the pure lib (Task 1); UI/route verified via lint + build + manual. |
| **No `.env*` files** | repo root | Phase 2 needs a documented env var + `.env.example`. Public deploy stays disabled unless a key is present. |
| CSP `connect-src` includes `'self'` | `src/middleware.ts:21` | Same‑origin `fetch('/api/skill/improve')` is allowed → no middleware change. A browser→provider call **would** be blocked, confirming the server‑route design. |
| `sonner` toasts available | `src/app/page.tsx:52`, `Toaster` in `layout-content.tsx` | Use for copy/download success + validation feedback. |

## Architecture Decisions

1. **Client‑first, server‑optional.** Phase 1 is 100% in‑browser (no network, no keys), matching MarkSight's existing architecture and CSP. Phase 2's AI is purely additive and gated.
2. **Pure, framework‑free core in `src/lib/skill/`.** `derive` / `validate` / `build` / `package` are plain TS with no React/Next imports, so they are unit‑testable and reusable by the Phase 2 route handler (single validation source of truth, client **and** server).
3. **`validate.ts` is a faithful TS port of `quick_validate.py`.** Same allowed‑keys set, name regex/length, description length + angle‑bracket ban, compatibility length. This is what makes output "ready to receive."
4. **Add `fflate`** (tiny, MIT, tree‑shakeable) for the in‑browser zip; **lazy‑import** it inside the download handler so it stays out of the initial bundle; register in `next.config.ts` `optimizePackageImports`. Rejected: `jszip` (heavier); hand‑rolled ZIP (CRC32/central‑directory risk).
5. **Add Vitest** for the pure lib only (no runner exists today). Keep tests to plain TS modules (no Next imports) to avoid transform complexity with Turbopack.
6. **Fully auto‑derived metadata, no editing form.** H1 → `name`, first paragraph → `description`, with deterministic fallbacks. The **live preview pane is the review surface**; downloads are disabled while validation fails.
7. **Reuse existing primitives:** Radix `ui/dialog` (preview modal), `ExportToolbar` (entry button), `downloadFile` (downloads), `sonner` (feedback), analytics (`skill_create` event).
8. **Phase 2 = Next.js Route Handler + Vercel AI Gateway** (AI SDK v6, `"anthropic/<model>"` string). The route **re‑validates** AI output with `validate.ts` and returns a graceful `{ enabled: false }` when no key/OIDC is present.
9. **`src/lib/skill/` is the single core shared by client, AI route, and MCP server.** Because it is pure TS, the MCP tools call `deriveX`/`buildSkillMd`/`packageSkill`/`validateSkill` directly — no logic is duplicated or re‑validated differently across surfaces.
10. **MCP server = a Next.js Route Handler over streamable HTTP**, built on the official MCP TypeScript SDK + the Vercel MCP adapter (`mcp-handler`/`@vercel/mcp-adapter`), running on Fluid Compute. Implement strictly from the current MCP SDK + Vercel MCP docs — **no hand‑written transport from memory**. Stateless tools first (`create_skill`, `validate_skill`); the document handoff is additive.
11. **Document handoff = ephemeral, anonymous token (no login in v1).** The browser `POST`s the current doc to `/api/skill/share`; the server stores it in a **Marketplace KV/Redis (Upstash)** store (Vercel KV is retired) with a short TTL and returns an unguessable token. The MCP tool `get_marksight_document(token)` retrieves it once. OAuth / "Sign in with Vercel" for persistent per‑user docs is a deliberate later option, not v1.
12. **MCP tools are thin wrappers over shared `lib/` cores — never re‑implementations.** The MCP server exposes a small **tool suite** (`create_skill`, `validate_skill`, `markdown_to_html`, `document_outline`, `document_metrics`). Because some of that logic currently lives *inside React components* (HTML pipeline in `export-toolbar.tsx`, outline/slug in `document-outline.tsx`, metrics in `analytics.ts`), it is first **extracted into pure `src/lib/markdown/` modules** that both the components and the MCP tools import. One implementation per capability, used by UI and MCP alike.

## Derivation & build rules (precise, so behavior is testable)

**Name** (`deriveSkillName`): take the first ATX/`setext` H1 → strip inline markdown & emoji → lowercase → replace each run of non‑`[a-z0-9]` with `-` → trim leading/trailing `-` → collapse `--` → truncate to ≤ 64 (no trailing hyphen) → if empty, fallback `"untitled-skill"`.

**Description** (`deriveSkillDescription`): first non‑empty **non‑heading** block → strip markdown to plain text (links→text, drop emphasis/inline‑code/images) → remove `<` and `>` → collapse whitespace → truncate to ≤ 1024 at a word boundary → if empty, fallback `"A skill generated from a MarkSight document."`.

**Build** (`buildSkillMd`): if the body already begins with a `---…---` YAML block, strip it (avoid double frontmatter). Compose `---\nname: <name>\ndescription: <quoted-if-needed>\n---\n\n<body>`. Quote/escape the description scalar when it contains YAML‑significant characters.

**Package** (`packageSkill`): `.skill` = zip with entry `<name>/SKILL.md` (room for future `references/`/`assets/`). MIME `application/zip`, filename `<name>.skill`.

## Task List

### Phase 1 — Client-side skill creation (offline)

- [ ] **Task 1A — Test harness + skill validation + types** (highest‑risk: the spec port, isolated)
- [ ] **Task 1B — Metadata derivation + `SKILL.md` builder**
- [ ] **Task 2 — "Create Skill" entry + live preview dialog**
- [ ] **Task 3 — Single-file + clipboard delivery**
- [ ] **Task 4 — `.skill` zip packaging + download**

#### Checkpoint A — Offline creator works end-to-end
- [ ] Click **Create Skill** → preview shows auto‑derived `SKILL.md` + validation status.
- [ ] Copy, Download `SKILL.md`, and Download `.skill` all work; the `.skill` unzips to `<name>/SKILL.md`.
- [ ] A downloaded skill passes the real validator: `python3 .../skill-creator/scripts/quick_validate.py <unzipped-dir>` → "Skill is valid!".
- [ ] `npm run lint` and `npm run build` clean; `npm run test` green.
- [ ] **Human review before Phase 2.**

### Phase 1.5 — Usefulness (valid ≠ useful; close the gap)

Rationale: a spec‑valid skill still fails if Claude never triggers it (bad description) or
if the body is content rather than instructions. These tasks make generated skills
*genuinely consumable* and make MarkSight a skill **editor**, not a one‑way converter.

- [ ] **Task 12 — Knowledge‑skill packaging mode** — second bundle shape for non‑instruction documents: short generated `SKILL.md` pointer ("Read `references/document.md` when …") + the document at `references/document.md`. Mode toggle in the dialog with a heuristic default (imperative‑verb/heading density → instruction vs. knowledge).
- [ ] **Task 13 — Trigger‑quality description + quality hints** — optional "When should Claude use this?" input appended as "Use this when …"; non‑blocking quality warnings beside the ✓ Valid badge (no use‑when language, generic first‑paragraph description, body > 500 lines, no imperative headings).
- [ ] **Task 14 — "New skill" starter template** — a skill‑shaped starter document (H1 name, trigger‑description intro, `## When to use`, `## Steps`, `## Output format`) reachable from the editor (Reset/menu affordance).
- [ ] **Task 15 — Import & modify skills (file/paste + common marketplaces)** — open an existing skill and edit it with live validation:
  - **15A — Local import:** open/drop a `.skill`/`.zip` or paste a `SKILL.md`; frontmatter + body load into the editor; extra bundle files (e.g. `references/`, `scripts/`) are carried in memory and preserved on re‑export (with a visible file list); warn if anything can't be preserved.
  - **15B — Marketplace import:** browse/fetch skills from the most common public sources (verified landscape research pending — candidates: the official `anthropics/skills` GitHub repo; Claude plugin marketplaces via `.claude-plugin/marketplace.json` → `skills/<name>/SKILL.md`; top community collections). Client‑side fetch via GitHub raw/API where CORS allows; requires adding `https://api.github.com https://raw.githubusercontent.com` (and/or jsDelivr) to CSP `connect-src` in `src/middleware.ts`. Provenance shown (source + path); imported skills are untrusted content — render as text, never execute.

#### Checkpoint A.5 — Generated skills are useful, and existing skills round‑trip
- [ ] A non‑instruction document packaged in knowledge mode yields `SKILL.md` + `references/document.md`, passes `quick_validate.py`.
- [ ] Quality hints flag a generic description; adding "use when" text clears them.
- [ ] A skill imported from a marketplace → edited → re‑exported passes `quick_validate.py` with extra files preserved.
- [ ] `lint` + `build` clean, `test` green; **human review**.

### Phase 2 — Optional AI refinement

- [ ] **Task 5 — `/api/skill/improve` route (Vercel AI Gateway)**
- [ ] **Task 6 — "Improve with AI" wiring + feature gating**

#### Checkpoint B — AI refinement is additive and safe
- [ ] With a key configured: **Improve with AI** updates the preview and re‑validates; failures surface as inline errors, never a broken download.
- [ ] With no key: the button is hidden/disabled; Phase 1 is unaffected.
- [ ] `npm run build` clean; route type‑checks.
- [ ] **Human review before Phase 3.**

### Phase 3 — Polish & docs

- [ ] **Task 7 — Analytics, shortcut, a11y, docs**

#### Checkpoint C — Feature complete (offline + AI)
- [ ] All Phase 1–3 acceptance criteria met; README + `.env.example` updated.

### Phase 4 — Distribution & easy-add (backend)

- [ ] **Task 8 — "Add to Claude" install panel** (client, zero infra)
- [ ] **Task 11 — Extract shared markdown core** (`lib/markdown/`; prereq for the tool suite)
- [ ] **Task 9 — MCP server endpoint (tool suite)** — `create_skill`, `validate_skill`, `markdown_to_html`, `document_outline`, `document_metrics`
- [ ] **Task 10 — Document handoff bridge (ephemeral token + KV)** — adds `get_marksight_document`

#### Checkpoint D — Easy-add works
- [ ] Install panel shows correct, copyable commands matching the real `.skill` layout.
- [ ] `claude mcp add --transport http marksight <url>` connects; every tool in the suite lists and runs.
- [ ] `create_skill` returns a bundle that passes `quick_validate.py`; `validate_skill`, `markdown_to_html`, `document_outline`, `document_metrics` outputs match their in‑app equivalents.
- [ ] Browser → `/api/skill/share` → token → `get_marksight_document(token)` round‑trips; token expires; size/rate limits enforced.
- [ ] **Human review; ready for PR.**

---

## Task detail

### Task 1A: Test harness + skill validation + types

**Description:** Stand up Vitest (no runner exists today) and implement the highest‑risk piece in isolation: the `SKILL.md` validator as a faithful TS port of `quick_validate.py`, plus the shared skill types. Cover the spec edge cases (allowed‑keys, name regex/length, description length + angle brackets, compatibility length).

**Acceptance criteria:**
- [ ] `validateSkill(input)` returns `{ valid, errors[] }` matching **every** rule in `quick_validate.py`.
- [ ] `npm run test` runs Vitest; validation edge cases (bad name chars, `--`, >64 name, >1024 / angle‑bracket description, unexpected keys) are covered and pass.
- [ ] `SkillMeta` / `ValidationResult` types defined and exported.

**Verification:**
- [ ] `npm run test` green; `npm run lint` clean.
- [ ] Parity: a handful of `SKILL.md` samples produce the same verdict from `validateSkill` and the Python validator.

**Dependencies:** None.

**Files likely touched:** `vitest.config.ts`, `package.json` (add `vitest` + `test` script), `src/lib/skill/types.ts`, `src/lib/skill/validate.ts`, `src/lib/skill/__tests__/validate.test.ts`.

**Estimated scope:** Medium (5 files).

---

### Task 1B: Metadata derivation + `SKILL.md` builder

**Description:** Implement `deriveSkillName` / `deriveSkillDescription` (per the Derivation rules above, with fallbacks) and `buildSkillMd` (strip any pre‑existing frontmatter, compose validated frontmatter + body, YAML‑escape the description). Unit‑test the tricky cases.

**Acceptance criteria:**
- [ ] `deriveSkillName` and `deriveSkillDescription` follow the documented rules incl. fallbacks (emoji/symbol‑only/missing H1 → safe name; empty body → fallback description).
- [ ] `buildSkillMd` strips a leading `---…---` block, emits valid YAML (round‑trips back to the same `name`/`description`), and passes `validateSkill`.
- [ ] Tests cover emoji/symbol‑only/missing H1, angle brackets, over‑length, and pre‑existing frontmatter.

**Verification:**
- [ ] `npm run test` green; `npm run lint` clean.
- [ ] Cross‑check a built `SKILL.md` against the Python validator.

**Dependencies:** Task 1A (types + `validateSkill` for round‑trip tests).

**Files likely touched:** `src/lib/skill/derive.ts`, `src/lib/skill/build.ts`, `src/lib/skill/__tests__/derive.test.ts`, `src/lib/skill/__tests__/build.test.ts`.

**Estimated scope:** Small–Medium (4 files).

---

### Task 2: "Create Skill" entry + live preview dialog

**Description:** Add a **Create Skill** button to `ExportToolbar` that opens a Radix dialog. On open, auto‑derive metadata, build the `SKILL.md`, validate, and render a read‑only live preview with the target folder name and a validation status (valid ✓ / itemized errors). No editing form (metadata is auto‑derived).

**Acceptance criteria:**
- [ ] New toolbar button (e.g. `PackagePlus`/`Sparkles` icon) with tooltip, consistent with existing buttons.
- [ ] Dialog shows the generated `SKILL.md`, the `<name>/` folder, and validation state; invalid state lists the failing rules.
- [ ] Reads live editor content (the same `content` prop the toolbar already receives) and re‑derives when reopened.

**Verification:**
- [ ] `npm run build` clean.
- [ ] Manual (preview tools): open app → click **Create Skill** → snapshot shows preview + "valid" for the default document; clearing the doc shows a sensible fallback/invalid state.

**Dependencies:** Tasks 1A–1B.

**Files likely touched:** `src/components/skill-creator-dialog.tsx` (new), `src/components/export-toolbar.tsx` (wire button + dialog state).

**Estimated scope:** Medium.

---

### Task 3: Single-file + clipboard delivery

**Description:** Add **Copy `SKILL.md`** and **Download `SKILL.md`** actions in the dialog, reusing the existing `downloadFile` pattern and `navigator.clipboard`, with `sonner` success/error toasts. Actions disabled while validation fails.

**Acceptance criteria:**
- [ ] Copy places the exact `SKILL.md` text on the clipboard; toast confirms.
- [ ] Download saves `SKILL.md` (`text/markdown`).
- [ ] Both disabled when the skill is invalid.

**Verification:**
- [ ] Manual (preview tools): copy → paste matches preview; download → file content matches preview byte‑for‑byte.
- [ ] `npm run lint` clean.

**Dependencies:** Task 2.

**Files likely touched:** `src/components/skill-creator-dialog.tsx`.

**Estimated scope:** Small.

---

### Task 4: `.skill` zip packaging + download

**Description:** Add `fflate`, implement `packageSkill` (zip with `<name>/SKILL.md`), and a **Download `.skill`** action. Lazy‑import `fflate` inside the handler; register it in `optimizePackageImports`.

**Acceptance criteria:**
- [ ] Downloads `<name>.skill`; unzipping yields `<name>/SKILL.md` identical to the preview.
- [ ] `fflate` is loaded only when the user downloads a bundle (not in the initial chunk).
- [ ] Unzipped folder passes the official `quick_validate.py`.

**Verification:**
- [ ] Manual: download → `unzip -l` shows `<name>/SKILL.md`; run the Python validator → "Skill is valid!".
- [ ] `npm run build` clean; confirm `fflate` is in a lazy chunk.

**Dependencies:** Task 2 (Tasks 1A–1B for skill types). `packageSkill` (`package.ts`) is created here.

**Files likely touched:** `src/lib/skill/package.ts` (new), `src/components/skill-creator-dialog.tsx`, `next.config.ts`, `package.json` (add `fflate`).

**Estimated scope:** Small–Medium.

---

### Task 5: `/api/skill/improve` route (Vercel AI Gateway)

**Description:** Add a Route Handler that takes `{ content, draft }` and returns AI‑refined `{ name, description }` (and optionally a "pushier" `description` / suggested *when‑to‑use* text), using AI SDK v6 through Vercel AI Gateway with a `"anthropic/<model>"` string. Re‑validate the AI output server‑side with `validate.ts`; never return invalid metadata. If no `AI_GATEWAY_API_KEY`/OIDC is present, return `{ enabled: false }`. **Implement strictly per `vercel:ai-sdk` + `vercel:ai-gateway` skills.**

**Acceptance criteria:**
- [ ] `POST /api/skill/improve` returns validated `{ name, description }` when a key is configured.
- [ ] Returns `{ enabled: false }` (no error) when unconfigured.
- [ ] Output is re‑validated with the shared `validateSkill`; invalid AI output is rejected/repaired, never passed through.

**Verification:**
- [ ] `npm run build` clean; route type‑checks.
- [ ] Manual: with a test key, `curl` returns refined metadata; without, returns `{ enabled: false }`.

**Dependencies:** Task 1A (shared validator). Independent of Tasks 2–4.

**Files likely touched:** `src/app/api/skill/improve/route.ts` (new), `package.json` (add `ai`), `.env.example` (new).

**Estimated scope:** Medium.

---

### Task 6: "Improve with AI" wiring + feature gating

**Description:** Add an **✨ Improve with AI** button to the dialog that calls the route, shows loading/error states, updates the preview with the refined metadata, and re‑validates. Feature‑detect capability (button hidden/disabled when the route reports disabled).

**Acceptance criteria:**
- [ ] Clicking Improve refines the preview and re‑runs validation; errors surface inline.
- [ ] Button is hidden/disabled when the backend reports `enabled: false`.
- [ ] Phase 1 flows are unchanged when AI is off.

**Verification:**
- [ ] Manual (preview tools): with key → Improve updates preview; without key → button absent/disabled, downloads still work.
- [ ] `npm run lint` + `npm run build` clean.

**Dependencies:** Task 5, Task 2.

**Files likely touched:** `src/components/skill-creator-dialog.tsx`.

**Estimated scope:** Small–Medium.

---

### Task 7: Analytics, shortcut, a11y, docs

**Description:** Add a `trackSkillCreate(kind: 'copy' | 'md' | 'skill' | 'ai-improve')` analytics event + hook method; add an optional keyboard shortcut to open the dialog; ensure dialog focus management/aria labels; document the feature and the Phase 2 env var in `README.md` and `.env.example`.

**Acceptance criteria:**
- [ ] Each delivery action emits a `skill_create` event with the correct label.
- [ ] Dialog is keyboard‑accessible (focus trap, escape, labeled controls).
- [ ] README documents Create Skill + the optional AI env var.

**Verification:**
- [ ] Manual: actions log events (GA debug / network); keyboard‑only open + operate works.
- [ ] `npm run lint` + `npm run build` clean.

**Dependencies:** Tasks 2–6.

**Files likely touched:** `src/lib/analytics.ts`, `src/hooks/use-analytics.ts`, `src/components/skill-creator-dialog.tsx`, `README.md`, `.env.example`.

**Estimated scope:** Small.

---

### Task 8: "Add to Claude" install panel (client, zero infra)

**Description:** In the skill‑creator dialog, add an **Add to Claude** section that turns the downloaded artifact into a one/two‑step install: a copyable Claude Code command and the claude.ai upload steps. Commands must match the real `.skill` layout (`<name>/SKILL.md` inside the zip).

**Acceptance criteria:**
- [ ] Claude Code: copyable `unzip -o ~/Downloads/<name>.skill -d ~/.claude/skills/` (yields `~/.claude/skills/<name>/SKILL.md`), with a note that the skill loads next session or after `/reload-plugins`.
- [ ] claude.ai: concise steps — Settings › Skills › Upload → `<name>.skill`.
- [ ] Commands interpolate the actual derived `<name>`; copy buttons emit a toast.

**Verification:**
- [ ] Manual: run the shown command against a real download → `~/.claude/skills/<name>/SKILL.md` exists and validates.
- [ ] `npm run lint` clean.

**Dependencies:** Task 4 (artifact + name).

**Files likely touched:** `src/components/skill-creator-dialog.tsx`.

**Estimated scope:** Small.

---

### Task 11: Extract shared markdown core (prereq for the tool suite)

**Description:** Behavior‑preserving refactor: lift MarkSight's markdown logic out of React components into pure, server‑safe `src/lib/markdown/` modules so both the UI and the MCP tools call one implementation. No UI/behavior change.

**Acceptance criteria:**
- [ ] `lib/markdown/to-html.ts` — `renderMarkdownToHtml(markdown, { styled })` (the `remark`+`remark-gfm`+`remark-html` pipeline currently inline in `export-toolbar.tsx`); the toolbar imports it.
- [ ] `lib/markdown/outline.ts` — `buildOutline(markdown)` → heading tree with `github-slugger` slugs (logic currently in `document-outline.tsx`); the component imports it.
- [ ] `lib/markdown/metrics.ts` — pure `documentMetrics(markdown)` (today's `calculateDocumentMetrics`), importable without GA side effects.
- [ ] HTML export, outline, and metrics behave identically to before.

**Verification:**
- [ ] `npm run test` (unit tests for each pure fn) green.
- [ ] Manual parity: HTML export + outline navigation + metrics unchanged in the app.
- [ ] `npm run build` + `npm run lint` clean.

**Sizing note:** this is three **independent, mechanical** extractions (to‑html / outline / metrics), each touching ≤ 2 files with no logic change. They share one subsystem so they're tracked as one task, but split into 11A/11B/11C if parallelizing across agents.

**Dependencies:** None (can run in parallel with Phase 1). Sequenced in Phase 4 because Task 9 consumes it.

**Files likely touched:** `src/lib/markdown/to-html.ts`, `outline.ts`, `metrics.ts`, `src/lib/markdown/__tests__/*`, edits to `src/components/export-toolbar.tsx`, `src/components/document-outline.tsx`, `src/lib/analytics.ts`.

**Estimated scope:** Small–Medium (mechanical; ≤ 2 files per extraction).

---

### Task 9: MCP server endpoint (tool suite)

**Description:** Add a remote MCP server as a Next.js Route Handler over streamable HTTP (MCP TS SDK + Vercel MCP adapter, Fluid Compute) exposing a small **tool suite**, each a thin typed wrapper that delegates to the shared `lib/` cores. Stateless. **Build from current MCP/Vercel docs, not memory.**

Tools:
- `create_skill(markdown, name?, description?)` → `{ skillMd, validation, bundleBase64 }` (lib/skill)
- `validate_skill(skillMd)` → `ValidationResult` (lib/skill)
- `markdown_to_html(markdown, { styled? })` → HTML (lib/markdown/to-html)
- `document_outline(markdown)` → heading tree + slugs (lib/markdown/outline)
- `document_metrics(markdown)` → word/char/line/heading/link/image counts (lib/markdown/metrics)

**Acceptance criteria:**
- [ ] An MCP client (`claude mcp add --transport http marksight <url>` or MCP Inspector) lists and calls **every** tool.
- [ ] Each tool has a typed input schema and structured output; bad input fails cleanly.
- [ ] Outputs match the in‑app equivalents: `create_skill` bundle passes `quick_validate.py`; `markdown_to_html`/`document_outline`/`document_metrics` equal what the editor produces for the same input.

**Verification:**
- [ ] `npm run build` clean; route type‑checks.
- [ ] Manual: MCP Inspector round‑trip per tool; decode `bundleBase64` → validate.

**Dependencies:** Tasks 1A–1B (skill core), Task 11 (markdown core).

**Files likely touched:** `src/app/api/mcp/route.ts` (or adapter's expected path), `package.json` (MCP SDK + adapter), `next.config.ts` if needed.

**Estimated scope:** Medium.

---

### Task 10: Document handoff bridge (ephemeral token + KV)

**Description:** Enable "package *my current MarkSight doc*" from Claude without login. The browser `POST`s the doc to `/api/skill/share` → stored in Marketplace Redis (Upstash) with a short TTL → returns an unguessable token (shown in the dialog as an "Open in Claude / connector code"). Add an MCP tool `get_marksight_document(token)` that retrieves it once. Enforce a max content size and basic rate limiting; tokens are single‑use or TTL‑bound.

**Acceptance criteria:**
- [ ] `POST /api/skill/share` returns `{ token, expiresAt }`; oversize payloads and abusive rates are rejected.
- [ ] `get_marksight_document(token)` returns the exact markdown before expiry, and fails cleanly after expiry / on bad token.
- [ ] End‑to‑end: in Claude, `get_marksight_document(token)` → `create_skill(...)` produces a valid bundle.

**Verification:**
- [ ] Manual: token round‑trips and expires; second use (if single‑use) is rejected.
- [ ] `npm run build` clean; secrets only via env; same‑origin `POST` honored by CSP `connect-src 'self'`.

**Dependencies:** Task 9 (MCP server), Task 2 (UI affordance). Needs a provisioned KV/Redis store.

**Files likely touched:** `src/app/api/skill/share/route.ts` (new), MCP route (add tool), `src/lib/skill/store.ts` (KV client), `src/components/skill-creator-dialog.tsx`, `.env.example`.

**Estimated scope:** Medium.

---

## Dependency graph

```
Task 1A (Vitest harness + validate + types)  ── shared validator
   │
   ├── Task 1B (derive + build)               ── completes the skill core
   │      │
   │      ├── Task 2 (Create Skill button + preview dialog)
   │      │      ├── Task 3 (copy + .md download)
   │      │      ├── Task 4 (.skill zip + packageSkill)   ── needs fflate
   │      │      │      └── Task 8 (Add-to-Claude install panel)
   │      │      └── Task 6 (Improve-with-AI wiring)      ── also needs Task 5
   │      │
   │      └── Task 9 (MCP server tool suite)   ── also needs Task 11
   │
   ├── Task 5 (/api/skill/improve)  ── needs only 1A's validator; independent of 2–4
   │
   ├── Task 11 (extract lib/markdown: to-html / outline / metrics)  ── refactor; independent
   │      └── Task 9 ── (joins the skill core above)
   │             └── Task 10 (doc handoff: /api/skill/share + get_marksight_document)  ── also needs Task 2 + KV
   │
   └── Task 7 (analytics + shortcut + a11y + docs)  ── joins UI stream
```

## Parallelization

- **Sequential spine:** 1A → 1B → 2 → (3, 4 → 8). The skill core (1A+1B) is the foundation for every surface.
- **Parallel‑safe back ends:** Task 5 (AI route, after 1A), Task 11 (markdown extraction, independent), and Task 9 (MCP suite, after 1B + 11) can be built alongside the UI stream. Tasks 3 and 4 parallelize once Task 2 lands.
- **Coordination joins:** Task 6 (needs 5 + 2), Task 10 (needs 9 + 2 + a KV store), and Task 7 (docs/analytics) come last.
- **Provisioning gate:** Task 10 needs a Marketplace Redis/KV store provisioned first (`vercel:marketplace`).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Slug/sanitize edge cases (emoji‑only, symbol‑only, or missing H1) produce an invalid `name` | Med | Deterministic fallbacks + Vitest cases for each; never emit an empty/invalid name. |
| Document already has YAML frontmatter → double frontmatter in `SKILL.md` | Med | `buildSkillMd` strips a leading `---…---` block before composing; unit test. |
| `fflate` bloats the initial bundle / SSR issues | Low | Lazy `import("fflate")` in the handler; add to `optimizePackageImports`; verify chunking in `build`. |
| Adding Vitest conflicts with Turbopack/Next 15 transforms | Low | Keep tests to pure TS modules (no Next imports); standard Vitest config. |
| AI Gateway keys absent in public prod (cost) | Med | Phase 2 gated; route returns `{ enabled: false }`; UI hides the button. No behavior change for the public deploy. |
| Outdated AI SDK/Gateway API from memory | Med | Implement Task 5 strictly from `vercel:ai-sdk` + `vercel:ai-gateway` skills; no memorized provider wiring. |
| Description with `:`/quotes breaks YAML | Low | Quote/escape the scalar in `buildSkillMd`; round‑trip test (parse the emitted frontmatter back). |
| No automated test for UI/route | Low | Verify via `lint` + `build` + scripted manual (preview tools) and the Python validator cross‑check. |
| MCP/share endpoints accept arbitrary markdown → abuse, payload bloat, token guessing | Med | Max content size, basic rate limiting, unguessable single‑use/TTL tokens, no secrets in client; same‑origin `POST` only. |
| MCP transport/adapter API drift on Vercel/Next 15 | Med | Build Task 9 from current MCP SDK + Vercel MCP docs; pin adapter version; smoke‑test with MCP Inspector. |
| Retired "Vercel KV" assumed available | Low | Provision a **Marketplace** Redis/KV (Upstash) via `vercel:marketplace`; read connection from env. |
| claude.ai custom connectors typically need OAuth/token | Med | v1 targets **Claude Code** (`mcp add` to a token‑guarded URL); claude.ai connector (OAuth) is a follow‑up, flagged in Open Questions. |

## Open Questions (need human input)

1. **AI scope (Task 5):** refine **metadata only**, or also offer to **restructure the body** / add a "when to use" section? *Default: metadata + optional when‑to‑use; leave body untouched unless the user opts in.*
2. **Provider/model:** AI Gateway with `anthropic/<model>` (recommended) vs. direct `@ai-sdk/anthropic`? *Default: AI Gateway.* Which model id?
3. **`license` frontmatter:** omit by default, or inherit the repo's MIT? *Default: omit unless added.*
4. **Single‑`.md` filename:** download literally as `SKILL.md` (drop‑in) vs. `<name>-SKILL.md` (avoids Downloads collisions)? *Default: `SKILL.md`, with the folder name shown in the UI.*
5. **Phase 2 in scope now**, or ship Phase 1 first and revisit? *Either works; the plan is structured so Phase 1 is independently shippable at Checkpoint A.*
6. **Connector target (Task 9/10):** Claude Code first via `claude mcp add` (recommended v1) vs. a full claude.ai **connector** (needs OAuth)? *Default: Claude Code first; claude.ai connector as a follow‑up.*
7. **Connector auth (Task 10):** anonymous ephemeral token (recommended v1, no login) vs. OAuth / "Sign in with Vercel" for persistent per‑user documents? *Default: ephemeral token.*
8. **KV/storage product:** which Marketplace store for the handoff (recommend **Upstash Redis** for TTL tokens) — and TTL + single‑use vs. reusable‑until‑expiry?
9. **MCP `create_skill` return shape:** inline `bundleBase64` vs. a short‑lived download URL (Vercel Blob)? *Default: inline base64 for small skills.*

## Definition of Done (standing bar for every task)

Per‑task acceptance criteria sit on top of this project‑wide bar. A task is not "done" until:

- [ ] `npm run lint` passes (ESLint / `eslint-config-next`) with no new warnings.
- [ ] `npm run build` succeeds (`next build --turbopack`), incl. type‑checks.
- [ ] `npm run test` (Vitest, added in Task 1A) is green for all touched `lib/` logic.
- [ ] No regression to existing flows (editor, live preview, MD/HTML/PDF export, outline, theme).
- [ ] New UI is keyboard‑accessible and respects the existing CSP (no new inline scripts; same‑origin fetches only).
- [ ] No secrets in client code; backend keys read from env; backend features degrade gracefully when unconfigured.
- [ ] No new top‑level frontmatter keys or output that fails the official `quick_validate.py`.
- [ ] Changes are scoped to the task's listed files (±1); anything broader is re‑planned, not smuggled in.

## Plan self-check (skill verification checklist)

- [x] **Every task has acceptance criteria** — Tasks 1A,1B,2–11 each list testable criteria.
- [x] **Every task has a verification step** — each lists `lint`/`build`/`test`/manual + the Python‑validator cross‑check where relevant.
- [x] **Dependencies identified and ordered** — see the dependency graph; foundation (1A→1B) first, high‑risk spec port first.
- [x] **No task exceeds ~5 files** — Task 1 split into 1A (5) + 1B (4); Task 11 noted as 3 mechanical ≤2‑file extractions; all others ≤5.
- [x] **Checkpoints between phases** — A (offline), B (AI), C (feature complete), D (easy‑add), each gated by human review.
- [ ] **Human has reviewed and approved** — pending. ← the only remaining box.
