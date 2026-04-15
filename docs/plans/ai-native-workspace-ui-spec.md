# AI-Native Stream Workspace v1 — UI Functional Spec

**Date:** 2026-04-14  
**Status:** Draft  
**Depends on:**
- `docs/plans/2026-04-09-secondstream-agent-harness-plan.md`
- `docs/plans/2026-04-09-secondstream-agent-harness-v1-spec.md`
- `docs/plans/ai-native-workspace.md`

---

## 1) Purpose

This document defines the **UI behavior and interaction model** for the first AI-native stream workspace in SecondStream.

It does **not** redefine the full harness architecture.
It translates the already agreed product direction into a concrete UI surface that can be:

- designed
- mocked
- implemented
- tested

The central principle is:

**The primary workspace surface should feel like a calm working environment around a live `Discovery Brief`, not like a long form, generic dashboard, or chat-first AI tool.**

---

## 2) Product role of the screen

The `Stream Workspace` is the primary broker-facing surface where the user:

1. understands the current state of the stream
2. reviews the current `Discovery Brief`
3. inspects evidence and provenance
4. reviews pending AI-generated points and suggestions
5. executes the next best action
6. edits structured information when needed

This screen is the main visible expression of:

- the `Discovery Completion Agent`
- the `Discovery Brief`
- the stream-local harness loop

---

## 3) Design goals

The screen must be:

- **simple**
- **calm**
- **intuitive**
- **low-noise**
- **artifact-first**
- **review-first**
- **evidence-grounded**
- **human-in-the-loop**

It must help the broker answer quickly:

1. What do we know?
2. What is missing?
3. What needs my review?
4. What should I do next?

---

## 4) Non-goals

This screen should **not** become:

- a chat-first AI assistant
- a mission-control dashboard
- a dense admin console
- a long wizard as the default experience
- a filesystem browser
- a cross-platform universal control plane

The UI should not expose the full complexity of:

- sessions
- runs
- memory classes
- promotion models
- tool registries

Those remain harness internals unless needed for a specific operator workflow.

---

## 5) Primary information architecture

### Top-level tabs

The workspace should expose four primary tabs:

1. `Overview` — default
2. `Structured Capture`
3. `Evidence`
4. `History`

### Rules

- `Overview` is the default landing surface
- `Structured Capture` is secondary, never the primary center of gravity
- `Evidence` is exploratory/supportive
- `History` is audit/review/supportive

---

## 6) Mental model for the user

The UI should communicate a very small set of visible primitives.

### Visible primitives

1. `Discovery Brief`
2. `Pending Review`
3. `Evidence`
4. `Next Actions`

Everything else should be secondary, contextual, or hidden behind interaction.

### Hidden complexity

The user does not need to think in terms of:

- `AgentSession`
- `AgentRun`
- internal coverage mapping
- prompt context assembly
- memory layer boundaries

The user should only experience:

- a living brief
- evidence-backed points
- reviewable AI output
- clear next steps

---

## 7) Overview tab — layout

### Recommended desktop layout

Use a **two-column layout**:

- **Main column:** 68–72%
- **Context rail:** 28–32%

### Avoid

- a permanent third content column
- a heavy left-side operational sidebar
- many competing panels visible simultaneously

### Visual intent

The screen should feel like:

- a focused work surface
- a live operating brief
- a premium B2B tool

Not like:

- an analytics dashboard
- a CRM form
- a chatbot app

---

## 8) Overview tab — required sections

### 8.1 Header

The header must include:

- stream title
- company/account label
- owner
- readiness indicator
- brief status
- last updated timestamp

### Primary actions

- `Refresh Brief`
- `Complete Discovery`

### Optional secondary actions

- `Add Evidence`
- overflow menu for additional actions

### Brief status values

- `Pending review`
- `Current working brief`
- `Stale`

### Rules

- Keep the header visually quiet
- Do not overload with metrics
- Keep only the minimum actionable controls visible

---

### 8.2 Executive Summary

This is the first content block under the header.

### Purpose

Let the broker understand the stream situation in under 10 seconds.

### Content

- 3–5 lines maximum
- one concise current-state summary
- one main blocker or uncertainty
- one high-value implication or recommendation

### Rules

- no long paragraphs
- no chain-of-thought style reasoning
- no cluttered metadata

---

### 8.3 Discovery Brief

This is the main block of the screen.

It should be visually and structurally clear that this is the primary artifact.

### Recommended section groups

1. `What we know`
2. `What is missing`
3. `Conflicts`
4. `Recommended next actions`

Optional additional groups can appear only when materially useful.

### Point model in UI

Important points must be explicitly typed as:

- `Fact`
- `Assumption`
- `Conflict`
- `Question`
- `Recommendation`

### Minimal visible point states

Keep visible state simple:

- `confirmed`
- `needs review`
- `missing`
- `conflict`

### Each visible point should show

- a short title/label
- a concise statement/value
- its point type
- its current state
- a subtle source hint or provenance cue

### Point-level actions

Point actions should exist, but remain visually restrained.

Allowed actions:

- `Accept`
- `Mark incorrect`
- `Needs verification`
- `Add note`

### Interaction rule

Do not render all actions permanently inline for every row.
Use one of these patterns:

- hover actions
- row expansion
- contextual menu

---

### 8.4 Open Questions

This block should make unresolved discovery gaps highly legible.

### Each question should show

- the question itself
- why it matters
- a priority indicator
- a suggested action or source to resolve it

### Rules

- show only the top 3–5 by default
- additional items should be collapsible
- this should not feel like a hidden form section

---

### 8.5 Next Best Actions

This block should tell the broker what to do now.

### Content

- maximum 3 visible recommended actions by default
- each action includes a short title and brief rationale

### Minimal states

