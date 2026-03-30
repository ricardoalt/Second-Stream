# Field-Agent Frontend Redesign — Canonical Implementation Plan

**Date:** 2026-03-24  
**Last updated:** 2026-03-29  
**Status:** Canonical frontend implementation plan (living, execution-ready)  
**Scope:** Frontend `(agent)` field-agent experience (Stitch parity + quality uplift)  
**Canonical baseline:** Stitch project `16271509822248673774` (SecondStream)

---

## 1) Objective

Define the single implementation plan that future agents must follow to deliver field-agent UI/UX parity (or better) versus Stitch, with clear sequencing, realistic status tracking, and execution-ready guidance for SDD phases.

---

## 2) Canonical sources of truth

1. Stitch project `16271509822248673774` (visual/workflow baseline)
2. This document (execution sequencing + scope normalization)
3. `docs/SDD.md` (platform architecture and broader implementation strategy)
4. Existing frontend route group: `frontend/app/(agent)` and supporting feature components
5. `docs/UI-SPEC.md` (secondary implementation reference; partially stale)

Rule: when in doubt, match Stitch behavior and flow intent, not ad-hoc implementation shortcuts.

---

## 3) Current implementation snapshot (2026-03-27)

This section is the operational status baseline for day-to-day SDD apply/verify work.

### 3.1 Family status snapshot

- **Agent shell:** **Stable** (active global shell and provider composition)
- **Dashboard:** **Partial / stabilized**, still mostly **mock-driven**
- **Discovery family:** **Functionally real**, active and **backend-connected**
- **Waste Streams family:** **Functionally real list/drafts flow** under `/streams` with inline tabs; backend-connected for list retrieval + draft confirmation, parity refinement still pending
- **Stream Detail Workspace:** **Partial but materially upgraded** — real 4-phase questionnaire foundation, refined Stitch-like shell, dedicated Files/Contacts support routes, unified Quick Capture modal, and AI-assisted questionnaire prefill review with human Accept/Reject control are active; deeper lifecycle completeness is still pending
- **Client Portfolio + Client Profile:** **Active UI coverage**, shifted toward operations-first, still mostly **mock-driven**
- **Offers family (Pipeline/Detail/Archive):** **Backend foundation materially real** — Workspace now hands off directly into Offer detail; active Pipeline + Detail are backend-connected; Archive foundation is implemented and runtime-verified for its scoped v1 goal

### 3.2 Backend-connected vs mock-driven reality

- **Backend-connected and active in UI:** Discovery Wizard flow; Waste Streams `/streams` list buckets (`All`/`Drafts`/`Missing Information`) load from dashboard API; Draft confirmation executes via discovery draft decision API
- **Deprecated legacy surface:** `DraftConfirmationSheet` (removed; centered confirmation modal is canonical)
- **Partially backend-connected:**
  - Quick Entry creates streams through project creation with required minimum input guardrails
  - Stream Detail now hydrates workspace state from workspace API, autosaves questionnaire answers, and uses backend phase progress + first-incomplete-phase selection
  - Stream Detail AI questionnaire prefill review is backend-connected through suggestion review API (`accept`/`reject`) with field, section, and phase scopes
  - `/streams/[id]/files` uses real project file APIs for listing/upload-adjacent refresh/delete patterns
  - `/streams/[id]/contacts` uses real project/location/company APIs for contact retrieval and prioritization
  - Workspace Quick Capture uploads files/audio/text as project files and triggers workspace re-hydration
  - Workspace completion (`complete-discovery`) now creates/reuses the Offer draft artifact and returns immediate Offer-detail navigation context
  - Offers Pipeline now loads from real project-scoped backend projection data
  - Offer Detail now resolves by `/offers/[projectId]`, hydrates from real project/proposal context, and persists follow-up-state transitions through backend actions
  - Offers Archive now loads from a real archive projection limited to backend-grounded terminal states (`accepted`, `declined`) and is runtime-verified for Archive v1 behavior
- **Mostly mock/local-state driven:** Dashboard KPIs beyond available counts, end-to-end stream workspace lifecycle semantics, Clients

### 3.3 Important implementation truths (must remain explicit)

