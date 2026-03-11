# SecondStream Waste Stream Workspace Redesign Spec

Date: 2026-03-08
Status: proposed direction for redesign
Scope: internal waste stream workspace only

## 1. What this workspace is for

This is not the main dashboard.

This workspace exists to turn an ambiguous material into an operatively defined stream that is:
- understood well enough to move forward
- supported by evidence
- reviewed through compliance logic
- grounded in economic reality
- ready for Material Passport

The workspace is not a form-filling tool.
It is a decision workspace for discovery.

## 2. Product stance

Strong stance:
- discovery is the product, not proposal generation
- field agents should start from raw info, not long forms
- AI should guide, structure, and warn, but not perform legal decisions
- the system should optimize for momentum, not completion percentage
- evidence must live next to claims, not in a separate mental bucket

## 3. What changes vs current workspace

### Remove or demote

- `Overview` as a primary tab
- `% complete` as the main readiness signal
- `Questionnaire` language
- proposal-first CTA hierarchy
- freeform AI-created canonical fields
- AI-as-demo behaviors and visual noise

### Keep and evolve

- note, voice, file, and image capture
- AI suggestion review flow
- evidence attribution
- right-side contextual help rail
- autosave and fast editing
- file ingestion pipeline already in code

### Add

- a real discovery-first information hierarchy
- readiness gates based on decisions, not field count
- explicit blocker model with owner, age, impact
- working compliance stance block
- economics baseline block
- working Material Brief artifact

## 4. Core UX principles

1. Start from what the agent knows now.
2. Show the next best action, not just empty inputs.
3. Separate facts, inferred attributes, blockers, and decisions.
4. Keep schema stable.
5. Let the workspace adapt by material family.
6. Keep AI quiet unless it changes the next action.
7. Make evidence visible at point of use.

## 5. Primary user flow

### Step 1 - Open stream workspace

Header shows:
- stream name
- company and location
- current thesis
- blocker count
- deadline
- current stance: unknown / waste / product / by-product

### Step 2 - Add raw information

Field agent can:
- paste notes
- record voice
- upload docs
- upload photos
- manually confirm key facts

### Step 3 - Review extracted facts

System proposes:
- structured updates
- inferred attributes
- conflicts
- freshness warnings
- ask-next prompts

Agent can:
- accept
- edit before accept
- reject
- convert into follow-up question

### Step 4 - Resolve discovery blockers

Workspace tracks:
- what is missing
- why it matters
- what it blocks
- who owes it
- how long it has been stuck

### Step 5 - Move toward readiness

System evaluates gates:
- material sufficiently defined
- evidence sufficiently credible
- compliance stance reviewed
- economics baseline captured
- critical blockers resolved

### Step 6 - Generate working outputs

Outputs are:
- Working Material Brief
- Material Passport draft
- proposal inputs

## 6. Recommended information architecture

Tabs:
- `Workspace`
- `Files`
- `Passport`

Do not use `Overview`.

### Workspace anatomy

#### Top bar

- stream name
- thesis sentence
- criticality
- deadline
- blocker count
- owner
- primary actions: capture, request info, send for review

#### Center canvas

Ordered blocks:
1. `Do Next`
2. `Material Definition`
3. `Evidence Coverage`
4. `Compliance Stance`
5. `Economics Baseline`
6. `Open Decisions`

#### Right rail

Contextual, changes by selected field or section:
- blockers
- ask next
- pending validations
- evidence freshness
- recent activity

## 7. Block design

### 7.1 Do Next

Always first.
Contains the top 3 actions ranked by impact.

Each item includes:
- action
- why it matters
- what it unlocks
- shortcut action

Example:
- Get water content lab result -> unlocks pricing and outlet fit

### 7.2 Material Definition

Purpose: define what the material actually is.

Always visible core facts:
- material family
- client alias / internal code
- generating process
- physical state
- packaging
- volume and recurrence
- production criticality
- urgency

Family-specific facts appear below core facts.

For solvents:
- water content
- flash point
- chlorinated
- purity or concentration

### 7.3 Evidence Coverage

Purpose: show whether the current understanding is supported.

