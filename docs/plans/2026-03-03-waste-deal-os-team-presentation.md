# Waste Deal OS — Team Alignment Document

**Date:** 2026-03-03 | **Status:** For team review | **Author:** Product

---

## What This Document Is

This document explains our product pivot: what we're building, why we changed direction, every major design decision with its rationale, and what the roadmap looks like. It's meant to give every team member full context — not just what we decided, but why.

If you disagree with any decision, this is the right place to start that conversation.

---

## 1. Why We Changed Direction

### What we built

We built an AI platform with 6 agents (image analysis, document extraction, voice transcription, notes extraction, bulk import, proposal generation) that generated "business opportunity ideas" for waste streams. Example output: "Convert spent MEK solvent → sell to solvent recycler at $0.10/lb."

### Why it failed

Our client Russ (20+ years in waste brokerage) rejected it. His team already knows what to do with every material type. The real insight came from his exact words:

> "The proposal is trivial. What's hard is converting an ambiguous material into a compliant, profitable movement without getting lost in the discovery."

When we dug deeper, we found 5 real pain points — none of which an idea generator addresses:

| Pain Point | Impact | Priority |
|---|---|---|
| **Waiting for information from the facility.** EHS contacts take days to respond. Agents juggle 10+ active deals and lose track of what's pending. | Deals freeze for weeks. | P0 |
| **Pricing is tribal knowledge.** "What's the going rate for spent MEK in Texas?" lives in one senior's head. When they leave, the knowledge is gone. | New agents can't price. Institutional knowledge dies. | P0 |
| **Lab test decisions are guesswork.** Each test costs ~$1,500. Many are unnecessary, but skipping a needed one kills the deal or causes a costly bad load. | ~$1,500 wasted per unnecessary test. Deals lost from missing data. | P1 |
| **Regulatory complexity is manual.** The same substance can be hazardous or non-hazardous depending on state, process that generated it, and whether it's being discarded or sold. | Manual lookups take hours. Mistakes mean fines. | P1 |
| **Documents go stale, nobody tracks it.** A lab report from 4 years ago is useless to a buyer, but nothing flags this until the deal is already in front of the buyer. | Rework, delays, lost deals. | P1 |

### The key market insight

AI document extraction (photos, PDFs, voice, notes) is commoditizing in 12-18 months. ChatGPT and Claude can already do generic extraction. **We cannot build a moat on extraction alone.**

Extraction is our wedge — it gets us in the door and delivers immediate value. The moat is built on:
1. **Proprietary outcome data** — deal pricing, rejection rates, lab outcomes that accumulate with every closed deal and exist nowhere else
2. **Compliance rules tuned to the organization** — RCRA + state regulations encoded into the system and corrected by senior engineers over time
3. **Evidence traceability** — every data field linked to its source document, page, date, and human validator
4. **Multi-actor workflow** — review gates, buyer sharing, outcome capture that create switching cost at the process level

---

## 2. The New Product: Waste Deal OS

### One-liner

Waste Deal OS turns weeks of manual deal work into hours — by giving every deal an intelligent workspace where AI structures, enriches, and learns, while the expert stays in control.

### Core thesis

**AI doesn't invent — it structures, enriches, accelerates, and learns from the expert's work.**

The expert knows what to do with spent MEK. The platform helps them get the deal done faster, with better documentation, and with accumulated intelligence that grows over time.

### The 5 layers

```
CAPTURE     → AI extracts data from photos, documents, voice, notes.
              (The wedge. Already built. Delivers immediate value.)

STRUCTURE   → Missing Info Tracker shows gaps, blockers, and what to ask next.
              Documents become evidence with freshness and provenance.
              (Highest daily impact. Solves "waiting for info dominates the funnel.")

VALIDATE    → Compliance Copilot suggests regulatory classification.
              Document Freshness Engine flags stale evidence.
              Evidence Graph links every field to its source.
              (Advisory only. Human confirms. Builds compliance knowledge over time.)

DECIDE      → Pricing Intelligence shows what similar deals went for.
              Lab Decision Engine recommends specific tests vs. full panels.
              Cost Normalizer reveals the generator's true disposal cost.
              (The data moat. Compounds with every closed deal.)

OPERATE     → Review Gate: senior validates before sharing.
              Outcome Ledger: mandatory capture at deal close.
              Disposition Plan: outlet candidates and their requirements.
              (Multi-actor workflow. Creates switching cost.)
```