- Use **Offers** as user-facing naming (not “Proposals”).
- Dashboard is **stabilized**, not parity-complete.
- Waste Streams family is consolidated under `/streams` with inline tabs (not separate routes per bucket).
- Discovery + Waste Streams list/drafts is now the most operationally real day-to-day flow.
- Discovery wizard is the canonical active discovery flow.
- Quick Entry and Draft confirmation are aligned on minimum stream-shape fields (material/volume/frequency, with units preserved; Quick Entry additionally requires explicit location before create).
- Client Portfolio has moved toward operations-first behavior, but parity vs Stitch is still tracked as incomplete.
- Stream workspace now has one canonical 4-phase questionnaire foundation (single top stepper; no duplicate phase controls).
- AI questionnaire prefill is assistive-only: suggested values are visible inline, and a human must explicitly Accept/Reject (field/section/phase).
- Workspace right rail is intentionally narrowed to Quick Capture actions (upload/voice/paste) through a unified modal.
- Files and Contacts are first-class support pages from workspace header actions, each with explicit “Back to workspace” navigation.
- Offer detail routing is now project-scoped (`/offers/[projectId]`), not proposal-id-scoped.
- `Project.proposal_follow_up_state` is the canonical commercial follow-up source of truth for active Offers behavior.

---

## 4) Frontend inventory (active today)

### 4.1 Active routes

- `/dashboard`
- `/streams`
- `/streams/[id]`
- `/streams/[id]/files`
- `/streams/[id]/contacts`
- `/clients`
- `/clients/[id]`
- `/offers`
- `/offers/[projectId]`
- `/offers/archive`

### 4.2 Active major global surfaces / modals

- Discovery Wizard provider + real wizard
- Quick Paste modal bridge into wizard
- Stream Quick Capture modal (workspace-scoped: files/audio/raw text)
- Add Client modal
- Edit Client modal
- Call Client modal
- Send Email modal
- Log Activity modal
- Request Update modal

---

## 5) Definition of done and status language

Use these terms consistently in propose/spec/design/tasks/apply/verify artifacts.

- **Implemented in code**: component/page exists in repo.
- **Active in UI**: mounted and reachable in normal user flow.
- **Stabilized**: no immediate rework required for baseline usage, but parity may still be incomplete.
- **Backend-connected**: primary user path uses real API/data integration.
- **Mock-driven**: depends on local mock data and/or local UI state for primary flow.
- **Parity-complete**: behavior/fidelity/workflow depth match (or intentionally improve) Stitch baseline and pass family acceptance checks.

Verification claims must always distinguish these dimensions; do not collapse them into a single “done”.

---

## 6) Family implementation matrix (execution baseline)

| Family | Active route(s) | Current status | Backend integration status | Parity status | Next major work |
|---|---|---|---|---|---|
| Dashboard (command center) | `/dashboard` | Partial / stabilized | Mostly mock/local-state | Not parity-complete | Replace remaining mock signals with backend data contract; tighten triage zones/CTAs against Stitch intent |
| Waste Streams family | `/streams` | Active and functionally real for list/drafts | **Partially backend-connected** (dashboard bucket reads + draft confirmation decisions) | Closer, still needs refinement | Tighten parity details, finish remaining backend-backed metrics/actions, and verify end-to-end list behavior |
| Stream Detail Workspace | `/streams/[id]` (+ `/streams/[id]/files`, `/streams/[id]/contacts`) | Active refined shell with real 4-phase questionnaire foundation, support pages, and AI prefill review controls | **Partially backend-connected** (hydrate + questionnaire autosave + suggestion review API + support-page data + quick-capture uploads) | Improved, still not parity-complete | Complete lifecycle depth: phase gating semantics, richer cross-phase coordination, and remaining backend action contracts |
| Client Portfolio | `/clients` | Active, shifted operations-first | Mostly mock/local-state | Partial parity | Complete operations-first parity details and replace mock portfolio/list signals with backend data |
| Client Profile | `/clients/[id]` | Active UI coverage | Mostly mock/local-state | Partial parity | Increase workflow depth (timeline/actions/context linkage) and connect profile actions/data |
| Offers Pipeline | `/offers` | Active backend-connected active follow-up surface | **Backend-connected** (project-scoped pipeline projection) | Improved, still not parity-complete | Tighten fidelity, polish labels, and deepen transition/error coverage |
| Offer Detail | `/offers/[projectId]` | Active backend-connected execution surface | **Backend-connected** (project/proposal hydration + follow-up transition mutation) | Improved, still not parity-complete | Deepen activity/history fidelity and remaining UI-level interaction coverage |
| Offers Archive | `/offers/archive` | Active backend-connected historical surface | **Backend-connected and runtime-verified** (archive projection + read-only UI) | Improved, still not parity-complete | Deepen historical fidelity, polish UX, and add stronger UI-level coverage |
| Discovery family (modal-first) | Global modal surfaces | Strongest flow, active canonical | Backend-connected (wizard + centered `DraftConfirmationModal`) | Closest to parity, still not closed | Keep modal flow canonical; complete orchestration and recovery parity checks |