Must show:
- evidence matrix by topic and doc type
- doc freshness
- virgin vs spent warnings
- inline provenance per claim

`Files` tab remains for browsing documents, but evidence status must also live in Workspace.

### 7.4 Compliance Stance

Purpose: make legal ambiguity visible without pretending the system is legal counsel.

Model:
- no default selection
- explicit working stance selected by human
- system shows consequences and open risks
- system can suggest a stance, never auto-select it

Supported stances:
- Waste
- Product
- By-product

### 7.5 Economics Baseline

Purpose: stop discovery from ignoring cost reality.

Must show:
- current handler
- current stated cost
- invoice status
- hidden fees known or unknown
- what is still missing before savings can be estimated

### 7.6 Open Decisions

Purpose: isolate unresolved decisions from raw data.

Examples:
- Is this chlorinated enough to change RCRA listing?
- Is lab actually required or can a trial load work?
- Is current SDS too old to trust?
- Is route domestic-only due to client restriction?

## 8. AI behavior model

AI should appear in only 4 ways:

1. `Suggested updates`
   - extracted from notes, docs, photos, voice
   - accepted fact becomes canonical

2. `Inferred attributes`
   - hypothesis, not canonical fact
   - can become confirmed fact later

3. `Ask next`
   - targeted follow-up question with impact and rationale

4. `Warnings`
   - freshness, conflict, ambiguity, likely blocker

AI should not:
- auto-publish facts into canonical record
- mutate the canonical schema freely
- auto-decide compliance classification
- act like a chat toy

## 9. Field strategy

### 9.1 Canonical schema

Use 3 layers.

#### Layer A - Core fields

Stable and cross-material.

- material_family
- client_alias
- generating_process
- physical_state
- packaging
- quantity
- recurrence
- location
- urgency
- production_critical
- working_regulatory_stance
- client_goals

#### Layer B - Family-specific fields

Curated by config, not invented live.

Examples:
- solvent -> water_content, flash_point, chlorinated
- metals -> alloy_type, grade_spec, contamination_level
- plastics -> resin_type, color, form

#### Layer C - Inferred attributes

Not canonical by default.

Each inferred attribute stores:
- label
- value
- confidence
- source
- status: suggested / confirmed / rejected

Rule:
- if AI finds something unusual, create an inferred attribute or open question
- if it repeats across many deals, later promote it into family config

### 9.2 Recommendation on dynamic fields

Do not let AI create canonical fields freely per deal.

Reason:
- destroys consistency
- breaks reporting
- makes readiness unreliable
- creates messy product behavior

Use `inferred attributes` instead.

## 10. Working Material Brief artifact

Recommendation: yes, build it.

But as a secondary view, not the primary editing surface.

Purpose:
- give agents and seniors a live synthesis of what is currently known
- make discovery legible without scanning the full workspace
- prepare the path to Material Passport

The Working Material Brief should be generated from confirmed facts plus selected evidence.

It should contain:
- current thesis
- confirmed material facts
- confidence and evidence notes
- compliance stance
- economics baseline
- blockers and open questions
- readiness gates

It should be:
- mostly read-only
- regenerable anytime
- versioned
- shareable internally

It should not be:
- a freeform note doc
- the canonical source of truth

## 11. Readiness gates

Replace percentage-based readiness with gates.

### Gate 1 - Material defined

Required:
- family
- process
- state
- packaging
- quantity pattern

### Gate 2 - Evidence sufficient

Required:
- at least one credible source for key claims
- no ignored critical freshness issue

### Gate 3 - Compliance stance reviewed

Required:
- working stance selected by human
- major ambiguity flagged if unresolved

### Gate 4 - Economics baselined

Required:
- current cost known or explicitly missing with blocker
- current route / handler at least partially understood

### Gate 5 - Critical blockers resolved or consciously waived

Required:
- no hidden hard blocker preventing next step

## 12. Keep / change / remove from current coded workspace

### Keep

- capture modalities
- AI suggestion review mechanics
- autosave
- provenance-aware extraction
- file processing

### Change

- `Technical Data` tab -> `Workspace`
- progress bar -> readiness gates
- section order -> decision order
- right rail -> contextual ops rail
- proposal language -> passport / brief language

