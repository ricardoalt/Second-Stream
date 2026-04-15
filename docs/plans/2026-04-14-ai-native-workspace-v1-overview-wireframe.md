# SecondStream AI-Native Stream Workspace v1 — Overview Wireframe

**Date:** 2026-04-14  
**Status:** Draft wireframe artifact (UI refinement, not architecture)  
**Depends on:**
- `docs/plans/ai-native-workspace.md`
- `docs/plans/ai-native-workspace-ui-spec.md`
- `docs/plans/2026-04-09-secondstream-agent-harness-plan.md`
- `docs/plans/2026-04-09-secondstream-agent-harness-v1-spec.md`

---

## 1) Overview Surface — High-Fidelity Textual Wireframe

### 1.1 Screen shell (desktop)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Top app nav (global): Streams | Accounts | Evidence | Agent Inbox                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Stream Workspace                                                                                              │
│ [Stream: Acme Paint Sludge - Houston]  [Account: Acme Industrial]  [Owner: R. Altamirano]                  │
│                                                                                                               │
│ Readiness: Needs attention • Brief: Pending review • Last updated: 11:42 AM                                  │
│ [Refresh Brief] [Complete Discovery] [Add Evidence] [···]                                                     │
│                                                                                                               │
│ Tabs: [Overview]*  Structured Capture  Evidence  History                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MAIN (70%)                                                                     │ CONTEXT RAIL (30%)          │
│                                                                                 │                              │
│ ① Executive Summary                                                             │ ⑤ Pending Review             │
│ ┌─────────────────────────────────────────────────────────────────────────────┐  │ ┌──────────────────────────┐ │
│ │ Current stream is likely paint sludge + absorbents, recurring weekly load. │  │ │ 3 items need field-agent review│ │
│ │ Main blocker: manifest code and solids % conflict across two documents.     │  │ │ 1) Conflict: solids %     │ │
│ │ Implication: do not finalize outlet shortlist until conflict is resolved.   │  │ │ 2) Assumption: pH range   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘  │ │ 3) Recommendation timing   │ │
│                                                                                 │ │ [View all pending]         │ │
│ ② Discovery Brief (primary artifact)                                            │ └──────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐  │                              │
│ │ Section: What we know                                                        │ ⑥ Evidence Context            │
│ │ • [Fact][confirmed] Material family: Paint sludge (source: Lab report p2)  │  │ ┌──────────────────────────┐ │
│ │ • [Fact][needs review] Est. monthly volume: 42–50 tons (3 sources)          │  │ │ For selected point:       │ │
│ │                                                                              │  │ │ "solids % conflict"       │ │
│ │ Section: What is missing                                                      │  │ │ - Source A: Lab report    │ │
│ │ • [Question][missing] Confirm EPA waste code at location-level               │  │ │   "32% solids" p3         │ │
│ │ • [Question][missing] Validate storage dwell time tolerance                   │  │ │ - Source B: Manifest       │ │
│ │                                                                              │  │ │   "18% solids" line 12    │ │
│ │ Section: Conflicts                                                            │  │ │ Why it matters: pricing +  │ │
│ │ • [Conflict][conflict] Solids percentage varies (18% vs 32%)                 │  │ │ outlet compatibility       │ │
│ │                                                                              │  │ │ [Open evidence tab]        │ │
│ │ Section: Recommended next actions                                             │  │ └──────────────────────────┘ │
│ │ • [Recommendation][pending] Request fresh sample + chain-of-custody          │  │                              │
│ │ • [Recommendation][pending] Confirm manifest code with compliance lead        │ ⑦ Recent Updates              │
│ └─────────────────────────────────────────────────────────────────────────────┘  │ ┌──────────────────────────┐ │
│                                                                                 │ │ 11:42 Brief refreshed      │ │
│ ③ Open Questions                                                                 │ │ 11:31 New evidence added   │ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐  │ │ 11:20 Field-agent note saved│ │
│ │ Q1 (High): Is waste code D001 or D007? Why: changes outlet options.        │  │ └──────────────────────────┘ │
│ │ Suggested resolution: verify latest manifest + compliance note.             │  │                              │
│ │ Q2 (Med): Is moisture variability seasonal? Why: impacts transport cost.    │  │ ⑧ Agent Presence (subtle)   │
│ │ [Show 2 more]                                                                 │ │ Discovery Completion Agent  │
│ └─────────────────────────────────────────────────────────────────────────────┘  │ │ Run: completed 2m ago       │
│                                                                                 │ │ Confidence: medium           │
│ ④ Next Best Actions                                                             │ │ [What changed] [Why this]   │
│ ┌─────────────────────────────────────────────────────────────────────────────┐  │ └──────────────────────────┘ │
│ │ A1. Call compliance lead (5 min)                                              │                              │
│ │     Why now: unblocks manifest conflict. [Accept now] [Defer] [Dismiss]     │                              │
│ │ A2. Request updated lab sample SOP doc                                        │                              │
│ │     Why now: needed before outlet outreach. [Accept now] [Defer] [Dismiss]  │                              │
│ └─────────────────────────────────────────────────────────────────────────────┘  │                              │
│                                                                                 │ ⑨ Contextual Ask/Tell (optional)
│                                                                                 │ ┌──────────────────────────┐ │
│                                                                                 │ │ Ask/Tell about selection │ │
│                                                                                 │ │ e.g. "ask for source gap"│ │
│                                                                                 │ │ [Ask/Tell bar]           │ │
│                                                                                 │ └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2) Interaction Notes by Major Area

