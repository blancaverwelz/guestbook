# Events Guestbook — Memory Archive Roadmap

## Current pagination decision and verification · 2026-11-10

The active Guestbook uses numbered pages of 10 approved messages. Previous, Next and page numbers replace the 20-message load-more flow in the historical entries below. Changing the search or sort returns to page 1. A stale background response cannot replace a newly selected page. Moderation can move the reader to the last valid page if their page disappears.

The client requests one bounded range with an exact count and orders by creation time and ID. Active searches also fetch the event-wide approved count. There are no schema or dependency changes. The old cursor and append logic and their obsolete tests were removed.

**Local verification:** Type-check, build and 26 unit tests passed. Lint has the three existing warnings. Chromium with a synthetic backend exercised 10/10/2 paging, direct jumps, search/sort resets, out-of-order responses, retry, approval and deletion, and the last-page fallback. GB-01 still needs staging Realtime/RLS verification. GB-02 awaits owner visual review. Resume GB-03 on the real staging read path with 22 approved notes and a second client.

## Earlier tracker entries


**Last updated:** 2026-11-06 (implementation session 2 — GB-02 art-direction correction)  
**Authoritative for:** Guestbook redesign and directly required safety/quality work  
**Current iteration:** GB-01 — Blocked on staging verification (code complete); GB-02 **NOT APPROVED — visual refinement round 2 delivered, awaiting owner review**; GB-03 code complete, 1,000+ and two-client gates not run  
**Next action:** Apply `0009` (and, if approved, `0010`) to a staging Supabase project; run the Realtime/RLS capture and the 1,000+ fixture checks; then screenshot-verify GB-02. Do not apply to production without approval.  
**Planning brief:** `docs/guestbook-redesign-kickoff.md`  
**Source reviewed:** user-provided `guestbook-main.zip` (no Git history; production revision unknown)  
**Important:** This document is the live progress tracker. Source was implemented against the supplied zip (no Git history); reconcile with the real checkout before merging. Nothing has been applied to any database or deployed.

## Product outcome

Replace the existing uniform vertical Guestbook list with a **premium editorial Memory Archive** for event guests. Deliver an event-aware intro and message count, a coherent visually varied card grid with readable long messages, date grouping, reliable approved-only pagination, cross-archive search, newest/oldest ordering, responsive/accessibility polish, and moderation-safe realtime. It must stay navigable with 1,000+ messages and retain all existing event, message, gallery, admin, theme, PWA, and routing contracts.

## Decisions and constraints carried forward

- **Approved direction for planning:** editorial luxury keepsake, visually layered, elegant but restrained, non-social, modern and mobile-friendly; rich visual craft without pointless decoration or unreadable layout.
- **Engineering standard:** best sustainable architecture, correctness, security and maintainability over a rushed patch; simplest design that meets needs without unnecessary abstraction.
- **Proposed technical approach:** retain the existing Next.js/React/Tailwind/Supabase/Vercel stack, refactor current Guestbook in place, query under anonymous RLS, and use explicit manual load-more rather than endless auto-feed. Do not assume a stack migration.
- **Protected:** guest event routes, message submission API and rate limit, pending/approved/rejected moderation, event isolation, admin, gallery, PWA, shared theme/nav/footer, existing guest data and uncommitted work.
- **Deferred:** host-curated/pinned featured messages (would require explicit admin+DB design), reactions/comments, portraits, AI, social features, export/print, site-wide redesign, speculative virtualization, unrelated new platform.
- **Material approvals required:** live database/security migrations, production deploy, material stack change, paid-service actions; do not confuse planning approval with production authorization.
- **Known uncertainty:** Actual production schema/Realtime behavior, traffic volumes, Lighthouse baseline, deployed revision, and source Git changes have not been inspected. No tests executed in the planning session.

## Iterations