Summary: route/surface coverage is strong; Discovery + Waste Streams list/drafts remain the most mature operational loop, and Stream Detail now has AI-assisted prefill review + support-page routing but still needs lifecycle-depth completion.

---

## 7) Implementation goal and normalized parity unit

- Deliver a field-agent experience equal or better than Stitch on:
  - operational clarity
  - workflow depth
  - speed-to-action
  - consistency across list/detail/modal interactions
- Close parity gaps primarily in **fidelity and workflow density**, not route existence.

Key conclusion: most major route families already exist in code, but interaction depth and operational fit are still below baseline.

### 7.1 Canonical family list and normalization rules

Parity is measured by **normalized family**, not raw screen count.

### Canonical family list

1. Dashboard (command center)
2. Waste Streams family (list-level states)
3. Stream Detail Workspace (single multi-phase workspace)
4. Client Portfolio
5. Client Profile
6. Offers Pipeline
7. Offer Detail
8. Offers Archive
9. Discovery family (modal-first)

Normalization rules:
- Do **not** count tab/status buckets as separate pages.
- **Tabs/buckets (All / Drafts / Missing Information) belong to Waste Streams family, NOT to Dashboard.**
- Waste Streams states are one family with variants.
- Stream detail phases are one multi-phase workspace family.
- Discovery is one modal-first family, even with multiple modal surfaces.
- Use **Offers** as user-facing naming (not “Proposals”).

---

## 8) Family-by-family requirements

## 8.1 Dashboard (command center)

**IMPORTANT: Tabs/buckets like All / Drafts / Missing Information belong to the Waste Streams family, NOT to Dashboard.** Dashboard is a curated operational surface, not a filtered list view.

Intent: triage-first command center, not a passive KPI wall or filtered streams list.

Must-have requirements (based on actual Stitch wireframe):
- **Zone 1 - Executive Summary**: 4 KPI cards:
  - Monthly Pipeline Growth
  - Conversion Rate
  - Avg. Deal Cycle
  - Compliance Score
- **Zone 2 - Immediate Action Required: Critical Alerts**: 3 cards:
  - Overdue
  - Stagnant Deal
  - New Opportunity
  - Each with status label, client, short description, and single dominant CTA
- **Zone 3 - Streams Awaiting Information**: Focused table centered on:
  - Material
  - Client / Origin Site
  - Compliance Status
  - Missing Documentation
  - Strategic Action
  - CTA per row
- **Zone 4 - Today's Strategic Focus**: Single editorial card with:
  - High-impact focus block
  - Primary CTA
  - Secondary CTA
  - Daily progress indicator

Dashboard does NOT have bucket tabs. Those belong to Waste Streams family.

Acceptance direction:
- Agent can identify top work items and take action in <30 seconds without hunting.

## 8.2 Waste Streams family (single family with state variants)

**NOTE: This is where bucket/tab variants belong (All / Drafts / Missing Information), NOT in Dashboard.**

Intent: one operational list family with state/bucket variants.

Must-have requirements:
- Unified table/list interaction model across states
- Canonical state taxonomy: All / Drafts / Missing Information
- Filtering/sorting/search consistency across variants
- Zero duplication of list logic by creating "new pages" per bucket
- Bulk actions and row-level CTAs wired and functional

Acceptance direction:
- Switching states changes data + emphasis, not interaction model.

## 8.3 Stream Detail Workspace (single multi-phase family)

Intent: one continuous workspace across phases, not disconnected pages.

Must-have requirements:
- Shared workspace shell with phase progression clarity
- Cross-phase continuity of context, evidence, notes, and actions
- Strong gating/next-step affordances and current blocker visibility
- Rich coordination actions (communications, updates, attachments, side actions)

