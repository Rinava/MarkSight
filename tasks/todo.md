# TODO: MarkSight → Skill Creator

Tracks execution of [`tasks/plan.md`](./plan.md). Check items as they land.
Do not start a phase until the previous checkpoint is signed off.

## Phase 1 — Client-side skill creation (offline) ✅ DONE

### Task 1A — Test harness + validation + types  ·  done
- [x] `src/lib/skill/types.ts` — `SkillMeta`, `SkillDraft`, `ValidationResult`, `ALLOWED_FRONTMATTER_KEYS`
- [x] `src/lib/skill/validate.ts` — TS port of `quick_validate.py` rules
- [x] Vitest setup: `vitest.config.ts` + `test`/`test:watch` scripts + `vitest` dep
- [x] `validate.test.ts` — 11 cases (bad name chars/`--`/>64, >1024/angle-bracket desc, unexpected keys, non-string)

### Task 1B — Derivation + SKILL.md builder  ·  done
- [x] `src/lib/skill/derive.ts` — `deriveSkillName`/`deriveSkillDescription`/`deriveSkillMeta` (+ fallbacks)
- [x] `src/lib/skill/build.ts` — `buildSkillMd` (strips pre-existing frontmatter, YAML-escapes), `parseSkillFrontmatter`
- [x] `derive.test.ts` + `build.test.ts` — emoji/symbol-only/missing H1, links, setext, angle brackets, over-length, existing frontmatter, round-trip
- [x] Verify: 34 tests green; parity vs Python validator confirmed ("Skill is valid!")

### Task 2 — "Create Skill" entry + live preview dialog  ·  done
- [x] `src/components/skill-creator-dialog.tsx` — auto-derive → build → validate → read-only preview + status badge
- [x] Wire button (PackagePlus + separator) + controlled dialog state into `export-toolbar.tsx`
- [x] Verify (preview tools): dialog shows `welcome-to-marksight/`, ✓ Valid, correct SKILL.md

### Task 3 — Single-file + clipboard delivery  ·  done
- [x] Copy `SKILL.md` (clipboard + sonner toast)
- [x] Download `SKILL.md` (`text/markdown`)
- [x] Both disabled while invalid

### Task 4 — `.skill` zip packaging + download  ·  done
- [x] Add `fflate`; `src/lib/skill/package.ts` (`<name>/SKILL.md`), lazy `import("fflate")`
- [x] Download `.skill` action; registered `fflate` in `optimizePackageImports`
- [x] Verify: unzips to `welcome-to-marksight/SKILL.md`; passes `quick_validate.py`

### ✅ Checkpoint A — Offline creator works end-to-end  ·  PASSED
- [x] Create → preview → validate → copy / `.md` / `.skill` all work
- [x] Downloaded skill passes official `quick_validate.py`
- [x] `lint` + `build` clean, `test` green (34)
- [ ] **Human review before Phase 2** ← awaiting your sign-off

## Phase 2 — Optional AI refinement

### Task 5 — `/api/skill/improve` route (AI Gateway)  ·  Medium  ·  deps: 1
- [ ] Read `vercel:ai-sdk` + `vercel:ai-gateway` skills first
- [ ] `src/app/api/skill/improve/route.ts` — AI SDK v6, `anthropic/<model>` via Gateway
- [ ] Re-validate AI output with shared `validateSkill`
- [ ] Graceful `{ enabled: false }` when no key/OIDC; add `ai` dep + `.env.example`
- [ ] Verify: `build` clean; `curl` with/without key

### Task 6 — "Improve with AI" wiring + feature gating  ·  Small–Medium  ·  deps: 5, 2
- [ ] ✨ Improve with AI button: call route, loading/error, update + re-validate preview
- [ ] Hide/disable when backend reports `enabled: false`
- [ ] Verify: manual with/without key; Phase 1 unaffected

### ✅ Checkpoint B — AI refinement is additive and safe
- [ ] With key: Improve updates preview, re-validates; bad output never reaches a download
- [ ] Without key: button gone; Phase 1 intact
- [ ] `build` clean
- [ ] **Human review before Phase 3**

