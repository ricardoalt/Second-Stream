# Discovery Phase — Analysis, Design & Implementation Plan

**Date:** 2026-03-04
**Status:** Draft — awaiting review
**Scope:** Phase 1 Discovery (field agent data capture)
**Builds on:** `discovery-ux-design.md`, `2026-03-03-waste-deal-os-full-product-design.md`

---

## 1. Problem Analysis: Why Discovery Is the Bottleneck

### 1.1 What Russ told us (interview synthesis)

The core business is NOT the proposal — it's converting an ambiguous material into a compliant, profitable movement. The proposal itself is "8 lines." The hard part is discovery.

**Top blockers in order of severity:**

| # | Blocker | Quote / Evidence | Impact |
|---|---------|-----------------|--------|
| P0 | **Missing info freezes pipeline** | "Everything is waiting for something" | Deals sit for weeks; no visibility into what's blocking |
| P0 | **Tribal knowledge for discovery & pricing** | "No encyclopedia exists"; pricing = IP in Steve's head | Cannot scale; single-point-of-failure on veterans |
| P1 | **Material names are useless** | Client codes like "5850", "B980" mean nothing | Misclassification risk; wrong regulatory path |
| P1 | **Regulatory status is multi-dimensional** | Same substance: NOT hazwaste as product, YES as discarded | Requires composition + process + legal status + exit route |
| P1 | **Lab decision is non-trivial** | $1,500 full panel vs $150 targeted; often unnecessary | Wasted money or delays from wrong test |
| P1 | **EHS contacts have variable knowledge** | Some know regs, others are "bean counters" | Answers depend on EHS asking someone else → more delays |
| P2 | **Hidden costs in invoices** | "Like a phone bill — fees and extra lines" | Can't price competitively without knowing true cost |
| P2 | **Production criticality = surprise variable** | BMW glycol: "if it doesn't move, production stops" | Changes entire solution design (redundancy, SLA, pricing) |
| P2 | **Deadlines are surprise data** | "VP visit March 15" drops late in the conversation | Missed deadlines = lost deals + reputation damage |

### 1.2 How these blockers map to our current system

| Blocker | Current System | Gap |
|---------|---------------|-----|
| Missing info freezes pipeline | No "what's missing" visibility; generic % bar | Need per-dimension progress + explicit gap list |
| Material names useless | Single "project name" field | Need `material_family` + `generating_process` as primary identifiers |
| Regulatory multi-dimensional | No regulatory fields at all | Need `regulatory_status`, `rcra_details`, `dot_classification` |
| Lab decision non-trivial | No lab-related fields | Need `lab_analysis_status`, `lab_details`, freshness tracking |
| Hidden costs | No cost capture fields | Need `stated_cost`, `invoice_breakdown`, `effective_cost_notes` |
| Production criticality | Not captured | Need `production_critical`, `urgency`, `specific_deadline` |
| Tribal knowledge | Not systematized | Need structured fields that encode what experts ask + pricing history (Phase 2) |

### 1.3 What our current system looks like

**Backend:** Projects store `project_data` as JSONB with `DynamicSection[]`. Each section has fields with `id`, `label`, `value`, `unit`, `type`, `source`. The IntakeSuggestion model maps AI extractions to `section_id` + `field_id`. This architecture is already flexible enough — no schema migration needed.

**Frontend:** Tab called "Questionnaire" with ~16 generic fields in 2 sections. Intake Panel on the right with notes, file upload, and AI suggestions. Progress is a single bar ("5 of 16 fields"). The accordion + suggestion flow already works.

**Key insight: The existing architecture supports everything we need.** The change is in the template (what sections/fields exist), the progress visualization, and the AI extraction prompts. No new database tables required.

---

## 2. What Changes (and What Doesn't)

### 2.1 What stays the same

| Component | Why it stays |
|-----------|-------------|
| `project_data` JSONB with `DynamicSection[]` | Already flexible; 6 new sections just means a new template |
| `IntakeSuggestion` model | Already maps to `section_id` + `field_id` with confidence + evidence |
| `IntakeNote` model | Free-form notes → AI analysis → suggestions pipeline works |
| `IntakePanel` component | Notes + Upload + Suggestions UX is solid; just gets new field targets |
| File upload + processing pipeline | Works as-is; AI extraction just needs updated prompts |
| Autosave (debounce + PATCH) | Same mechanism, more fields |
| Proposal generation | Reads `technical_sections` generically; works with any section structure |