### The two central artifacts

**Deal Workspace** (daily experience)
Every deal gets its own intelligent workspace. The agent lives here — uploading documents, filling in questionnaire data, reviewing AI suggestions, tracking blockers, seeing pricing context, preparing for review. This is not a form you fill once and submit. It's where the deal lives from first contact to close.

**Material Passport** (the deliverable)
A professional, buyer-ready 8-section document that assembles progressively as the workspace fills. Not a "Generate" button. By the time the agent marks a deal ready for review, most of the passport is already structured. The Passport Agent polishes and formats.

### Before and after: the field agent's day

**Today:**
1. Visit facility → paper/phone notes → transcribe to Excel manually
2. Email EHS contact for more info → wait days or weeks
3. Call a senior colleague for pricing reference
4. Manual regulatory lookup → hours of research
5. Assemble Word/PDF proposal over 1-2 weeks
6. Email to buyer → buyer asks questions → rework from scratch

**Time to buyer-ready proposal: 1-2 weeks.**

**With Waste Deal OS:**
1. Photos + voice notes → AI populates workspace fields instantly
2. Missing Info Tracker shows exactly what to ask, drafts the follow-up email
3. Pricing Intelligence shows 5 similar deals from org history
4. Compliance Copilot suggests RCRA code and state flags in seconds
5. Lab Decision Engine recommends specific test (not full panel) with cost-benefit
6. Engineer writes their plan → senior reviews → passport generated
7. Buyer receives professional dossier via shareable link

**Time to buyer-ready passport: hours, not weeks.**

---

## 3. Key Design Decisions

These are the 6 most important design decisions we made. Each one is explained with the problem it solves, the solution we chose, and why we chose it over alternatives.

---

### Decision 1: Unified workspace per deal, not separate modules

**Problem:** If the deal information lives in multiple disconnected tools (a questionnaire here, a file manager there, a proposal tab somewhere else), agents have to context-switch constantly. Nothing is aware of the deal's full state.

**Solution:** One workspace per deal where all 5 layers of intelligence operate on the same data simultaneously. Every AI engine (extraction, missing info, pricing, compliance) sees the full deal context.

**Why this and not separate modules:**
- Modules create silos. A "missing info" module doesn't know about compliance blockers. A "pricing" module doesn't know about document freshness. The workspace knows everything.
- The deal is the unit of work, not the task. Organizing by modules organizes by AI capability, not by how the agent actually works.
- One workspace means one source of truth. No "is the latest version in the file manager or in the proposal tab?"
- Switching cost is structural: the agent's deal history, evidence, corrections, and outcomes live in the workspace. Moving to another tool means losing all of that context.

---

### Decision 2: Evidence Graph — every data field links to its source

**Problem:** When the Material Passport shows "Composition: MEK 85%, Water 12%," a buyer's question is: "How do you know this? When was it tested? Who confirmed it?" Without answers, trust is low. With a vague "AI said so," it's worse.

**Solution:** Every structured field in the passport is traceable:
```
"Composition: MEK 85%, Water 12%, Other 3%"
  → Source: Lab Report "LabCorp-2025-0847.pdf", page 2, section "Analytical Results"
  → Extracted by: Document Analysis Agent, confidence 92%
  → Extraction date: 2026-02-15
  → Analysis date: 2025-11-03 (4 months old — GREEN freshness)
  → Validated by: Senior Engineer, 2026-02-18
```

**Why this and not just showing the AI's confidence score:**
- A confidence score is "AI says it's probably right." Evidence is "lab report page 2 says this."
- Buyers need to trust the passport enough to sign contracts on it. That requires primary sources, not AI confidence.
- Traceability is what converts the passport from a marketing document to a compliance artifact — which is exactly what SB253 and e-Manifest require.
- The Evidence Graph also exposes inconsistencies: if two documents contradict each other on the same field, the system flags it instead of silently picking one.

