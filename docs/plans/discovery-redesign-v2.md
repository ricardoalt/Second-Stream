# Discovery Phase — Definitive Design Plan

**Date:** 2026-03-04
**Status:** Final — ready for implementation plan derivation
**Scope:** Phase 1 Discovery (field agent data capture)
**Sources:** `discovery-ux-design.md`, `discovery-phase-implementation-plan.md`, `waste-deal-os-full-product-design.md`, `waste-deal-os-team-presentation.md`, UX/UI expert review

---

## 1. The Problem: Why Discovery Is the #1 Bottleneck

> *"La propuesta es trivial; lo difícil es convertir un material ambiguo en un movimiento compliant y rentable sin perderse en el discovery."* — Russ (20yr veteran broker)

### What Russ told us (prioritized)

| # | Blocker | Severity | Quote / Evidence |
|---|---------|----------|-----------------|
| P0 | **Missing info freezes the pipeline** | Critical | "Everything is waiting for something" — no visibility into what's stuck |
| P0 | **Tribal knowledge for discovery & pricing** | Critical | "No encyclopedia exists"; pricing = IP in veterans' heads |
| P1 | **Material names are useless** | High | Client codes like "5850", "B980" mean nothing |
| P1 | **Regulatory status is multi-dimensional** | High | Same substance: NOT hazwaste as product, YES as discarded |
| P1 | **Lab decision is non-trivial** | High | $1,500 full panel vs $150 targeted; often unnecessary |
| P1 | **Documents have freshness/reliability issues** | High | Docs 2-5yr old are useless; virgin SDS ≠ spent SDS |
| P2 | **Hidden costs in invoices** | Medium | "Like a phone bill — fees and extra lines" |
| P2 | **Production criticality = surprise variable** | Medium | Changes entire solution design |
| P2 | **Deadlines are surprise data** | Medium | "VP visit March 15" drops late |

### Pain Point Coverage Audit

**77 distinct requirements** extracted from Russ interview:

| Classification | Count | % |
|---|---|---|
| Addressed in Phase 1 | 41 | 53% |
| Partially addressed | 8 | 10% |
| Gap — promoted to Phase 1 | 4 | 5% |
| Phase 2+ (correct deferral) | 24 | 32% |

**Gaps promoted from Phase 2 to Phase 1:**
1. Lab decision guidance (integrated into Evidence Status — see §3.5)
2. Document confidence scoring (beyond just freshness)
3. Brand protection as explicit field
4. Regulatory deadline as distinct from general urgency

---

## 2. Current System vs. What We Need

### What exists today

- `project_data` JSONB with `DynamicSection[]` — flexible, no migrations needed
- `IntakeSuggestion` model — maps AI extractions to `section_id` + `field_id`
- Intake Panel sidebar — notes + file upload + AI suggestion cards
- 4 tabs: Overview | Technical Data (questionnaire) | Files | Proposals
- Resizable two-panel layout: accordion (65%) + intake panel (35%)
- Flying chip animation when applying AI suggestions
- Autosave with status indicator
- Mobile FAB pattern for intake panel

### What changes (and what stays)

| Stays (working well) | Changes |
|---|---|
| JSONB data model — no new tables for fields | Tabs: 4 → 3 (drop Overview, rename remaining) |
| IntakeSuggestion pipeline | "Technical Data" → "Discovery" |
| Flying chip animation | "Proposals" → "Material Passport" |
| Resizable panel layout | Sidebar: scrolling sections → 4 internal tabs |
| Mobile FAB | Progress: single bar → Dimension Map with status vocabulary |
| Autosave | Add combobox, tags, multiline field types |
| File upload pipeline | Material Family as deal configurator |
| | Evidence attribution on AI-populated fields |
| | NEW: EvidenceNode table (separate, append-only) |
| | NEW: CorrectionEvent table |
| | NEW: Deal Re-Entry Card |

---

## 3. UX/UI Design: The Discovery Workspace

### 3.1 Navigation: 3 Tabs

```
[ Discovery  ⋯ · 3 ] [ Files (6) ] [ Material Passport ]
```

**Why 3 tabs, not 4:**
- Overview is eliminated. Its content lives in the **project header** (always visible) + **Dimension Map** (always visible above accordion) + **Gaps tab** in sidebar (blockers with aging).
- A broker returning to a deal gets the "where was I?" context from the **Deal Re-Entry Card** (§3.13), not from a separate tab.
- Material Passport (was "Proposals") aligns with team presentation naming — the output of Discovery is a passport, not just a proposal.

**Tab badge on Discovery:** Status indicator + pending suggestions count as dot.

### 3.2 Layout: Resizable Two-Panel with Dimension Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Project Header (sticky)                                                 │
│  Meridian Chemical · Spent Acetone Recovery                              │
│  28/42 fields · 60% complete                                            │
├───────────────────────────┬──────────────────┬──────────────────────────┤
│ Discovery  ⋯ · 3          │  Files(6)        │  Material Passport       │
├───────────────────────────┴──────────────────┴──────────────────────────┤
│                                                                          │
│  Dimension Map                                                           │
│  [✓ Identity] [⋯ Volume 60%] [⚡ Regulatory] [⚠ Evidence] [— Cost]     │
│  [⋯ Priorities 60%]                                                     │
│                                                                          │
│  ┌─ Ready banner (only when threshold met) ──────────────────────────┐  │
│  │ Ready to run a passport. Review 2 AI suggestions first?           │  │
│  │                                                [Generate →]       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────┬────────────────────────────────────┐  │
│  │  ACCORDION (60%)             │  SIDEBAR (40%)                     │  │
│  │                              │                                    │  │
│  │  ▼ Material Identity   4/5  │  [Capture][Suggest·3][Gaps·2][Docs]│  │
│  │    [editable fields]        │  ─────────────────────────────────  │  │
│  │    [2-col grid]             │                                    │  │
│  │    [source badges]          │  (active tab content below)        │  │
│  │    [1 dismissed ▾]          │                                    │  │
│  │                              │  See §3.5 for each tab's content  │  │
│  │  ▶ Evidence & Docs    1/4   │                                    │  │
│  │  ▶ Volume & Logistics 3/5   │                                    │  │
│  │  ▶ Regulatory    ✦   0/5   │                                    │  │
│  │  ▶ Cost & Economics   0/6   │                                    │  │
│  │  ▶ Client Priorities  3/5   │                                    │  │
│  │                              │                                    │  │
│  └──────────────────────────────┴────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Dimension Map — Hybrid Status + Progress

Six indicators above the accordion. Each shows a **status word** that tells the broker what's happening, plus percentage when in-progress.

**States:**

| State | Visual | Meaning |
|---|---|---|
| `—` Not started | Muted outline, muted text | Nothing filled yet |
| `⋯` In progress | Neutral fill + percentage | Some fields filled, no issues |
| `⚡` Blocked | Amber border + "blocked" | Has open blockers preventing progress |
| `⚠` Warning | Amber border + specific warning | Stale evidence, aged docs, attention needed |
| `✓` Complete | Green fill + checkmark | All required + optional fields adequate |

