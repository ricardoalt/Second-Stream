# Waste Deal OS — Full Product Design & Strategy

**Date:** 2026-03-03
**Status:** Draft
**Supersedes:** `2026-03-02-waste-deal-os-product-pivot.md` (expands and deepens all sections)

**Naming note:** "Waste Deal OS" is a working name for this doc set; the team also discussed "Stream Asset Reclassification" as a potential external name.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why the Original Value Prop Failed](#2-why-the-original-value-prop-failed)
3. [The New Thesis](#3-the-new-thesis)
4. [Product Vision: Waste Deal OS](#4-product-vision-waste-deal-os)
5. [The Two Central Artifacts](#5-the-two-central-artifacts) (Discovery Pack, Evidence Graph, e-Manifest Mapping, Data Governance)
6. [Deal Workspace: The 4 AI Engines](#6-deal-workspace-the-4-ai-engines)
7. [Material Passport: The Exportable Artifact](#7-material-passport-the-exportable-artifact)
8. [Lab Decision Engine](#8-lab-decision-engine)
9. [Review Gate Workflow](#9-review-gate-workflow)
9b. [Outcome Ledger](#9b-outcome-ledger-mandatory-from-day-one)
9c. [Evaluation & Observability Layer](#9c-evaluation--observability-layer)
10. [Technical Mapping: Reuse vs. Build](#10-technical-mapping-reuse-vs-build)
11. [Phased Rollout Strategy](#11-phased-rollout-strategy)
12. [Moat & Defensibility Strategy](#12-moat--defensibility-strategy) (Commoditization Risk Assessment)
13. [Industry Context & Competitive Landscape](#13-industry-context--competitive-landscape) (Regulatory Timeline, Funded Startups)
14. [North Star Metrics](#14-north-star-metrics)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Open Questions](#16-open-questions)

---

## 1. Executive Summary

**What we're building:** A vertical AI operating system for waste brokerage that captures the entire deal lifecycle — from the moment a field agent visits a facility to the moment a buyer accepts the material.

**What we're NOT building:** A generator of business ideas. Not a CRM. Not a marketplace (yet). Not a generic copilot that ChatGPT could replace.

**Core thesis:** "AI doesn't invent — it structures, enriches, accelerates, and learns from the expert's work."

**The two artifacts:**
- **Deal Workspace** — the daily experience. An intelligent workspace per deal where 4 AI engines actively help: extracting data from documents, tracking missing information, suggesting pricing from history, and flagging compliance issues.
- **Material Passport** — the exportable artifact. A buyer-ready professional dossier that assembles progressively as the agent works, not from a magic "generate" button. Internally, the same data exists as a richer **Discovery Pack** view (handoff to seniors) before anything is shared externally.

**Critical strategic insight (from industry research, March 2026):**
AI extraction (documents, images, voice) is commoditizing fast — ChatGPT, Claude, and Gemini will match generic extraction quality within 12-18 months. AI extraction is our **wedge** (how we get in the door), NOT our moat. The moat is built on layers that cannot be replicated by foundation models:
1. **Proprietary outcome data** — pricing, rejection rates, margin by material/region/buyer
2. **Versioned compliance rules** — tuned per org, per state, per material family, with expert corrections
3. **Multi-actor workflow with auditable gates** — review approvals, buyer QA, chain-of-custody
4. **Evidence graph with trazability** — every data point linked to its source document, page, date, and validator

**Why this wins:**
- No competitor in waste brokerage has AI-powered evidence capture (cieTrade, AMCS, Scrap Dragon are operations/ERP tools)
- The platform compounds value with every deal — pricing intelligence, compliance knowledge, and eventually network effects make it impossible to replace
- Regulatory tailwinds (SB253 deadline August 2026, e-Manifest expansion, EPR in 7 states) create urgency for structured waste data
- AI extraction is the entry point, but the Outcome Ledger + Compliance Rules + Evidence Graph are what make it impossible to leave

---

## 2. Why the Original Value Prop Failed

The original platform centered on an AI Proposal Agent that analyzed waste stream data and generated "business opportunity ideas" — pathways like "convert wood waste to sawdust, sell to animal bedding manufacturers at $X/ton."

**Why it was rejected by the client (Russ, 20+ years in waste brokerage):**

1. **Sales engineers already know the ideas.** A veteran with decades of experience has deeper, more nuanced knowledge of outlets, buyers, pricing, and transformations than any LLM. The AI's suggestions felt generic and shallow compared to their tribal knowledge.

2. **"Ideas" are not the bottleneck.** The hard part of waste brokerage is not figuring out what to do with a material — it's getting the information needed to actually do it. Discovery, classification, compliance, pricing, and logistics are the real bottlenecks.

3. **A copilot that just suggests ideas is replaceable.** If the value is "ask AI what to do with this waste," the user could just use ChatGPT directly. There's no moat, no switching cost, no accumulated intelligence.

4. **The proposals lacked credibility with buyers.** Buyers don't need "business ideas" — they need specifications, lab evidence, compliance documentation, and ESG metrics. A proposal saying "this could be sold as recycled HDPE" without COA, FDA NOL, or contamination data is useless.

**Key quote from Russ:** "The proposal is trivial; what's hard is converting an ambiguous material into a compliant, profitable movement without getting lost in the discovery."

---

## 3. The New Thesis

### From "AI that invents" to "AI that operates"

The platform's value is not in telling experts what they already know. It's in:

1. **Eliminating information bottlenecks** — deals freeze for days/weeks waiting for data from facility contacts. AI can extract, infer, and track what's missing.

2. **Capturing tribal knowledge into a system** — pricing, outlet preferences, classification patterns, and regulatory nuances that live in veterans' heads become queryable institutional memory.

3. **Automating the tedious** — document parsing, compliance checking, cost normalization, manifest preparation — repetitive work that consumes hours per deal.

4. **Compounding intelligence over time** — every deal closed makes the system smarter at pricing, risk assessment, and compliance for similar future deals.

### The vertical AI platform philosophy

A generic copilot (ChatGPT wrapper) is:
- Interchangeable — any competitor can build it
- Stateless — doesn't learn from your organization's history
- Disconnected — lives outside the workflow

A vertical AI OS is:
- Deeply integrated — AI is the connective tissue between data, actors, and processes
- Stateful — accumulates organizational intelligence with every deal
- Workflow-native — operates inside the deal lifecycle, not alongside it
- Infrastructure — becomes the system of record where deals live

**The progression:** Tool → System of Record → Intelligence Platform → Industry Standard.

---

## 4. Product Vision: Waste Deal OS

### What it is

An intelligent system of record for waste brokerage where AI is invisible connective tissue — not a "business advisor," but the operating system that makes every deal faster, more accurate, and more professional.

### The deal lifecycle

```
Capture → Enrich → Track → Price → Decide → Passport → Review → Share
   │         │        │       │        │         │          │        │
   │         │        │       │        │         │          │        └─ Buyer portal (Phase 2)
   │         │        │       │        │         │          └─ Senior review gate
   │         │        │       │        │         └─ Progressive assembly
   │         │        │       │        └─ Lab decision engine
   │         │        │       └─ Pricing intelligence (data moat)
   │         │        └─ Missing info tracker
   │         └─ Document/Image/Notes AI extraction
   └─ Field visit: photos, voice, documents, questionnaire
```

### Actors and their roles

| Actor | Role in Platform | Phase |
|-------|-----------------|-------|
| **Field Agent** | Captures data, works in Deal Workspace daily, generates passports | Phase 1 |
| **Senior Engineer / Manager** | Reviews passport drafts, corrects pricing/classification, approves sharing | Phase 1 |
| **AI Engines** | Extract, enrich, track, suggest — never decide | Phase 1 |
| **Buyer** | Receives passport via link, views specs/evidence/ESG, leaves requirements | Phase 2 |
| **Generator (facility)** | Submits waste stream info directly (self-service intake) | Phase 3 |
| **Compliance Officer** | Validates regulatory classifications, manages e-Manifest readiness | Phase 2 |

### What the field agent's day looks like with Waste Deal OS

**Today (without platform):**
1. Visit facility, take notes on paper/phone
2. Back at office, manually type data into Excel
3. Email EHS contact for missing info → wait days/weeks
4. Call Steve to ask "what's the going rate for spent MEK in Texas?"
5. Manually search state regulations
6. Assemble a Word doc proposal over 1-2 weeks
7. Email PDF to buyer
8. Buyer asks questions → rework

**Tomorrow (with Waste Deal OS):**
1. Visit facility, take photos (AI classifies material instantly), record voice notes (AI transcribes and extracts data), upload SDS (AI extracts composition, hazards, specs)
2. Open Deal Workspace — 60% of fields already populated by AI
3. Missing Info Tracker shows: "Need volume estimate and water content — here's a suggested email to the EHS contact"
4. Pricing Intelligence shows: "3 similar MEK deals in Texas last year: $0.08-$0.12/lb"
5. Compliance Copilot flags: "Probable F003 listed waste — California DTSC requires additional form"
6. Lab Decision Engine recommends: "Water content test only ($150), not full panel ($1,500)"
7. Engineer fills in their pathway: "Sell to solvent recycler, $0.10/lb"
8. Marks deal as "ready for review" → senior validates
9. Material Passport generated automatically → shareable link sent to buyer
10. Buyer sees professional dossier with specs, evidence, ESG metrics — no rework needed

**Time saved:** weeks → hours. **Knowledge required:** decades of experience → accessible from day one.

---

## 5. The Two Central Artifacts

### 5.1 Deal Workspace (daily experience)

The workspace is NOT a static form. It's an **active environment** where 4 AI engines work in parallel on every deal. Think of it as a project management space specifically designed for waste deal discovery.

**Core UX principles:**
- **Progressive disclosure** — don't show everything at once. Show what matters now based on where the deal is in its lifecycle.
- **AI suggestions, not AI decisions** — every AI output is a suggestion the user accepts, modifies, or rejects. The human-in-the-loop pattern (already implemented in the Intake Panel) extends to all engines.
- **Contextual intelligence** — pricing, compliance, and lab recommendations appear when relevant, not as separate modules to navigate to.
- **Deal Completeness Score always visible** — a progress bar that shows how "buyer-ready" this deal is, with actionable guidance on what's missing.

**Workspace sections:**
1. **Overview** — deal summary, completeness score, status, timeline, blockers
2. **Data Collection** — the existing questionnaire + file uploads + notes, enhanced with AI extraction
3. **Intelligence Panel** — pricing history, compliance flags, lab recommendations (contextual, appears based on data)
4. **Disposition Plan (v0)** — outlet/offtaker candidates, requirements, and status (manual in Phase 1; becomes intelligent later)
5. **Ops & Pickup Readiness (v0)** — onboarding blockers (NDA/insurance/permits), handling constraints, equipment needs, pickup readiness checklist
6. **Engineer Pathway** — where the sales engineer defines their plan (human input, not AI)
7. **Evidence Pack** — all documents with freshness indicators, confidence scores, and evidence graph links
8. **Material Passport Preview** — live preview of what the passport will look like, updates as data comes in
9. **Deal Metrics** — operational observability: time in each stage, AI suggestion acceptance rate, blockers resolved

### 5.1b Discovery Pack (internal handoff artifact)

Phase 1 is called **Discovery** for a reason: the goal is to turn "field chaos" into a structured, reviewable handoff that a senior ("Steve") can act on.

**Discovery Pack (internal) includes:**
- Structured intake fields + evidence links (Evidence Graph)
- Missing info blockers (data + compliance + ops + logistics) with owners and aging
- Criticality + deadline context (production-critical vs standard)
- Disposition Plan v0: outlet candidates + requirements + current status

**Material Passport (exportable) is a redacted, reviewed view** of the same underlying data, generated only after the Review Gate.

### 5.2 Material Passport (exportable artifact)

The passport is NOT generated from a single button press. It **assembles progressively** as the workspace fills with data. When the agent marks the deal as ready, the AI polishes the language, calculates final ESG metrics, and formats everything professionally.

**Structure (8 sections):**

#### Section 1: Material Identity
- Operational name (not the facility's internal code — Russ said those are meaningless like "5850" or "B980")
- Material family/type (solvent, acid, polymer, metal, organic, equipment, etc.)
- Process that generated it (legally critical — determines classification)
- Legal status: waste / product / under evaluation
- Photos with AI analysis (quality grade, visual condition, estimated composition)
- Source: facility name, location, industry sector

#### Section 2: Technical Specifications
- Composition (from lab reports and/or SDS, with source and date cited)
- Physical properties: density, moisture content, particle size, heat value, viscosity — whatever applies to the material type
- Packaging/form: drums, totes, bulk tanker, super sacks, pallets, individual units
- Available volume + recurrence (one-off vs weekly/monthly)
- Quality grade: High / Medium / Low (from Image Analysis Agent)
- Key spec table formatted per buyer vertical expectations (e.g., ISRI format for metals, FDA-relevant specs for food-contact plastics)

#### Section 3: Safety & Handling
- Identified hazards (from SDS extraction + image analysis)
- PPE requirements
- Storage requirements and degradation risks
- Transport classification: DOT shipping name, UN number, packing group, placard requirements
- Special handling notes (e.g., "incompatible with water — store dry")

#### Section 4: Compliance Status
- RCRA classification (suggested, with confidence level and basis)
- State-specific flags and requirements
- Document completeness for compliance: what exists vs what's still needed
- e-Manifest readiness indicator
- PFAS screening flag (if applicable under new EPA proposed rules)
- All marked as "advisory — requires compliance officer validation"

#### Section 5: Environmental Impact (calculated, not estimated)
- CO2 avoided if diverted vs. disposed (EPA WaRM factors — deterministic, not hallucinated)
- Water savings estimate
- Circularity potential score
- SDG alignment indicators
- ESG headline: a ready-to-use statement for the buyer's sustainability report
- Methodology disclosure: "Calculated using EPA WaRM v16 factors for [material category]"

#### Section 6: Engineer Pathway (human-defined)
- Action: what the broker plans to do with this material
- Target buyer type and industry
- Transformation/processing needed before sale
- Estimated price range (from engineer's expertise, informed by Pricing Intelligence)
- Logistics outline: pickup frequency, transport mode, distance
- Notes and special considerations
- Clearly labeled: "Defined by [Engineer Name], not AI-generated"

#### Section 7: Evidence Pack
- Complete list of attached documents
- Each document shows: type, date, purpose (transport / composition / regulatory), confidence/freshness badge
- Freshness scoring:
  - Green: < 1 year old
  - Yellow: 1-3 years old
  - Red: > 3 years old
- Lab reports with key values highlighted
- Photos with AI annotations

#### Section 8: Deal Readiness Score
- Visual summary of passport completeness
- Risk flags: "lab analysis is 4 years old", "RCRA classification unconfirmed", "volume is estimated"
- Recommendation: READY / NEEDS ATTENTION / INCOMPLETE
- Based on data completeness and evidence quality, not business viability (the engineer decides viability)

### Evidence Graph (every data point is traceable)

**This is a critical architectural requirement identified from industry research.** A Material Passport without provenance is just another document. With an evidence graph, it becomes a **data contract** that buyer QA accepts.

Every structured field in the passport links back to its source:

```
Field: "Composition: MEK 85%, Water 12%, Other 3%"
  └─ Source: Lab Report "LabCorp-2025-0847.pdf", page 2, section "Analytical Results"
  └─ Extracted by: Document Analysis Agent, confidence 92%
  └─ Extraction date: 2026-02-15
  └─ Validated by: Senior Engineer (Maria G.), 2026-02-18
  └─ Analysis date: 2025-11-03 (freshness: GREEN, 4 months old)
```

**Implementation:**
Each `IntakeSuggestion` already stores `evidence` (page + excerpt). Extend this pattern:
- Add `validated_by` and `validated_at` to track senior corrections
- Add `source_document_id` linking to `ProjectFile`
- Add `analysis_date` (extracted from document content, not upload date)
- Frontend: clicking any field in the passport shows its evidence chain
- Export: evidence graph included in passport as appendix for buyer QA

This converts the passport from "AI said this" to "Lab report page 2 says this, confirmed by senior engineer on Feb 18." That's the difference between a document buyers trust and one they don't.

### Data Governance & Retention (discoverability risk)

Russ flagged a serious tension: traceability helps audits, but over-documenting can create legal exposure ("discoverable"). The Evidence Graph makes this risk **worse** unless we design governance.

**Design principle: publish boundary.** The platform maintains two layers:
- **Working / Discovery layer** (ephemeral): raw notes/voice transcripts, drafts, conflicts, intermediate extractions, follow-up emails, negotiation artifacts.
- **Record / Compliance layer** (retained): finalized documents used to justify movement (manifests/BOLs/COAs/final lab results), the approved passport output, and the Outcome Ledger.

**Operational policies (Phase 1 v0):**
- Every file/note/extraction is labeled `retention_class = working | compliance_record`.
- External export (PDF/link) references only `compliance_record` evidence.
- Default retention for `working`: short, configurable window after close (e.g., 90 days), with purge automation.
- `compliance_record`: retained per org policy + legal hold capability.
- Role-based access + export redaction rules (e.g., never expose internal pricing/margin or sensitive internal comments).

This is not a legal product decision made by AI; it is product infrastructure so the customer can choose a defensible retention posture.

### e-Manifest Field Mapping

**The passport schema must be compatible with EPA e-Manifest format.** This enables direct export for compliance and provides immediate measurable ROI (time and fees saved).

Key mappings:
- Material Identity → e-Manifest Item 9 (waste description), Item 13 (waste codes)
- Compliance Status → e-Manifest Items 13-14 (EPA/state waste codes, special handling)
- Transport Classification → e-Manifest Item 14 (special handling instructions), DOT info
- Location data → e-Manifest Items 5-8 (generator, transporter, TSDF)
- Volume/weight → e-Manifest Item 11 (total quantity), Item 12 (unit/type)

**Implementation:** mapping function `passport_to_emanifest_fields()` that exports passport data in e-Manifest compatible structure. Not full e-Manifest generation (that requires integration with EPA's system), but data readiness.

### How the passport is generated

```
Progressive Assembly (as workspace fills):
  Document Intelligence → populates Sections 2, 3, 7 (with evidence graph links)
  Image Analysis → populates Sections 1, 2, 3, 5 (with evidence graph links)
  Compliance Copilot → populates Section 4
  EPA WaRM calculations → populates Section 5
  Engineer input → populates Section 6
  Missing Info Tracker → populates Section 8
  Evidence Graph → tracks provenance for ALL populated fields

Final Assembly (when agent marks "ready"):
  Passport Agent (formerly Proposal Agent) → polishes language,
  resolves conflicts between data sources, generates professional
  formatting, calculates final ESG metrics, produces PDF + shareable link
  Evidence appendix included with source citations for buyer QA
```

---

## 6. Deal Workspace: The 4 AI Engines

### Engine 1: Document Intelligence

**What exists today (reuse ~70%):**
- Image Analysis Agent: classifies material, quality grade, composition estimate, LCA calculations, safety hazards from photos
- Document Analysis Agent: extracts data from SDS/lab reports into structured fields with confidence scores and page-level evidence citations
- Notes Analysis Agent: converts free-text field notes into structured suggestions
- Intake Panel UI: human-in-the-loop apply/reject/batch workflow for AI suggestions

**What's new:**

#### 1a. Document Freshness Engine
Every document uploaded gets metadata beyond what currently exists:

| Metadata | Purpose | Implementation |
|----------|---------|---------------|
| `analysis_date` | When was the analysis/test performed (not upload date) | Extracted by Document Agent from document content |
| `document_purpose` | transport / composition / regulatory / commercial | Classified by Document Agent |
| `evidence_type` | SDS / lab_report / waste_profile / manifest / BOL / COA / photo | User-selected or AI-classified |
| `confidence_decay` | Freshness score based on age | Deterministic: green (<1yr), yellow (1-3yr), red (>3yr) |
| `coverage` | What tests/data points does this document contain | Extracted by Document Agent |
| `material_state_match` | Does this document match the current state of the material? | Flag if SDS is for virgin product but waste is spent |

**Technical implementation:**
- Extend `ProjectFile` model with new JSONB field `evidence_metadata`
- Document Analysis Agent prompt updated to extract `analysis_date` and `coverage`
- New utility function `calculate_freshness_score(analysis_date) -> FreshnessLevel`
- Frontend: badge on each document in the Evidence Pack section

#### 1b. Cross-Document Consistency Checker
When multiple documents exist for the same deal, detect inconsistencies:
- SDS says pH 2.1, lab report says pH 4.3 → flag discrepancy
- SDS is for "virgin MEK", but waste profile says "spent MEK with water" → flag mismatch
- Two lab reports with different dates show significantly different composition → flag change

**Implementation:** Not a separate agent — add a post-processing step after each document analysis that compares new extractions against existing `IntakeSuggestion` records for the same fields. Flag conflicts as a new `IntakeConflict` record type.

#### 1c. Automatic Document Type Detection
Currently users manually categorize uploads. The Document Agent should auto-detect:
- SDS (Safety Data Sheet) → specific extraction pipeline for hazards, composition, PPE
- Lab report / analytical → specific extraction for analytes, values, units, methods
- Waste profile → comprehensive extraction for classification, process, handling
- Manifest → shipment details, waste codes, facilities
- BOL (Bill of Lading) → product movement details
- COA (Certificate of Analysis) → quality specifications
- Invoice → cost line items for Cost Normalizer
- Photo → route to Image Analysis Agent

**Implementation:** Add a classification step before the extraction prompt. The Document Agent first identifies the document type, then applies the appropriate extraction strategy. This replaces the current `document_type` parameter (sds/lab/general) that users must specify.

---

### Engine 2: Missing Info Tracker

**This is entirely new — the highest-impact feature for day-to-day agent productivity.**

#### The problem in depth
Russ identified this as P0: "esperar información domina el funnel." A field agent visits a facility, captures what they can, but inevitably needs more info from the EHS contact. The EHS contact needs to ask their plant manager. The plant manager is busy. Days pass. The deal stalls. The agent loses track of what's pending across 10+ active deals.

#### How it works

**Readiness Schema (data + compliance + ops):**
The system maintains a readiness schema per material family that defines what is needed to make progress. This is NOT a rigid checklist — it's a weighted priority model across three categories:

1) **Data readiness** (passport quality)
2) **Compliance readiness** (classification + required docs)
3) **Ops readiness** (NDA/insurance/permits + pickup readiness)

```
For material family "spent solvents":
  CRITICAL (blocks passport):
    - composition (at least primary component + concentration)
    - volume or weight (with unit)
    - packaging/form
    - location
  HIGH (significantly reduces passport quality):
    - process that generated it
    - water content (for solvents specifically)
    - current cost baseline
    - recurrence
  MEDIUM (improves passport but not blocking):
    - density
    - flash point
    - color/appearance (can come from photo)
    - client priorities
  LOW (nice to have):
    - specific gravity
    - vapor pressure
    - previous disposal method
```

The completeness schemas start with a generic default and evolve per material family as senior engineers make corrections.

**Deal Completeness Score:**
```
Score = Σ (filled_fields × weight) / Σ (all_fields × weight)

Where weights are:
  CRITICAL = 10
  HIGH = 5
  MEDIUM = 2
  LOW = 1
```

Displayed as a percentage with color coding:
- 0-40%: Red — "Not enough data to proceed"
- 40-70%: Yellow — "Missing key information"
- 70-90%: Green — "Most data collected, minor gaps"
- 90-100%: Blue — "Buyer-ready"

**Blocker Board (includes non-technical blockers):**
A prioritized list visible in the workspace showing:

```
┌─────────────────────────────────────────────────────┐
│ BLOCKERS (5 items blocking progress)               │
│                                                     │
│ 🔴 Composition — no lab report or SDS uploaded      │
│    Impact: Cannot classify RCRA, cannot price       │
│    Action: Ask EHS for SDS or recent lab report     │
│    [Generate follow-up email]                       │
│                                                     │
│ 🔴 Volume — not specified                           │
│    Impact: Cannot estimate transport cost            │
│    Action: Ask EHS for monthly volume estimate      │
│    Alternative: If you have container dimensions     │
│    + weight, system can calculate                    │
│    [Generate follow-up email] [Calculate from dims] │
│                                                     │
│ 🔴 Location — only state known, no address          │
│    Impact: Cannot determine state-specific regs      │
│    Action: Confirm facility address                  │
│    [Generate follow-up email]                        │
│                                                     │
│ 🔴 Ops — $3M umbrella insurance missing             │
│    Impact: Transporter cannot enter site             │
│    Action: Upload COI / insurance certificate        │
│                                                     │
│ 🔴 Pickup readiness — placards/loading not confirmed │
│    Impact: Truck may fail on-site                    │
│    Action: Confirm placards + loading capability     │
│                                                     │
│ 🟡 Water content — not tested (HIGH priority for    │
│    solvents)                                        │
│    Impact: Buyer will likely require this            │
│    Action: See Lab Decision Engine recommendation    │
│    [View lab recommendation]                         │
└─────────────────────────────────────────────────────┘
```

**Smart Follow-ups:**
The system generates suggested communications to the facility contact:

```
Subject: Following up on the [material name] at [facility name]

Hi [EHS contact name],

Thanks for the time last week at the facility. To move forward
with evaluating the [material name], we still need a few items:

1. Safety Data Sheet (SDS) for the material — even if it's for
   the virgin product, it helps us understand the base composition

2. Approximate monthly volume — even a rough estimate works
   (e.g., "about 4 drums per month")

3. Facility address for regulatory determination

Would it be possible to get these by [date]? Happy to jump on
a call if that's easier.

Best,
[Agent name]
```

The follow-up is AI-generated based on: what fields are missing, which contact is responsible, and the communication style of previous follow-ups (learned over time).

**Alternative Unblock Paths:**
When a data point is blocked, the system suggests creative alternatives:
- "No density available? If you have container dimensions and gross weight, I can calculate density."
- "No composition data? If you have the product name or process description, I can look up typical composition ranges for this material family."
- "EHS not responding? Try asking for just the SDS first — it usually has enough info to start classification."

**Technical implementation:**
- New service: `MissingInfoService` with methods `calculate_completeness(project_id)`, `get_blockers(project_id)`, `generate_followup(project_id, contact_id)`
- Completeness schemas stored in code initially (like `assessment_questionnaire.py`), evolving to DB-stored per-org customizable schemas
- Follow-up generation: can reuse existing Notes Analysis Agent pattern or a lightweight prompt
- Frontend: new component in workspace, always visible, collapsible
- New model: `DealBlocker` with `category` (data/compliance/ops/pickup/logistics), `assigned_to`, `external_contact_id?`, `aging_days`, `due_at?`

#### Criticality flag (production emergency)
Russ emphasized: if material blocks production, the deal is an SLA emergency, not just a price optimization.

**Phase 1 v0 behavior:**
- Intake question: "Does this block production?" + deadline date
- If `production_critical=true`, the system requires **redundancy** (2-3 outlet candidates) before allowing "Ready for Review"
- Critical deals surface on top of dashboards and review queues

---

### Engine 3: Pricing Intelligence

**This is entirely new — and the most strategically important feature for building the data moat.**

#### The problem in depth
Russ said: "No existe enciclopedia. Dependen de historia/memoria — llama a alguien que movió esto hace 4.5 años." And: "El número viene del IP de Steve y del historial."

Pricing in waste brokerage is:
- **Opaque** — no public index, no benchmark, no spot market
- **Tribal** — lives in the heads of experienced brokers
- **Context-dependent** — same material can be worth $0.02/lb or $0.15/lb depending on quality, volume, location, urgency, and buyer relationship
- **Two-sided** — the broker needs to know both what the generator is paying now (to offer savings) AND what outlets will pay (to ensure margin)

#### How it works

**Deal Outcome Capture:**
When a deal closes (won or lost), the system captures structured outcome data:

```python
class DealOutcome:
    project_id: UUID
    outcome: Literal["won", "lost"]

    # If won
    final_price_per_unit: Decimal | None  # $/lb, $/gal, $/ton
    price_unit: str | None  # "lb", "gal", "ton", "unit"
    buyer_type: str | None  # "solvent recycler", "metal smelter", etc.
    outlet_region: str | None
    margin_percentage: Decimal | None

    # If lost
    loss_reason: str | None  # "price", "quality", "compliance", "timing", "competitor"

    # Always
    material_family: str  # normalized material type
    material_quality: str  # High/Medium/Low
    volume: Decimal
    volume_unit: str
    origin_state: str
    origin_region: str  # metro area or broader region
    is_hazardous: bool
    is_recurring: bool

    closed_at: datetime
    notes: str | None
```

**Historical Matching:**
When a field agent opens a new deal, the system searches for similar historical deals within the same organization:

```
Similarity scoring:
  material_family match     → 40 points
  origin_state match        → 15 points
  origin_region match       → 10 points
  material_quality match    → 15 points
  volume_range overlap      → 10 points
  is_hazardous match        → 10 points

Show deals with similarity > 60 points, sorted by recency
```

**What the agent sees:**

```
┌─────────────────────────────────────────────────────┐
│ 💰 Pricing Intelligence                             │
│                                                     │
│ Similar deals found: 5                              │
│                                                     │
│ Price range: $0.08 - $0.14 / lb                     │
│ Median: $0.11 / lb                                  │
│ Most recent: $0.12 / lb (Deal #147, Jan 2026)       │
│                                                     │
│ ├─ Deal #147 — Spent MEK, Houston TX                │
│ │  $0.12/lb, 2000 gal/mo, solvent recycler          │
│ │  Quality: Medium, Margin: 22%                     │
│ │                                                     │
│ ├─ Deal #98 — Spent MEK, Dallas TX                  │
│ │  $0.10/lb, 5000 gal/mo, fuel blender              │
│ │  Quality: Low (high water), Margin: 15%            │
│ │                                                     │
│ └─ [3 more deals...]                                │
│                                                     │
│ ⚠️ Note: Deals with water content >3% averaged      │
│ 30% lower pricing. Your material's water content     │
│ is unknown — consider testing.                       │
│ [See Lab Decision recommendation]                    │
│                                                     │
│ 📊 Generator's current cost: $0.18/lb (disposal)    │
│ Your potential offer: $0.08/lb (savings for them)    │
│ Your sell price: ~$0.11/lb (based on similar deals)  │
│ Estimated margin: ~$0.03/lb → ~$360/mo at 6000 lb   │
└─────────────────────────────────────────────────────┘
```

**Cost Normalizer (for generator's current cost):**
Russ said: "Like a phone bill, there are fees and extra line items."

The agent uploads the generator's current disposal invoice. The Document Analysis Agent extracts line items:

```
Invoice line items extracted:
  Base disposal fee:    $0.12/lb
  Fuel surcharge:       $45.00/pickup
  Environmental fee:    $25.00/pickup
  Container rental:     $150.00/month
  Lab testing fee:      $200.00/quarter

Effective cost per lb (at 2000 lb/month):
  $0.12 + ($45+$25)/(2000) + $150/(2000) + $200/(6000)
  = $0.12 + $0.035 + $0.075 + $0.033
  = $0.263/lb effective (vs. $0.12/lb stated)
```

This is powerful — the field agent can show the generator: "You think you're paying $0.12/lb but you're actually paying $0.26/lb. We can take it for $0.08/lb — that's 70% savings."

**Technical implementation:**
- New model: `DealOutcome` table linked to `Project`
- New service: `PricingIntelligenceService` with methods `find_similar_deals(project_id)`, `calculate_effective_cost(invoice_extractions)`
- Similarity search: initially simple SQL queries with scoring; can evolve to embeddings/vector search as data grows
- Privacy: strictly org-scoped. Cross-org data NEVER shared. `organization_id` isolation maintained at query level.
- Bootstrap phase: while <50 deals exist, allow seniors to manually input reference prices via a simple "pricing notes" field. System shows these alongside any historical matches.
- Frontend: new panel in workspace, appears when material family is known

#### Disposition planning (Outlet Candidates v0)
Russ described a second discovery loop: the same ambiguity must be resolved again on the "where does it go" side.

**Phase 1 v0 (manual, but structured):**
- Maintain a per-deal list of outlet/offtaker candidates with:
  - outlet type (recycler, blender, TSDF, exporter, etc.)
  - requirements (tests, thresholds, packaging, max water %, etc.)
  - status (identified/contacted/pending NDA/pending sample/rejected)
  - logistics notes (equipment needed, legs, transfer facility/port if export)

This creates the minimal "second graph": material -> requirements -> outlets/vendors -> route notes.

**The moat this creates:**
After 6 months of deals, the organization has a proprietary pricing index that doesn't exist anywhere else in the industry. No public database tracks waste brokerage pricing at this granularity. Leaving the platform means losing access to this intelligence. A new employee can be productive on day one because the institutional knowledge is in the system.

---

### Engine 4: Compliance Copilot

**This is new — advisory only, human-in-the-loop, never declarative.**

#### The problem in depth
Russ explained that the same substance can be non-hazardous as a product and hazardous as discarded waste. Classification depends on:
- Chemical composition (approximate)
- Process that generated it
- Legal status (discarded vs. reuse)
- Exit route (end-use)
- Transport classification (different taxonomy than waste classification)

And it varies by state. California DTSC has different rules than federal RCRA. A broker managing national accounts must navigate 50+ regulatory frameworks simultaneously.

#### How it works

**Auto-Classification Suggestion:**
Based on data extracted from documents and questionnaire:

```
┌─────────────────────────────────────────────────────┐
│ ⚖️ Compliance Copilot                               │
│                                                     │
│ RCRA Classification (suggested):                     │
│ 🟡 Probable F003 — Spent non-halogenated solvents   │
│ Confidence: Medium                                   │
│                                                     │
│ Basis:                                               │
│ • SDS indicates primary component: MEK (methyl       │
│   ethyl ketone)                                      │
│ • Process: parts cleaning / degreasing               │
│ • MEK is listed under F003 when spent from           │
│   degreasing                                         │
│                                                     │
│ ⚠️ Important:                                        │
│ • If this material is being SOLD as a product        │
│   (not discarded), it may not be classified as       │
│   waste. Documentation of legitimate reuse           │
│   required.                                          │
│ • The generator's determination is ultimately         │
│   their responsibility per 40 CFR 262.11             │
│                                                     │
│ State flags:                                         │
│ 🔴 California: DTSC may classify as California-only  │
│    hazardous waste even if exempt from federal RCRA   │
│ 🟡 Texas: TCEQ requires additional manifest form     │
│    for F-listed wastes                               │
│                                                     │
│ Transport requirements (DOT):                        │
│ • Shipping name: Ketones, liquid, n.o.s. (MEK)      │
│ • UN number: UN1193                                  │
│ • Packing group: II                                  │
│ • Placard: FLAMMABLE LIQUID (Class 3)                │
│                                                     │
│ ℹ️ This is an advisory suggestion. Consult your     │
│ compliance team before making regulatory             │
│ determinations.                                      │
│                                                     │
│ [Accept suggestion] [Override] [Request review]       │
└─────────────────────────────────────────────────────┘
```

**Implementation approach — phased:**

**Phase 1 (rules-based):**
- Build a classification lookup table: process + primary component → probable RCRA code
- Start with the most common material families handled by Russ's team
- State-specific flags as a separate rules table: waste_code + state → additional_requirements
- DOT classification mapping: material properties → shipping name + UN number + packing group
- All data sourced from public EPA/DOT regulations

**Phase 2 (AI-enhanced):**
- Use an LLM agent with access to the rules tables AND the full EPA/DOT regulatory text (via RAG)
- Agent can interpret edge cases: "This material has been blended — the mixture rule applies"
- Agent explains reasoning: "I classified this as F003 because..."
- Still advisory only — never generates compliance documents directly

**Waste vs. Product Detection:**
A critical nuance from Russ: the same substance might NOT be hazardous waste if it has a legitimate reuse path. The system detects:
- If the Engineer Pathway specifies a reuse/recycling end-use → flag: "This material may qualify as product, not waste, if legitimate reuse is documented"
- If the exit route changes from disposal to sale → flag: "Classification may change — review with compliance"

**Technical implementation:**
- New service: `ComplianceCopilotService`
- Phase 1: lookup tables stored as Python data structures (like `assessment_questionnaire.py`), evolving to DB
- Phase 2: new pydantic-ai agent with RAG over regulatory documents
- Frontend: panel in workspace that appears when material type + location are known
- All outputs stored as `ComplianceSuggestion` records (similar pattern to `IntakeSuggestion`)

---

## 8. Lab Decision Engine

### Why this deserves special attention

Russ specifically called this out: each lab test costs ~$1,500, and many are unnecessary. But NOT testing when needed can kill a deal or result in a "bad load" that costs thousands more.

The decision is not trivial because it depends on:
- Material type and which contaminants matter
- Buyer requirements (different buyers have different specs)
- Age of existing test data
- Historical outcomes for similar materials
- Whether a trial load is acceptable to the buyer

### How it works

**Triggers (when the Lab Decision Engine activates):**
- Document Freshness Engine flags a lab report as >2 years old
- A specific buyer requirement exists that needs a test not yet performed
- Composition data has a critical value near a threshold (e.g., water content 4.8% when buyer max is 5%)
- Material family has known "deal-breaker" contaminants (e.g., water in solvents, chlorides in metals)
- Engineer requests pricing intelligence and system identifies that similar deals with lab data commanded higher prices

**The recommendation:**

```
┌─────────────────────────────────────────────────────┐
│ 🔬 Lab Decision Engine                              │
│                                                     │
│ Recommendation: REQUEST SPECIFIC TEST               │
│ Confidence: High                                    │
│                                                     │
│ Why:                                                │
│ The target buyer (solvent recycler) requires water   │
│ content <2%. Your most recent analysis (2023) shows  │
│ 1.8% but it's 3 years old — the buyer will likely    │
│ reject it.                                          │
│                                                     │
│ Recommended test:                                    │
│ • Water content by Karl Fischer method              │
│ • Estimated cost: ~$150                             │
│                                                     │
│ ⚠️ DO NOT order full analytical panel ($1,500).     │
│ Only water content is needed for this buyer.         │
│                                                     │
│ Supporting evidence:                                │
│ • 4 similar deals in last 12 months:                │
│   - 3 required water test                           │
│   - 1 buyer accepted trial load without test         │
│ • Material family "spent solvents" has water as      │
│   primary quality differentiator                    │
│                                                     │
│ Alternatives:                                       │
│ • Request trial load (no upfront test cost, but      │
│   this buyer historically rejects without COA)       │
│ • Use existing 2023 data (risk: buyer may reject,    │
│   wasting transport cost ~$800)                     │
│                                                     │
│ Cost-benefit:                                       │
│ • Test cost: $150                                   │
│ • Deal value if won: ~$4,800/year                   │
│ • Risk of rejection without test: ~60% based on      │
│   historical data                                   │
│ • Expected value of testing: +$2,730                │
│                                                     │
│ [Accept recommendation] [Skip test] [Order full     │
│ panel] [Discuss with senior]                        │
└─────────────────────────────────────────────────────┘
```

### Rule sources (3 layers)

**Layer 1: Material-specific rules (codified from senior knowledge)**
- Built with input from Russ's senior engineers
- Examples:
  - Solvents: always check water content. If water >5%, value drops dramatically.
  - Metals: check chloride levels. High chloride = corrosion risk = smelter rejection.
  - Plastics: check melt flow index (MFI) and contamination ppm.
  - Acids: check concentration and heavy metals.
- Stored as structured rules, not AI-generated. Senior engineers can add/edit rules.

**Layer 2: Buyer requirements (Phase 2)**
- When buyer requirement templates exist, the system knows exactly what tests a specific buyer needs
- "Buyer ABC requires water content, flash point, and color for solvent purchases"
- This eliminates guesswork entirely

**Layer 3: Deal history (grows over time)**
- "In 8 similar deals, 6 required a specific water test. In 2 cases, the buyer accepted a trial load."
- "Deals with recent lab data closed 40% faster than deals with old data."
- "Full panel was requested only when the material had unknown composition."

### Learning loop

Every lab decision outcome feeds back:
- Agent ordered test → deal won/lost → was the test the deciding factor?
- Agent skipped test → buyer accepted/rejected → was the rejection because of missing data?
- Senior overrode recommendation → what did the senior know that the system didn't?

Over time, the recommendations become more precise for each material family and buyer combination.

### Technical implementation
- NOT a separate AI agent — it's a rules engine with data inputs
- New service: `LabDecisionService`
- Rules stored as structured data (material_family × contaminant → threshold, test_type, cost_estimate)
- Historical matching reuses `PricingIntelligenceService.find_similar_deals()` with additional filters for lab data presence
- Frontend: card in workspace Intelligence Panel, activated by triggers
- New model: `LabDecision` to track recommendations and outcomes

---

## 9. Review Gate Workflow

### Why a review gate

Three reasons from Russ's interview:
1. **Pricing is IP** — the organization's proprietary pricing knowledge shouldn't go out unchecked
2. **Classification has legal risk** — a wrong RCRA classification can lead to regulatory penalties
3. **Brand protection** — the Material Passport represents the broker's professional reputation

### The flow

```
Field Agent works in workspace
    ↓
Agent marks deal as "Ready for Review"
    ↓
System validates: completeness score > 70%? All CRITICAL fields filled?
    ↓ (if no: shows what's still missing, blocks review request)
    ↓ (if yes: proceeds)
Senior/Manager receives notification
    ↓
Senior reviews passport draft:
    - Checks pricing against their knowledge
    - Validates classification
    - Reviews engineer pathway
    - Adds comments or corrections
    ↓
Senior approves → passport status: "Approved"
    OR
Senior requests changes → notification to agent with comments
    ↓
Agent makes corrections → re-submits for review
    ↓
Approved passport → "Generate final" → PDF + shareable link created
    ↓
Agent shares with buyer
```

### What the senior sees

A review interface that highlights:
- **AI-generated content** vs **human-entered content** — clearly distinguished
- **Confidence levels** on all AI suggestions
- **Changes since last review** (if re-submitted)
- **Pricing intelligence context** — what similar deals went for
- **Compliance flags** — anything the Copilot flagged as uncertain

### The learning flywheel

Every senior correction is captured:
- Senior changes price estimate → feeds Pricing Intelligence ("the expert says this material in this region should be $X")
- Senior overrides RCRA classification → feeds Compliance Copilot ("for this material + process combination, the correct classification is...")
- Senior adds a note about a buyer preference → feeds Lab Decision Engine ("this buyer always requires X test")

**Over time, the drafts arrive more accurate, the senior spends less time reviewing, and the organization's collective knowledge lives in the system instead of in people's heads.**

### Technical implementation
- Extend `Project.status` enum: add `pending_review`, `changes_requested`, `approved`
- New model: `PassportReview` (reviewer_id, status, comments, corrections_made JSONB, reviewed_at)
- Permissions: `passport:submit_review` (field_agent), `passport:review` (org_admin, senior engineer role)
- Notifications: in-app notification + optional email when review requested/completed
- Frontend: review mode with diff highlighting and inline commenting

---

## 9b. Outcome Ledger (mandatory from day one)

**This is the single most important data structure for long-term defensibility.** The research is clear: the dataset of deal outcomes is what's hardest to copy and what feeds every intelligence feature.

### Why it can't be optional

The Pricing Intelligence engine, Lab Decision Engine, and Risk-of-Rejection Score all depend on historical outcome data. Without it, these features never become useful. The Outcome Ledger must be **mandatory to close a deal** — not a "nice to have" that agents skip.

### What gets captured at deal close

```python
class DealOutcome:
    project_id: UUID
    outcome: Literal["won", "lost", "abandoned"]

    # Financials (required for "won")
    final_price_per_unit: Decimal | None
    price_unit: str | None  # "lb", "gal", "ton", "unit"
    buyer_type: str | None
    buyer_region: str | None
    margin_percentage: Decimal | None

    # Loss analysis (required for "lost")
    loss_reason: Literal["price", "quality", "compliance", "timing",
                         "competitor", "material_changed", "no_response"] | None
    loss_details: str | None

    # Rejection tracking (if material was rejected by buyer)
    was_rejected: bool = False
    rejection_reason: str | None  # "contamination", "old_data", "wrong_specs", etc.
    rejection_cost: Decimal | None  # cost of the bad load

    # Lab outcomes
    lab_tests_ordered: list[str] | None  # which tests were done
    lab_total_cost: Decimal | None
    lab_was_decisive: bool | None  # did the lab result change the deal outcome?

    # Context (auto-populated from deal data)
    material_family: str
    material_quality: str  # High/Medium/Low
    volume: Decimal
    volume_unit: str
    origin_state: str
    origin_region: str
    is_hazardous: bool
    is_recurring: bool
    deal_duration_days: int  # auto-calculated from created_at to closed_at

    closed_at: datetime
    closed_by: UUID  # who closed the deal
    notes: str | None
```

### What this feeds

| Data captured | Feeds | Impact |
|---|---|---|
| `final_price_per_unit` + context | Pricing Intelligence — historical matching | "Similar deals went for $X-Y" |
| `loss_reason` | Risk patterns — why deals fail | "80% of lost MEK deals lost on price" |
| `was_rejected` + `rejection_reason` | Risk-of-Rejection Score | "Materials without fresh water test have 60% rejection rate" |
| `rejection_cost` | Lab Decision Engine cost-benefit | "Bad load costs avg $3,200 — testing is worth it" |
| `lab_tests_ordered` + `lab_was_decisive` | Lab Decision Engine | "Water test was decisive in 75% of solvent deals" |
| `deal_duration_days` | Operational metrics | "Avg deal cycle: 12 days. Deals with missing info: 28 days" |
| `margin_percentage` | Profitability analysis | "High-water solvents: 15% margin. Low-water: 28% margin" |

### Implementation
- New model: `DealOutcome` linked to `Project` (one-to-one)
- Required: closing a deal (`closed_won` or `closed_lost` status) REQUIRES filling the outcome form
- Frontend: modal that appears when changing deal status to closed, with required fields based on outcome type
- Privacy: strictly org-scoped, never cross-org accessible

---

## 9c. Evaluation & Observability Layer

**Industry research warns: >40% of agentic AI projects get cancelled due to unclear ROI (Gartner, 2025). We prevent this by measuring business impact from day one.**

### Business metrics (automated, always visible)

| Metric | How measured | Displayed where |
|---|---|---|
| **Time to Passport** | `passport.approved_at - project.created_at` | Dashboard, per-agent reports |
| **Deal cycle time** | `deal_outcome.closed_at - project.created_at` | Dashboard trends |
| **Deals blocked by missing info** | Count of deals with completeness <70% for >7 days | Dashboard alert |
| **AI suggestion acceptance rate** | `accepted / (accepted + rejected)` per engine | Admin analytics |
| **Lab spend per deal** | From `DealOutcome.lab_total_cost` | Pricing Intelligence context |
| **Lab decisiveness rate** | % of lab tests that were decisive in deal outcome | Lab Decision Engine tuning |
| **Win/loss rate with reasons** | From `DealOutcome` aggregations | Dashboard, filterable by material/region |
| **Rejection rate and cost** | From `DealOutcome.was_rejected` + cost | Risk scoring calibration |
| **Cost savings demonstrated** | Effective cost (normalized) vs. our offer | ROI proof for client retention |
| **Senior review turnaround** | `reviewed_at - submitted_at` | Operational efficiency |

### AI quality metrics (for tuning, not user-facing)

| Metric | Purpose |
|---|---|
| Extraction accuracy by document type | Tune Document Analysis Agent prompts |
| Classification accuracy (vs senior corrections) | Tune Compliance Copilot rules |
| Pricing suggestion accuracy (vs final price) | Calibrate Pricing Intelligence |
| Completeness score at review vs at close | Measure Missing Info Tracker effectiveness |
| Follow-up response rate | Measure Smart Follow-up quality |

### Implementation
- New service: `AnalyticsService` with aggregation queries over existing data
- Dashboard: new "Analytics" tab (org_admin and above)
- No new infrastructure needed — all data comes from existing tables + DealOutcome
- Key principle: **measure outcomes, not AI accuracy**. "Did the deal close faster?" matters more than "was the extraction 95% accurate?"

---

## 10. Technical Mapping: Reuse vs. Build

### Preserved as-is (no changes needed)

| Component | Current State | Role in New Design |
|-----------|--------------|-------------------|
| Image Analysis Agent | Classifies materials, quality, LCA, safety from photos | Feeds Passport sections 1, 2, 3, 5 |
| Document Analysis Agent | Extracts SDS/lab data to structured fields | Core of Document Intelligence engine |
| Notes Analysis Agent | Converts text notes to structured suggestions | Workspace data capture |
| Bulk Import Agent | Extracts locations + waste streams from files | Onboarding existing clients |
| Voice Interview pipeline | Transcription + extraction | Field capture differentiator |
| JSONB `project_data` | Dynamic questionnaire | Workspace flexibility — supports templates without schema changes |
| Multi-tenant RBAC | Organization isolation, 6 roles, deny-by-default | Foundation for review gates and future buyer/generator portals |
| Intake Panel (apply/reject) | Human-in-the-loop AI suggestions | Pattern extends to all 4 engines |
| File management + S3 | Upload, categorize, thumbnail, download | Evidence Pack section of passport |
| Rate limiting | Redis-backed, per-user/per-endpoint | Prevents AI abuse |
| Background job system | Redis job status + polling | Passport generation uses same pattern |
| WeasyPrint PDF generation | HTML → PDF for proposals | Passport PDF export |

### Transformed (same infrastructure, new purpose)

| Component | Current → New | Effort |
|-----------|--------------|--------|
| Proposal Agent | "Business idea generator" → "Passport assembler". Same pydantic-ai agent, same model (gpt-5.2), new prompt v4. Stops inventing pathways, starts assembling and polishing existing data. | M — prompt rewrite + schema evolution |
| `ProposalOutput` schema | Evolve to `PassportOutput`. Add sections for compliance, evidence freshness, deal readiness score. Remove AI-generated pathways as primary content. Additive changes with defaults for backward compatibility. | M |
| Proposal UI (frontend) | From "GO/NO-GO + business pathways" layout to 8-section passport layout. Major UI redesign but same data flow pattern (fetch from API, render sections). | L |
| `ExternalOpportunityReport` | Becomes the buyer-facing Material Passport. Same sanitization logic (no sensitive commercial data), new structure. | M |
| Project status flow | From `intake → in_progress → completed` to `intake → assessment → pending_review → approved → shared → closed_won/closed_lost`. | S |
| Dashboard | Current kanban evolves to show deals by new lifecycle stages. Add completeness score badge on cards. Add ESG metrics preview. | M |
| Assessment Questionnaire | Same field catalog, but organized around material families instead of generic "waste generation details". Templates per material type that pre-select relevant fields. | S |

### Built new

| Component | Description | Effort | Dependencies |
|-----------|------------|--------|-------------|
| **Outcome Ledger** | **Mandatory deal close form + DealOutcome model. Feeds pricing, risk, and lab engines.** | **S** | **— (SPRINT 1 PRIORITY)** |
| **Evidence Graph** | **Provenance tracking: every field → source document + page + extractor + validator. Extends IntakeSuggestion pattern.** | **M** | **IntakeSuggestion (exists)** |
| **Eval & Observability** | **AnalyticsService: business metrics dashboard, AI quality tracking, outcome-based measurement.** | **M** | **DealOutcome (new)** |
| Missing Info Tracker | Completeness schemas, score calculation, blocker identification, follow-up generation | L | Field catalog (exists) |
| Document Freshness Engine | Evidence metadata layer on ProjectFile, freshness scoring, cross-document consistency | M | Document Analysis Agent (exists) |
| Pricing Intelligence Service | Historical matching, cost normalizer, margin calculator (depends on Outcome Ledger) | L | Outcome Ledger (new) |
| Lab Decision Engine | Rules engine, trigger detection, recommendation generation, outcome tracking | M | Pricing Intelligence (partial), Document Freshness (partial) |
| Compliance Copilot | Classification rules, state flags, transport requirements, waste vs product detection | L (Phase 1 rules), XL (Phase 2 RAG) | Document extraction (exists) |
| Review Gate workflow | Review status, notifications, correction capture, learning flywheel | M | RBAC (exists) |
| Engineer Pathway form | Structured input for engineer's plan | S | BusinessPathway schema (exists) |
| Cost Normalizer | Invoice extraction + effective cost calculation | M | Document Analysis Agent (exists) |
| Auto Document Type Detection | Classification step before extraction | S | Document Analysis Agent (exists) |
| e-Manifest Field Mapping | `passport_to_emanifest_fields()` export function | S | Passport schema (new) |

**Effort scale:** S = <1 week, M = 1-2 weeks, L = 2-4 weeks, XL = 4+ weeks

---

## 11. Phased Rollout Strategy

### Phase 1: Deal Workspace + Material Passport (8 weeks)

The goal: field agents use Waste Deal OS as their daily tool for working deals, and produce Material Passports instead of manual proposals.

#### Sprint 1 (weeks 1-2): Passport Foundation + Outcome Ledger
- Rewrite Proposal Agent prompt v3 → v4 (passport assembler)
- Evolve `ProposalOutput` → `PassportOutput` schema
- Engineer Pathway form (simple structured input)
- Basic passport UI with 8 sections
- Project status flow expansion (add `pending_review`, `approved`, `closed_won`, `closed_lost`)
- **Outcome Ledger model + mandatory close form** — this cannot wait. Every deal closed from now on must deposit outcome data. The pricing engine depends on it.
- **Evidence Graph foundation** — extend `IntakeSuggestion` with `validated_by`, `validated_at`, `source_document_id`, `analysis_date`. Every AI extraction links to its source.
- **Missing Info Tracker v0** — show a blocker list + completeness score (no automation yet)
- **Criticality flag v0** — production-critical + deadline fields; enforce redundancy before review
- **Disposition Plan v0** — capture outlet candidates + requirements + status (manual)
- **Data governance v0** — retention labeling + export redaction rules for internal vs external views

**Validation gate:** Generate 3 passports from existing deal data. Show to Russ. "Is this something you'd send to a buyer?" Also: close 2 existing deals through the Outcome Ledger form to validate the data capture flow.

#### Sprint 2 (weeks 3-4): Document Intelligence Upgrades
- Document Freshness Engine (metadata + scoring + badges)
- Auto document type detection
- Cross-document consistency checker
- Evidence Pack section in passport with freshness indicators and evidence graph links
- e-Manifest field mapping function (`passport_to_emanifest_fields()`)
- Ops & pickup readiness fields (placards, loading capability, required equipment, NDA/insurance blockers)

**Validation gate:** Upload 5 real documents from Russ's deals. Does the freshness scoring match the team's assessment? Are inconsistencies detected correctly? Can passport data export in e-Manifest compatible format?

#### Sprint 3 (weeks 5-6): Missing Info Tracker + Review Gate
- Missing Info Tracker with completeness score and blocker board
- Smart follow-up email generation
- Alternative unblock paths
- Review Gate workflow (submit → review → approve → generate final)
- Notification system for review requests
- **Senior correction capture** — every review correction creates a labeled example (field → evidence → corrected value → reason) that feeds future intelligence

**Validation gate:** 2-3 field agents use the workspace for 1 week on real deals. Does the completeness score help them? Do seniors find the review workflow useful?

#### Sprint 4 (weeks 7-8): Intelligence Layer + Observability
- Pricing Intelligence v1 (historical matching from Outcome Ledger + manual reference input by seniors)
- Cost Normalizer (invoice extraction + effective cost calculation)
- Lab Decision Engine v1 (material-specific rules, basic recommendations)
- Compliance Copilot v1 (RCRA lookup tables, state flags, DOT classification)
- **Eval & Observability dashboard** — business metrics from day one: time-to-passport, deal cycle time, AI acceptance rate, win/loss rate, lab spend per deal
- Note: instrumentation for these metrics should start in Sprint 1; Sprint 4 is the dashboard + reporting surface
- Dashboard updates (new lifecycle stages, completeness badges, ESG preview)

**Validation gate:** End-to-end test: new deal from field visit to buyer-shared passport. Measure total time vs. previous process. Review observability dashboard — can we prove ROI?

### Phase 2: Buyer Portal + Compliance + Intelligence (12-16 weeks)

#### Phase 2a: Buyer Portal (weeks 9-14)
- Shareable passport link (public, secure token, optional expiry)
- Interactive browser view (expand/collapse sections, ESG charts)
- Buyer engagement tracking (views, time spent, sections visited)
- Buyer Requirement Templates per vertical (metals/plastics/wood/hazardous/organics)
- Buyer comment/request feature

#### Phase 2b: Compliance & Disclosure Pack (weeks 9-14, parallel)
- SB253 Supplier Data Pack (urgent: August 2026 deadline)
- e-Manifest readiness indicators and data export
- EPR Data Pack for 7 states
- PFAS screening flags

#### Phase 2c: Intelligence Layer Depth (weeks 15-20)
- Pricing Intelligence v2 (enough deal data to show trends, confidence intervals)
- Risk-of-Rejection Score (photo + lab + SDS + history → rejection probability)
- Lab Decision Engine v2 (buyer requirements integration)
- Compliance Copilot v2 (LLM-enhanced with RAG over regulatory text)

### Phase 3: Multiplayer OS (6+ months)

Only proceed after Phase 1-2 validation with real users.

#### Phase 3a: Generator Portal
- Self-service waste stream submission by generators
- AI auto-structures the submission
- Broker receives pre-qualified, structured leads
- Reduces cold outreach and site visits for low-value leads

#### Phase 3b: Smart Marketplace (conditional on liquidity)
- Waste stream ↔ buyer requirement matching
- Broker remains intermediary (not disintermediated)
- Commission-based model per facilitated deal
- Network effects: more participants = more value for all

#### Phase 3c: ESG Certification / Impact Ledger
- Verifiable environmental impact certificates per transaction
- MRV (Measurement, Reporting, Verification) built into platform
- Optional pathway to carbon/plastic credits (Verra, ACR)
- Attribute ownership for environmental benefits

#### Phase 3d: Multi-Agent Orchestration
- Generator Agent: "Help me describe and classify my waste"
- Broker Agent: "Enrich, validate, and optimize this deal"
- Buyer Agent: "Summarize the environmental benefit of this purchase"
- Compliance Agent: "Verify regulations and generate documentation"
- All operating in same data space with role-based permissions

#### Phase 3e: CRM Sync
- HubSpot bidirectional sync (Company / Deal / Note + PDF)
- Platform is system-of-record; CRM is downstream destination

---

## 12. Moat & Defensibility Strategy

### The progression from tool to infrastructure

```
Month 1-3:   TOOL        — "Waste Deal OS saves me time"
Month 4-8:   SYSTEM      — "My deals live in Waste Deal OS"
Month 9-14:  INTELLIGENCE — "Waste Deal OS knows my market better than I do"
Month 15+:   NETWORK     — "My buyers and generators are on Waste Deal OS"
```

### Moat 1: Pricing Intelligence (data moat)

**What it is:** Every closed deal deposits structured pricing data — material, region, volume, quality, price, outcome. After enough deals, the platform contains a proprietary pricing index that doesn't exist anywhere else.

**Why it's defensible:**
- No public database tracks waste brokerage pricing at this granularity
- Pricing data from one organization cannot be replicated by a competitor (it's private, accumulated over time)
- A new employee can leverage years of institutional pricing knowledge from day one
- The accuracy improves with every deal — compounding returns

**What a competitor would need:** Years of real deal data from real brokers. Not buildable in a lab.

**The lock-in:** "If we leave, we lose access to our own pricing history and the intelligence built on top of it."

### Moat 2: Compliance Knowledge Base (rules moat)

**What it is:** Every senior correction to a RCRA classification, every state-specific flag that gets validated, every regulatory nuance that gets codified — this builds an organization-specific compliance knowledge base.

**Why it's defensible:**
- RCRA + 50 state regulatory frameworks = enormous surface area
- The rules engine is tuned to the specific material families and regions each broker operates in
- Tribal knowledge that previously existed only in veterans' heads is now queryable
- New hires become productive immediately because compliance intelligence is in the system

**What a competitor would need:** Hundreds of expert corrections across dozens of material families and state jurisdictions. Not a one-time build.

**The lock-in:** "Our compliance knowledge is encoded in this system. A new tool would start from zero."

### Moat 3: Network Effects (Phase 2+)

**What it is:** When buyers configure their requirements in the portal, when generators submit waste streams directly, when multiple actors use the same platform — the value increases for everyone with each new participant.

**Why it's defensible:**
- Buyers won't re-configure specs in a competing platform if this one works
- Generators won't submit to multiple platforms if brokers they work with are here
- The broker is structurally in the center — migrating means breaking established connections
- Each new participant makes the matching/intelligence better for all

**What a competitor would need:** Critical mass of all three actor types simultaneously. Classic chicken-and-egg barrier.

**The lock-in:** "Our buyers check Material Passports here, our generators submit here, our data lives here. Migrating means starting over with everyone."

### Commoditization Risk Assessment (from industry research)

**Framework: will this feature be commoditized in 12-18 months?** (Source: deep-research-report.md)

A feature is safe if it: (1) requires integration with real regulatory systems, (2) has continuous ground truth from outcomes, (3) has high cost of error requiring traceability, (4) generates multi-actor switching costs, (5) depends on non-scrapable proprietary data.

| Feature | Commoditization risk | What gets commoditized | What stays defensible |
|---|---|---|---|
| Document/image extraction | **HIGH** | Generic OCR/parsing/vision | Schema + validation rules + evidence graph + audit trail + learning from corrections |
| Voice transcription | **VERY HIGH** | Transcribe/summarize is commodity | Linking to completeness checklist, contradiction detection vs docs |
| Compliance suggestions | **MEDIUM** | Generic "advice" | Hybrid rules engine + versioned state regulations + trazability of reasoning |
| Missing Info Tracker | **MEDIUM** | Generic task tracker | Connected to compliance gates + buyer requirements = switching cost |
| Pricing Intelligence | **LOW** | Superficial public benchmarks | Proprietary outcome dataset + price decomposition + per-buyer patterns |
| Lab Decision Engine | **LOW** | Generic rules | Outcome-trained model + buyer-specific requirements + cost-benefit from real data |
| Material Passport as data contract | **LOW** | PDF generation | Evidence graph + buyer QA approval + compliance gates + e-Manifest mapping |

**Strategic implication:** AI extraction is the **wedge** (gets us in the door, impresses in demos). The Outcome Ledger, Compliance Rules, Evidence Graph, and multi-actor workflow are the **moat** (keeps customers forever). Never confuse the two.

### Moat comparison with competitors

| Moat dimension | cieTrade / AMCS | Wastebits | ChatGPT/generic AI | Waste Deal OS |
|---------------|-----------------|-----------|-------------------|---------------|
| AI extraction | None | None | Can do, no workflow | Workflow-integrated (WEDGE, not moat) |
| Outcome data | None | None | No proprietary data | Accumulates with every deal (MOAT) |
| Compliance rules | Basic | Good (profiles) | Generic, no state rules | Versioned, tuned per org, expert-corrected (MOAT) |
| Evidence traceability | None | Partial | None | Full evidence graph with provenance (MOAT) |
| Network effects | None | None | None | Phase 2+ buyer/generator portals (MOAT) |
| Switching cost | Low | Medium | Zero | Very high (intelligence + data + network) |

---

## 13. Industry Context & Competitive Landscape

### Market size
- U.S. waste and recycling: **$104B revenue** (2024)
- Global industrial waste management: **$93-98B** (2024), growing to $158B by 2032 at 6.1% CAGR
- AI in waste management: **$2.6B** (2025), projected $18.2B by 2033 at 27.5% CAGR
- Circular economy: **$656B** (2024), projected $2.6T by 2035

### Regulatory tailwinds creating urgency
- **California SB253** (Climate Corporate Data Accountability Act): large corporations must disclose Scope 1/2/3 emissions. First deadline **August 10, 2026**. Brokers become data suppliers, not just material suppliers.
- **EPA e-Manifest expansion:** paper corrections no longer accepted as of January 2025. Full electronic transition accelerating. EPA FY 2026-2027 user fees incentivize digital (paper processing fees up to 80% higher).
- **PFAS regulations:** EPA proposed adding 9 PFAS compounds to RCRA hazardous constituents. Creates new classification and testing requirements.
- **EPR laws in 7 states:** CA, CO, ME, MD, MN, OR, WA — require traceability by material type and destination. CA SB54 (packaging EPR) in active rulemaking.
- **EU ESPR + Digital Product Passport:** European regulations creating mandatory material passports by category (2026-2028 working plan). Battery Passport obligatory from February 2027 for EV/LMT/industrial >2kWh. Precedent for "passport as infrastructure."

### Regulatory timeline (digital requirements impacting brokers)

```
2025-12  e-Manifest: export/report capabilities phase effective (EPA)
2026-08  SB253: first deadline — Scope 1-2 for in-scope companies in CA
2026     EPR packaging: multiple states move to implementation/reporting phase
2026     EU ESPR working plan published (Digital Product Passport categories)
2027-02  EU Battery Passport obligatory (precedent for material passports)
2027-28  More DPP/EPR categories mature; supply chain data audits increase
```

### Funded AI/waste startups to watch (from research)

| Company | Funding | What they do | Threat level |
|---|---|---|---|
| **SuperCircle** | $24M Series A (Dec 2025) | "Waste management OS" for textiles — digital twin per garment | LOW (different vertical, validates our approach) |
| **AMP Robotics** | $91M Series D | AI-powered waste sorting robots | NONE (physical sorting, not brokerage) |
| **Glacier** | $16M Series A (2025) | AI recycling robots for MRFs | NONE (physical sorting) |
| **Encamp** | $30M Series C | Environmental compliance SaaS | MEDIUM (compliance overlap, but no AI capture or pricing) |
| **Rubicon** | Public (>8K generators, >8K partners) | Digital waste marketplace | LOW (municipal focus, marketplace model, not broker workflow) |
| **DSQ Discovery** | Unknown | AI platform for waste management | WATCH (unclear capabilities) |

### Competitor analysis

**Operations/ERP tools (cieTrade, AMCS, Scrap Dragon):**
- Strength: established customer base, operational workflows (weight, tickets, fleet, billing)
- Weakness: no AI, no evidence layer, no intelligence, no buyer-facing artifacts
- Our relationship: complementary, not competitive. We handle the evidence/intelligence layer; they handle operations. Future integration possible.

**Compliance tools (Wastebits, Encamp):**
- Strength: waste profile management, e-Manifest, regulatory reporting
- Weakness: no AI extraction, no field capture, no pricing intelligence, no buyer-facing artifacts
- Our relationship: partial overlap on compliance. We differentiate with AI-powered capture and the broader deal lifecycle.

**Marketplace models (Rheaply, Excess Materials Exchange):**
- Strength: matching/marketplace concept, sustainability metrics
- Weakness: chicken-and-egg problem, don't serve broker workflow, no compliance
- Our relationship: we can evolve into marketplace (Phase 3) but start from real broker deal flow — solving the chicken-and-egg problem.

**Generic AI (ChatGPT, custom GPTs):**
- Strength: broadly capable, can parse documents, answer regulatory questions
- Weakness: no workflow integration, no persistent data, no pricing intelligence, no institutional memory, no compliance rules engine
- Our relationship: this is the "why wouldn't they just use ChatGPT?" question. The answer is everything above — workflow integration, accumulated data, organizational knowledge, multiplayer features.

### Our positioning statement

> "Waste Deal OS is the intelligent system of record for waste brokerage. While competitors manage operations (weight, tickets, logistics), we manage the evidence layer — turning ambiguous waste streams into buyer-ready Material Passports with AI-powered capture, compliance intelligence, and pricing data that compounds with every deal."

---

## 14. North Star Metrics

### Phase 1 metrics (Deal Workspace + Passport)

| Metric | What it measures | Target | How to measure |
|--------|-----------------|--------|---------------|
| **Time to Passport (TTP)** | Hours from first data capture to buyer-ready passport | <24 hours (vs. current baseline of 1-2 weeks) | `passport.approved_at - project.created_at` |
| **Agent satisfaction** | Do agents find the workspace useful? | 4+/5 rating | In-app survey after passport generation |
| **AI suggestion acceptance rate** | Are AI extractions accurate enough? | >70% accepted | `accepted_suggestions / total_suggestions` |
| **Deal completeness at review** | How complete are passports when submitted for review? | >80% score average | `completeness_score` at `pending_review` status |
| **Senior review turnaround** | How long does review take? | <4 hours | `reviewed_at - submitted_at` |
| **Deals per agent per month** | Throughput increase | 30% increase over baseline | Count of deals reaching `approved` status per agent |

### Phase 2 metrics (Buyer Portal + Intelligence)

| Metric | What it measures | Target |
|--------|-----------------|--------|
| **Buyer engagement rate** | % of shared passports viewed by buyers | >60% |
| **Buyer time on passport** | Engagement depth | >3 minutes average |
| **Deal cycle time** | From creation to closed_won | 30% reduction vs. Phase 1 |
| **Pricing prediction accuracy** | How close is the intelligence to actual outcomes? | Within 20% of final price |
| **Lab cost per deal** | Are lab decisions more efficient? | 25% reduction in lab spend |
| **Compliance issue rate** | Post-shipment compliance problems | Decreasing trend |

### Phase 3 metrics (Multiplayer)

| Metric | What it measures | Target |
|--------|-----------------|--------|
| **Buyer retention** | % of buyers who return to view additional passports | >40% |
| **Generator self-service rate** | % of new leads from generator portal | >20% of new deals |
| **Cross-actor deals** | Deals involving buyer requirements matching | Growing MoM |
| **Network density** | Connections per actor | Increasing trend |

---

## 15. Risks & Mitigations

| Risk | Severity | Probability | Mitigation |
|------|----------|------------|-----------|
| **"Why do I need AI?"** — enrichment too weak to justify platform | Critical | Medium | Ship Document Intelligence + Missing Info Tracker BEFORE changing the proposal agent. Let users feel the value of AI extraction before removing idea generation. |
| **Compliance errors worse than no compliance help** | Critical | Medium | Always "advisory" language. Never generate compliance documents. Human-in-the-loop gate mandatory. Spike with 3-5 real materials before shipping. Liability disclaimer. |
| **Pricing intelligence needs data density** | High | High (early) | Bootstrap with manual senior input. Show pricing panel only when >3 similar deals exist. Clear "limited data" indicator. Becomes strength at >100 deals. |
| **15 users = premature optimization for platform** | High | Medium | Validation gates between sprints. Don't build Phase 2 without Phase 1 feedback. Focus on making 15 users love it before scaling. |
| **Senior review bottleneck** | Medium | Medium | Show seniors only what changed / what's flagged. Auto-approve option for "standard" deals (configurable). Over time, fewer corrections needed as AI improves. |
| **Lab Decision Engine gives bad advice** | Medium | Low (Phase 1) | Start with conservative rules (recommend test when uncertain). Track outcomes. Seniors can override and system learns. Never auto-order tests. |
| **Marketplace commoditizes broker premium** | Medium | Low | Marketplace only in Phase 3, only if brokers request it. Broker always remains intermediary. Never direct generator-to-buyer matching without broker. |
| **Data governance / over-documenting creates legal exposure** | High | Medium | Russ flagged this tension explicitly. Implement retention labeling + export redaction + purge automation in Phase 1 v0. Legal review before expanding buyer portal in Phase 2. |
| **ESG metrics credibility gap** | Medium | Low | Use EPA WaRM factors exclusively (established, government-backed). Never estimate — always calculate from data. Methodology always disclosed. Phase 3 for formal certification. |
| **Regulatory landscape changes** | Medium | Ongoing | Rules engine is updateable. Monitor EPA/state agency updates. Compliance Copilot agent can be retrained. Version compliance rules with effective dates. |

---

## 16. Open Questions

### Product questions (validate with Russ)

1. **Deal archetypes:** Are there 3-5 recognizable "types" of deals that would benefit from different workspace templates? Or is every deal truly unique?

2. **Senior review adoption:** Will senior engineers actually use a review workflow, or will they prefer to review over the agent's shoulder? Need to understand current review patterns.

3. **Pricing data willingness:** Will the team consistently record deal outcomes (price, win/loss)? This is critical for the pricing moat. May need to make it a required step to close a deal.

4. **Buyer acceptance of Material Passport format:** What do Russ's buyers actually expect? Is the 8-section structure what they need, or do different buyer types need different views?

5. **Compliance appetite:** How much compliance assistance does the team want vs. handle themselves? Some organizations prefer to keep compliance entirely manual for liability reasons.

6. **Data governance policy:** Russ mentioned tension between tracking everything and legal exposure. Need to define what the platform stores, for how long, and who can access it. Phase 1 needs a safe default (labels + redaction + purge). Legal review required before broad buyer-facing portals in Phase 2.

### Technical questions

7. **Completeness schema authoring:** Should material-family-specific completeness schemas be authored by us (the platform team) or by the customer's admin? Initially by us, but need a path to customization.

8. **Pricing intelligence privacy:** Even within an org, should all agents see all deal pricing? Or should there be a "manager-only" view for sensitive margin data?

9. **Compliance data sources:** Which state regulatory databases are accessible via API vs. requiring manual maintenance? This determines the scalability of the Compliance Copilot.

10. **Offline support:** Do field agents need to capture data when they don't have internet access at remote facilities? If so, the workspace needs offline-first capabilities (major technical investment).