- `pending`
- `accepted`
- `dismissed`

### Rules

- actions should feel like recommendations from the brief
- avoid making them look like generic dashboard buttons
- keep them tightly connected to the current brief state

---

## 9) Context rail — required sections

The right-side rail must remain lightweight and contextual.

### 9.1 Pending Review

This block summarizes what requires human attention.

### Each item should show

- item type
- short summary
- why it requires review

### Interaction

Selecting an item should:

- focus the related point in the main `Discovery Brief`
- update the evidence section below to show relevant grounding

### Rules

- show only top 2–4 items by default
- allow `View all` if more exist
- do not turn this into a noisy alert feed

---

### 9.2 Evidence Context

This is not a permanent file gallery.

Its purpose is to show the evidence for the currently selected brief point or review item.

### Show

- source title
- source type
- snippet/extract
- provenance metadata
- page/timestamp if relevant

### Default empty state

If no point is selected, show:

- most relevant recent source
or
- an instruction to select a brief point to inspect evidence

### Rules

- evidence must be context-linked
- evidence should help explain *why this point exists*
- avoid large visual galleries in the default state

---

### 9.3 Recent Updates

This block gives lightweight visibility into recent changes.

### Show

- latest brief refresh
- latest evidence added
- latest broker correction

### Rules

- 3–5 events max in overview
- no full activity timeline here

---

## 10) Structured Capture tab

This tab is the place for manual editing of structured truth.

It exists because structured data entry still matters, but it should no longer dominate the main workspace experience.

### Layout

- single column
- grouped sections
- one expanded group at a time
- substantially less visual noise than current workspace form

### Recommended group framing

Prefer semantic groups, not raw numbered phases.

Examples:

- `Generator & source`
- `Material & composition`
- `Volume & frequency`
- `Handling & logistics`
- `Compliance & documentation`

### Group state

Each group should show a lightweight summary state:

- `complete`
- `needs review`
- `missing info`

### Rules

- collapse resolved groups by default
- avoid showing all 31 questions at once
- avoid re-creating the current overwhelming form experience

### AI suggestions in Structured Capture

Suggestions may appear inline, but they must be:

- subtle
- reviewable
- source-hinted
- non-dominant

---

## 11) Evidence tab

This tab is for evidence-first exploration.

### Purpose

Allow the broker to inspect source material and its relationship to the current brief.

### Required capabilities

- list evidence items
- filter by source type
- open source detail
- inspect which brief points reference each source
- add human note or observation
- inspect conflicts related to a source

### Rules

- this tab may be denser than `Overview`
- however, it still should not look like a raw storage browser

---

## 12) History tab

This tab is for traceability and operational auditability.

### Purpose

Allow the broker or reviewer to understand how the current brief evolved.

### Required content

- brief versions
- important runs
- review decisions
- broker corrections
- change summaries

### Rules

- do not expose raw chain-of-thought
- do expose triggers, version changes, and review outcomes
- focus on inspectability, not verbosity

---

## 13) Interaction requirements

### 13.1 Selecting a brief point

When the user selects a point in the brief:

- the point gets a subtle focus state
- the right rail updates to show contextual evidence
- related review items become easier to understand

### 13.2 Reviewing a point

When the user reviews a point:

- the review action is saved immediately
- the point state updates visibly
- the action becomes part of structured broker feedback
- a later brief refresh may incorporate that signal

### 13.3 Refreshing the brief

The brief can refresh:

- automatically on relevant system events
- manually via `Refresh Brief`

### Refresh UI behavior

While updating:

- brief status shows lightweight updating state
- do not block the whole interface if unnecessary

After update:

- update timestamp
- show lightweight change summary
- highlight materially changed points

### 13.4 Completing discovery

This should never be a blind CTA.

Before the user completes discovery, the UI should make clear if there are:

- unresolved critical blockers
- major points still pending review
- insufficient confidence/provenance for the current brief

If the stream is not ready, the UI should explain why.

---

## 14) Visual and interaction principles

### The screen should feel

- calm
- focused
- legible
- premium
- trustworthy

### Avoid

- excessive badges
- too many colors
- too many cards
- too many visible controls
- thumbnail-heavy evidence by default
- loud notification patterns
- overly dashboard-like composition

### Recommended visual characteristics

- soft neutrals
- restrained accent use
- subtle borders
- strong typography hierarchy
- generous spacing in the main artifact surface

---

## 15) Success criteria for design reviews

### A mockup passes if, within 5–10 seconds, a reviewer can answer:

1. What do we know?
2. What is missing?
3. What needs review?
4. What should I do next?

### A mockup passes if it is obvious that:

- the `Discovery Brief` is the main artifact
- the right rail is contextual support, not another competing app
- `Structured Capture` is secondary
- evidence is connected to brief points
- the UI feels simpler than the current workspace

### A mockup fails if:

- it looks like a long form again
- it looks like a heavy dashboard
- it looks chat-first
- it shows too many simultaneous decisions
- it separates evidence from the point it supports

---

## 16) Alignment with current plan

This UI spec is aligned with:

- `Discovery Brief` as the first canonical artifact
- `Discovery Completion Agent` as the first canonical agent
- reviewable `Workspace Suggestions`
- human-in-the-loop approval semantics
- evidence/provenance requirements
- model-agnostic harness ownership
- `Overview` as the first major visible AI-native surface

This spec intentionally keeps visible complexity low while preserving the deeper harness architecture underneath.

---

## 17) Next recommended document

After this spec, the next useful artifact should be either:

1. a mockup prompt for `Overview` + `Structured Capture`
2. a component spec for the first UI primitives:
   - `DiscoveryBriefCard`
   - `BriefPointRow`
   - `PendingReviewList`
   - `EvidenceContextRail`
   - `NextActionsPanel`