```
[✓ Identity] [⋯ Volume 60%] [⚡ Regulatory] [⚠ Evidence] [— Cost] [⋯ Priorities 60%]
  green/muted    neutral          amber           amber       muted      neutral
```

**Cross-linking:** Clicking a ⚡ blocked pill auto-switches sidebar to the Gaps tab. Clicking ⚠ warning auto-switches to the Docs tab. Clicking any pill smooth-scrolls to that accordion section and auto-expands it.

**Responsive:** 6 inline on desktop → horizontal scroll on mobile.

### 3.4 Progressive Disclosure: Material Family as Deal Configurator

**The key UX innovation:** Not all fields show at once. Picking a material type loads the right questions.

#### How it works:

1. **Empty state** — notes-first, material family second:

```
┌──────────────────────────────────────────────┐
│  New deal — how do you want to start?        │
│                                               │
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │  📝 Paste notes  │  │  🎤 Record what   │   │
│  │  from a call     │  │  you know         │   │
│  └─────────────────┘  └──────────────────┘   │
│                                               │
│  ─── or if you know the material ──────────  │
│                                               │
│  Material Type *      [Select            ▾]  │
│                                               │
│  Core fields (always collected):             │
│                                               │
│  Material Name      [_____________________]  │
│  How is it made?    [_____________________]  │
│    "How this stuff was created matters        │
│     more than its name."                      │
│  Physical State     [Select             ▾]   │
│  Packaging          [Select tags        ▾]   │
│  Volume             [________] [unit    ▾]   │
│  Recurring?         [Select             ▾]   │
│  How urgent?        [Select             ▾]   │
│  Production critical? [Select           ▾]   │
│  What does the client want? [Select tags ▾]  │
│                                               │
└──────────────────────────────────────────────┘
```

2. **Material type selected** — the right questions appear:

```
Broker selects: "Solvents"
→ Identity adds: water_content, flash_point, chlorinated_components
→ Regulatory adds: rcra_solvent_codes, state_solvent_rules
→ Evidence adds: water_content_lab_status

Broker selects: "Metals (Non-ferrous)"
→ Identity adds: alloy_type, grade_spec, contamination_level
→ Evidence adds: assay_report_status
→ Regulatory adds: scrap_classification (ISRI code)

Broker selects: "Plastics"
→ Identity adds: resin_type, color, regrind_vs_bale, mfi
→ Evidence adds: fda_nol_status
```

**Briefing toast (8s, dismissable):** "Solvents: water content and flash point drive the price. Those questions are now added."

3. **AI-suggested ghost fields** — outlined, dashed, appear when AI finds something unexpected:

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  ✦ Suggested: Chlorine Content %          │
│  AI found possible chlorinated solvent    │
│  in the SDS. This changes RCRA listing.   │
│  [Add field]  [Dismiss]                   │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Why this works:**
- Not overwhelming: 10 core fields → 15-25 type-specific → AI suggests more as needed
- Not rigid: different materials get different questions
- Still uses `DynamicSection[]` — material type controls which fields are visible
- Adding a new material type = config change, not code change

### 3.5 The Sidebar: 4 Internal Tabs

Right sidebar restructured from scrolling sections to **tabbed navigation**. Each tab is a distinct mental mode — brokers switch between modes deliberately, not by scrolling.

```
┌──────────────────────────────────────┐
│  [Capture] [Suggest·3] [Gaps·2] [Docs]  ← sticky tab strip with badges
├──────────────────────────────────────┤
```

#### Tab 1: Capture (default on new deals)

```
│  CAPTURE                             │
│                                      │
│  [🎤 Voice Note]        [📷 Photo]   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Notes from call with John:   │    │
│  │ "Acetone blend, 20 drums/mo  │    │
│  │  critical for production..." │    │
│  └──────────────────────────────┘    │
│  Saved · [Analyze →]     [+ Upload]  │
│                                      │
```

Primary actions: Voice note, camera capture, text notes, file upload. The most common entry point for field agents.

#### Tab 2: Suggestions (auto-selects when new suggestions arrive, once per session)

```
│  SUGGESTIONS (3 pending)             │
│                                      │
│  Identity (2):                       │
│  ┌──────────────────────────────┐    │
│  │ ✦ material_type → Solvents   │    │
│  │   95% · SDS pg.1             │    │
│  │   [Apply ✓]  [Skip]         │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ ✦ flash_point → "58°C"       │    │
│  │   91% · SDS pg.4             │    │
│  │   [Apply ✓]  [Skip]         │    │
│  └──────────────────────────────┘    │
│  [Apply all Identity ✓]             │
│                                      │
│  Volume (1):                         │
│  ┌──────────────────────────────┐    │
│  │ ✦ volume → "20 drums/month"  │    │
│  │   87% · From notes           │    │
│  │   [Apply ✓]  [Skip]         │    │
│  └──────────────────────────────┘    │
│                                      │
```

**"Apply all [dimension]" conflict resolution:**
- Applies all non-conflicting suggestions in that dimension with a single click
- If two suggestions target the same field with different values → those skip batch and surface individually as conflict cards (existing pattern)
- After batch apply: success toast "Applied 4 suggestions to Identity. 1 conflict needs review."

#### Tab 3: Gaps & Blockers

```
│  GAPS (2 blockers · 1 AI question)   │
│                                      │
│  ⚡ Lab Analysis (Water Content)      │
│  Needed for: Buyer QA, pricing       │
│  Blocks: Passport generation         │
│  Waiting on: [EHS - John  ▾]        │
│  Since: 4 days ⏱                     │
│  [What to send them →]  [Done]       │
│                                      │
│  💡 What to ask them next:           │
│  "SDS shows acetone/toluene blend    │
│   but waste profile says 'spent      │
│   solvent.' Does toluene exceed      │
│   10%? This changes the RCRA codes." │
│  Impact: RCRA codes, disposal, price │
│  [Draft email →]  [Copy]  [Dismiss]  │
│                                      │
```

Primary action on every blocker: **"What to send them"** — generates a draft email (see §6.2-J).

#### Tab 4: Docs (Evidence Status)

```
│  EVIDENCE & LAB                      │
│                                      │
│  📄 SDS            ✅ Fresh (2024)    │
│  📄 Waste Profile  ⚠ Stale (2022)    │
│  📄 Lab Analysis   —— None           │
│  📄 Manifest       ✅ Available       │
│  📄 Invoice        —— None           │
│                                      │
│  Evidence Score: 40%                 │
│                                      │
│  ─── Lab Guidance ──────────────── │
│                                      │
│  For solvents, recommended tests:    │
│                                      │
│  Water Content   $50-150  ✓ needed   │
│  Flash Point     $50-100  ✓ needed   │
│  Full TCLP Panel $800-1500  ✗ skip   │
│    "Full panel not needed unless     │
│     buyer specifically requires."    │
│                                      │
│  [Upload missing docs →]            │
│                                      │
```