### 2.2 What changes

| Change | From | To | Effort |
|--------|------|-----|--------|
| **Template** | 2 sections, 16 fields | 6 sections, 47 fields | Medium — define template + migration |
| **Tab name** | "Questionnaire" | "Discovery" | Trivial — rename in UI |
| **Progress visualization** | Single bar: "5/16 fields" | 6 dimension cards + overall %; per-section accordion headers | Medium — new components |
| **Section layout** | Flat form | Accordion with expand/collapse, 2-col grid within | Medium — refactor form layout |
| **Overview tab** | Single % + "Continue Questionnaire" | 6-dimension breakdown + "Continue Discovery" | Small — update overview component |
| **Header** | "Questionnaire Progress" | "Discovery Progress" with new total | Small — update header component |
| **Alert banner** | None inside technical tab | Threshold banner showing top gaps with links | Small — new component |
| **AI extraction prompt** | Maps to old 16 field IDs | Maps to new 47 field IDs across 6 sections | Medium — update AI agent prompts |
| **Field types** | Mostly text/number | Add: combobox, tags (multi-select), multiline text | Medium — extend field renderer |

---

## 3. The 6 Discovery Dimensions (Field Specification)

These come directly from what Russ described as the "multi-dimensional matrix" of discovery. Each dimension targets a specific class of pain points.

### Why 6 dimensions (not 2, not 20)

Russ's interview reveals that discovery requires answering 6 questions simultaneously:
1. **What is it?** (Identity) — beyond the useless client name
2. **Can you prove it?** (Evidence) — documentation freshness and reliability
3. **How much, how often?** (Volume) — viability of logistics and pricing
4. **Is it legal to move?** (Regulatory) — waste vs product, RCRA, DOT, state rules
5. **What does it really cost?** (Economics) — hidden fees, true baseline
6. **What does the client need?** (Priorities) — deadline surprises, production criticality

These 6 map 1:1 to the sections defined in `discovery-ux-design.md`. See that document for the complete field specification (47 fields, 11 required).

### Summary table

| # | Section | Fields | Required | Primary Pain Point |
|---|---------|--------|----------|-------------------|
| 1 | Material Identity | 8 | 4 | "Name never tells you anything" |
| 2 | Evidence & Documentation | 9 | 0 | "Old docs are useless; SDS virgin ≠ spent" |
| 3 | Volume & Logistics | 8 | 3 | "Volume + recurrence + storage = viability" |
| 4 | Regulatory & Compliance | 6 | 1 | "Same substance can be waste or product" |
| 5 | Cost & Economics | 7 | 0 | "Invoice is like a phone bill — hidden fees" |
| 6 | Client Priorities & Constraints | 9 | 3 | "Criticality and deadlines are surprise data" |
| | **Total** | **47** | **11** | |

### Field type additions needed

The current `DynamicField` supports `type: "string" | "number"`. We need:

| New type | Used for | Behavior |
|----------|---------|----------|
| `combobox` | `material_family`, `physical_state`, `regulatory_status`, etc. | Dropdown with predefined options + free text "Other" |
| `tags` | `form_packaging`, `client_goals`, `current_storage`, etc. | Multi-select chips; user picks multiple |
| `multiline` | `generating_process`, `invoice_breakdown`, etc. | Textarea (already supported but needs explicit rendering) |

These are **UI rendering types** — they don't change the data model. The field `value` stays a string (or string[] serialized for tags). The `type` field in `DynamicField` just tells the frontend which input component to render.

---

## 4. UI/UX Design — The Discovery Experience