| ID | Outcome and included work | Dependencies / risks | Completion gate | Status |
| --- | --- | --- | --- | --- |
| **GB-01 — Safety and read model** | Confirm current checkout/schema; audit/resolve anonymous Broadcast payload exposure if present; define approved-only count and deterministic timestamp+ID cursor semantics; verify moderation and accurate submit copy; establish focused tests. | Safe Supabase test/staging; if SQL change is needed, design review/production authorization before rollout. | RLS + WebSocket payload tests show no pending/rejected data to guests; identical-timestamp records traverse exactly once; submit pending semantics correct; baseline commands/results recorded. | **Blocked** — code + unit tests done; staging checks Not run |
| **GB-02 — Editorial Guestbook** | Implement Guestbook intro, approved count and CTA; semantic responsive editorial card grid, date headers, deterministic varied card treatments, long-text expansion, clear skeletons/errors/empty states, manual load-more. | GB-01 data interface; theme provider. | 0/1/5/20/100-item scenarios look coherent at mobile/tablet/desktop in both themes; keyboard/focus and DOM reading order remain logical; functional loading. | **In progress — NOT APPROVED.** Round 1 rejected by owner (double borders, stretched cards, arbitrary type, dashboard feel). Round 2 rebuilt layout/type/surfaces; screenshots at 390/1440 dark+light reviewed by implementer only; remaining matrix and owner sign-off Not done |
| **GB-03 — Discovery and scale** | Search guest name/message text across complete approved archive; newest/oldest sort; server-side search/count, query reset/failed requests; realtime revalidation and reconnect; 1,000+ fixture checks and bounded rendering. | Stable DB query contract, potential query-index experiment. | Search finds results outside first page; count/status/sort/paging accurate with 1,000+ messages; approvals/rejections/deletions don't leak or produce phantom cards; no unbounded initial fetch. | **In progress** — implemented; scale/moderation checks Not run |
| **GB-04 — Polish, hardening, delivery** | Responsive/contrast/motion/AT audit, motion polish, mobile/PWA/SEO/admin/gallery regressions, performance profiling, remove obsolete code, docs and handoff, deployment readiness (not deployment). | GB-01–GB-03, test devices and environment. | Type/lint/build + regression results recorded; screen-size/theme/motion matrix passes; no known security/functional release blocker; approved deployment plan if requested. | **Planned** |

## Implementation status (session 1)

**Session 2 (GB-02 correction):** owner rejected the first visual result. Root causes found and fixed at source rather than patched: `.archive-card::after` inner frame (removed), `h-full` + grid row stretching (removed; notes now have natural height), size-by-length type scale and oversized quote glyph (removed; one body size, serif reserved for signature/dates/headline), uniform two-column grid (replaced by a centred axis: notes sized to their text up to a reading measure; only same-size, near-equal-height neighbours share a row; never two pair rows in a row; DOM order unchanged). New canonical tokens `.archive-stage` / `.archive-note` / `.archive-rule` in `globals.css`. Day headers, toolbar, intro divider and closing mark re-composed on the same centred axis. Hook, queries, keyset, moderation, realtime untouched.

**Session 1 — done in code:** `lib/guestbook/{keyset,queries,presentation}.ts`, rewritten `useGuestbookFeed` (stable `(created_at,id)` keyset, lookahead hasMore, exact counts, server search, sort, request cancellation, invalidation-only realtime), `useDebouncedValue`, `GuestbookIntro`, `GuestbookToolbar`, `MessageGrid`, `MessageCard`, `ArchiveSkeleton`, `EmptyState`, `GuestbookFeed`, guestbook page, archive tokens in `globals.css`, truthful submit copy, migrations `0009`/`0010` (unapplied), unit tests. Old observer-based auto-pagination and single-column list removed.

**Still required to close iterations:** staging Realtime/RLS capture (GB-01), 0/1/5/20/21/100/1,000+ fixtures and two-client moderation (GB-03), screenshots at 375/430/768/1024/1440 in both themes, keyboard/screen-reader/contrast/zoom pass, regression smoke (event home, message, gallery, admin, PWA), Lighthouse (GB-04).

## GB-01 — next exact work

1. Obtain current Git checkout and inspect `README.md`, `package.json`/lockfile, `app/events/[slug]/guestbook/page.tsx`, `components/Guestbook/*`, `hooks/useGuestbookFeed.ts`, `lib/events.ts`, `app/api/messages/route.ts`, `supabase/migrations/0001`, `0005`–`0007`, and any newer migrations. Record commit, current changes, and updated differences versus planning zip.
2. Use an isolated staging/test Supabase environment to inspect effective `messages` RLS and `realtime.messages` authorization and capture anonymous Realtime events on `messages-changes:<event-id>`. Current source passes `new` and `old` rows to Broadcast for **all statuses**, and anonymous authorization accepts the message-topic prefix. Determine whether non-approved body/name leaks over the wire; do **not** assume a frontend `status` check is a security boundary. Also test the `0001` public `messages` SELECT policy on approved rows belonging to unpublished events; direct table RLS is not the same as the page route published gate.
3. If confirmed, design an approved-only/public-safe payload or invalidation-only Broadcast contract, with client refetch through RLS and appropriately scoped topic authorization; write a **new** reviewed migration rather than edit historical migration 0005/0006. Verify approval/rejection/delete behavior. Do not run production SQL without approval.
4. Define stable cursor `(created_at,id)` and correct forward/backward sort, 20-item page + lookahead, event/approved-constrained count/search interfaces, safe request cancellation/deduplication. Add focused unit/integration tests (choose tool proportionate to actual project).
5. Correct misleading message-success wording if default `pending` is confirmed; verify existing 1–80/1–500 validation and server rate limit remain intact. Run `npm ci`, type-check, supported lint, build and tests as possible; record baseline failures separately.