Lab guidance is integrated directly into the Docs tab — not a separate display field. Shows test name + cost range + recommended/skip per material type.

### 3.6 Evidence Attribution on Fields

When AI populates a field from a document, the source stays visible:

```
Flash Point: 58°C
┌─────────────────────────────────────────────────┐
│ Source: SDS_Acetone_2023.pdf · Page 4 · 14mo ⚠  │
└─────────────────────────────────────────────────┘
```

- AI-populated fields show dashed underline in primary color
- Hover/tap reveals: source document, page, AI confidence, extraction date
- User-entered fields show solid (no attribution needed)

**Freshness rules (configurable):**

| Document Type | Fresh | Stale | Critical |
|---|---|---|---|
| Lab report | <6 months | 6-12 months | >12 months |
| SDS | <24 months | 24-36 months | >36 months |
| Waste profile | <12 months | 12-24 months | >24 months |
| Invoice | <3 months | 3-6 months | >6 months |

### 3.7 Section-Level Intelligence: ✦ as Separate Chip

When the AI has a contextual question about a section, a **separate chip** appears next to the section title (not on the expand/collapse button — that creates click-target conflicts):

```
▶ Regulatory & Compliance    0/5    [ ✦ AI has a question ]
                                     ↑ distinct clickable chip
                                       with hover state
```

Clicking the ✦ chip opens a popover with the AI's question and a link to the Gaps tab.

### 3.8 Project Header (replaces Overview tab)

The project header is **always visible** across all tabs. It absorbs Overview's content:

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Meridian Chemical · Spent Acetone Recovery                    │
│  Solvents · 28/42 fields · 60% complete                         │
│  ⚡ 2 blockers: Lab Analysis (4d), Regulatory classification     │
│  [Assign ▾]  [Status: Discovery ▾]                              │
└──────────────────────────────────────────────────────────────────┘
```

Top blockers with aging are always visible. No need for a dedicated tab to see deal health — the header + Dimension Map + Gaps tab cover it.

### 3.9 Mobile Experience

```
┌───────────────────────────────┐
│ ← Meridian · Spent Acetone    │
│ Solvents · 60% · ⚡ 2 blocked │
│                               │
│ [Discovery ⋯][Files][Passport]│
│                               │
│ Dimension Map (horiz scroll): │
│ [✓ Id.][⋯ Vol.][⚡ Reg.]→    │
│                               │
│ ▼ Material Identity     4/5   │
│ ┌───────────────────────┐     │
│ │ Material Type *        │     │
│ │ [Solvents          ▾] │     │
│ │                        │     │
│ │ How is it made? *      │     │
│ │ [Degreasing ops     ] │     │
│ └───────────────────────┘     │
│                               │
│ ▶ Evidence & Docs       1/4   │
│ ▶ Volume & Logistics    3/5   │
│ ...                           │
│                               │
│           ┌──────┐ ┌────────┐ │
│           │ 📷   │ │ ✦ 3    │ │
│           └──────┘ └────────┘ │
│           Camera    Intake    │
│           FAB       FAB       │
└───────────────────────────────┘
```

**Voice recording — full-screen takeover:**

```
┌───────────────────────────────┐
│ ← Recording · Meridian        │
│                               │
│  ┌─────────────────────────┐  │
│  │                         │  │
│  │      🎤                 │  │
│  │   RECORDING  0:23       │  │
│  │   ████████░░░░          │  │
│  │                         │  │
│  │  [Stop ■]    [Pause ⏸]  │  │
│  └─────────────────────────┘  │
│                               │
│  Recent captures:             │
│  • "Acetone blend, 20 drums"  │
│    2 min ago                  │
│  • Photo_001.jpg · 5 min ago  │
│                               │
└───────────────────────────────┘
```

**Two mobile FABs:** Camera (direct to camera) + Intake (opens bottom drawer with Capture/Suggest/Gaps/Docs tabs). Camera is first-class because field agents photograph material on-site.

**Offline queue: deferred to Phase 2.** Phase 1 relies on autosave over cellular. Phase 2 adds explicit "Saved locally — syncing when connected" queue.

### 3.10 Readiness Threshold

**Formula:** All required core fields filled + 50% of visible fields overall.

Required core fields (10, always required regardless of material type):
1. `material_family`
2. `generating_process`
3. `physical_state`
4. `form_packaging`
5. `volume_quantity` + `volume_unit`
6. `recurrence`
7. `regulatory_status`
8. `production_critical`
9. `urgency`
10. `client_goals`

**Why this formula:** With flexible fields per material, a fixed count doesn't work. "You've answered the essential questions AND have a decent overall picture."

### 3.11 Regulatory Classification: 3-Button Segmented Control

The regulatory status of a material is the single most complex decision in discovery. Same substance can be waste, product, or by-product depending on generating process, intent, and jurisdiction. A dropdown trivializes this.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Regulatory Classification                                          │
│                                                                     │
│  Not yet determined                                                 │
│  ┌──────────┬──────────┬──────────────┐                            │
│  │  Waste   │ Product  │  By-product  │   ← 3 options              │
│  └──────────┴──────────┴──────────────┘                            │
│  I don't know yet — that's OK. Upload the SDS and describe the     │
│  process. AI will suggest a classification.                         │
│                                                                     │
│  ┌─ AI Insight (appears when enough data) ──────────────────────┐  │
│  │  ✦ Based on generating process "degreasing" and composition   │  │
│  │  (acetone/toluene), this is likely spent solvent waste.        │  │
│  │  Suggest RCRA F001 or F002 depending on chlorinated status.   │  │
│  │  [Why?]                                    [Select Waste →]   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── After selection: "Waste" ─────────────────────────────────────  │
│                                                                     │
│  Waste means: manifest + permitted facility + DOT hazmat            │
│  (if characteristic)                                                │
│  [What does this mean for this deal? ▾]  ← expands to full detail  │
│                                                                     │
│  RCRA Codes:     [tags input, e.g. D001, F003]                     │
│  DOT Class:      [text]                                             │
│  State Rules:    [multiline]                                        │
│  Export Status:  [Domestic only ▾]                                  │
│  Reg. Deadline:  [date or event description]                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **"Unknown" is NOT a button** — it's the absence of selection. The prompt text ("I don't know yet — that's OK") normalizes uncertainty.
- **Contextual insight is one sentence** after selection, with "What does this mean?" disclosure for full detail.
- **Conditional fields:** RCRA/DOT fields appear when Waste selected. Product spec fields appear when Product selected. State-specific by-product rules appear when By-product selected.
- **AI suggests but NEVER auto-selects.** The insight panel shows rationale + a "Select [X] →" shortcut, but the broker must confirm.

**Contextual insight per selection:**

| Selection | One-line summary | Conditional fields |
|---|---|---|
| **Waste** | Needs manifest + permitted facility + DOT hazmat (if characteristic) | RCRA codes, DOT class, state rules, export status |
| **Product** | Can sell/ship as commodity — no manifest needed | Product spec, quality cert status, buyer requirements |
| **By-product** | EPA beneficial use rules — may need state approval | State by-product rules, market documentation |

### 3.12 Micro-Interactions

| Moment | Behavior |
|---|---|
| **Material type selected** | Briefing toast (8s, dismissable): "Solvents: water content and flash point drive the price. Those questions are now added." |
| **Field populated by AI** | Dashed underline in primary color + small ✦ icon; hover reveals source popover |
| **Ghost field appears** | Slide-in from left with dashed border; subtle pulse on first appearance only |
| **Dimension completed** | Pill fills with green + brief scale animation + checkmark replaces % |
| **Flying chip lands + completes section** | Chip lands → field highlights → if last required field in section, accordion header transitions to ✓ with green flash |
| **Blocker created** | Card slides into Gaps tab + amber pulse on Dimension Map for affected dimension |
| **Blocker resolved** | Card collapses with success animation + affected fields highlight briefly |
| **Ready threshold met** | Banner slides down with green accent; Dimension Map does a brief celebratory shimmer (once, not looping) |
| **Flying chip (existing)** | AI suggestion → chip flies from sidebar into form field → field briefly highlights |
| **✦ chip on accordion** | Gentle pulse on first appearance only, then static. Click opens popover. |
| **Evidence freshness warning** | One-time amber pulse on scroll-into-view, then **static**. No periodic animation. |
| **Inline field hints** | Below key fields, muted italic text: "How this stuff was created matters more than its name." |
| **CorrectionEvent prompt** | When senior changes an AI-populated field: "Changed from AI suggestion. Quick note why?" (optional, dismiss by clicking away) |

**State transitions the broker "feels":**
```
New deal → "How do you want to start?"
    ↓ Notes pasted or material type selected