### 4.1 Layout overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Project Header                                                       │
│  Discovery Progress  28/47 fields  ████████████░░░░░░░░░░  60%       │
├──────────┬─────────────┬─────────┬────────────┐                      │
│ Overview │  Discovery  │  Files  │ Proposals  │                      │
├──────────┴─────────────┴─────────┴────────────┴──────────────────────┤
│                                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────┐│
│  │Identity │ │Evidence │ │ Volume  │ │Regulat. │ │  Cost   │ │Pri.││
│  │  80%    │ │  38%    │ │ 100% ✓  │ │   0%    │ │  17%    │ │60% ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────┘│
│                                                                       │
│  ┌────────────────────────────────┬──────────────────────────────────┐│
│  │   Accordion Sections (65%)    │    AI Intake Panel (35%)         ││
│  │                                │                                  ││
│  │  ▼ Material Identity    80%   │    [Notes] [Upload] [Suggestions]││
│  │    (fields in 2-col grid)     │                                  ││
│  │                                │    "Called EHS, they said..."    ││
│  │  ▶ Evidence & Docs      38%   │    [Analyze Notes]               ││
│  │  ▶ Volume & Logistics  100% ✓ │                                  ││
│  │  ▶ Regulatory            0%   │    AI Suggestions (3 pending)    ││
│  │  ▶ Cost & Economics     17%   │    ┌─── SDS → material_family ──┐││
│  │  ▶ Client Priorities    60%   │    │  "Solvents"  95%  [Apply] │││
│  │                                │    └────────────────────────────┘││
│  └────────────────────────────────┴──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Progress cards — the key innovation

**Why cards matter:** Russ said "everything is waiting for something." The cards answer "what dimensions of this deal do we understand, and what's still a black box?" at a glance.

```
┌───────────────┐     States:
│  🧪 Identity  │     ─── 0% : grey border, muted text
│               │     ─── 1-49% : amber border (red if required fields empty)
│  ████████░░   │     ─── 50-79% : amber border
│    80%        │     ─── 80-99% : green border
│   6 of 8      │     ─── 100% : green bg + ✓
└───────────────┘
```

**Interaction:** Click card → smooth scroll to that accordion section + auto-expand.

**Responsive:** 6 inline on desktop → 2x3 grid on tablet → horizontal scroll on mobile.

### 4.3 Accordion sections

Each section has:
- **Header:** icon + title + description + completion % bar + field count
- **Collapsed state:** shows header + "⚠ N required fields empty" if applicable
- **Expanded state:** fields in 2-column grid (single column for `multiline` and `tags` types)
- **Section notes:** each section has an `additional_notes` multiline field at the bottom

### 4.4 Threshold and readiness

**Current:** 30% overall → can generate proposal.
**New:** All 11 required fields filled + 50% overall → can generate proposal.

Rationale: With 47 fields, 50% = ~24 fields filled. The 11 required fields ensure we have the minimum information (material family, generating process, physical state, packaging, volume, recurrence, regulatory status, production criticality, urgency, client goals). Everything else enriches the proposal but isn't blocking.

**Banner states:**
- Below threshold: amber banner listing top gaps by dimension with "Go to [Section]" links
- Above threshold: green banner with "Generate Proposal" CTA
- Always visible at top of Discovery tab

### 4.5 Mobile experience

On mobile, the Intake Panel is NOT side-by-side. It's accessed via a FAB (floating action button) that opens a bottom drawer.

- FAB shows pending suggestion count as badge
- Pulse animation when new suggestions arrive
- Bottom drawer has tabs: Notes | Upload | Suggestions
- Fields render single-column

(See `discovery-ux-design.md` for detailed mobile wireframes.)

### 4.6 Overview tab changes

The Overview tab currently shows 4 metric cards (Data Complete %, Proposals, Client, Location) and a "Next Step" card.

**Changes:**
- "Data Complete" card → "Discovery Progress" card (same %, new name)
- Add a "Discovery Dimensions" breakdown below the metric cards:

```
Discovery Dimensions:
  Identity    ████████░░  80%
  Evidence    ████░░░░░░  38%   ← needs attention
  Volume      ██████████  100% ✓
  Regulatory  ░░░░░░░░░░  0%   ← empty
  Cost        ██░░░░░░░░  17%
  Priorities  ██████░░░░  60%

  [Continue Discovery →]
```

- "Next Step" card: threshold logic changes to match new readiness formula

---

## 5. AI Functions in Discovery

### 5.1 What exists today (keep + enhance)

#### A. Document Extraction (File → Suggestions)
**How it works:** User uploads SDS/waste profile/invoice/lab report → AI parses → generates `IntakeSuggestion` records mapped to `section_id` + `field_id`.