**Known GB-01 blocker to resolve:** No live/test Supabase environment or existing Git checkout is provided with this planning artifact. The executor can implement/test pure cursor logic with fixtures immediately, but cannot declare RLS/Broadcast behavior secure without suitable environment or separately supplied evidence. Escalate a material security/schema change before production application.

## Verification ledger

| Date | Area | Evidence / result | Owner / context |
| --- | --- | --- | --- |
| 2026-11-06 | Planning | Inspected supplied repository archive; identified existing 20-message feed, timestamp cursor, event accent system, admin moderation path, SQL/RLS and Broadcast setup. No source changes. | Planning GPT |
| 2026-11-06 | Baseline tests | **Not run:** archive contains no `node_modules` or test suite; no installed app dependencies, live credentials, or staging environment. | Planning GPT |
| 2026-11-06 | Security | **Unverified risk:** migrations broadcast full old/new rows to publicly authorized message-topic prefix. Needs safe WebSocket/policy test; not labeled a confirmed production leak. | Planning GPT |
| 2026-11-06 | Support | Checked Next.js official support policy: Next 15 maintenance security support through 2027-01-31, Next 16 active LTS. A separate upgrade review is recommended; no upgrade performed. | Planning GPT |
| 2026-11-06 | GB-02 visual round 2 | Screenshots via headless Chromium against a local PostgREST stand-in (real Next page, real queries): 7-message archive at 1440 and 390, dark and light; 130-message archive loaded to 100 and 120 cards at 1440 and 390 (top/middle/end). Reviewed by implementer; **owner approval pending**. | Implementation session 2 |
| 2026-11-06 | Responsive overflow | No horizontal overflow at 375/430/768/1024/1440, dark+light, 7- and 130-message archives (**Passed**, scripted). | Implementation session 2 |
| 2026-11-06 | Behaviour regression (mock backend) | Load-more to 100+ with exact "Showing 100 of 130"; search "tamales" returns 8 matches from beyond page 1; no-results state; Oldest sort puts earliest message first; "Read full message" toggles `aria-expanded`. **Passed against the mock only** — mock is not Supabase/RLS. | Implementation session 2 |
| 2026-11-06 | Unit tests | `npx vitest run` **Passed** (27 tests) after layout change. `tsc --noEmit`, `next lint`, `next build` re-run — see below. | Implementation session 2 |
| 2026-11-06 | Baseline | `npm ci` OK; `npx tsc --noEmit` **Passed** (0 errors) on the unmodified zip. | Implementation session |
| 2026-11-06 | Static checks after changes | `npx tsc --noEmit` **Passed**; `next lint` **Passed** (3 pre-existing warnings in Admin/Footer/UploadButton, none in changed files); `next build` **Passed** with placeholder env vars. | Implementation session |
| 2026-11-06 | Unit tests | `npx vitest run` **Passed**: 21 tests (keyset paging exactly-once both directions over 47 rows with tied timestamps; filter-string/predicate equivalence; hasMore boundary at 20/21; search escaping; window reconciliation; day grouping; no holes beside full-width cards). Pure logic only. | Implementation session |
| 2026-11-06 | Migrations | `0009`, `0010` syntax-parsed with pglast (incl. PL/pgSQL body). **Not applied** to any database; behaviour **Not run**. | Implementation session |
| 2026-11-06 | Public data boundary / Realtime payload | **Not run** — no staging Supabase. Source audit confirms 0005 broadcasts full rows for all statuses and 0006 lets anon receive the prefix: treat R-01 as open until captured on staging. | Implementation session |
| 2026-11-06 | Submit semantics | Success copy corrected to "sent for approval". `/api/messages` untouched; rate-limit/validation regression **Not run**. | Implementation session |
| 2026-11-06 | Visual / responsive / a11y / 1,000+ fixture / two-client moderation / Lighthouse / PWA | **Not run** — no browser, device, or seeded database in this session. | Implementation session |

## Decisions / blockers / questions log