Getting started → questions appear, briefing toast
    ↓ Core fields filling in
In progress → Dimension Map animates, badges update
    ↓ Required info stuck
Blocked → amber indicators, blocker cards with aging timers
    ↓ Blockers resolved, info coming in
Almost there → dimensions turning green one by one
    ↓ All required fields + 50% visible
Ready → green banner, "Generate passport" is the primary action
    ↓ Passport generated
Done → Discovery becomes reference view with edit capability
```

### 3.13 Deal Re-Entry Card

When a broker reopens a deal they haven't touched in 48+ hours, a summary card appears **above** the Dimension Map:

```
┌──────────────────────────────────────────────────────────┐
│  Back on Meridian · Spent Acetone · Last session 4 days ago          │
│                                                          │
│  While you were away:                                    │
│  ✦ SDS processed → 8 new suggestions ready              │
│  ⚡ Lab Analysis still waiting on John (6 days now)      │
│                                                          │
│  You were last working on: Regulatory & Compliance       │
│                                                          │
│  [Review 8 suggestions →]   [Continue in Regulatory →]  │
│                                          [Dismiss ×]    │
└──────────────────────────────────────────────────────────┘
```

- Dismisses on any action click or explicit dismiss
- Only appears if broker has been away 48+ hours
- Leverages existing data: `last_edited`, pending suggestion count, blocker aging
- Requires one new field: `last_section_edited` on the project store (cheap to add)
- **Purpose:** Solves the context-switching problem for brokers juggling 10-20 deals

### 3.14 Dismissed Items Recovery

When a broker skips a suggestion or dismisses a ghost field, it's recoverable via a subtle counter in the accordion section header:

```
▼ Material Identity    4/5    [2 dismissed ▾]
```

Clicking "2 dismissed" reveals a collapsible row inside the section with dismissed items:

```
│  Dismissed:                                    │
│  ✦ chlorine_content → "2.3%" · SDS pg.3      │
│  [Restore]                                     │
│  ✦ Ghost: Boiling Point                        │
│  [Restore]                                     │
```

- One-click restore. No new page needed.
- Counter disappears when nothing is dismissed.
- Dismissed items expire after 30 days (cleanup, not hoarding).

### 3.15 Error States

#### AI analysis failure (notes, voice, documents)

```
┌──────────────────────────────────────┐
│  ⚠ Couldn't analyze this content     │
│                                      │
│  [Reason: timeout / format / etc.]   │
│                                      │
│  [Try again]  [Enter data manually]  │
└──────────────────────────────────────┘
```

#### LLM question generation failure

The "What to ask them next" section silently falls back to rules-only suggestions. No error shown — the rules engine always works. If the LLM fails, the broker simply sees fewer/simpler suggestions.

#### Voice recording failure

```
┌──────────────────────────────────────┐
│  ⚠ Recording failed                  │
│                                      │
│  Check microphone permissions.       │
│  [Try again]  [Type notes instead]   │
└──────────────────────────────────────┘
```

#### Ghost field suggestion failure

If AI can't generate ghost fields due to error, nothing appears — no broken UI. Ghost fields are additive; their absence is invisible.

**Design principle:** AI features degrade gracefully. Rules engine always works. Manual entry always works. AI errors never block the broker's workflow.

---

## 4. Field Specification

### 4.1 Core Fields (always visible, ~10)

| Field | Type | Required | Why it's core |
|---|---|---|---|
| `material_family` | combobox | **yes** | Loads the right questions for this material |
| `material_name` | text | no | Client's name/code (often useless, but captured) |
| `generating_process` | multiline | **yes** | Changes legal classification (per Russ) |
| `physical_state` | combobox | **yes** | Fundamental property |
| `form_packaging` | tags | **yes** | Affects logistics, pricing |
| `volume_quantity` + `volume_unit` | text + combobox | **yes** | Viability check |
| `recurrence` | combobox | **yes** | One-off vs continuous changes everything |
| `regulatory_status` | **segmented control** | **yes** | Waste / Product / By-product (see §3.11) |
| `production_critical` | combobox | **yes** | Changes SLA and redundancy needs |
| `urgency` | combobox | **yes** | Prioritization |
| `client_goals` | tags | **yes** | What the client actually wants |

### 4.2 Family-Specific Fields (examples)

**Solvents:**

| Section | Field | Type | Why |
|---|---|---|---|
| Identity | `water_content_pct` | number | Water kills recycling value |
| Identity | `flash_point` | text | DOT classification driver |
| Identity | `chlorinated` | combobox (yes/no/unknown) | Changes RCRA listing |
| Identity | `purity_concentration` | text | Affects resale value |
| Regulatory | `rcra_solvent_codes` | tags | F001-F005 listings |
| Evidence | `water_content_lab_status` | combobox | Buyers require this test |

**Metals (Non-ferrous):**

| Section | Field | Type | Why |
|---|---|---|---|
| Identity | `alloy_type` | combobox | Determines value |
| Identity | `grade_spec` | text | ISRI grade or buyer spec |
| Identity | `contamination_level` | combobox | Clean vs painted vs oily |
| Evidence | `assay_report_status` | combobox | Buyers need composition verification |
| Regulatory | `scrap_classification` | text | ISRI code |

**Plastics:**

| Section | Field | Type | Why |
|---|---|---|---|
| Identity | `resin_type` | combobox | HDPE/LDPE/PP/PET/PS/Mixed — drives value |
| Identity | `color` | combobox | Natural/clear = premium |
| Identity | `regrind_vs_bale` | combobox | Processing stage |
| Identity | `mfi_known` | text | Melt flow index |
| Evidence | `fda_nol_status` | combobox | Food-grade needs FDA letter |

**Implementation:** JSON config maps `material_family` → additional fields per section. Adding a new material type = config change, not code.

### 4.3 Common Fields (all families, within sections)

**Evidence & Documentation:**

| Field | Type | Description |
|---|---|---|
| `sds_status` | combobox | Available (current/outdated) / Not available / Requested |
| `sds_type` | combobox | Virgin / Spent / Both |
| `waste_profile_status` | combobox | Available / Outdated / Not available / Requested |
| `manifest_history` | combobox | Available / Not available / Unknown |
| `lab_analysis_status` | combobox | Recent / Old / Very old / None / Requested |
| `lab_details` | multiline | What tests, date, key results |
| `photos_status` | combobox | Available / None / Requested |
| `evidence_notes` | multiline | Gaps, concerns, freshness issues |

**Volume & Logistics:**

| Field | Type | Description |
|---|---|---|
| `seasonal_details` | multiline | Seasonal variation patterns |
| `density_known` | text | For volume↔weight conversion |
| `current_storage` | tags | Compactor / Roll-off / Hazmat / etc. |
| `loading_capability` | tags | Forklift / Dock / Crane / Vacuum truck / etc. |
| `special_equipment` | tags | Beyond standard equipment needs |
| `logistics_notes` | multiline | Access, scheduling, restrictions |

**Regulatory & Compliance:**

| Field | Type | Description |
|---|---|---|
| `rcra_details` | text | Waste codes if known |
| `dot_classification` | text | DOT hazard class, UN number |
| `state_requirements` | multiline | State-specific rules |
| `export_status` | combobox | Domestic only / Export possible / No restrictions |
| `regulatory_deadline` | text | Compliance deadline (distinct from business urgency) |
| `regulatory_notes` | multiline | Open questions, pending determinations |

**Cost & Economics:**

| Field | Type | Description |
|---|---|---|
| `current_handler` | text | Current hauler/processor |
| `stated_cost` | text | What the client says they pay |
| `cost_unit` | combobox | ¢/lb, $/ton, $/drum, $/load, etc. |
| `invoice_breakdown` | multiline | Line items: base, fuel, env fee, admin |
| `effective_cost_notes` | multiline | Hidden fees identified |
| `existing_revenue` | multiline | If generating income currently |
| `contract_details` | multiline | Current contract terms, minimums |

**Client Priorities & Constraints:**

| Field | Type | Description |
|---|---|---|
| `specific_deadline` | text | Date or event ("VP visit March 15") |
| `no_export_policy` | combobox | Strict / Prefer domestic / No restriction |
| `brand_sensitive` | combobox | Yes (high profile) / Moderate / No concern |
| `brand_concerns` | multiline | Specific brand/reputation issues |
| `ehs_capability` | combobox | Expert / Competent / Limited / Minimal |
| `operational_constraints` | tags | Space / Budget / Permits / Staff / Access / Safety / Union / Corporate |
| `priority_notes` | multiline | Additional context |

---

## 5. Data Model Extensions: Evidence Graph

### 5.1 EvidenceNode (separate table, append-only) — DECIDED

Every data point in Discovery has provenance. `EvidenceNode` is an append-only record in a **separate table** (not extending IntakeSuggestion).

```
EvidenceNode:
  id: UUID
  project_id: FK → Project
  section_id: str           # e.g., "identity"
  field_id: str             # e.g., "flash_point"
  value: str                # The extracted/entered value
  source_type: enum         # "document" | "notes" | "voice" | "manual" | "ai_suggestion"
  source_ref: str | null    # File ID, note ID, or null for manual
  source_detail: str | null # "Page 4, Section 3.1" or "Mentioned at 2:31 in voice note"
  confidence: float | null  # AI confidence score (null for manual entry)
  extracted_at: datetime
  accepted_at: datetime | null  # When broker applied the suggestion
  accepted_by: FK → User | null