Acceptance direction:
- Agent can progress a stream from current phase to next phase without context switching routes.

## 8.4 Client Portfolio (operations-first)

Intent: portfolio as operational command surface, not a marketing-style card gallery.

Must-have requirements:
- Table-first presentation optimized for sorting and scanning
- Account health, active streams, and pending actions surfaced inline
- Fast navigation into client profile and related stream work
- Portfolio filters aligned to operations (not vanity metrics)

Acceptance direction:
- Agent can pick highest-priority client work from the list directly.

## 8.5 Client Profile

Intent: account operating context + active work coordination.

Must-have requirements:
- Consolidated client overview, locations, contacts, active streams, and recent timeline
- Action shortcuts for discovery/workflow continuation
- Clear relationship between client-level and stream-level actions

Acceptance direction:
- Agent can answer “what is happening with this client and what do I do next?” at a glance.

**Add Client follow-up (must remain explicit):**
- Add Client parity is **not** complete yet.
- Product Engineering has now confirmed that the Stitch **"Shipping Location & Logistics Hub"** block should persist as the client/company's **first real `Location`**.
- This first Location is valid onboarding data, but it does **not** change the rule that Discovery Wizard remains the only waste-stream creation path.
- Add Client can now be implemented as a real sequential flow: `Company` → primary `CompanyContact` → first `Location`.
- Remaining work is implementation detail and partial-failure UX, not domain ambiguity.

## 8.6 Offers Pipeline

Intent: active commercial pipeline view for field agents.

Must-have requirements:
- User-facing naming and copy use **Offers** consistently
- Stage/status clarity with operational next actions
- Fast drill-down into offer detail and linked stream/client context

Acceptance direction:
- Agent can manage active commercial follow-up without leaving pipeline context.

## 8.7 Offer Detail

Intent: execution surface for one commercial opportunity.

Must-have requirements:
- Complete offer context (status, economics/commercial notes, activity/timeline)
- Explicit next-step actions and status transitions
- Linkage to parent stream/client context

Acceptance direction:
- Agent can progress or close an offer with complete context in one place.

## 8.8 Offers Archive

Intent: historical closed/archived offer retrieval + learning loop.

Must-have requirements:
- Fast search/filter by key dimensions
- Distinct visual semantics from active pipeline
- Read-focused detail access with minimal friction

Acceptance direction:
- Archived commercial history is discoverable in seconds.

## 8.9 Discovery family (modal-first)

Intent: discovery intake and confirmation through modal-first flows.

Must-have requirements:
- Primary UX is modal-first (wizard + helper modals), not route sprawl
- Multi-input intake support and confirmation loops
- Reliable handoff into stream lifecycle with minimal re-entry
- Consistent modal behavior, validation, and escape/recovery patterns

Acceptance direction:
- Agent can complete discovery from intake to confirmed handoff without UX dead ends.

---

## 9) Canonical audit matrix (baseline → implementation)

| Family | Baseline intent (Stitch) | Current state summary | Gap type | Parity acceptance direction |
|---|---|---|---|---|
| Dashboard | Command center triage | Stabilized but still mostly mock-driven | Backend + workflow density | Priority triage + quick action command center using real signals |
| Waste Streams family | Unified family with state variants | Consolidated tabs under `/streams` with backend-backed list/drafts confirmation loop | Remaining fidelity + backend depth | One family model; no variant overcount |
| Stream Detail Workspace | One multi-phase workspace | Active refined shell with real 4-phase questionnaire foundation, support pages, unified quick-capture modal, and human-reviewed AI prefill controls | Remaining lifecycle depth + backend contract completion | End-to-end continuity in one workspace without mock-dependent transitions |
| Client Portfolio | Operations-first client list | Operations-first direction landed, still mock-driven | Backend + fidelity | Table-first operational portfolio with real data |
| Client Profile | Client command context | Active UI coverage, mostly local/mock behavior | Workflow density + backend | Full account action context |
| Offers Pipeline | Active commercial follow-up | Active coverage with Offers naming, mostly mock-driven | Backend + fidelity | Actionable stage UX with real transitions |
| Offers Pipeline | Active commercial follow-up | Backend-connected active pipeline with real open-state projection | Remaining fidelity + test depth | Actionable stage UX with real transitions |
| Offer Detail | Single-offer execution | Backend-connected execution surface with persisted follow-up transitions | Remaining history fidelity + UI interaction depth | Full next-step control in-place |
| Offers Archive | Historical retrieval | Backend-connected read-only archive foundation, runtime-verified for v1 | Remaining fidelity + test depth | Fast archive retrieval and context |
| Discovery family | Modal-first discovery workflow | Active backend-connected canonical flow | Parity hardening | Modal-first completion path with strong handoff and recovery |