---

### Decision 3: Outcome Ledger is mandatory — closing a deal requires it

**Problem:** Pricing intelligence, lab decision accuracy, and risk scoring all depend on historical outcome data. If the Outcome Ledger is optional, it will not be filled consistently, and the intelligence layer will never have enough data to be useful.

**Solution:** The deal-close workflow requires filling a 2-minute form: deal outcome (won/lost), final price, buyer type, loss reason (if lost), lab tests ordered and whether they were decisive.

**Why mandatory and not optional or prompted:**
- Optional data = sparse data = intelligence that doesn't work = feature that gets ignored = product gets cancelled.
- The Outcome Ledger is the product's core value compound. Every closed deal deposits data that makes the next deal smarter. This only works if every deal deposits data.
- 2 minutes at close is a small cost. The benefit: new agents can price deals from day one. The organization's pricing knowledge survives employee turnover. Lab decisions improve over time.
- Gartner estimates >40% of agentic AI projects are cancelled due to unclear ROI. The Outcome Ledger is how we prove ROI: "This deal closed 40% faster because Pricing Intelligence showed us the market rate."

---

### Decision 4: Review Gate — senior approval before sharing

**Problem:** Three independent risks if passports go directly from field agent to buyer without review:
1. **Pricing is proprietary IP** — unchecked pricing sent externally reveals strategy and can lock the broker into bad terms.
2. **RCRA classification has legal risk** — a wrong hazardous waste classification exposes the broker to regulatory penalties.
3. **The passport is the company's reputation** — incorrect technical specs sent to a buyer damage trust and can cause costly bad loads.

**Solution:** Field agent marks "Ready for Review" → senior/manager receives notification → reviews workspace → approves or requests changes → only then is the passport shareable.

**Why this and not just trusting agents to be careful:**
- Russ specifically cited this: "Pricing shouldn't go out unchecked" and classification errors "can mean fines."
- The review gate is also the most important learning mechanism in the product. Every correction a senior makes (overriding a price estimate, changing a RCRA code) is a labeled training example that makes the AI more accurate for the next deal.
- The agent learns by seeing what the senior changed and why. Junior agents get better faster.
- The approval is not a bureaucratic bottleneck — it's a trust signal. A passport that says "reviewed and approved by [Senior Name]" on [date] carries more weight with buyers.

---

### Decision 5: Lab Decision Engine uses rules, not AI

**Problem:** Lab tests cost ~$1,500 each. The decision of whether to test, and what to test, depends on material type, buyer requirements, age of existing test data, and deal history. This knowledge currently lives with 2-3 senior engineers.

**Solution:** A rules engine — not an AI model — that recommends specific tests with cost-benefit analysis:
```
Recommendation: REQUEST SPECIFIC TEST

Why: Buyer requires water content <2%. Last analysis (2023) shows 1.8%
     but it's 3 years old — buyer will likely require fresh data.

Recommended: Water content by Karl Fischer method (~$150)
NOT: Full analytical panel (~$1,500)

Similar deals: 4 in last 12 months, 3 required water test.
Cost-benefit: Test cost $150. Expected deal value $4,800/yr.
```

**Why rules-based and not an AI model in Phase 1:**
- Rules are correct from day one. An AI model needs thousands of training examples — we don't have them yet.
- Senior knowledge can be directly encoded into rules: "for solvents, always check water content; for metals, check chlorides; for plastics, check MFI." This is exactly the tribal knowledge we want to preserve.
- Rules are auditable. You can read them and verify they're right. A black-box model recommendation on a $1,500 decision needs to be explainable.
- Rules evolve into data-driven recommendations over time: as the Outcome Ledger accumulates outcomes, the rules get weight from evidence ("water content test was decisive in 75% of solvent deals in our history").

---

### Decision 6: AI is the assembler, not the inventor

**Problem:** The original platform's AI invented "business opportunity ideas." Experts rejected them as generic and superficial. An AI that gives experts advice they already know is useless.

**Solution:** AI's role is limited to: extracting data from documents/images/voice, tracking what's missing, surfacing relevant historical data, flagging compliance issues, and polishing the final document. The expert defines the strategy (Engineer Pathway), validates AI suggestions, and makes all key decisions.