**What changes:** The extraction prompt must know about the new 47 fields across 6 sections. The AI needs a mapping guide:
- SDS → `material_family`, `main_composition`, `physical_state`, `dot_classification`, `sds_status`
- Waste profile → `regulatory_status`, `rcra_details`, `generating_process`, `volume_quantity`
- Invoice → `current_handler`, `stated_cost`, `cost_unit`, `invoice_breakdown`
- Lab report → `lab_analysis_status`, `lab_details`, `main_composition`, contamination data
- Photos → `physical_state`, `form_packaging`, `current_storage`

**Key design principle:** The prompt must be specific per document type. A generic "extract everything" prompt produces low-confidence garbage. Instead:
```
If file category = "SDS": focus on composition, hazards, physical properties, DOT classification
If file category = "Invoice": focus on handler, line items, fees, effective cost
If file category = "Lab Report": focus on composition, contaminants, test date, test type
```

#### B. Notes Analysis (Text → Suggestions)
**How it works:** User writes free-form notes in the Intake Panel → clicks "Analyze Notes" → AI parses → generates `IntakeSuggestion` records.

**What changes:** Same as above — prompt must know the new 47 fields. Notes are often conversational ("Called EHS, they said it's acetone, about 20 drums a month, very urgent"). The AI needs to extract structured data from unstructured conversation notes.

### 5.2 What's new for Discovery

#### C. Smart Gap Analysis (NEW)
**What:** After the user fills some fields, the system identifies not just "what's empty" but "what you should ask next and why."

**How it works:**
1. When discovery is 20-70% complete, show contextual prompts per empty required field
2. Prompts are rules-based (not AI), e.g.:
   - If `material_family` = "Solvents" AND `lab_analysis_status` is empty → "For solvents, buyers typically require water content analysis. Has the facility done any lab testing?"
   - If `production_critical` = "Yes" AND `urgency` is empty → "Since this is production-critical, what's the deadline before it disrupts operations?"
   - If `regulatory_status` = "Unknown" AND `generating_process` is filled → "Based on the generating process, an expert should determine if this is RCRA-listed waste"

**Why this matters (from Russ):** "AI impacts when it returns questions you didn't know to ask." This is the "Material Discovery Copilot" from the interview insights.

**Implementation:** Rules engine, not AI. A JSON configuration of `if field X has value Y, and field Z is empty, suggest question Q`. This is deterministic, auditable, and doesn't hallucinate.

#### D. Evidence Freshness Scoring (NEW)
**What:** Visual indicators on documentation fields showing data reliability.

**How it works:**
- When `lab_analysis_status` = "Old (1-3yr)" → amber warning: "Buyer may require recent analysis"
- When `lab_analysis_status` = "Very old (>3yr)" → red warning: "Analysis likely unusable for most buyers"
- When `sds_status` = "Available (outdated, >2yr)" → amber: "SDS may not reflect current composition"
- When `sds_type` = "Virgin material SDS" → info: "Virgin SDS may not match spent/waste characteristics"

**Why this matters (from Russ):** "Docs from 2-5 years ago are useless." Russ explicitly described needing a "traffic light" for document freshness — green/amber/red semaphore.

**Implementation:** Pure frontend logic based on field values. No AI needed. Color-coded badges next to the Evidence & Documentation fields.

#### E. Cost Normalization Helper (Phase 1.5)
**What:** When the user enters invoice breakdown, the system calculates effective cost per unit.

**Example:**
```
User enters:
  stated_cost: "$0.72/lb"
  invoice_breakdown: "Base: $0.72/lb, Fuel surcharge: $0.08/lb, Env fee: $0.05/lb, Admin: $25/pickup"

System calculates and shows:
  "Effective cost: ~$0.88/lb (assuming 2,000 lb/pickup)"
  "22% higher than stated cost"
```

**Why this matters (from Russ):** "Like a phone bill — fees and extra lines." The client says "$0.72/lb" but the real cost is $0.88/lb. Knowing the real cost gives the broker pricing advantage.

**Implementation:** Phase 1.5. Requires structured invoice input (not just text). Can be a calculated field that shows when both `stated_cost` and `invoice_breakdown` are filled.

---

## 6. User Flow — Complete Walkthrough

### 6.1 Creating a new waste stream

```
User is on Location detail page
  → Clicks "New Waste Stream"
  → Dialog: Name + Description (optional)
  → Creates project with 6-section template at 0%
  → Redirects to Discovery tab
```

