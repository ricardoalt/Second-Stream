# Waste Deal OS — Product Pivot Overview

**Date:** 2026-03-03 | **For:** Internal team | **Status:** For discussion

---

## TL;DR

1. The original product generated "business opportunity ideas." Russ rejected them — experts already know the ideas. The bottleneck is the *discovery process*, not the proposals.
2. We're not rebuilding from scratch. We're reframing what already exists: the project becomes a **deal workspace**, the proposal becomes a **material passport**, and we add 4 AI engines that solve the real pain points.
3. The moat is not AI extraction (that's commoditizing fast). The moat is **accumulated deal outcome data** — pricing, rejections, lab decisions — that makes every future deal smarter and makes leaving the platform costly.

---

## 1. What We Learned

### From the call with Russ

Russ runs waste brokerage deals with 20+ years of experience. His team (Steve, etc.) have deep tribal knowledge. When we showed them the AI proposal generator, the reaction was:

> "The proposal is trivial. What's hard is converting an ambiguous material into a compliant, profitable movement without getting lost in the discovery."

**The 5 real pain points — none solved by idea generation:**

| # | Pain | Real Impact |
|---|---|---|
| P0 | **Waiting for info.** EHS contacts take days. Agent juggles 10+ deals and loses track of what's pending. | Deals freeze for weeks. Funnel dominated by "pending info." |
| P0 | **Pricing is tribal.** "What's the going rate for spent MEK in Texas?" lives in Steve's head. | New agents can't price. Knowledge dies when people leave. |
| P1 | **Lab decisions are guesswork.** ~$1,500/test. Many unnecessary, but missing a needed one kills the deal. | Wasted money or lost deals. |
| P1 | **Regulatory complexity is manual.** Same substance can be hazardous or not depending on state, process, and exit route. | Hours of lookups. Mistakes mean fines. |
| P1 | **Documents go stale, nobody tracks it.** 4-year-old lab report is useless but nobody flags it. | Rework, buyer rejections, delays. |

**Critical insight on material names:** Russ pointed out that generator-given names are often internal codes ("5850", "B980") with no meaning. The system can't use "product name" as a key — it needs: *what it is, what process generated it, what documents exist, what the constraints are.*

### From the team meeting (Jose, Ricardo, Guillermo)

- The team agreed the current product direction should change based on the Russ call.
- **First module = "Discovery"** — AI assists the sales agent in gathering all necessary information. Voice notes + file uploads are the primary input. Ends with structured data + clear picture of what's missing.
- **Sub-agents:** Regulatory, Environmental, Logistics, Handling.
- **Long-term vision:** Discovery → Matchmaking (offtakers) → Offtake (contracts) → Investment.
- Jose proposed the name **"Stream Asset Reclassification"** — this is still open, we're using "Waste Deal OS" as working name.

---

## 2. The New Product Vision

### One sentence

**Waste Deal OS turns weeks of discovery into hours by giving every deal an intelligent workspace where AI structures, validates, and learns — while the expert stays in control.**

### Core thesis

AI doesn't invent — it **structures, enriches, accelerates, and learns** from the expert's work.

The expert (sales engineer) knows what to do with spent MEK. The platform helps them get the deal done faster, with better evidence, and with institutional knowledge that accumulates over time so the next deal is easier.

### The 5 layers of intelligence per deal

```
┌──────────────────────────────────────────────────────────────────┐
│  CAPTURE     Photos · Voice · Documents · Notes → Structured data │
│              (What we already have. The wedge, not the moat.)     │
├──────────────────────────────────────────────────────────────────┤
│  STRUCTURE   Missing Info Tracker + Completeness Score            │
│              "What do I ask next? What's blocking this deal?"     │
├──────────────────────────────────────────────────────────────────┤
│  VALIDATE    Compliance Copilot · Document Freshness · Evidence   │
│              "Is this data trustworthy? Is it current?"           │
├──────────────────────────────────────────────────────────────────┤
│  DECIDE      Pricing Intelligence · Lab Decision Engine           │
│              "What should we charge? Do we need a lab test?"      │
├──────────────────────────────────────────────────────────────────┤
│  OPERATE     Review Gate · Outcome Ledger · Disposition Plan      │
│              "Control, sign-off, and capture what happened."      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Before vs After: The Two Main Screens

### 3.1 Dashboard → Deal Board

**TODAY: Dashboard**

```
┌─────────────────────────────────────────────────────────────────┐
│ DSR Platform Dashboard                                           │
├─────────────────────────────────────────────────────────────────┤
│  Pipeline                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐│
│  │ Preparation  │→ │   Analysis   │→ │ Proposal     │→ │ Done ││
│  │   (count)    │  │   (count)    │  │  Ready       │  │      ││
│  │  progress%   │  │              │  │              │  │      ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘│
│                                                                  │
│  Your Waste Streams                                              │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ Project Name       │  │ Project Name       │                 │
│  │ Company > Location │  │ Company > Location │                 │
│  │ Status badge       │  │ Status badge       │                 │
│  │ Progress: 65%  ████│  │ Progress: 30%  ██  │                 │
│  │ 0 proposals   ───  │  │ 2 proposals   ───  │                 │
│  │ [Complete Sheet]   │  │ [View Proposal]    │                 │
│  └────────────────────┘  └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘

4 stages: Preparation → Analysis → Proposal Ready → Completed
Card shows: Progress %, proposal count, generic CTA
```

**NEW: Deal Board**

```
┌─────────────────────────────────────────────────────────────────┐
│ Waste Deal OS                               [+ New Deal]         │
├─────────────────────────────────────────────────────────────────┤
│  Pipeline                                                        │
│  ┌───────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ ┌────┐│
│  │Intake │→│Assess. │→│⏳ Review │→│Approved│→│Shared │→│ ✓✗ ││
│  │  (3)  │ │  (5)   │ │   (2)   │ │  (4)   │ │  (6)  │ │    ││
│  └───────┘ └────────┘ └──────────┘ └────────┘ └───────┘ └────┘│
│                                                                  │
│  Active Deals                                 [Filter] [Search]  │
│  ┌───────────────────────────────┐                              │
│  │ Acme Corp — Spent MEK         │  ← 14 days open              │
│  │ Completeness: 68%  ████████░░ │                              │
│  │ ⚠ 3 blockers  · Pricing ready │                              │
│  │ [Assessment]  Review pending  │                              │
│  └───────────────────────────────┘                              │
│  ┌───────────────────────────────┐                              │
│  │ MegaCo — Solvent Mix          │  ← 3 days open               │
│  │ Completeness: 41%  ████░░░░░░ │                              │
│  │ ⚠ 6 blockers  · Lab needed    │                              │
│  │ [Intake]                      │                              │
│  └───────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘

7 stages: Intake → Assessment → Pending Review → Approved → Shared → Closed Won/Lost
Card shows: Completeness %, blocker count, deal age, intelligence hints
```

**Key differences:**
- 4 stages → 7 stages (reflects the real deal lifecycle)
- Progress % → Completeness Score (weighted by field importance, not just fill rate)
- "0 proposals" → Blocker count (actionable, not just a count)
- Generic CTA → Specific state (what actually needs attention)
- "Generate Proposal" disappears from cards (passport assembles progressively)

---

### 3.2 Project Workspace → Deal Workspace

**TODAY: Project Workspace**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Dashboard / Project Name                                          │
│ Project Name · Status Badge · Progress: 65% (32/49 fields)         │
│ [Generate Proposal ↑]                                               │
├──────────────────────────────────────────────────────────────────── │
│ [Overview] [Questionnaire] [Files (3)] [Proposals (2)]              │
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │  AI Intake Panel          │
│  (Tab content — one of:)                │  ───────────────          │
│                                         │  Processing: SDS.pdf ●●●  │
│  Overview:                              │                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │  Pending Suggestions (4)  │
│  │65%   │ │  2   │ │Acme  │ │Texas │  │  ┌─────────────────────┐  │
│  │Data  │ │Props │ │Client│ │Loc.  │  │  │ From: SDS.pdf pg.2  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │  │ Field: Composition  │  │
│  Next: Complete questionnaire to 80%   │  │ Value: "MEK 85%..."│  │
│  [Continue Questionnaire →]            │  │ Conf: HIGH ●●●      │  │
│                                         │  │ [Skip] [Apply ✓]    │  │
│  Questionnaire:                         │  └─────────────────────┘  │
│  20+ sections organized generically     │                           │
│                                         │  Unmapped Notes (2)       │
│  Files:                                 │  Conflicts (1)            │
│  File browser — just files, no context  │                           │
│                                         │                           │
│  Proposals:                             │                           │
│  "Not enough data (65% < 80%)" OR       │                           │
│  GO/NO-GO + business pathway cards      │                           │
│                                         │                           │
└─────────────────────────────────────────┴───────────────────────────┘
```

**NEW: Deal Workspace**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Deal Board / Acme Corp — Spent MEK                 [⏳ Submit for Review] │
│ Status: Assessment · Completeness: 68% ████████░░ · 3 blockers ⚠   │
├──────────────────────────────────────────────────────────────────── │
│ [Material Profile] [Evidence & Gaps] [Pricing] [Compliance] [Passport]│
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │  Intelligence Panel       │
│  MATERIAL PROFILE                       │  ───────────────          │
│  ┌──────────────────────────────────┐   │                           │
│  │ Material Family: [Spent Solvent ▼]│  │  ⚠ BLOCKERS (3)          │
│  │ Process: [parts cleaning       ] │   │  ┌─────────────────────┐  │
│  │ Volume:  [____________] gal/mo   │   │  │ CRITICAL: Volume    │  │
│  │ Packaging: [55-gal drums       ] │   │  │ Impact: Can't price │  │
│  │ Origin State: [Texas           ] │   │  │ [Draft follow-up ✉] │  │
│  │ Recurring: [Monthly ▼]          │   │  └─────────────────────┘  │
│  │                                  │   │  ┌─────────────────────┐  │
│  │ ENGINEER PATHWAY (human, not AI) │   │  │ HIGH: Density       │  │
│  │ ┌────────────────────────────┐   │   │  │ [Calc from dims ⚙]  │  │
│  │ │ Plan: ___________________  │   │   │  └─────────────────────┘  │
│  │ │ Target buyer: ___________  │   │   │                           │
│  │ │ Price range: $___/___      │   │   │  AI Suggestions (4)       │
│  │ └────────────────────────────┘   │   │  ┌─────────────────────┐  │
│  └──────────────────────────────────┘   │  │ From: SDS.pdf pg.2  │  │
│                                         │  │ Composition: MEK 85%│  │
│  EVIDENCE & GAPS                        │  │ HIGH ●●● [Apply ✓]  │  │
│  ┌─────────────────────────────────┐    │  └─────────────────────┘  │
│  │ 🟢 SDS-MEK-2025.pdf     0.3yr   │    │                           │
│  │    Coverage: composition,hazards│    │  PRICING INTEL            │
│  │ 🟡 LabReport-2022.pdf   3.8yr ⚠ │    │  5 similar deals found    │
│  │    Stale: water content may vary│    │  Range: $0.08–$0.14/lb    │
│  │ ⚫ Waste Profile         missing │    │  Median: $0.11/lb         │
│  └─────────────────────────────────┘    │                           │
│                                         │  LAB RECOMMENDATION        │
│  PRICING                                │  Recommend: Karl Fischer   │
│  [See Intelligence Panel →]             │  Only (~$150, not $1,500)  │
│                                         │                           │
│  COMPLIANCE                             │  COMPLIANCE FLAG           │
│  Probable: F003 (Medium conf.)          │  F003 + Texas: TCEQ form   │
│  [Accept] [Override] [Request review]   │  required ⚠               │
│                                         │                           │
│  PASSPORT PREVIEW                       │                           │
│  [Live preview — assembles as you work] │                           │
│                                         │                           │
└─────────────────────────────────────────┴───────────────────────────┘
```

**Key differences tab by tab:**

| Today | New | What changed |
|---|---|---|
| Overview (4 metric cards + Next Step) | *Removed — merged into Material Profile header* | Less clicking, deal state always visible in header |
| Questionnaire (generic 20+ section form) | **Material Profile** (fields organized by material family) | Better signal: "process that generated it" drives classification |
| Files (file browser, no context) | **Evidence & Gaps** (freshness badges, consistency flags, blocker board) | Files become evidence with provenance and age |
| Proposals (GO/NO-GO + business pathways) | **Passport Preview** (live 8-section preview, assembles progressively) | AI role: assembler, not inventor |
| — (new) | **Pricing** (similar deals from org history) | Pricing intelligence replaces "call Steve" |
| — (new) | **Compliance** (advisory RCRA suggestion) | Structured classification help, always advisory |

**The Intelligence Panel (right sidebar):**

Today the sidebar is the **Intake Panel** — AI suggestions to apply or reject. It stays. We extend it:

```
TODAY: Intake Panel               NEW: Intelligence Panel
───────────────────               ───────────────────────
Processing banner                 Processing banner        (SAME)
Notes section                     Notes section            (SAME)
Quick upload                      Quick upload             (SAME)
Conflicts                         Conflicts                (SAME)
AI Suggestions (apply/reject)     AI Suggestions           (SAME pattern)
Unmapped notes                    Unmapped notes           (SAME)
                                  ─────────────────
                                  NEW: Blockers board
                                  NEW: Pricing panel
                                  NEW: Lab recommendation
                                  NEW: Compliance flags
```

The apply/reject animation, the confidence indicators, the batch apply — all stay. We add intelligence panels below.

---

## 4. What Stays, What Changes, What's New

### What stays (zero changes needed)

| Component | Why it stays |
|---|---|
| All 5 AI agents (image, document, notes, voice, bulk import) | They extract data well. We add metadata on top, not replace them. |
| Intake Panel apply/reject pattern | Solid UX. We extend it, not replace it. |
| File management + S3 uploads | Add freshness metadata on top. |
| RBAC / permissions system | Add 2 new permissions only: `passport:submit_review`, `passport:review`. |
| Background job system | Reused for new async services. |
| WeasyPrint PDF generation | Reused for passport PDF. |
| Rate limiting, auth, multi-tenancy | No changes. |
| **Companies, Locations, IncomingMaterial model** | See next section. |

### What changes (same bones, evolved purpose)

| Component | Today | After | Effort |
|---|---|---|---|
| `Project` status flow | `In Preparation → Generating → Proposal Ready → Completed` | `Intake → Assessment → Pending Review → Approved → Shared → Closed Won/Lost` | S |
| `ProposalOutput` schema | GO/NO-GO + business pathways | 8-section passport: Identity, Specs, Safety, Compliance, ESG, Engineer Pathway, Evidence, Readiness Score | M |
| `proposal_agent.py` | Invents ideas from waste stream | Assembles + polishes passport from existing extracted data | M (prompt rewrite) |
| Dashboard UI | 4-stage pipeline + project cards with progress % | 7-stage pipeline + deal cards with completeness score + blocker count | M |
| Project workspace tabs | Overview / Questionnaire / Files / Proposals | Material Profile / Evidence & Gaps / Pricing / Compliance / Passport | L |
| Project header | Progress bar + "Generate Proposal" button | Completeness score + "Submit for Review" button (gated by score) | S |
| Questionnaire sections | Generic 20+ sections | Organized by material family (solvents, metals, plastics, etc.) | S |
| `IntakeSuggestion` model | Field + value + confidence | + `validated_by`, `validated_at`, `source_document_id`, `analysis_date` | S |

### What's built new

| Component | What it does | Effort |
|---|---|---|
| **Outcome Ledger** (`DealOutcome` model) | Mandatory close form: price, buyer, win/loss, lab outcomes. Feeds all intelligence. | S |
| **Missing Info Tracker** (`MissingInfoService` + `DealBlocker`) | Completeness score + blocker board + follow-up drafts + workarounds | L |
| **Document Freshness Engine** | Extracts analysis date, calculates age, green/yellow/red badges, staleness flags | M |
| **Cross-doc Consistency Checker** | Compares extractions across docs, flags contradictions | M |
| **Evidence Graph** (extends `IntakeSuggestion`) | Every field links to source doc + page + extractor + human validator | M |
| **Pricing Intelligence** (`PricingIntelligenceService`) | Historical deal matching from Outcome Ledger. Starts empty, compounds over time. | L |
| **Cost Normalizer** | Extracts invoice line items → calculates effective cost per unit | M |
| **Lab Decision Engine** (`LabDecisionService`) | Rules-based: which test, why, cost-benefit. Not an AI model — a rules engine. | M |
| **Compliance Copilot** (`ComplianceCopilotService`) | RCRA lookup tables + state flags + DOT classification. Advisory only, Phase 1 rules-based. | L |
| **Review Gate** (`PassportReview` model) | Submit → senior reviews → approve or request changes → passport unlocked | M |
| **Disposition Plan v0** | Per-deal list of outlet candidates, requirements, status. Manual at first. | S |
| **Analytics Dashboard** | Time to passport, win rate, lab spend, AI acceptance rate — measurable ROI | M |

**Effort:** S = <1 week, M = 1-2 weeks, L = 2-4 weeks

---

## 5. Companies, Locations, and the Role System

### Companies → Locations → Deals (the generator graph)

This structure **stays exactly as is** and maps cleanly to the new product:

```
Organization (our broker)
└── Company (Acme Corp — the generator/facility)
    └── Location (Plant A, Houston TX)
        └── Deal / Project (Spent MEK stream from Plant A)
            └── IncomingMaterial (the waste stream itself)
```

The `IncomingMaterial` model (already exists as a separate entity at the location level) becomes the canonical reference for what the material *is* — independent of any specific deal. A location can have multiple recurring streams, each spawning multiple deals over time.

**What we add:** A deal can now explicitly link to an `IncomingMaterial` record, making it easy to see "this is the 4th deal for this stream, here's what we learned from the last 3."

### Roles and permissions

The current permission system (deny-by-default, ~30 granular permissions) **stays**. We add exactly 2 new permissions:

```
passport:submit_review    → field agents: mark deal "Ready for Review"
passport:review           → seniors/managers: review + approve or reject
```

The existing `PROJECT_PURGE` admin bypass (anyone with purge permission bypasses ownership checks) also governs the new review workflow — managers can always review any deal.

**No new roles needed for Phase 1.** The existing role structure maps naturally:
- Field agents: capture data, submit for review
- Seniors/managers: review, approve, override compliance/pricing
- Admins: full access, can see margin data

### Data governance (two layers)

Russ flagged a real tension: "Over-documenting creates legal exposure — it's discoverable."

```
Working / Discovery layer (ephemeral)
  → Raw voice transcripts, draft extractions, internal notes, conflicts
  → Default retention: 90 days after deal close, then auto-purge
  → Never exported externally

Record / Compliance layer (retained)
  → Final approved passport, supporting documents, outcome data
  → Retained per org policy + legal hold capability
  → The only layer that goes into the Evidence Graph and passport exports
```

---

## 6. The 4 AI Engines in Plain Terms

### Engine 1: Document Intelligence (upgrade of what we have)

What it does *now*: uploads → extraction → suggestions in intake panel.

What changes:
- Every doc gets an age badge (GREEN <1yr, YELLOW 1-3yr, RED >3yr) — derived from the actual *analysis date* in the document, not the upload date.
- After each new document upload, the system compares new extractions against existing ones for the same deal. If two docs disagree on a field, a conflict appears in the panel. Example: "SDS says pH 2.1, lab report from 2024 says pH 4.3 — which is correct?"
- Auto document type detection: the AI recognizes whether you uploaded an SDS, lab report, manifest, invoice, or photo before choosing the right extraction strategy.

### Engine 2: Missing Info Tracker (entirely new — P0 pain point)

The blocker board that answers "what do I do next?"

```
DEAL: Acme — Spent MEK            Completeness: 68%
──────────────────────────────────────────────────
⛔ CRITICAL  Volume / Weight
   Impact: Can't price deal or estimate transport cost
   Action: Ask EHS for monthly estimate (container count × avg fill)
   Alternative: Give me drum count + avg fill % → I'll calculate
   [Draft follow-up email]  [Calculate from container data]

⚠  HIGH  Density
   Impact: Required for classification and transport docs
   Alternative: Give me container dimensions + net weight → I'll derive it
   [Calculate from dimensions]

○  MEDIUM  Flash point
   Impact: DOT placard classification
   [Mark as not available]
```

Blocker categories: Data, Compliance, Ops/NDA/Insurance, Logistics, Pickup Readiness.

### Engine 3: Pricing Intelligence (entirely new — the data moat)

```
PRICING INTELLIGENCE               5 similar deals found
────────────────────────────────────────────────────────
Price range:  $0.08 – $0.14 / lb
Median:       $0.11 / lb
Most recent:  $0.12 / lb (Deal #147, Jan 2026, Houston TX)

Material match:  ████████████ Spent MEK, 85%+ purity
Region match:    ████████░░░░ Texas → Gulf Coast

Generator's stated cost:    $0.12 / lb disposal
True cost (after fees):     $0.26 / lb (Cost Normalizer)
Your offer:                 $0.08 / lb → saves them 69%
Your sell price (estimate): $0.11 / lb
Estimated margin:           ~$0.03 / lb
```

Starts empty. After 3-6 months of closed deals with outcome data, it becomes a proprietary pricing index that doesn't exist anywhere else in the industry. **Leaving the platform means losing your pricing history.**

### Engine 4: Compliance Copilot (entirely new — advisory only)

```
COMPLIANCE COPILOT (Advisory — always verify with compliance officer)
────────────────────────────────────────────────────────────────────
RCRA Classification:  Probable F003
Confidence:           Medium

Basis:
  • Primary component: MEK (from SDS extraction)
  • Process: parts cleaning / degreasing (from questionnaire)
  • MEK is listed under F003 when spent from solvent cleaning

⚠ Note: If this material is being SOLD as product for legitimate reuse
  (not discarded), it may qualify as "product" not "waste." Requires
  documented legitimate use case.

State flags:
  • Texas: TCEQ requires additional manifest form for F-listed wastes
  • California (if routed there): DTSC additional form required

DOT: Ketones, liquid, n.o.s. (MEK) | UN1193 | Class 3 | FLAMMABLE LIQUID

[Accept suggestion]  [Override]  [Flag for senior review]
```

Phase 1: lookup tables. Phase 2: LLM + RAG over regulatory text.

---

## 7. The Two Deliverables

### Discovery Pack (internal — what the senior sees at review)

Not a new screen. It IS the Deal Workspace itself — all data, all blockers, all AI suggestions, all evidence. When the agent submits for review, the senior opens the same workspace and sees:

- Which fields are AI-generated vs. human-entered
- Confidence levels on all AI suggestions
- What changed since last review (if re-submitted)
- Pricing context (what similar deals went for)
- Compliance flags

The senior approves or requests specific changes with comments.

### Material Passport (external — what the buyer receives)

```
┌──────────────────────────────────────────────────────┐
│  MATERIAL PASSPORT                                    │
│  Issued by: [Broker Org]    Reviewed by: [Senior Name]│
│  Approved: 2026-03-03       Deal ID: #247             │
├──────────────────────────────────────────────────────┤
│  1. MATERIAL IDENTITY                                 │
│     Spent Non-Halogenated Solvent — MEK-based         │
│     Source: Pacific Packaging Solutions, Houston TX   │
│     [Photo]                                           │
├──────────────────────────────────────────────────────┤
│  2. TECHNICAL SPECIFICATIONS                          │
│     Composition: MEK 85%, Water 12%, Other 3%         │
│     Source: LabCorp-2025-0847.pdf pg.2 ● 4 months ✓  │
│     Volume: ~500 gal/month | Packaging: 55-gal drums  │
├──────────────────────────────────────────────────────┤
│  3. SAFETY & HANDLING                                 │
│     Flammable liquid | Class 3 | UN1193               │
│     PPE: gloves, eye protection, enclosed footwear    │
├──────────────────────────────────────────────────────┤
│  4. COMPLIANCE STATUS                                 │
│     RCRA: F003 — confirmed by [Senior Name], 03-03-26 │
│     State: Texas — TCEQ manifest required             │
│     e-Manifest: data ready for electronic filing      │
├──────────────────────────────────────────────────────┤
│  5. ENVIRONMENTAL IMPACT                              │
│     CO₂ avoided vs. landfill: 1.8 MT/yr (EPA WaRM)   │
│     Water savings: 240 gal/yr                         │
├──────────────────────────────────────────────────────┤
│  6. ENGINEER PATHWAY  [defined by human, not AI]      │
│     Plan: Solvent recovery → fuel blending program    │
│     Target: Gulf Coast solvent recyclers              │
│     Price range: $0.09–$0.12 / lb                     │
├──────────────────────────────────────────────────────┤
│  7. EVIDENCE PACK                                     │
│     ● SDS-MEK-2025.pdf           ✓ 4 months (GREEN)  │
│     ⚠ LabReport-2022.pdf        ⚠ 3.8 years (YELLOW)│
│     ○ Waste Profile              missing              │
├──────────────────────────────────────────────────────┤
│  8. DEAL READINESS SCORE                              │
│     ████████░░ 82% — READY (2 minor gaps)             │
│     Risk: Lab data approaching stale threshold        │
└──────────────────────────────────────────────────────┘
```

The key difference from today's proposals: **the passport assembles progressively as the agent works**. There's no "Generate" button. By the time the agent submits for review, 80%+ of the content is already structured from extracted data. The AI polishes language and format.

---

## 8. The Review Gate + Outcome Ledger

These two are the most important new pieces. Without them, the intelligence layer never works.

### Review Gate

```
Field agent works in workspace
        │
        ▼
Agent clicks "Submit for Review"
  (only available when completeness ≥ 70%)
        │
        ▼
Senior receives notification
  • Sees what's AI-generated vs human-entered
  • Sees confidence levels + pricing context
  • Sees compliance flags
        │
   ┌────┴────┐
   ▼         ▼
APPROVE  REQUEST CHANGES (with inline comments)
   │               │
   ▼               ▼
Passport      Agent fixes
unlocked      Re-submits
   │
   ▼
Agent shares via PDF or link
```

**Why this exists:**
1. Pricing is IP — can't go out unchecked.
2. RCRA classification has legal risk — wrong code = fines.
3. Every correction the senior makes feeds the intelligence layer. This is how tribal knowledge becomes institutional knowledge.

### Outcome Ledger (mandatory)

When a deal closes, a 2-minute form blocks status change until completed:

```
Deal: Acme — Spent MEK    Outcome: [Won ▼]

Financial (won):
  Final price: $0.11 / lb
  Buyer type:  [Solvent recycler]
  Margin:      28%

Lab outcomes:
  Tests ordered: [Karl Fischer water content]
  Total cost: $150
  Was it decisive? [Yes — buyer required fresh water content data]

Notes: ___________________

[Save & Close Deal]
```

**Why mandatory, not optional:** Every optional data capture eventually gets skipped under deal pressure. The Outcome Ledger is the product's core value flywheel. Each closed deal makes pricing intelligence more accurate, lab decisions better, and risk scoring possible. After 6 months of consistent data, the platform has an asset no competitor can replicate: your organization's proprietary pricing history.

---

## 9. Roadmap

### Phase 1 — Deal Workspace + Material Passport (8 weeks)

**Goal:** One deal from field visit to buyer-shared passport. Time to passport: hours, not weeks.

```
Sprint 1 (wk 1-2): Foundation
  ✓ Passport schema (8 sections)
  ✓ New project status flow (7 stages)
  ✓ Outcome Ledger — CRITICAL, starts accumulating data immediately
  ✓ Evidence Graph (extend IntakeSuggestion)
  ✓ Missing Info Tracker v0 (completeness score + blocker list)
  ✓ Disposition Plan v0 (manual outlet candidates)
  ✓ Data governance labels (working vs. compliance-record)
  → Validate: 3 passports from existing data. Russ review.

Sprint 2 (wk 3-4): Document Intelligence
  ✓ Document Freshness Engine (analysis date + green/yellow/red)
  ✓ Auto document type detection
  ✓ Cross-document consistency checker
  ✓ e-Manifest field mapping
  ✓ Ops/pickup readiness fields (placards, equipment, insurance)
  → Validate: 5 real docs. Does freshness match team's assessment?

Sprint 3 (wk 5-6): Missing Info Tracker + Review Gate
  ✓ Full MissingInfoService (weighted completeness, blocker board)
  ✓ Smart follow-up email generation
  ✓ Alternative unblock paths
  ✓ Review Gate workflow (submit → review → approve)
  ✓ Senior correction capture (every correction = training example)
  → Validate: Agents use workspace on real deals for 1 week.

Sprint 4 (wk 7-8): Intelligence Layer
  ✓ Pricing Intelligence v1 (historical matching + manual reference)
  ✓ Cost Normalizer (invoice → true effective cost)
  ✓ Lab Decision Engine v1 (material-specific rules)
  ✓ Compliance Copilot v1 (RCRA tables + state flags)
  ✓ Analytics dashboard (time-to-passport, win rate, lab spend)
  → Validate: End-to-end: field visit → shared passport. Measure time.
```

**Phase 1 success criteria:**
- Time to passport: <24h (vs. current 1-2 weeks)
- Russ: "This is something I'd send to a buyer"
- 100% of closed deals through Outcome Ledger
- Senior review turnaround: <4h

---

### Phase 2 — Buyer Portal + Compliance + Intelligence Depth (12-16 weeks)

```
  • Shareable passport link (browser, not just PDF)
  • Buyer engagement tracking (views, time on sections)
  • Buyer Requirement Templates per vertical
  • SB253 Compliance Pack (California, deadline August 2026 — urgent)
  • e-Manifest export
  • EPR Data Pack for 7 states
  • Pricing Intelligence v2 (trends + confidence intervals)
  • Risk-of-Rejection Score
  • Lab Decision Engine v2 (buyer requirements integration)
  • Compliance Copilot v2 (LLM + RAG over regulatory text)
```

**Phase 2 success criteria:**
- >60% of shared passports viewed by buyers
- Pricing prediction within 20% of final price
- 25% reduction in lab spend per deal

---

### Phase 3 — Network + Marketplace (6+ months)

```
  • Generator Portal (facility self-service intake)
  • Smart Marketplace (broker as intermediary, AI surfaces matches)
  • ESG Certification / Impact Ledger
  • CRM Sync (platform = system of record, CRM = downstream)
  • Multi-agent orchestration (Discovery → Matchmaking → Offtake)
```

**Phase 3 = the long-term vision from the team meeting:** Discovery (Phase 1) → Matchmaking (Phase 3a) → Offtake/contracts (Phase 3b) → Investment (Phase 3c+).

---

### Moat progression

```
Month 1-3   SPEED        Deals in hours not weeks. Replicable.
Month 4-8   DATA         Pricing index. Compliance rules tuned to org.
                         Lab decisiveness patterns. Not replicable.
Month 9-14  NETWORK      Buyers + generators on the platform.
                         Structural switching cost.
```

---

## 10. Open Questions (team needs to decide)

1. **Name:** "Waste Deal OS" (working) vs. "Stream Asset Reclassification" (Jose's proposal) vs. something else. This affects how we talk about it externally.

2. **Discovery as module name:** Should the first experience be called "Discovery" (matching the team meeting language) or is it just "the Deal Workspace"? Naming the phases matters for internal alignment.

3. **Will seniors use the Review Gate digitally?** If they prefer reviewing over the agent's shoulder, the learning flywheel (corrections → better AI) needs a different capture mechanism.

4. **Outcome Ledger cultural adoption:** The product enforces it, but is the team's culture ready to always fill it in? This is the most important question for whether Pricing Intelligence ever works.

5. **Material family templates:** Are there 3-5 recognizable deal types (spent solvents, scrap metals, plastics, acids, etc.) that would benefit from different workspace templates? Or is every deal unique?

6. **Outlet directory:** Does the team have a structured list of buyers/offtakers? The Disposition Plan v0 needs seed data.

7. **SB253 urgency:** California deadline is August 2026. Does our current client need this? If yes, move to Sprint 3 in Phase 1.

8. **Offline capture:** Do field agents visit facilities without internet? Offline-first is a significant investment — validate the need before building.

---

*This document is a starting point for team discussion. Nothing in Phase 2 or 3 is final. Phase 1 requires validation at every sprint gate before proceeding.*