**Why this boundary matters:**
- The expert's judgment is the product's value, not the AI's suggestions. The AI makes the expert faster and more organized.
- An AI that stays in its lane builds trust. An AI that oversteps destroys it.
- Compliance and pricing decisions have legal and financial consequences. They cannot be automated — only assisted.
- The advisory model also creates the feedback loop: when a senior overrides an AI suggestion, that correction improves future suggestions. An AI that "decides" has no correction mechanism.

---

## 4. What Changes in the Product Experience

The underlying infrastructure (file management, extraction agents, RBAC, PDF generation, background jobs) stays. What changes is the experience of using it.

| | Today | With Waste Deal OS |
|---|---|---|
| **Where deals live** | A form with 4 tabs you fill once | An intelligent workspace per deal you return to daily |
| **After uploading a document** | AI extracts → you apply/reject suggestions | AI extracts + flags freshness + detects type + checks consistency vs. other docs |
| **Knowing what's missing** | You remember, or you check your email | Missing Info Tracker shows weighted blockers with follow-up email drafts |
| **Pricing a deal** | Call a senior or check old emails | Pricing Intelligence shows similar deals from org history |
| **Lab decisions** | Guesswork or call someone | Lab Decision Engine recommends specific test with cost-benefit |
| **Compliance** | Manual regulatory lookup (hours) | Compliance Copilot suggests RCRA code + state flags in seconds (advisory) |
| **The deliverable** | Word/PDF assembled by hand | Material Passport: 8 sections, evidence-backed, progressively assembled |
| **Before sending to buyer** | Ad hoc email chain with manager | Review Gate: senior validates pricing, classification, and plan |
| **When a deal closes** | Done → forgotten | Outcome Ledger: mandatory 2-min form feeds all intelligence |
| **For a new agent** | Learn from a veteran or make mistakes | Pricing Intelligence + Lab Engine show institutional knowledge from day one |

### New deal lifecycle

```
Today:   [In Preparation] → [Generating Proposal] → [Proposal Ready] → [Completed]

New:     [Intake] → [Assessment] → [Pending Review] → [Approved] → [Shared] → [Closed Won / Closed Lost]
```

### New workspace structure

```
Deal Board                    Deal Workspace
┌─────────────────────┐       ┌────────────────────────────────────────┐
│ Pipeline view        │       │ [Material Profile] [Evidence & Gaps]   │
│ (7 stages)           │       │ [Pricing] [Compliance] [Passport]      │
│                      │       │                                        │
│ Deal Cards:          │ ───→  │ Intelligence Panel (sidebar):          │
│ • Completeness score │       │ • Blockers + follow-up drafts          │
│ • Blocker count      │       │ • Pricing from similar deals           │
│ • Days open          │       │ • Compliance flags                     │
│ • Status badge       │       │ • Lab recommendations                  │
└─────────────────────┘       └────────────────────────────────────────┘
```

**The key shift:** The platform goes from "a form you fill, then AI generates a one-time report" to "where every deal lives daily, with AI working alongside you at every step."

---

## 5. Roadmap

### Phase 1 — Deal Workspace + Material Passport (8 weeks)

**What we ship:**
- Deal Workspace (5-tab layout replacing current 4-tab project view)
- Material Passport (8 sections, progressively assembled)
- Missing Info Tracker with completeness score and blocker board
- Document Freshness Engine (green/yellow/red badges based on analysis date)
- Evidence Graph (every field traceable to source document)
- Review Gate (submit → senior review → approve or request changes)
- Outcome Ledger (mandatory form at deal close)
- Lab Decision Engine v1 (rules-based, material-specific)
- Pricing Intelligence v1 (historical matching from Outcome Ledger)
- Compliance Copilot v1 (RCRA lookup tables + state flags, advisory only)
- Disposition Plan v0 (manual outlet candidate list)

**Success criteria:**
- Time to passport: <24 hours (vs. current 1-2 weeks)
- Russ confirms: "This is something I'd send to a buyer"
- 100% of closed deals go through the Outcome Ledger form
- Senior review turnaround: <4 hours