```

**Why separate table:** EvidenceNode is the foundation of the Evidence Graph and future Material Passport. Keeping it separate from IntakeSuggestion (which is a transient "pending" state) gives us a clean audit trail and a clear data model for Phase 2+.

**Why append-only:** We never delete evidence, even when values are corrected. The UI shows the latest accepted value, but the full history is accessible. Critical for compliance-sensitive waste materials.

**Flow:** `IntakeSuggestion` (pending) → broker applies → creates `EvidenceNode` (permanent). Manual field edits also create `EvidenceNode` records with `source_type = "manual"`.

### 5.2 CorrectionEvent (training data capture)

When a senior broker corrects a value or overrides an AI suggestion, we capture this as structured training data.

```
CorrectionEvent:
  id: UUID
  project_id: FK → Project
  evidence_node_id: FK → EvidenceNode  # The original evidence being corrected
  previous_value: str
  corrected_value: str
  correction_reason: str | null         # Optional — zero friction by default
  corrected_by: FK → User
  corrected_at: datetime
  material_family: str                  # Denormalized for easy querying
```

**Why this matters:** Over time, CorrectionEvents become the dataset for improving AI extraction accuracy per material family. "AI said flash point was 58°C from SDS page 4, but senior corrected to -20°C because SDS was for virgin material, not spent" — this is the data moat.

**UI moment:** When a senior changes an AI-populated field, a subtle prompt appears: "Changed from AI suggestion. Quick note why?" Optional — dismiss by clicking away. The before/after is always captured automatically regardless.

---

## 6. AI Functions for Discovery

### 6.1 Existing (enhanced with new field mappings)

#### A. Document Extraction → Suggestions
Same pipeline, category-specific prompts:
- **SDS** → identity (composition, physical state, hazards, DOT)
- **Invoice** → cost (handler, line items, effective cost)
- **Lab Report** → composition, contaminants, test date/type
- **Waste Profile** → regulatory status, RCRA codes, process
- **Photos** → physical state, packaging, storage

#### B. Notes Analysis → Suggestions
Same pipeline, enhanced to detect "surprise data" — production criticality keywords ("shutdown", "can't stop", "critical"), deadline mentions, urgency signals → auto-flags in sidebar Gaps tab.

### 6.2 New for Phase 1

#### C. Material Family Configuration
**Type:** Config-driven (JSON), not AI
**Trigger:** Broker selects `material_family`
**Effect:** Type-specific fields appear in relevant sections

**Rules engine storage: JSON config, explicitly confirmed.** Material family → field mappings, gap analysis rules, compliance rules, and lab guidance are ALL stored as JSON config. Not hardcoded logic. A compliance person or product manager can edit these without a code deploy. The config schema:

```json
{
  "material_families": {
    "solvents": {
      "fields": { "identity": ["water_content_pct", "flash_point", ...], ... },
      "gap_rules": [ { "condition": "...", "message": "..." }, ... ],
      "compliance_rules": [ { "condition": "...", "flag": "...", "suggest": "..." }, ... ],
      "lab_guidance": [ { "test": "Water Content", "cost": "$50-150", "recommended": true }, ... ]
    }
  }
}
```

#### D. Smart Gap Analysis (Rules Engine)
**Type:** Deterministic rules, NOT AI
**Why rules:** No hallucination, instant, auditable
**Storage:** JSON config per material family (see above)

Example rules (~30-40 total):
```
IF material_family = "Solvents" AND water_content_pct IS EMPTY
  → "For solvents, water content is what buyers care about most.
     Has the facility tested it?"