Summary: route coverage is broadly present; parity risk is now concentrated in lifecycle depth, semantics, and backend contract completion for remaining families.

---

## 10) Next implementation priorities (reality-based)

Priority order for next SDD cycles:
1. **Stream Detail lifecycle completion from the new foundation** (phase gating semantics, cross-phase continuity, unresolved workspace action contracts)
2. **Waste Streams parity hardening from current functional baseline** (metrics/actions/contracts and list-to-workspace handoff quality)
3. **Dashboard data integration + triage fidelity hardening**
4. **Clients family backend integration** (portfolio/profile)
5. **Offers family parity/fidelity hardening** (activity/history depth, archive/detail UI interaction coverage, remaining historical polish)
6. **Clients Add Client follow-up** (real Company + primary contact + first Location creation flow, with partial-failure handling)
7. **Discovery parity hardening** (centered confirmation modal canonical; continue orchestration/recovery hardening)

Rationale:
- Stream Detail foundation/refinement work is now real (including AI prefill review controls and support pages); highest value is finishing lifecycle semantics and backend contract depth (not rebuilding shell structure again).
- Waste Streams should focus on parity/contract hardening, not re-laying list foundations.
- Dashboard/Clients must avoid overclaiming parity until real data and behavior are verified.
- Offers now has a real backend-connected foundation; remaining work is parity/fidelity hardening rather than first-pass backend integration.

---

## 11) Supporting doc relationship

- `docs/UI-SPEC.md` remains a **secondary** implementation reference.
- It is currently **partially stale** and must not override this plan when conflicts exist.
- During verify/archive cycles, sync key decisions from this canonical plan into UI-SPEC to reduce drift.

---

## 12) SDD usage guidance (how to use this plan)

Use this document as the frontend execution anchor for all SDD phases:

- **/sdd-propose**: choose target family using Section 6 matrix + Section 10 priorities.
- **/sdd-spec**: write requirements using Sections 7–9 terminology and acceptance direction.
- **/sdd-design**: define technical approach to move family from mock-driven/partial to backend-connected/parity-complete.
- **/sdd-tasks**: create tasks that explicitly separate:
  1) implementation in code,
  2) active UI mount,
  3) backend integration,
  4) parity verification.
- **/sdd-apply**: implement only scoped family tasks and update matrix/status language with factual progress.
- **/sdd-verify**: validate claims using status definitions in Section 5; reject “done” claims that only prove code exists.

---

## 13) Implementation principles

1. **Family-first parity**: deliver complete family behavior before polishing edge variants.
2. **Workflow depth over route count**: no “checkbox parity” by adding shallow pages.
3. **Operational UI bias**: prioritize scanability, triage, and next actions.
4. **State variants are variants**: never split list/workspace variants into fake new families.
5. **Modal discipline for Discovery**: preserve modal-first architecture and consistency.
6. **Offers naming consistency**: user-facing copy uses Offers across all commercial surfaces.
7. **Parity + uplift**: matching Stitch is baseline; improvements are allowed if they increase clarity/speed without breaking canonical family behavior.

---

## 14) Phased implementation plan (updated)

## Phase A — Status and taxonomy lock
- Freeze family boundaries, route inventory, and status language from Sections 4–7
- Ensure all active frontend work references this matrix before coding
- Keep Offers naming consistency and Waste Streams tab boundary rules enforced

Exit criteria:
- Team cannot overcount variants as pages in planning/review
- P0 family acceptance criteria are explicit and testable

## Phase B — Stream Detail backend alignment from real list baseline
- Keep `/streams` as the functional list baseline and continue from the now-landed Stream Detail foundation (4-phase shell + support pages + quick capture)
- Close remaining `/streams/[id]` lifecycle backend gaps (phase semantics, state transitions, and coordination actions)
- Validate end-to-end transitions from list triage to detail execution without mock fallback

Exit criteria:
- Daily triage flow is executable end-to-end without workaround paths