### Remove

- Overview as first-class tab
- completion percent as hero KPI
- questionnaire framing as primary mental model
- AI-heavy decorative behavior

## 13. Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Meridian Chemical / Monterrey / Spent Acetone Blend                               │
│ Thesis: Probable spent solvent from degreasing line. Route and water content open │
│ Critical | Deadline 10d | 2 blockers | Stance: Unknown | Owner: Maria            │
│ [Capture] [Request info] [Send for review]                                        │
├───────────────────────────────┬───────────────────────────────────┬────────────────┤
│ Workspace | Files | Passport  │ DO NEXT                           │ Context rail   │
├───────────────────────────────┤ 1. Get water content lab          │ Blockers       │
│ Material Definition           │ 2. Confirm chlorinated content    │ Ask next       │
│ - Family                      │ 3. Upload disposal invoice        │ Freshness      │
│ - Process                     ├───────────────────────────────────┤ Validations    │
│ - Physical state              │ Material Definition               │ Activity       │
│ - Packaging                   │ [core + family-specific facts]    │                │
│ - Volume / recurrence         ├───────────────────────────────────┤                │
│ - Criticality / urgency       │ Evidence Coverage                 │                │
├───────────────────────────────┤ [matrix + provenance + freshness] │                │
│ Compliance Stance             ├───────────────────────────────────┤                │
│ [Waste][Product][By-product]  │ Compliance Stance                 │                │
│ Implications + open risks     │ [stance + implications + gaps]    │                │
├───────────────────────────────┤───────────────────────────────────┤                │
│ Economics Baseline            │ Economics Baseline                │                │
│ - Handler                     │ [invoice status + cost baseline]  │                │
│ - Current cost                ├───────────────────────────────────┤                │
│ - Invoice status              │ Open Decisions                    │                │
│ - Hidden fees                 │ [questions, blockers, next asks]  │                │
└───────────────────────────────┴───────────────────────────────────┴────────────────┘
```

## 14. Mobile wireframe

```text
┌──────────────────────────────────────┐
│ Spent Acetone Blend                  │
│ 2 blockers | Unknown stance | 10d    │
│ [Capture] [Request info]             │
├──────────────────────────────────────┤
│ Tabs: Workspace | Files | Passport   │
├──────────────────────────────────────┤
│ Do Next                              │
│ 1. Get water content lab             │
│ 2. Confirm chlorinated               │
│ 3. Upload invoice                    │
├──────────────────────────────────────┤
│ Material Definition                  │
│ Family: Solvents                     │
│ Process: Degreasing line 3           │
│ Packaging: Drums, IBCs               │
│ Water content: missing               │
├──────────────────────────────────────┤
│ Compliance Stance                    │
│ [Waste][Product][By-product]         │
│ No stance selected yet               │
├──────────────────────────────────────┤
│ Bottom sheet: Context                │
│ - blockers                           │
│ - ask next                           │
│ - freshness                          │
│ - pending validations                │
└──────────────────────────────────────┘
```

## 15. Implementation slices

### Slice 1

- rename and restructure tabs
- replace progress hero with blocker-aware header
- add `Do Next`

### Slice 2

- add evidence coverage block
- add compliance stance block
- add economics baseline block

### Slice 3

- implement inferred attributes layer
- add Working Material Brief artifact
- switch readiness logic to gates

## 16. AI agent architecture

Core principle: AI discovers data. Product defines structure.

### 16.1 Agents

Six specialized agents. Each maps to a workspace feature.

#### Extraction agent

Drives: suggested updates in the rail.

Trigger: user pastes notes, uploads doc/photo, records voice.

Pipeline:
- preprocessing: STT for voice, OCR for photos, PDF parse for docs
- LLM extraction: raw text + current schema + current field values → structured {field, value, confidence, source_span}
- dedup against existing values
- output: suggestion cards in rail

On accept: field updates in canonical schema. Provenance = AI-extracted, confirmed by user. Blue stripe.
On edit-then-accept: provenance = AI-extracted, modified by user. Green stripe.

#### Inference agent

Drives: inferred attributes (violet dashed fields).

Trigger: runs after extraction completes, or when new evidence arrives.

Pipeline:
- confirmed facts + extracted data + evidence docs
- LLM: current profile + family config → hypotheses as {label, value, confidence, reasoning, source}
- filter: surface only if confidence ≥ 75% AND attribute maps to existing family field OR is flagged as unusual by extraction
- output: inferred attribute cards in relevant section

Key rule: inferred attributes never auto-promote to canonical. Human must confirm.

Aggressive filtering matters. If threshold is too low, the UI fills with pseudo-hallazgos that erode trust.

#### Compliance agent

Drives: compliance stance section.

Trigger: user selects a stance, or new evidence/facts change compliance-relevant data.

Pipeline:
- LLM + rules engine
- input: material profile, stance, jurisdiction, evidence
- output: {suggested_stance, confidence, reasoning, gaps[], risks[]}

UI touchpoints:
- pre-selection: "AI suggests: likely waste" pill with confidence
- post-selection: compliance gaps panel with specific requirements
- ongoing: warnings when new data may affect the stance

Critical: this is decision support, not legal determination. The system must make this distinction viscerally clear in the UI. Persistent disclaimer, not buried in copy.

#### Economics agent

Drives: economics baseline section.

Trigger: invoice uploaded, or notes mention cost/handler data.

Pipeline:
- invoice text/data + notes mentioning costs
- LLM extraction → {handler, cost, hidden_fees[], missing_for_baseline[]}
- missing items become blockers or ask-next items

#### Gap detection agent

Drives: do next, blockers, ask next.

Trigger: runs after every field update, file upload, or state change.

Pipeline:
- rules engine first: evaluate each gate's requirements deterministically
- LLM second: rank actions by impact, generate ask-next questions
- output: {do_next[], blockers[], ask_next[]}

This agent is rules-first, LLM-second. Gate evaluation and blocker detection are deterministic. LLM only for ranking and question generation.

#### Evidence agent

Drives: evidence coverage section.

Trigger: file uploaded/processed, or freshness thresholds crossed.

Pipeline:
- rules-based: evaluate coverage per document type, freshness against thresholds
- output: {coverage_by_topic[], warnings[], missing_docs[]}

### 16.2 Orchestrator

Agents don't fire independently. An orchestrator decides what runs after each user action.

- user capture (notes/file/voice) → extraction → inference → gap detection
- user accepts suggestion → gap detection
- user sets compliance stance → compliance → gap detection
- file uploaded → evidence → extraction → gap detection
- field manually edited → gap detection

The orchestrator batches: if user accepts 3 suggestions, gap detection runs once after all 3, not 3 times.

### 16.3 Why not dynamic schema

Do not let AI create canonical fields freely per deal.

Five reasons:

1. Consistency death. LLMs are non-deterministic. Same SDS on two runs produces `flash_point`, `flashpoint`, `flash_pt_celsius`. Three fields, same meaning. No query or report can aggregate them. You'd need a normalization layer on top of generation — which is a schema system, just a worse one.

2. Readiness becomes unreliable. Gates require specific fields. If field count changes per deal, gate evaluation becomes undefined. "All fields filled" means nothing when the number of fields is unknown.

3. Reporting breaks. "What % of solvent streams have chlorinated compounds?" requires a stable `chlorinated` field across deals. Dynamic naming makes analytics fiction.

4. UI becomes unpredictable. Dynamic schema → dynamic layout. Section order changes per deal. Field count changes. Users can't build muscle memory. Every stream looks different.

5. Compliance requires audit trails. Regulators need predictable, auditable data structures. "Show chlorinated status for all streams this quarter." If that field has 4 names across 50 deals, the audit fails.

Alternative: the 3-layer schema (section 9). AI puts unusual findings in Layer C (inferred attributes). If a finding repeats across many deals, the product team promotes it to Layer B (family config) through a deliberate decision. This is controlled evolution, not entropy.

## 17. UX interaction patterns

### 17.1 Thesis

The thesis sentence is the most important narrative element. First-class, editable inline.

Treatment:
- 14px/500, full text color (not muted), with mono label prefix `THESIS` in 10px
- dashed underline on hover indicates editability
- click → inline contenteditable, save on blur or Enter
- this is the team's shared understanding of the material

### 17.2 Field editing

Clear click-to-edit pattern.

Resting: label (10px mono) + value (13px). Left stripe for provenance. No edit icon visible.
Hover: background shift + pencil icon (12px, muted) in top-right corner. Cursor changes.
Editing: border transitions to blue. Value becomes input, auto-focused. Save/Cancel below.
Saved: border flashes green (300ms), then returns to provenance color. Checkmark fades after 2s.

Missing fields: show "Add value" button instead of italic "Missing" text. Clicking goes directly to edit state.

### 17.3 Suggestion accept flow

Accept: button shows checkmark (100ms). Card contracts and fades (200ms). Target field in main column pulses blue (400ms). If section collapsed, toast confirmation appears.

Edit before accept: card expands inline with pre-filled input. User modifies. Apply triggers same animation. Provenance becomes green (manual) since human modified.

Reject: card fades to 50% (150ms). Optional "Why?" for rejection reason. Card collapses after 1.5s.

No sparkle trails. No fly animations. CSS transitions only.

### 17.4 Compliance stance selection

Pre-selection: banner above cards — "No stance selected. System cannot evaluate compliance gaps until you choose." Amber background. Cards show dashed borders.

Selection: selected card gets 2px solid blue border + blue background. Other cards fade to 40% opacity + scale(0.97). Consequence section stays visible.

Post-selection: "Compliance Gaps" panel fades in below cards. Shows specific requirements for the chosen stance.

Changing stance: "Change stance" link with confirmation dialog. Prevents accidental changes since this resets compliance evaluation.

### 17.5 Gates strip

Five circles (24px) connected by thin lines. Sober, not theatrical.

- solid fill = passed
- half-fill = in progress
- hollow red = blocked
- hollow gray = not started

Each circle is clickable → scrolls main column to corresponding section.
Hover tooltip shows gate requirements summary.
Lines communicate dependency, not decoration.

Labels: 11px mono, uppercase, state-colored (green for passed, amber for in-progress, red for blocked, muted for not-started). This ensures scannability in daily use — gates are not just decorative, they are the primary readiness signal.

No animation on lines. No glow effects. Just structure + status.

### 17.6 Evidence coverage in Discovery

Show coverage by topic, not by document. The question is "are my claims backed?" not "do I have an SDS?"

Four cards in 2×2 grid:
- topic name (e.g., "Material composition")
- status: evidenced / partial / unevidenced
- source document name if evidenced
- freshness indicator

Missing topics show dashed border + upload prompt.
Files tab is the document inventory with full management (preview, reprocess, download).

### 17.7 Open Decisions

Categorized by domain: compliance, lab/testing, logistics, economics.
Max 3-5 visible. "Show N more" for the rest.
Each decision shows: question + impact statement.

### 17.8 Empty state (day 1)

Sections are hidden until first data arrives. Day 1 shows only:
- editable title ("Untitled Stream" → click to name)
- empty thesis with placeholder
- centered dropzone: "Drop files here or paste your notes"
- three large action buttons: Voice, Photo, Upload

After first capture: AI processes. Sections unfold as data populates them. Material Definition appears first (300ms), others follow as data is extracted (staggered 200ms each).

Gates strip appears after Material Definition has ≥2 fields populated.

### 17.9 Right rail behavior

Capture pinned at top (never scrolls).

Below capture: tabbed mode switcher with 3 tabs:
- Suggestions (count badge, blue)
- Blockers (count badge, red)
- Actions (ask-next, count badge, amber)

Only one tab's content visible at a time. Each tab shows its full content depth without competing for scroll space.

Activity feed: pinned footer below tab content. Shows last 2 items. "Show all activity" link.

Section awareness: when user scrolls main column into a section, active rail tab filters to show relevant items first. Cross-section items move below divider.

### 17.10 Responsive behavior

No compact/comfortable toggle. Density adapts automatically.

Desktop (>1200px): 2-col fields, rail visible, sections expanded.
Laptop (900-1200px): rail collapses to slide-out panel (tab handle on right edge). Main gets full width.
Tablet (600-900px): 1-col fields, compact section previews. Rail becomes bottom sheet.
Mobile (<600px): single column. Capture as floating action button. Bottom sheet for rail content. Deliberate tap for suggestion accept (no swipe gestures for consequential actions).

Collapse priority (first to last):
1. Rail → slide-out or bottom sheet
2. Field grid → 2-col to 1-col
3. Section bodies → collapsed with preview line
4. Header meta → dropdown detail panel
5. Never collapse: gates strip, do next, thesis

### 17.11 Transitions summary

All CSS transitions. No JS animation libraries. No sparkle/glow/fly.

- section open/close: height + content fade, 250ms ease-out
- field edit mode: border + background, 200ms ease
- field saved: green border flash 300ms, checkmark fades 2s
- suggestion accept: card collapse 200ms, target field pulse 400ms
- suggestion reject: fade 150ms, collapse 200ms
- gate passes: circle fills, 400ms ease
- tab switch: underline slides, 200ms ease

What does NOT animate: field values while typing, pill colors, breadcrumb navigation, scrolling, button hover (150ms CSS transition only).

## 18. Visual identity

### 18.1 Typography

Satoshi (body/headers) + IBM Plex Mono (labels, data, timestamps).

Hierarchy:
- title: 22px/700 Satoshi, -0.03em tracking
- thesis: 14px/500 Satoshi, full text color
- section names: 14px/600 Satoshi
- field values: 13px/500 Satoshi
- mono labels: 10px/500 IBM Plex Mono
- action mono (rail buttons): 11px/500 IBM Plex Mono

### 18.2 Color

Semantic only. No decorative color.

- blue (#84b7ff): AI-sourced data, suggestions
- green (#4bd79c): confirmed, manual, passed
- amber (#f0be63): warning, aging, in progress
- red (#ff9480): blocker, missing, blocked
- violet (#c4a5ff): inferred attributes

Background layering: 3 levels used aggressively.
- page: --bg
- workspace shell: --panel
- section bodies: --panel-2 (creates visual "well")

No flow lines. No noise textures. No glow effects. No progress rings.
The visual identity comes from the type system, color discipline, and the gates pipeline — not from decorative elements.

### 18.3 Field provenance

3px left border stripe. Color-coded by source:
- blue: AI-extracted
- green: manually confirmed
- red: missing
- violet (dashed): inferred

No badges. No sparkle icons. No "AI suggests" labels except in agent insight bars and rail suggestion cards.

### 18.4 Agent insight bars

Each main column section can show an inline agent insight bar — a subtle blue-tinted row that surfaces what the relevant agent found for that section.

Structure:
- circle icon (agent initial, 16px)
- agent name (mono, 10px, blue)
- insight text (12px, muted)
- optional action link (mono, 10px, blue, right-aligned)

Agent-section mapping:
- Material Definition → Extraction agent ("Found 2 values from your notes")
- Evidence Coverage → Evidence agent ("Composition covered. Water content unevidenced.")
- Compliance Stance → Compliance agent ("Likely waste. Confidence 78%.")
- Economics Baseline → Economics agent ("Fuel surcharge extracted. Invoice needed.")
- Do Next → Gap Detection agent (shown as label suffix "via gap detection")

Design rules:
- one insight bar per section max
- collapse after user acts on the insight
- no animation — appears with the section
- blue background at 10% opacity — subtle, not attention-grabbing
- action link navigates to rail tab or triggers upload/review flow

This makes agents visible within their domain context without centralizing everything in the rail. Agents feel integrated into the workflow, not bolted on as a sidebar feature.

## 19. Unresolved questions

- top 10-15 material families for phase 1
- exact gate thresholds for evidence sufficiency
- who can approve working compliance stance
- whether Working Material Brief is internal-only in phase 1
- inference confidence threshold (proposed: 75%) — needs validation with real data
- orchestrator debounce timing for batched re-evaluation
- compliance disclaimer exact wording and legal review
- contenteditable thesis: works as visual pattern in mockup, real implementation needs accessibility, focus management, save, undo — use controlled input component, not browser contenteditable