IF material_family = "Solvents" AND chlorinated IS EMPTY
  → "Chlorinated vs non-chlorinated solvents have completely
     different RCRA listings. Ask the facility."

IF production_critical = "Yes" AND urgency IS EMPTY
  → "This is production-critical. What's the deadline before
     it disrupts their operations?"

IF regulatory_status IS EMPTY AND generating_process IS FILLED
  → "Process is described but classification isn't set.
     Upload SDS and AI will suggest a classification."

IF sds_type = "Virgin material SDS"
  → "This SDS is for virgin material, not spent.
     Waste profile or fresh lab analysis needed."

IF lab_analysis_status IN ("Old", "Very old")
  → "Lab results are outdated. Most buyers need
     recent testing. Ask if they can retest."
```

#### E. Lab Decision Guidance (integrated into Docs tab)
**Type:** JSON config per material family → display in sidebar Docs tab
**Not** a separate display field — lives alongside the evidence status where brokers naturally look at document needs.

Per-family config:

```json
{
  "solvents": {
    "lab_guidance": [
      { "test": "Water Content", "cost_range": "$50-150", "recommended": true,
        "note": null },
      { "test": "Flash Point", "cost_range": "$50-100", "recommended": true,
        "note": null },
      { "test": "Full TCLP Panel", "cost_range": "$800-1500", "recommended": false,
        "note": "Not needed unless buyer specifically requires." }
    ]
  },
  "metals": {
    "lab_guidance": [
      { "test": "Assay Report", "cost_range": "$100-300", "recommended": true,
        "note": "Verifies composition and grade." },
      { "test": "TCLP (if painted/coated)", "cost_range": "$300-500", "recommended": "conditional",
        "note": "Only if contamination suspected." }
    ]
  }
}
```

Renders in sidebar Docs tab as: test name + cost + ✓/✗/conditional badge + note.

#### F. Evidence Freshness & Confidence Scoring
**Type:** Frontend logic (field values → visual indicators)
- Color-coded badges on evidence fields (green/amber/red per thresholds in §3.6)
- Warning text for stale documents
- Info text for virgin-vs-spent SDS distinction
- Source attribution on AI-populated fields with confidence %
- One-time amber pulse on scroll-into-view for stale docs, then static

#### G. Blocker Tracking
**Type:** Semi-automated
- **Auto-created:** Required fields empty after **72h** → system creates blocker
- **Manual creation:** Broker adds blockers for non-field dependencies
- **Tracking:** Who owes it, how long pending, what it blocks
- **Resolution:** "Done" triggers broker to fill the field

**Why 72h, not 24h:** With 10-20 active deals, a broker may not touch a deal for 2-3 days. 24h auto-blockers would create noise — every deal would have blockers after one busy day. 72h means: if something has been empty for 3 days, it's genuinely stuck.

#### H. AI-Suggested Ghost Fields
**Type:** AI-driven
- When AI extracts data from documents that doesn't match any visible field, it suggests adding a new field
- Appears as outlined/dashed "ghost field" in the relevant section
- Broker decides: [Add field] or [Dismiss]
- Dismissed ghost fields recoverable via §3.14 dismissed items tray
- Prevents rigidity — AI adapts to what it finds

#### I. LLM Contextual Questions (Hybrid AI)
**Type:** LLM-generated, broker-reviewed
**Why:** Rules engine covers known patterns (~40 rules). Deals have unique nuances that rules can't anticipate. LLM fills the gap.

**Trigger:** Broker clicks "What to ask them next" or AI detects ambiguity no rule covers.

**How it works:**
1. LLM receives: material family + all filled fields + all empty fields + notes/documents
2. LLM generates: 1-3 contextual questions ranked by impact on passport readiness
3. Questions appear in the Gaps tab with rationale
4. Broker can: draft email, copy to clipboard, or dismiss

**Example:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 What to ask them next                                           │
│                                                                     │
│  "The SDS shows this as an acetone/toluene blend, but the waste     │
│   profile lists only 'spent solvent.' Does toluene exceed 10%?      │
│   This changes the RCRA codes and which facilities can take it."    │
│                                                                     │
│  Affects: RCRA codes, disposal routing, pricing                     │
│  [Draft email →]  [Copy to clipboard]  [Dismiss]                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Failure mode:** If LLM fails, silently fall back to rules-only suggestions. No error shown. The rules engine always works.

#### J. Draft Follow-up Emails (LLM)
**Type:** LLM-generated, broker-reviewed
**Trigger:** Broker clicks "Draft email" or "What to send them" on any blocker or AI question.

LLM generates a professional email to the facility contact:
- The specific information needed
- Why it matters (in plain terms for facility EHS)
- Urgency level based on deal state
- Reference to previous conversations (from notes, if available)

```
Subject: Information needed — Spent Solvent Composition (Meridian Chemical)

Hi John,

Following up on the spent acetone from your degreasing operation.
To move forward with recycling options, we need a composition
breakdown — specifically whether the toluene content exceeds 10%.

This affects which facilities can accept the material. If you have
a recent lab analysis or COA with the breakdown, that would be ideal.

Can you get this to us by [date based on urgency]?

Thanks,
[Broker name]
```

**Guardrails:** Email is NEVER auto-sent. Always presented as editable draft. Broker must copy/paste or send manually.

#### K. Regulatory Classification Assistance (Rules + LLM)
**Type:** Hybrid — deterministic rules for known patterns, LLM for ambiguous cases
**Storage:** JSON config for deterministic rules

**Deterministic compliance rules (~15-20):**

```
# Chlorinated solvent RCRA flag
IF material_family = "Solvents" AND chlorinated = "Yes"
  → Auto-suggest RCRA codes F001/F002
  → "Chlorinated solvents are listed hazardous waste under RCRA.
     Verify specific codes based on solvent type."

# Ignitability threshold
IF flash_point IS FILLED AND flash_point < 140°F (60°C)
  → Auto-suggest RCRA code D001 (Ignitability)
  → "Flash point below 140°F means D001. Requires hazmat transport."