No change to creation flow. The template is applied server-side when creating the project (or client-side on first load if `project_data.technical_sections` is empty).

### 6.2 Day 1: Lead arrives (typical scenario)

```
1. Broker creates "Spent Solvent - Line 3" in ACME Houston location
2. Discovery tab opens → 6 empty sections, 0% overall
3. Broker expands "Material Identity", fills what they know:
   → material_family: Solvents
   → generating_process: "Parts cleaning in mfg line 3"
   → physical_state: Liquid
   → form_packaging: [Drums]
   = Identity: 50% (4/8)

4. Broker writes in Intake Notes:
   "Called EHS. Acetone/MEK blend, ~15% water.
    20 drums/month. Paying $0.85/lb to Clean Harbors.
    Critical for production — VP visit in 2 weeks."

5. Clicks "Analyze Notes" → AI extracts 8 suggestions:
   → main_composition: "Acetone/MEK blend, ~15% water"
   → contamination: "~15% water content"
   → volume_quantity: "20"
   → volume_unit: "drums/month"
   → recurrence: "Monthly"
   → stated_cost: "$0.85"
   → cost_unit: "¢/lb"
   → production_critical: "Yes — stops production"
   → urgency: "Urgent (1-4 weeks)"
   → specific_deadline: "VP visit in ~2 weeks"

6. Broker reviews suggestions in Intake Panel → applies 8 of 10
   → Progress jumps: Identity 75%, Volume 38%, Cost 14%, Priorities 33%
   → Overall: ~32%
   → Gap banner: "Top gaps: Regulatory (0%), Evidence (0%), Cost (14%)"
```

### 6.3 Day 2: Documents arrive

```
7. EHS sends SDS by email. Broker uploads via Quick Upload → category: SDS
8. AI processes SDS → 5 new suggestions:
   → sds_status: "Available (current)"
   → sds_type: "Virgin material SDS"  ← freshness scoring shows info badge
   → dot_classification: "Flammable Liquid, Class 3, UN1993"
   → regulatory_status: "Probable hazardous waste (based on SDS composition)"
   → physical_state: "Liquid" (confirms existing value)

9. Broker applies suggestions → Evidence 22%, Regulatory 33%

10. Smart Gap Analysis triggers:
    → "For solvents with water contamination, buyers typically require
       water content analysis. Consider requesting from facility."
    → "SDS is virgin material — spent characteristics may differ.
       Waste profile recommended for accurate classification."
    → "Regulatory status flagged as 'probable hazardous' — confirm with
       RCRA determination for your state."

11. Broker manually fills:
    → client_goals: [Reduce disposal cost, Reduce liability]
    → ehs_capability: "Competent"
    → no_export_policy: "No restriction"

12. Overall: ~55%
```

### 6.4 Day 5: Final push

```
13. Broker gets invoice from Clean Harbors, uploads it
14. AI extracts:
    → current_handler: "Clean Harbors"
    → invoice_breakdown: "Base $0.72/lb + Fuel $0.08/lb + Env $0.05/lb"
    → (Cost normalization shows: "Effective: ~$0.85/lb — matches stated cost")

15. Broker fills remaining gaps:
    → waste_profile_status: "Requested"
    → manifest_history: "Available"
    → density_known: "~7.2 lbs/gal"
    → current_storage: [Hazmat storage, Covered area]
    → loading_capability: [Forklift, Loading dock]

16. All 11 required fields ✓ + Overall: 72%
    → Green banner: "Discovery ready! Generate Proposal"

17. Broker generates proposal → AI has 34 structured data points to work with
    (vs 5-8 with the old 16-field questionnaire)
```

---

## 7. Implementation Plan

### 7.1 Approach: Template swap + progressive UI enhancements

Since the architecture already supports dynamic sections, the core change is:
1. Define the new 6-section template
2. Update the field renderer to handle new types (combobox, tags)
3. Add progress cards component
4. Update accordion headers with completion indicators
5. Update AI extraction prompts
6. Update Overview tab

### 7.2 Work breakdown

#### Phase 1A: Template + Field Types (foundation)

**Backend:**
- [ ] Define the 6-section template as a Python constant/config
- [ ] Add migration utility: when a project has the old template, offer to migrate (or auto-migrate if no data)
- [ ] Update `FlexibleWaterProjectData.to_ai_prompt_format()` and `to_ai_context()` to handle new field types
- [ ] Update AI extraction prompts (file analysis + notes analysis) with new field mappings