| ID | Type | Detail | Disposition |
| --- | --- | --- | --- |
| D-01 | Product | Memory Archive is the selected artistic direction; Guestbook not social media, maintain readable deterministic order. | Carry forward |
| D-02 | Technical proposal | Retain current stack and use existing provider/Framer Motion/DB for UX redesign. No wholesale migration based only on design needs. | Use by default pending fresh code review; material change requires approval |
| D-03 | Data proposal | Exact approved count, server-side name/text search, timestamp+ID keyset; query RLS remains authority. | GB-01/03 |
| D-04 | Featured cards | Visually emphasize selected-by-layout approved messages without implying host curation; defer explicit host-pinned features to a later request. | Carry forward |
| R-01 | Security risk | Potential non-approved full-row data in Realtime Broadcast payload to anonymous subscribers. | Investigate first, block release if confirmed |
| R-02 | Privacy risk | Initial public messages SELECT policy checks approval status but does not reference parent event publication; clarify whether direct anonymous reads of approved messages from unpublished events are permitted. | Verify policy against production and expectations in GB-01 |
| R-03 | Compatibility | Next 15 moves out of maintenance support after 2027-01-31; `next lint` deprecated and removed in Next 16. | Post-release/earlier prioritized support review; no migration authorized |
| D-05 | Implementation | Broadcast is now an invalidation signal only: the client ignores payload bodies and re-reads via RLS. Fix lives in new `0009` (invalidation-only payload, approved-boundary only, topic policy scoped to published events). | Needs staging verification + approval before production |
| D-06 | Implementation | `0010` (messages SELECT requires published event) split from `0009` so R-02 can be approved independently. | Awaiting product decision |
| D-07 | Implementation | Search ignores `*` (PostgREST wildcard alias cannot be escaped); `%`, `_`, `\\`, quotes, commas, parens are matched literally. Max 80 chars. | Carry forward |
| D-08 | Implementation | Realtime reconciliation: removals applied silently; additions held behind a "N new messages — show" prompt; loaded ranges above 200 rows show a reload prompt instead of in-place verification. Reconnect and tab-return also revalidate. | Carry forward |
| D-09 | Implementation | Added `vitest` (dev) + `npm test`; `npm run typecheck`. No other dependencies added. | Carry forward |
| D-10 | Design correction | Centred-axis composition replaces left/right alternation (read as a chat thread) and the stretched 2-column grid (dashboard). Width follows content up to a reading measure; length never changes type size. | Pending owner approval |
| D-11 | Design | Type system: Lora 17/18px body for every message; Cormorant Garamond italic for signatures, day numerals and headline; Inter for time/meta. No quote glyphs. | Pending owner approval |
| D-12 | Known behaviour | Pair/solo layout is recomputed from the loaded list, so when "Load more" appends, the last previously-shown note can change from solo to pair. Accepted; revisit if the owner finds it jarring. | Open |
| D-13 | Design | Notes use three alternating surface tones (ink / tint / paper; paper = ivory in dark mode, deep ink in light mode) chosen from the message id only — never length/author — and never repeated on adjacent notes. Author signature takes the event accent (hue/chroma kept, lightness clamped per surface; >= 4.9:1 across 11 test accents). Pending owner review with GB-02. | Pending owner approval |
| R-04 | Security (found, out of scope) | `0005` also broadcasts full `gallery` rows (incl. pending uploads' URLs) to anon via the same prefix policy. Gallery was protected scope, so not changed. | Needs owner decision; same fix pattern as 0009 |
| B-01 | Evidence gap | No production migration proof, Git status or representative load metrics. | Executor reconciles in current checkout + safe staging |

## Update instructions for every implementing session

- At start: reread kickoff and roadmap, check current code and latest commit, record any divergence, mark current iteration **In progress**.
- During: append test evidence and important choices, scope changes, blockers and dependency decisions; keep roadmap authoritative. Don't maintain a separate conflicting status tracker.
- Before claiming completion: pass the documented iteration gate; record commands, artifacts, screenshots/measurements, relevant commit, unresolved issues, and next step. **Not run** is not **Passed**.
- At handoff: provide updated roadmap, changed/removed file manifest and concise resume point. If interrupted, keep **In progress**/**Blocked**, preserving exact remaining checks.
- No production deployment, live SQL or destructive data action without explicit user approval. Never expose Supabase credentials or personal message data in artifacts.

## References for implementation

- Completed kickoff: `docs/guestbook-redesign-kickoff.md` (all ten sections, scope, file manifest, acceptance criteria).
- Official support: https://nextjs.org/support-policy ; https://nextjs.org/blog/next-15-5
- Official Realtime: https://supabase.com/docs/guides/realtime/authorization ; https://supabase.com/docs/guides/realtime/broadcast