### 2.1 Header (quiet control strip)
- **Goal:** Orient field-agent in <3 seconds without dashboard noise.
- **Primary actions:** `Refresh Brief`, `Complete Discovery`.
- **Behavior:**
  - `Refresh Brief` starts non-blocking update; keeps page interactive.
  - Brief status transitions: `Pending review` → `Updating…` → `Pending review` or `Current working brief`.
  - `Complete Discovery` opens readiness gate check (critical blockers, pending review, provenance completeness).

### 2.2 Executive Summary
- **Goal:** 10-second situational grasp.
- **Behavior:**
  - max 3–5 lines.
  - always contains: current state, top blocker/uncertainty, immediate implication.
  - clicking any sentence jumps/focuses matching Brief point.

### 2.3 Discovery Brief (primary artifact)
- **Goal:** Single coherent working understanding.
- **Behavior:**
  - grouped in stable sections (`What we know`, `What is missing`, `Conflicts`, `Recommended next actions`).
  - each point row shows: type, state, concise statement, source hint.
  - point actions hidden by default; shown on row focus (`Accept`, `Mark incorrect`, `Needs verification`, `Add note`).
  - review action saves immediately and updates state badge in place.
  - material changes since previous version get subtle “Updated” marker for one session.

### 2.4 Open Questions
- **Goal:** Make discovery gaps explicit, prioritized, and actionable.
- **Behavior:**
  - default top 3–5 only.
  - each item shows question + why it matters + priority + suggested resolution source.
  - “Show more” expands list inline; no navigation interruption.

### 2.5 Next Best Actions
- **Goal:** Convert understanding into immediate field-agent action.
- **Behavior:**
  - show max 3 by default.
  - states: `pending`, `accepted_now`, `accepted_deferred`, `dismissed`.
  - action feedback separates correctness from timing (defer ≠ reject).
  - accepted actions can spawn supporting draft artifacts (e.g., draft request checklist).

### 2.6 Pending Review (right rail)
- **Goal:** Human-in-the-loop queue, not alert feed.
- **Behavior:**
  - show top 2–4 items by priority.
  - selecting item focuses related brief point and auto-updates Evidence Context.
  - “View all pending” opens filtered full review list.

### 2.7 Evidence Context (right rail)
- **Goal:** Explain why a point exists with minimal friction.
- **Behavior:**
  - bound to selected point/review item.
  - shows snippet, source type, provenance metadata, page/time anchors.
  - empty state: “Select a brief point to inspect evidence” + recent relevant source fallback.

### 2.8 Agent representation (subtle, non-dominant)
- **Goal:** Make agent visible as governed actor without becoming the UI center.
- **Behavior:**
  - compact metadata row/card for “Discovery Completion Agent” in rail.
  - exposes run freshness + confidence + lightweight links (`What changed`, `Why this`).
  - no large chat panel, no animated assistant, no persistent conversational takeover.
  - avoid anthropomorphic avatar treatment; represent as product capability status.