**Frontend:**
- [ ] Add `combobox` field renderer (dropdown with predefined options + "Other" free text)
- [ ] Add `tags` field renderer (multi-select chips)
- [ ] Ensure `multiline` renders as textarea with proper sizing
- [ ] Update template constant used when creating new projects

**Effort:** ~3-4 days

#### Phase 1B: Discovery Tab UI (the visible change)

**Frontend:**
- [ ] Rename tab: "Questionnaire" → "Discovery" (in `project-tabs.tsx`)
- [ ] Build `DiscoveryProgressCards` component (6 cards with completion %, click-to-scroll)
- [ ] Update accordion section headers to show: icon + title + description + completion % + field count + required warning
- [ ] Add threshold banner component (below cards, above accordion):
  - Amber: "Discovery at X% — need [threshold] for proposal. Top gaps: [links]"
  - Green: "Discovery ready! [Generate Proposal]"
- [ ] Update `project-header.tsx`: "Discovery Progress" label + new total
- [ ] 2-column grid within expanded sections (full-width for multiline/tags)

**Effort:** ~4-5 days

#### Phase 1C: Overview Tab + Header Updates

**Frontend:**
- [ ] Update Overview tab: replace single % with 6-dimension breakdown + "Continue Discovery" CTA
- [ ] Update progress indicator in header
- [ ] Update proposal readiness logic: all 11 required fields + 50% overall

**Effort:** ~1-2 days

#### Phase 1D: AI Prompt Updates

**Backend:**
- [ ] Update file analysis prompt: per-category extraction targeting new 47 fields
- [ ] Update notes analysis prompt: extract from conversational text to new fields
- [ ] Test extraction quality with sample SDS, invoice, waste profile, lab report
- [ ] Ensure suggestions map correctly to new `section_id` + `field_id`

**Effort:** ~2-3 days

#### Phase 1E: Smart Gap Analysis (rules engine)

**Backend or Frontend:**
- [ ] Define rules config: `{condition: {field, value}, target_field, message}`
- [ ] ~20-30 rules covering common scenarios (solvents, metals, plastics, hazwaste, etc.)
- [ ] Surface as contextual hints within section fields or as a summary in the gap banner

**Effort:** ~2-3 days

#### Phase 1F: Evidence Freshness Scoring

**Frontend:**
- [ ] Color-coded badges on Evidence & Documentation fields based on values
- [ ] Warning messages for old/outdated docs
- [ ] Info messages for virgin vs spent SDS distinction

**Effort:** ~1 day

### 7.3 Total estimated effort

| Phase | Description | Days |
|-------|-------------|------|
| 1A | Template + Field Types | 3-4 |
| 1B | Discovery Tab UI | 4-5 |
| 1C | Overview + Header | 1-2 |
| 1D | AI Prompt Updates | 2-3 |
| 1E | Smart Gap Analysis | 2-3 |
| 1F | Evidence Freshness | 1 |
| | **Total** | **13-18 days** |

### 7.4 Migration strategy for existing projects

Options:
1. **Auto-migrate on load:** If `project_data.technical_sections` has old template (2 sections), automatically convert to 6 sections, mapping old fields to closest new fields. Best for early-stage product with few projects.
2. **Parallel templates:** Let old projects keep old template, new projects get new template. Adds complexity.

**Recommendation:** Option 1 (auto-migrate). We're early-stage, no production users. Map whatever fields exist to the new sections, leave the rest empty.

---

## 8. How Discovery Changes the Proposal Quality

### Before (16 generic fields)
The AI proposal agent receives:
- Project name, sector, location
- Maybe a description
- A few technical fields (generic)
- Uploaded file text

Result: Generic proposals that veterans dismissed as "things I already know."

### After (47 structured fields across 6 dimensions)
The AI proposal agent receives:
- **Identity:** Material family, composition, generating process, physical state, packaging, contamination
- **Evidence:** What documentation exists, how fresh it is, gaps identified
- **Volume:** Quantity, frequency, storage, loading capability
- **Regulatory:** Classification, RCRA codes, DOT class, state requirements, export status
- **Cost:** Current handler, stated cost, invoice breakdown, effective cost, contracts
- **Priorities:** Production criticality, urgency, deadlines, goals, export policy, brand concerns