## Phase 3 — Polish & docs

### Task 7 — Analytics, shortcut, a11y, docs  ·  Small  ·  deps: 2–6
- [ ] `trackSkillCreate(kind)` in `analytics.ts` + `use-analytics.ts`
- [ ] Optional keyboard shortcut to open the dialog
- [ ] Dialog a11y: focus trap, escape, labeled controls
- [ ] Update `README.md` + `.env.example`
- [ ] Verify: events fire; keyboard-only flow works; `lint` + `build` clean

### ✅ Checkpoint C — Feature complete (offline + AI)
- [ ] All Phase 1–3 acceptance criteria met; docs updated

## Phase 4 — Distribution & easy-add (backend)

### Task 8 — "Add to Claude" install panel  ·  Small  ·  deps: 4
- [ ] Claude Code copyable cmd: `unzip -o ~/Downloads/<name>.skill -d ~/.claude/skills/`
- [ ] claude.ai upload steps (Settings › Skills › Upload)
- [ ] Interpolate real `<name>`; copy → toast
- [ ] Verify: running the cmd yields `~/.claude/skills/<name>/SKILL.md` that validates

### Task 11 — Extract shared markdown core  ·  Small–Medium  ·  deps: none (prereq for 9)
- [ ] `src/lib/markdown/to-html.ts` — `renderMarkdownToHtml` (lift from `export-toolbar.tsx`); toolbar imports it
- [ ] `src/lib/markdown/outline.ts` — `buildOutline` (lift from `document-outline.tsx`); component imports it
- [ ] `src/lib/markdown/metrics.ts` — pure `documentMetrics` (from `analytics.ts`), no GA side effects
- [ ] Unit tests for each; verify HTML export + outline + metrics unchanged in app

### Task 9 — MCP server endpoint (tool suite)  ·  Medium  ·  deps: 1, 11
- [ ] Read current MCP TS SDK + Vercel MCP adapter docs first
- [ ] `src/app/api/mcp/route.ts` — streamable HTTP; thin typed wrappers delegating to shared libs
- [ ] Tools: `create_skill`, `validate_skill`, `markdown_to_html`, `document_outline`, `document_metrics`
- [ ] Verify: `claude mcp add --transport http` / MCP Inspector lists + runs every tool; bundle passes `quick_validate.py`; outputs match in-app

### Task 10 — Document handoff bridge (token + KV)  ·  Medium  ·  deps: 9, 2 (+ KV store)
- [ ] Provision Marketplace Redis/KV (Upstash) via `vercel:marketplace`
- [ ] `src/app/api/skill/share/route.ts` — store doc, short TTL, unguessable token; size + rate limits
- [ ] MCP tool `get_marksight_document(token)` (single-use / TTL)
- [ ] Dialog affordance to create + show the token
- [ ] Verify: token round-trips, expires; e2e `get_marksight_document → create_skill` valid

### ✅ Checkpoint D — Easy-add works
- [ ] Install panel commands match real `.skill` layout
- [ ] MCP connector usable from Claude Code; tools validated
- [ ] Share→token→fetch round-trips with limits enforced
- [ ] **Human review; ready for PR**

---

## Open questions (blocking decisions — see plan.md)
- [ ] AI scope: metadata only vs. also restructure body / add when-to-use
- [ ] Provider/model: AI Gateway `anthropic/<model>` (default) — which model id?
- [ ] `license` frontmatter: omit (default) vs. inherit MIT
- [ ] Single `.md` filename: `SKILL.md` (default) vs. `<name>-SKILL.md`
- [ ] Phase 2 now vs. ship Phase 1 first
- [ ] Connector target: Claude Code first (default) vs. claude.ai connector (OAuth)
- [ ] Connector auth: ephemeral token (default) vs. OAuth / Sign in with Vercel
- [ ] KV store + TTL/single-use policy (recommend Upstash Redis)
- [ ] `create_skill` return: inline base64 (default) vs. short-lived Blob URL
- [ ] MCP tool suite: confirm/trim the proposed set (create_skill, validate_skill, markdown_to_html, document_outline, document_metrics)