### 2.9 Contextual Ask/Tell bar (optional, low prominence)
- **Goal:** Enable targeted field-agent-to-agent instruction without making chat the main workflow.
- **Behavior:**
  - appears contextual to current brief point/evidence selection.
  - accepts concise asks/tells tied to artifact context.
  - creates structured signal for next run/review, not free-floating conversation mode.

---

## 3) Explicit No-Chat / Low-Chat Interaction Model

### Default mode: **No-chat primary surface**
- Overview works completely without chat.
- Review and progression use artifact interactions (point review, evidence inspection, action states).

### Low-chat fallback (secondary only)
- Optional “Ask about this point” appears inside point details or evidence rail.
- Opens compact side drawer for targeted Q&A tied to selected artifact context.
- Chat responses must reference brief point IDs and evidence refs; no free-floating assistant mode.

### Design constraint
- If chat exists, it must remain secondary interrogation/explanation.
- It cannot replace Discovery Brief, Pending Review, Evidence Context, or Next Actions as primary workflow.
- Contextual Ask/Tell is preferred over full chat as v1 default.

---

## 3.1 New/Empty stream first-run flow (field agent)

When a stream starts empty, default to **AI-assisted capture workspace**:

1. add first natural evidence (voice/note/message/file)
2. system generates initial brief draft with explicit gaps
3. user reviews top missing questions and next best actions
4. user optionally uses contextual Ask/Tell to steer next capture

Constraint:

- do not drop user first into full 31-question structured form as primary entry path
- Structured Capture remains available as secondary tab for targeted manual edits

---

## 4) Point-Level Review + Evidence + Pending Review + Next Actions (Concrete Examples)

### 4.1 Point-level review example

```text
Point: [Fact][needs review] "Estimated monthly volume is 42–50 tons"
Source hint: 2 manifests + field-agent note

On focus actions:
- Accept
- Mark incorrect
- Needs verification
- Add note

Example field-agent action:
Mark incorrect + note "Latest contract amendment caps monthly at 38 tons."
Result:
- point state -> needs review (human-asserted correction attached)
- correction logged with author/timestamp
- follow-up run queued (trigger: field_agent_correction)
```

### 4.2 Evidence context example

```text
Selected conflict point: "Solids % varies (18% vs 32%)"

Evidence Context shows:
- Lab Report #LR-884 (PDF, p3): "32% solids"
- Transport Manifest #TM-220 (doc extract): "18% solids"
- Provenance: ingest timestamps + extraction confidence + parser version
- Why this matters: outlet compatibility and transport class
```

### 4.3 Pending review example

```text
Pending Review (3)
1) Conflict — Solids % mismatch across two material sources (High)
2) Assumption — pH band inferred from historical dossier, no fresh sample (Medium)
3) Recommendation timing — "contact outlet now" may be premature (Medium)
```

### 4.4 Next actions example

```text
A1 Request updated sample panel from generator
State: accepted_now
Why: resolves solids conflict and unlocks outlet filtering

A2 Confirm manifest code with compliance lead
State: accepted_deferred
Why: still needed, but field-agent waits for call at 3 PM

A3 Start buyer outreach
State: dismissed
Why: blocked by unresolved classification conflict
```

---

## 5) Visual Direction Notes (to keep output premium, calm, non-generic)

- Warm monochrome palette with restrained accent color only for state cues.
- Strong typographic hierarchy (artifact title > section title > point text > metadata).
- Flat surfaces, subtle borders, minimal elevation.
- Intentional spacing; avoid tight card grids and dashboard density.
- Restrained motion only for state transitions (refresh, focus, saved).
- No gradients, heavy shadows, flashy badges, or decorative AI motifs.

---

## 6) Why this aligns with the PRD

1. **Artifact-first:** Discovery Brief is clearly the dominant center of gravity.
2. **Review-first:** Pending Review + point-level actions make human review explicit and mandatory.
3. **Evidence-grounded:** Evidence Context is always linked to selected points and conflicts.
4. **Human-in-the-loop:** Suggestions and recommendations are reviewable states, not auto-truth writes.
5. **One visible primary agent:** Agent is represented as a compact governed actor, not a chat-first takeover.
6. **No implicit approval:** Pending status remains until explicit review/approval action.
7. **Structured Capture remains secondary:** Present as sibling tab, not main workflow surface.
8. **Calm premium B2B direction:** Layout and visual principles match the agreed minimal, modern, low-noise UI intent.