**What we validate between sprints:**
- Sprint 1 → Generate 3 passports from existing data. Russ review.
- Sprint 2 → Upload 5 real documents. Does freshness scoring match the team's assessment?
- Sprint 3 → 2-3 agents use workspace on real deals for 1 week.
- Sprint 4 → End-to-end test: field visit → buyer-shared passport. Measure total time.

---

### Phase 2 — Buyer Portal + Compliance + Intelligence (12-16 weeks)

**What we ship:**
- Shareable passport link (browser view, not just PDF)
- Buyer engagement tracking (views, time on page, sections visited)
- Buyer Requirement Templates per vertical (what each buyer type needs to see)
- SB253 Compliance Pack (California deadline: August 2026)
- e-Manifest readiness export
- EPR Data Pack for 7 states
- Pricing Intelligence v2 (trends, confidence intervals)
- Risk-of-Rejection Score ("materials without fresh water test have 60% rejection rate")
- Lab Decision Engine v2 (buyer requirements integration)
- Compliance Copilot v2 (LLM + RAG over regulatory text for edge cases)

**Why the buyer portal matters:** Phase 1 proves value internally. Phase 2 proves value in the market. A buyer who views a Material Passport through our platform, configures their requirements there, and approves deals there is the beginning of network effects.

**Success criteria:**
- >60% of shared passports viewed by buyers
- >3 minutes average time on passport
- Pricing prediction within 20% of final price
- 25% reduction in lab spend per deal

---

### Phase 3 — Network (6+ months)

Only after Phase 1-2 validation. The network is what makes the platform impossible to replicate.

- **Generator Portal:** Facility contacts submit waste stream info directly instead of via email/phone
- **Smart Marketplace:** Waste stream ↔ buyer requirement matching. Broker remains intermediary — the platform surfaces the right match, the broker closes it.
- **ESG Certification / Impact Ledger:** Verifiable environmental impact certificates built on Outcome Ledger data
- **Multi-agent orchestration:** Generator Agent, Broker Agent, Buyer Agent coordinating across the platform
- **CRM Sync:** Platform becomes system of record; CRM is downstream

---

## 6. Why This Wins

### The moat compounds over time

```
Month 1-3:   SPEED       Deals in hours, not weeks.
             → Replicable by a well-funded competitor. This is the wedge.

Month 4-8:   DATA        Proprietary pricing index. Compliance rules tuned to org.
             Evidence graph with org history. AI improving with every correction.
             → Not replicable. Data compounds. The longer you're on the platform,
               the smarter it gets. Leaving means losing your pricing history,
               your compliance knowledge, and your evidence graph.

Month 9-14:  NETWORK     Buyers configure requirements in the portal.
             Generators submit directly. Multi-actor workflow.
             → Structural switching cost. "Our buyers check Material Passports here."
```

### Competitive landscape

| | cieTrade / AMCS / Scrap Dragon | Encamp | ChatGPT | Waste Deal OS |
|---|---|---|---|---|
| AI data extraction | No | No | Yes (generic) | Yes (workflow-native) |
| Missing info tracking | No | No | No | Yes |
| Pricing intelligence | No | No | No | Yes (proprietary) |
| Compliance assistance | No | Yes (compliance only) | Partial | Yes (integrated) |
| Evidence traceability | No | No | No | Yes |
| Multi-actor workflow | No | No | No | Yes |
| Outcome data moat | No | No | No | Yes |
| Buyer-facing deliverable | No | No | No | Yes |

**cieTrade, AMCS, Scrap Dragon** are operations/ERP tools. They manage what happened — manifest tracking, invoicing, reporting. We manage what's happening and what should happen — evidence capture, intelligence, deal velocity.

**Encamp** is a compliance SaaS. Strong on regulatory tracking, no AI capture, no pricing, no deal workflow. Potential partner, not a head-on competitor.

**ChatGPT/Claude** can extract data from a document in isolation. They cannot: track what's missing across a deal, apply org-specific pricing history, remember what a senior engineer corrected last month, or produce a compliance-ready evidence-backed passport. Generic AI is stateless; we are stateful.