# State-specific reminder
IF facility_state IS FILLED AND regulatory_status = "Waste"
  → "Check [state] specific rules. Some states are stricter
     than federal RCRA (e.g., CA DTSC, NY DEC)."

# Classification nudge
IF regulatory_status IS EMPTY
   AND generating_process IS FILLED
   AND sds_status = "Available"
  → "SDS + process are available. AI can suggest a classification.
     Run it and review with a regulatory expert."

# Virgin SDS warning
IF sds_type = "Virgin material SDS" AND regulatory_status = "Waste"
  → "This SDS is for virgin material. Spent characteristics
     may differ. Lab analysis or waste profile needed."

# By-product beneficial use
IF regulatory_status = "By-product"
  → "By-product exemptions vary by state. Need: (1) produced
     within normal process, (2) has market, (3) meets specs.
     Missing any → regulated as waste."
```

**LLM for ambiguous cases:** When rules can't determine classification (mixed waste streams, novel materials), LLM analyzes all available data and provides a reasoned suggestion with citations — presented as advisory, never a determination.

---

## 7. Gap Tracking & Blockers (Detail)

### The Blocker Card

```
┌─────────────────────────────────────────────────┐
│ ⚡ Missing: Lab Analysis (Water Content)         │
│                                                   │
│ Needed for: Buyer QA, pricing accuracy            │
│ Blocks: Passport generation                       │
│                                                   │
│ Waiting on: [EHS - John ▾] [+ Contact]           │
│ Since: 4 days ago                                 │
│                                                   │
│ [What to send them →]  [Done]  [Not needed]       │
└─────────────────────────────────────────────────┘
```

**"What to send them" is the primary action** — it generates a draft email (§6.2-J). "Done" marks the blocker resolved and prompts the broker to fill the field.

**Auto-creation rules:**
- Required field empty after **72h** → auto-blocker
- Evidence field shows "Requested" → auto-blocker tracking the request
- AI detects missing critical data in notes → suggests blocker

**In project header:** Top 2-3 blockers with aging always visible. No separate tab needed.

---

## 8. What Makes This Feel Like an Intelligent System

| Pattern | How the broker experiences it |
|---|---|
| **Right questions for the material** | Pick a material type → relevant questions appear, irrelevant ones don't |
| **Tracks what you're waiting for** | Blockers auto-created after 72h with aging timers; draft emails to chase contacts |
| **AI works alongside you** | Suggestions grouped by dimension with batch-apply; ghost fields adapt to what AI finds |
| **Everything has a source** | EvidenceNode — you always know where data came from. Corrections build institutional knowledge |
| **Status at a glance** | Dimension Map shows blocked/warning/complete, not just percentages |
| **Picks up where you left off** | Deal Re-Entry Card after 48h away: what happened, what's stuck, where you were |
| **Regulatory intelligence** | Segmented control with one-line implications; AI suggests classification but broker decides |
| **Rules + AI hybrid** | Deterministic rules for known patterns; LLM for novel questions and draft emails |
| **Graceful degradation** | AI fails silently → rules still work → manual entry always works |
| **Flying chip animation** | Best moment — AI insight flies from sidebar into form field |
| **Corrections make it smarter** | Senior overrides captured as training data for AI improvement |

---

## 9. What NOT to Change

| Component | Why it stays |
|---|---|
| Flying chip animation | Best "intelligent system" moment — quadratic bezier, sparkle trail, landing burst |
| Resizable panel | Brokers need both panels visible simultaneously |
| Mobile FAB pattern | Preserves accordion full-width on mobile; now with camera FAB added |
| Autosave with status badge | Field agents can't remember to save |
| `DynamicSection[]` data model | No migrations for field changes; template swap is enough |
| File upload pipeline | Works as-is; EvidenceNode adds source tracking downstream |
| Files tab (separate) | Different task = different mental model; don't merge with Discovery |
| Material Family configurator | Core UX innovation — config-driven, not code-driven |
| AI never auto-selects regulatory | Non-negotiable guardrail — AI suggests, broker confirms |
| Rules engine for gap analysis | No hallucination, instant, auditable — LLM supplements, doesn't replace |
| Hybrid AI (rules + LLM) | Best of both: deterministic for known patterns, LLM for novel situations |
| EvidenceNode append-only | Audit trail for compliance; foundation for Material Passport |
| CorrectionEvent (optional, not blocking) | Zero-friction training data capture |

---

## 10. Field Agent Step-by-Step Flow

How a real deal moves through Discovery, from first contact to passport-ready:

### Step 1: Deal Capture (Day 1)
**Trigger:** Broker gets a call/email about waste material.
**Action:** Creates project. Pastes notes from the call into Capture tab (the primary entry path).
**System:** AI analyzes notes → generates suggestions in the Suggest tab.

```
Broker enters: "Got a call from John at Meridian. They have spent acetone
from degreasing, about 20 drums a month. It's production critical —
they can't let it build up. John mentioned they have an old SDS."