## Phase C — Dashboard hardening + Clients integration
- Complete dashboard triage fidelity with real data contracts
- Complete Clients backend connectivity (portfolio + profile)
- Keep operations-first IA and action model

Exit criteria:
- Discovery-to-stream handoff is reliable and low-friction
- Client portfolio supports operational prioritization directly

## Phase D — Offers integration + Discovery parity closeout
- Complete Offers family backend connectivity and status semantics
- Keep `DraftConfirmationModal` as canonical discovery confirmation surface; legacy `DraftConfirmationSheet` remains deprecated
- Final cross-family consistency pass (copy, action patterns, state semantics)

Exit criteria:
- All normalized families meet parity checklist; no unresolved critical mismatches

---

## 15) SDD-ready ticket breakdown

Use this as the decomposition baseline for `/sdd-propose` → `/sdd-spec` → `/sdd-design` → `/sdd-tasks`.

### Epic FE-FA-1: Dashboard command center
- Define command-center IA and queue model
- Implement triage-first dashboard layout and interactions
- Validate priority-to-action speed and route transitions

### Epic FE-FA-2: Waste Streams family normalization
- Implement single-family list architecture with state variants
- Align state taxonomy and list behavior consistency
- Remove variant-specific interaction drift

### Epic FE-FA-3: Client Portfolio operations-first redesign
- Replace card-first bias with table-first operational portfolio
- Add inline operational context and action affordances
- Validate navigation and prioritization workflow

### Epic FE-FA-4: Discovery modal-first parity
- Harden wizard and helper modal orchestration
- Improve confirmation/edit/handoff reliability
- Validate recovery/error UX for modal flows

### Epic FE-FA-5: Stream Detail workspace depth
- Strengthen multi-phase continuity and workspace coordination tools
- Align gating and next-step communication patterns

### Epic FE-FA-6: Offers family consistency pass
- Enforce Offers naming in user-facing copy
- Tighten pipeline/detail/archive operational continuity

---

## 16) Execution order (current recommendation)

1. FE-FA-5 Stream Detail workspace depth (+ backend lifecycle wiring)
2. FE-FA-2 Waste Streams family hardening from current functional baseline
3. FE-FA-1 Dashboard command center hardening (real data + triage parity)
4. FE-FA-3 Client Portfolio operations-first redesign completion (+ profile integration)
5. FE-FA-6 Offers family consistency + backend integration
6. FE-FA-4 Discovery modal-first parity hardening (close remaining orchestration gaps)
7. Final cross-family parity audit against normalized matrix and Section 5 status definitions

Dependency note:
- Dashboard and Waste Streams remain important inputs, but Stream Detail lifecycle completion is now unblocked because foundational shell/support surfaces are already active.

---

## 17) Guardrails

- Do not measure progress by raw Stitch screen count.
- Do not split tab/status/phase variants into separate "new pages."
- **Do NOT add bucket/tab filters to Dashboard. Tabs (All / Drafts / Missing Information) belong to Waste Streams family, NOT to Dashboard.**
- Do not claim parity-complete unless backend-connected + active + acceptance checks pass.
- Do not ship shallow visual parity without workflow completion depth.
- Do not regress discovery into route-heavy flows; keep modal-first.
- Do not use "Proposals" in user-facing field-agent UI copy; use **Offers**.
- Do not expand scope to admin redesign from this plan.

---

## 18) Open questions / blockers

1. ~~Waste Streams taxonomy final decision: exact state naming/semantics for missing-information vs follow-up handling.~~ **RESOLVED: Use "Missing Information" as canonical taxonomy visible in Waste Streams.**
2. ~~Discovery surface policy: finalize whether `DraftConfirmationSheet` is mounted as active flow or deprecated.~~ **RESOLVED: Keep centered `DraftConfirmationModal` as canonical; deprecate/remove `DraftConfirmationSheet`.**
3. Offer status vocabulary alignment: confirm canonical wording for all field-agent-facing status chips/tooltips.
4. Stream Detail workspace contract sequencing: confirm hydrate/update/phase-transition endpoints and UI integration order for `/streams/[id]`, including AI suggestion review edge cases.
5. Waste Streams KPI contract completion: confirm backend availability/timing for monthly volume + open offers metrics still marked unavailable.

Blocking policy:
- If any open question affects IA semantics, resolve before implementation of that family begins.