### Regulatory tailwinds

Three regulations create urgency:

1. **California SB253** (deadline: August 2026): Large corporations must disclose Scope 3 emissions including waste. Brokers become data suppliers. Our compliance packs are the product.

2. **EPA e-Manifest expansion** (effective January 2025): Paper manifests now cost 80% more than electronic. Our e-Manifest data mapping removes that friction.

3. **EPR laws in 7 states** (CA, CO, ME, MD, MN, OR, WA): Extended Producer Responsibility requires traceability by material type and destination. Our evidence graph is the traceability layer.

These aren't niche compliance features — they're regulatory tailwinds that make our product increasingly necessary regardless of what we do.

---

## 7. Open Questions

These decisions need to be made before we build. Some require input from Russ, some from the team.

### Validate with client (Russ)

1. **Deal templates:** Are there 3-5 recognizable deal types (solvents, metals, plastics) where a pre-filled workspace template would help? Or is every deal unique?

2. **Senior review adoption:** Will senior engineers actually use a digital review workflow? Or do they prefer reviewing together with the agent? (If they won't use it, the learning flywheel doesn't work.)

3. **Outcome Ledger buy-in:** Will the team consistently record outcomes at close? The Outcome Ledger is mandatory in the product, but cultural adoption is a separate question.

4. **Buyer passport expectations:** Is the 8-section structure what buyers need? Do recyclers, fuel blenders, and TSDFs need different views?

5. **Compliance comfort level:** How much compliance AI assistance does the team want? Some organizations prefer fully manual compliance for liability reasons.

### Workflow

6. **Outlet directory:** Does the team have a structured list of buyers/outlets, or is it all in people's heads? The Disposition Plan v0 needs seed data.

7. **Pricing visibility within org:** Should all agents see all deal pricing, or is margin data manager-only?

8. **Offline capture:** Do field agents need to capture data at remote facilities without internet? Offline-first is a significant investment — need to confirm the actual need.

### Timing

9. **SB253 urgency:** Is SB253 a selling point for our current client or a future-client play? If urgent, it moves from Phase 2 to Sprint 3.

10. **Buyer portal timeline:** Phase 2 starts the buyer portal. Should we pull any part of it earlier if buyer adoption is the growth lever?

---

## Appendix: Glossary

| Term | Definition |
|---|---|
| **Generator** | The factory or plant that produces the waste — our client's client |
| **Offtaker / Outlet** | Who buys or receives the waste material (recycler, fuel blender, TSDF) |
| **SDS** | Safety Data Sheet — manufacturer document with composition, hazards, handling info |
| **RCRA** | Resource Conservation and Recovery Act — federal law governing hazardous waste classification |
| **F003** | RCRA waste code for spent non-halogenated solvents (MEK, xylene, acetone) |
| **e-Manifest** | EPA's electronic hazardous waste tracking system (replacing paper manifests) |
| **TSDF** | Treatment, Storage, and Disposal Facility — licensed hazardous waste handler |
| **DOT** | Dept. of Transportation — governs shipping classification and placards |
| **MEK** | Methyl Ethyl Ketone — common industrial solvent, frequent subject of waste deals |
| **Karl Fischer** | Lab test for water content in solvents (~$150 vs. $1,500 for full panel) |
| **SB253** | California Climate Disclosure Act — Scope 3 emissions disclosure, deadline Aug 2026 |
| **EPR** | Extended Producer Responsibility — laws requiring traceability by material and destination |
| **EPA WaRM** | EPA Waste Reduction Model — calculates CO2 avoided by diverting waste from landfill |
| **Material Passport** | Buyer-ready 8-section document: specs, evidence, compliance, ESG, engineer pathway |
| **Evidence Graph** | Every data field linked to its source: document, page, extraction date, validator |
| **Completeness Score** | Weighted % of how buyer-ready a deal is, based on field importance |
| **Outcome Ledger** | Mandatory capture at deal close: price, buyer, win/loss, lab outcomes |
| **Review Gate** | Senior approval workflow before passport can be shared externally |
| **Disposition Plan** | Per-deal list of outlet candidates, their requirements, and current status |