→ AI suggests: material_family = "Solvents" (90%)
→ AI suggests: generating_process = "Degreasing operations" (85%)
→ AI suggests: volume = "20 drums/month" (92%)
→ AI suggests: production_critical = "Yes" (88%)
→ AI flags: "Old SDS" → note about freshness concern in Docs tab
```

Sidebar auto-switches to Suggest tab (badge: 4 new).

### Step 2: Material Type Configuration (Day 1)
**Trigger:** Broker applies AI suggestion for material_family = "Solvents".
**System:** 6 solvent-specific questions appear.
**Toast (8s):** "Solvents: water content and flash point drive the price. Those questions are now added."
**Dimension Map:** Identity starts filling; other dimensions show `—`.

### Step 3: Document Upload (Day 1-3)
**Trigger:** Broker receives SDS from facility, uploads via Capture tab or Files tab.
**System:** AI processes document → generates 8-12 suggestions across dimensions.
**Sidebar:** Suggest tab badge updates. Suggestions grouped by dimension with "Apply all" per group.
**Evidence attribution:** Each applied suggestion creates an `EvidenceNode` with source document + page.

### Step 4: Gap Identification (Day 3-5)
**System:** Rules engine runs continuously as fields fill:
- "Water content not tested — buyers need this for solvent recycling."
- "Flash point below 140°F from SDS — verify, this triggers D001."
- "Chlorinated status unknown — this changes the RCRA listing entirely."

**Gaps tab fills with actionable cards.** Auto-blockers start appearing at 72h for empty required fields.

### Step 5: Regulatory Classification (Day 3-7)
**Trigger:** Enough identity + evidence data for classification attempt.
**System:** Regulatory field shows "Not yet determined" with AI insight:
> "Based on generating process 'degreasing' and composition (acetone/toluene), this is likely spent solvent waste. Suggest RCRA F001 or F002 depending on chlorinated status."

**Broker selects "Waste"** → RCRA fields appear, DOT fields appear.
**One-line summary:** "Waste means: manifest + permitted facility + DOT hazmat."
**Rules fire:** "Chlorinated status still unknown — critical for F001 vs F002."

### Step 6: Follow-up & Resolution (Day 5-14)
**Trigger:** Broker needs to chase missing information.
**Action:** Clicks "What to send them" on blocker card.
**System:** LLM generates professional email to facility contact requesting water content analysis and chlorinated confirmation.
**As responses come in:** Broker updates fields → blockers auto-resolve → Dimension Map pills turn green.

**CorrectionEvent example:** Senior reviews broker's work, changes flash_point from "58°C" (from old SDS) to "estimated -20°C" (based on spent solvent knowledge). Prompt appears: "Changed from AI suggestion. Quick note why?" → Senior writes: "SDS is virgin acetone. Spent blend flash point is much lower due to toluene."

### Step 7: Ready State (Day 7-21)
**Trigger:** All 10 required core fields + 50% visible fields filled.
**System:** Green banner: "Ready to run a passport. Review 2 AI suggestions first?"
**Broker reviews:** Checks Dimension Map for any remaining ⚡ or ⚠ indicators.
**Action:** Clicks "Generate" → system reads all Discovery data generically via `DynamicSection[]` → Material Passport generated.

---

## 11. Implementation Phases

### Phase 1A: Foundation (Template + Field Types + Data Model)
- Define material family → field config JSON (schema in §6.2-C)
- Add `combobox`, `tags`, `multiline` field renderers
- Define core fields template
- Define family-specific fields for top 5 families
- Auto-migration for old template
- Create `EvidenceNode` table (separate, append-only)
- Create `CorrectionEvent` table
- Wire EvidenceNode creation on IntakeSuggestion acceptance + manual field edit

### Phase 1B: Discovery Tab UI
- Rename tabs: 3-tab structure (Discovery | Files | Material Passport)
- Remove Overview tab; absorb content into project header
- Build Dimension Map strip with hybrid status vocabulary
- Update accordion headers (icon + progress + ✦ chip separate from expand)
- Material Family empty state (notes-first) → configured state transition
- Inline field hints (muted italic guidance text)
- Readiness banner
- 2-col grid within sections
- Dismissed items tray per section (§3.14)

### Phase 1C: Regulatory UX
- Segmented control component (Waste / Product / By-product — 3 buttons)
- "Not yet determined" default state with guidance text
- Contextual insight (one sentence + expandable detail)
- Conditional field visibility
- AI classification suggestion (suggests, never auto-selects)
- Compliance rules engine (~15-20 rules, JSON config)

### Phase 1D: Sidebar Restructure
- 4 internal tabs: Capture, Suggestions, Gaps, Docs
- Tab badges with counts
- Capture tab: voice note button, camera shortcut, text notes, upload
- Suggestions: grouped by dimension with "Apply all [dimension]"
- Apply-all conflict resolution (apply non-conflicting, surface conflicts individually)
- Gaps: blocker cards with "What to send them" as primary action
- Docs: evidence status semaphore + lab guidance (test + cost + recommended)

### Phase 1E: AI Updates
- Extraction prompts per document category
- Notes analysis for new fields + surprise data detection
- Source attribution on AI-populated fields (via EvidenceNode)
- AI-suggested ghost fields with dismissed items recovery
- LLM contextual questions (fallback to rules-only on failure)
- Draft follow-up email generation
- CorrectionEvent capture UI (optional prompt on senior override)

### Phase 1F: Intelligence Layer
- Smart Gap Analysis rules engine (~30-40 rules, JSON config)
- Regulatory compliance rules (~15-20 rules, JSON config)
- Lab decision guidance config per family
- Evidence freshness scoring (one-time pulse, then static)
- ✦ chip on accordion headers (separate from expand button)
- Blocker auto-creation at 72h
- Deal Re-Entry Card (48h threshold)

### Phase 1G: Project Header + Micro-interactions
- Sticky project header with blockers + status
- Briefing toast (8s, dismissable)
- Dimension completion animation chain (flying chip → section complete)
- State transition animations (§3.12)
- Error states for AI failures (§3.15)

### Phase 1H: Mobile
- Full-screen voice recording mode
- Camera FAB alongside intake FAB
- Horizontal-scroll Dimension Map
- Bottom drawer with sidebar 4-tab structure

### Estimated Effort

| Phase | Description | Days |
|---|---|---|
| 1A | Foundation (template + field types + data model) | 4-5 |
| 1B | Discovery Tab UI + Dimension Map | 4-5 |
| 1C | Regulatory UX | 3-4 |
| 1D | Sidebar restructure (4 tabs + apply-all) | 3-4 |
| 1E | AI updates (extraction + LLM + ghost fields) | 3-4 |
| 1F | Intelligence layer (rules + blockers + re-entry) | 3-4 |
| 1G | Header + micro-interactions + error states | 2-3 |
| 1H | Mobile (voice + camera + responsive) | 2-3 |
| | **Total** | **24-32 days** |

---

## 12. Reconciliation with Broader Vision

This Discovery redesign is Phase 1 within the larger SecondStream vision. How the pieces connect:

| This Plan (Phase 1) | Broader Vision (Phase 2+) |
|---|---|
| `EvidenceNode` table | → Becomes the Evidence Graph powering Material Passport |
| `CorrectionEvent` table | → Training data for AI model improvement per material family |
| Material Family JSON configs | → Expand to 15-20+ families over time |
| Rules engine (~55 rules, JSON) | → Grows into full Compliance Copilot with regulatory database |
| LLM contextual questions | → Evolves into full AI Copilot with deal history context |
| Blocker tracking | → Feeds into Deal Board lifecycle view |
| Regulatory classification | → Connects to automated compliance gate before passports |
| Evidence freshness scoring | → Feeds into Pricing Intelligence (stale data = pricing risk) |
| Material Passport tab | → Becomes the shareable document for buyers/facilities |
| Offline queue (Phase 2) | → Full offline-first mobile experience for field agents |

**Key principle:** Everything built in Phase 1 is a primitive that Phase 2+ builds on. No throwaway code.

---

## 13. Open Questions

1. **Material family list:** What are the top 10-15 families to support at launch? Need Russ input.
2. **Voice integration:** Connect to existing `voice-interview` in Phase 1 or defer?
3. **Blocker notifications:** Email/Slack reminders for aged blockers in Phase 1 or Phase 2?
4. **Rules source:** Session with Russ for the ~55 rules (gap analysis + compliance)?
5. **Migration:** Auto-migrate old projects or new template for new projects only?
6. **Ghost field limits:** Max AI-suggested fields per section to avoid noise?
7. **LLM model for questions/drafts:** Same model as document extraction or separate, cheaper model?
8. **Regulatory rules accuracy:** Compliance rules need legal review before shipping — who validates?
9. **Deal Re-Entry Card data:** Track `last_section_edited` per project — confirm this is lightweight enough.
10. **Apply-all UX:** After batch-applying 4 suggestions, should flying chips animate one-by-one (satisfying but slow) or all at once (fast but less delightful)?