Result: Proposals that address the actual deal constraints — regulatory compliance path, logistics feasibility, pricing based on real cost structure, risk assessment based on criticality and evidence gaps.

**The proposal goes from "here's what you could do with this waste" to "here's the compliant, profitable movement plan given what we know, with gaps flagged."**

---

## 9. Future Enhancements (Phase 2+, not in scope now)

These are capabilities mentioned in the interview and strategy docs that build on the discovery foundation but are NOT Phase 1:

| Enhancement | What it does | Depends on |
|-------------|-------------|------------|
| **Pricing Intelligence** | "3 similar deals in TX last year: $0.08-0.12/lb" | Outcome Ledger with historical deal data |
| **Lab Decision Engine** | "Water content test only ($150), not full panel ($1,500)" | Buyer requirements database + material-specific rules |
| **Compliance Copilot** | "Probable F003 listed waste — CA DTSC requires additional form" | Versioned regulatory rules engine |
| **Missing Info Tracker with SLA** | "Waiting 5 days for waste profile from John at ACME" | Task management per blocker |
| **Voice Interview Integration** | Record field visit → AI transcribes → auto-fills discovery | Already partially built (VoiceInterview model exists) |
| **Buyer Portal** | Buyer sees Material Passport, leaves requirements | Multi-actor workflow |
| **Outcome Ledger** | Track accept/reject/margin per deal for learning | New data model |

---

## 10. Key Design Decisions & Rationale

### Q: Why 47 fields? Won't that overwhelm the user?

**A:** The user does NOT fill 47 fields in one sitting. Discovery happens over days/weeks as information trickles in. The accordion starts collapsed except the first section. Progress cards show what's filled and what's not. AI auto-fills many fields from documents and notes. The interview showed that brokers already track this information — they just do it in their heads, in emails, and in Excel. We're structuring what they already do.

### Q: Why no new database tables?

**A:** The `project_data` JSONB with `DynamicSection[]` already supports arbitrary sections and fields. Adding new tables would mean:
- Schema migrations for every field change
- JOIN overhead for reads
- Loss of the flexibility that lets us iterate fast

The JSONB approach means we can change the template without any migration. The `IntakeSuggestion` model already maps to `section_id` + `field_id` strings — it works with any template.

### Q: Why rules-based gap analysis instead of AI?

**A:** Three reasons:
1. **Deterministic:** Same inputs always produce same suggestions. No hallucination risk.
2. **Auditable:** You can explain why each suggestion was made ("because material_family is Solvents and lab_analysis_status is empty").
3. **Fast:** No API call needed. Instant feedback.

AI is great for extracting unstructured data (documents, notes). But "what question should I ask next?" is a domain-knowledge problem that's better solved with expert-defined rules. From the deep research: "treat AI extraction as commodity input; put the moat in the rules engine."

### Q: Why not start with the full Waste Deal OS (Lab Decision Engine, Pricing Intelligence, etc.)?

**A:** Discovery is the bottleneck. Russ was explicit: "The proposal is trivial; the discovery is the business." If we improve discovery, we unlock everything downstream. The Lab Decision Engine needs buyer requirement data we don't have yet. Pricing Intelligence needs historical outcome data. The Compliance Copilot needs a versioned rules database. All of those are Phase 2+ and depend on the structured discovery data we're building now.

**Build the foundation first. The intelligence layers compound on top of it.**

---

## 11. Open Questions

1. **Threshold formula:** Should we use "all 11 required + 50% overall" or "all 11 required + N fields per section"? The per-section approach ensures no dimension is completely blank, but is more complex.

2. **Template migration:** For existing projects with data in the old 2-section template, should we auto-map fields or start fresh? Some fields may have data that maps to multiple new sections.

3. **Voice interview integration:** The `VoiceInterview` model and bulk import pipeline already exist. Should we integrate voice → discovery auto-fill in Phase 1 or defer?

4. **AI extraction granularity:** Should file analysis generate suggestions for ALL detected fields, or only fields relevant to the file's category (SDS → identity/regulatory, Invoice → cost)?

5. **Smart Gap Analysis rules:** Who defines the initial rule set? Should we interview Russ specifically about "what questions do you ask per material family" to build the rules?
