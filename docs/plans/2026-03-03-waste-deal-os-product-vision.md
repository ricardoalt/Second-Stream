# Waste Deal OS — Product Vision

**Date:** March 3, 2026
**Audience:** Internal team
**Purpose:** Align on the product pivot, user flow, and what changes in the platform

---

## The One-Liner

**Waste Deal OS turns weeks of manual deal work into hours — by putting AI where it actually helps: extracting data, tracking what's missing, learning your pricing, and catching compliance issues.**

**Naming note:** "Waste Deal OS" is a working name for this document set; the team also discussed "Stream Asset Reclassification" as a potential external name.

---

## What Changed and Why

### The original idea

We built an AI that analyzes waste streams and generates business opportunity ideas — "you could convert this to X and sell to Y at Z price."

### Why it didn't work

Our client's team — with 20+ years of experience — already knows what to do with every material. They don't need AI to tell them to "sell spent solvent to a recycler." That's day-one knowledge for them.

The real insight came from listening to how deals actually work:

> "The proposal is trivial. What's hard is converting an ambiguous material into a compliant, profitable movement without getting lost in the discovery."
> — Russ

### The real problems

When a field agent visits a factory and starts a new deal, here's what actually slows them down:

| Problem | Impact |
|---------|--------|
| **Waiting for information** from the facility — EHS contacts need to check with their plant, which takes days or weeks | Deals freeze. Agents lose track of what's pending across 10+ deals |
| **No pricing reference** — "What's the going rate for spent MEK in Texas?" lives in Steve's head, not in any system | New agents can't price deals. Veterans leave and take knowledge with them |
| **Lab test decisions** — each test costs ~$1,500 and many are unnecessary, but skipping one can kill a deal | Money wasted on unnecessary tests, or deals lost from missing data |
| **Regulatory complexity** — the same substance can be hazardous or not depending on state, process, and exit route | Compliance mistakes mean fines. Manual lookups take hours |
| **Old documents** — a lab report from 4 years ago might be useless, but no one tracks freshness | Buyers reject offers based on stale data. Rework and delays |
| **Hidden costs** — a generator's "true cost" is buried in invoice line items they don't even see | Agents can't show the real savings they're offering |

**None of these problems are solved by generating business ideas.** They're solved by an intelligent system that helps at every step of the deal.

---

## The New Product: Waste Deal OS

### What it is

An intelligent workspace where field agents work their deals daily — with AI actively helping at every step, not just at the end.

Think of it as: **the operating system for waste deals.** Not a report generator. Not a CRM. The place where every deal lives, where institutional knowledge accumulates, and where AI does the tedious work so experts can focus on what they do best.

### What it is NOT

- NOT a replacement for the sales engineer's expertise
- NOT an AI that tells you what to do
- NOT a chatbot or copilot that could be replaced by ChatGPT
- NOT a CRM (CRM integration comes later)

### The core philosophy

> **AI doesn't invent — it structures, enriches, accelerates, and learns from the expert's work.**

The sales engineer knows the business. The AI handles the grunt work: parsing documents, tracking what's missing, looking up similar past deals, and flagging regulatory issues. The expert stays in control.

---

## What Changes in Our Platform (Before -> After)

This is the concrete shift for the team: not "a proposal generator", but a **system of record + workflow** for Discovery-to-Disposition.

**Before (today):**
- Unstructured notes + attachments; no reliable "what's missing" view
- Proposal assembled manually late (Word/PDF), then buyer questions -> rework
- Pricing/compliance knowledge lives in people's heads
- Low trust externally: no field-level provenance ("why do you believe this?")
- Ops/pickup readiness and outlet discovery live in emails/calls, not in the system

**After (with Waste Deal OS):**
- Deal Workspace becomes the daily home for each deal (not a one-off form)
- Missing Info Tracker answers "what do I ask next?" with blockers + impact + follow-ups
- Documents become evidence (freshness, purpose, coverage) + field-level traceability (Evidence Graph)
- Discovery Pack (internal) is the handoff artifact for seniors; Material Passport is the export artifact after review
- Outcome capture is mandatory at close, turning tribal pricing into institutional memory
- Ops/pickup readiness + outlet candidates become first-class (not hidden in inboxes)

**What we reuse (already built):**
- Image analysis, document extraction, voice transcription/extraction
- Human-in-the-loop apply/reject UI patterns from Intake

## The Core User Flow (6 steps)

```
Capture -> Structure -> Validate -> Review -> Share -> Close (Outcomes)
  |          |           |          |        |         |
  |          |           |          |        |         +-- Outcome Ledger (mandatory)
  |          |           |          |        +------------ PDF/email now; buyer portal later
  |          |           |          +--------------------- Senior gate (pricing/compliance/IP)
  |          |           +------------------------------- Compliance flags + evidence freshness
  |          +------------------------------------------- Missing info blockers + completeness
  +-------------------------------------- Photos/voice/docs -> structured fields + evidence
```

## Discovery Pack vs Material Passport (Publish Boundary)

| | Discovery Pack (internal) | Material Passport (exportable) |
|---|---|---|
| Primary user | Field agent + senior reviewer | Buyer / external stakeholders |
| Goal | Fast, structured handoff; make review efficient | Buyer-ready dossier with only approved claims |
| Data layer | Working + record (role-gated) | Record only (redacted by policy) |
| Includes | Blockers, outlet candidates/status, ops readiness, internal context | Specs, compliance status (validated), evidence appendix, ESG calcs |
| When created | As you work (always present) | After Review Gate approval |

## How It Works: Two Things That Work Together

### 1. The Deal Workspace (the daily experience)

Every deal gets an intelligent workspace. As the agent captures data — photos, documents, notes, voice recordings — four AI engines work in the background:

Internally, the same workspace produces a **Discovery Pack** view: structured, reviewable, and evidence-linked so a senior ("Steve") can act fast before anything is shared externally.

It also maintains a lightweight **Disposition Plan**: outlet/offtaker candidates, their requirements, and current status (manual at first; becomes intelligent as outcomes accumulate).

#### Engine 1: Document Intelligence
Upload an SDS, lab report, or photo → AI extracts the relevant data automatically.

- "This SDS shows primary component is MEK, flash point 16°F, classified flammable"
- "This lab report is from 2022 — 4 years old. Buyer will likely want a fresh one"
- "The SDS says 'virgin MEK' but this waste is spent — composition may differ"

**What exists today:** We already have AI that extracts data from documents and photos. The upgrade adds freshness tracking and consistency checking.

**Evidence Graph:** Key extracted fields link back to the exact source (document + page + date) and who validated them.

#### Engine 2: Missing Info Tracker
A live dashboard showing what information is still needed and why it matters.

- Shows a **Deal Completeness Score** — "This deal is 62% ready"
- Identifies blockers: "Without volume data, you can't get a transport quote"
- Identifies ops/pickup blockers: "Missing NDA/COI/insurance" or "Vacuum truck required" or "Placards not confirmed"
- Generates follow-up emails to the facility contact: "Here's a suggested email asking for the 3 items we still need"
- Suggests workarounds: "No density data? Give me container dimensions and weight, I'll calculate it"
- Handles criticality: if the material blocks production, require redundancy (2+ outlet candidates) before review

**Why this matters:** Russ said "waiting for information dominates the funnel." This engine makes sure nothing falls through the cracks across all active deals.

#### Engine 3: Pricing Intelligence
The institutional memory that currently lives in people's heads — now in the system.

- "3 similar deals in Texas last year: $0.08–$0.12/lb"
- "The generator thinks they pay $0.12/lb, but with all fees it's actually $0.26/lb — show them the real cost"
- "Hypothesis: deals with fresh lab data close faster — the system will measure and quantify this"

**The most important thing about this engine:** It starts empty and gets smarter with every deal. After 3-6 months, the organization has a pricing index that doesn't exist anywhere else in the industry. Over time, it becomes extremely difficult for a competitor to match because it's built from your own outcomes.

#### Engine 4: Compliance Copilot
Advisory assistance for regulatory classification — never makes decisions, always suggests.

- "This is probably F003 (spent non-halogenated solvent) based on the composition and process"
- "California has additional requirements for this waste code"
- "DOT shipping name: Ketones, liquid — Class 3 Flammable placard required"
- "If this is being sold as product (not discarded), it may not be classified as waste"

**Always marked as advisory.** The compliance officer makes the final call. But instead of hours of manual regulatory lookup, the agent gets a starting point in seconds.

### 2. The Material Passport (the deliverable)

When a deal has enough data and the agent marks it ready, the system generates a **Material Passport** — a professional, buyer-ready document that replaces the manual Word/PDF proposals.

**What's in it:**

| Section | What it shows |
|---------|--------------|
| **Material Identity** | What it is, where it comes from, photos with AI analysis |
| **Technical Specs** | Composition, physical properties, packaging, volume, quality grade |
| **Safety & Handling** | Hazards, PPE, storage, transport classification |
| **Compliance Status** | Regulatory classification, state-specific flags, document completeness |
| **Environmental Impact** | CO2 avoided, water savings, circularity score, ESG statement — calculated from real EPA data |
| **Engineer Pathway** | What the sales engineer plans to do — defined by the human, not the AI |
| **Evidence Pack** | All attached documents with freshness indicators |
| **Traceability** | Every key field links to its source (document/page/date) and who validated it |
| **Deal Readiness Score** | How complete and buyer-ready this passport is |

**Data governance note:** The system separates working/discovery artifacts (drafts, raw transcripts, intermediate extractions) from retained compliance records (final passport, final supporting docs, outcomes). Exports reference only the record layer.

**Key difference from today:** The passport assembles progressively as the agent works — it's not a magic "generate" button at the end. By the time the agent hits "finalize," most content is already structured and linked to evidence.

### The Review Gate

Before any passport goes to a buyer, a senior engineer or manager reviews it:

```
Field Agent captures data and works in workspace
         ↓
Agent marks deal as "Ready for Review"
         ↓
Senior reviews: checks pricing, classification, pathway
         ↓
Senior approves → Professional passport generated
         ↓
Shared with buyer via link or PDF
```

**Why this matters for the business:**
- Pricing is proprietary IP — it shouldn't go out unchecked
- Regulatory classification has legal implications
- The Material Passport represents the company's professional reputation

**The hidden benefit:** Every time a senior corrects something, the system learns. Over time, the drafts arrive more accurate, reviews take less time, and the organization's knowledge lives in the system — not just in people's heads.

---

## The Lab Decision Engine

This deserves special attention because it directly saves money.

**The problem:** Each lab test costs ~$1,500. Order the wrong test and you've wasted money. Skip a needed test and the buyer rejects your material or you send a "bad load" that costs thousands more.

**What the engine does:**

Instead of the agent guessing, the system recommends:

- "The buyer requires water content <2%. Your last test (2023) shows 1.8% but it's 3 years old. Recommend: water content test only ($150), NOT full panel ($1,500)."
- "3 out of 4 similar past deals required a water test. The 4th buyer accepted a trial load."
- "Cost-benefit: test costs $150, deal is worth ~$4,800/year. If missing data often causes rejection for this material family, testing has positive expected value." (Phase 1 starts rules-first; percentages come later from outcomes)

**The rules come from three sources:**
1. Material-specific knowledge from senior engineers (codified once, used forever)
2. Buyer requirements (Phase 2 — when buyers tell us what they need)
3. Historical deal outcomes (learned automatically as deals close)

---

## What Changes Day-to-Day

### Before: The current process

1. Visit facility, take notes on paper/phone
2. Back at office, manually type data into spreadsheets
3. Email EHS contact for missing info → wait days/weeks
4. Call a colleague to ask "what's the going rate for this material?"
5. Manually search state regulations
6. Assemble a Word/PDF proposal over 1-2 weeks
7. Email PDF to buyer
8. Buyer asks questions → rework

**Time from visit to buyer-ready proposal: 1-2 weeks**

### After: With Waste Deal OS

1. Visit facility — take photos (AI classifies material instantly), record voice notes (AI transcribes and extracts), upload SDS (AI extracts composition, hazards, specs)
2. Open Deal Workspace — many fields already populated
3. Missing Info Tracker shows exactly what's still needed, with suggested follow-up emails
4. Pricing Intelligence shows similar past deals and their outcomes
5. Compliance Copilot flags regulatory requirements
6. Lab Decision Engine recommends specific tests (not expensive full panels)
7. Engineer fills in their plan — the system doesn't invent, it supports
8. Senior reviews → Material Passport generated → shared with buyer
9. Buyer sees professional dossier with specs, evidence, ESG metrics — no rework

**Time from visit to buyer-ready passport: hours, not weeks**

---

## The Roadmap: How We Get There

### Phase 1: Deal Workspace + Material Passport (8 weeks)

**Goal:** Field agents use Waste Deal OS daily and produce Material Passports.

What gets built:
- Workspace with 4 AI engines (Document Intelligence, Missing Info Tracker, Pricing Intelligence, Compliance Copilot)
- Discovery Pack (internal) + evidence traceability for key fields
- Material Passport with 8 sections
- Lab Decision Engine
- Senior review workflow
- Outcome capture is mandatory at close (pricing, win/loss, reason)
- e-Manifest field mapping export (readiness/data-entry elimination; not EPA submission)

**Validation:** Test with 2-3 field agents on real deals. Measure time-to-passport and satisfaction.

**Success criteria (Phase 1):**
- Time to first viable, reviewable Discovery Pack (and time to approved passport)
- Days blocked by missing info (and which blockers dominate)
- Lab spend per deal; % tests later judged unnecessary
- Outcome Ledger completion rate on closed deals (target: ~100%)
- Review cycle time (request -> approved) and rework rate

### Phase 2: Buyer Portal + Compliance (12-16 weeks)

**Goal:** Buyers interact with the platform. Compliance becomes a competitive advantage.

What gets built:
- Buyer receives a shareable link instead of a PDF by email
- Buyer engagement tracking (what did they look at? how long?)
- Buyer requirement templates per material type
- SB253 Supplier Data Pack (California deadline: August 2026)
- e-Manifest integration planning (if/when EPA workflows are in-scope)

**Why Phase 2 matters for the business:**
- Buyers start depending on the passport format → switching cost
- SB253 compliance creates urgency for corporate clients → new revenue opportunity
- Engagement tracking gives agents intelligence about buyer interest

### Phase 3: The Multiplayer Platform (6+ months)

**Goal:** Generators, brokers, and buyers all use the platform.

What gets built:
- Generator self-service portal (factories submit waste stream info directly)
- Smart matching (waste streams matched to buyer requirements)
- ESG certification and impact tracking
- CRM integration (HubSpot)

**Why Phase 3 matters:** This is where network effects kick in. Each new participant makes the platform more valuable for everyone else. The broker stays in the center as the trusted intermediary — but now receives structured leads, has pre-qualified buyers, and has data-backed pricing for everything.

---

## Why This Creates a Business That Lasts

### The "moat" — why customers can't leave

Most software tools are replaceable. You can switch from one CRM to another, from one spreadsheet to another. But Waste Deal OS builds three layers of defense over time:

**Layer 1 — Speed (from day one)**
The platform makes deals faster. Hours instead of weeks. That's useful from day one, but a competitor could replicate it.

**Layer 2 — Institutional Knowledge (after 3-6 months)**
Every deal that closes deposits pricing data, classification patterns, and lab decision outcomes. After 100 deals, the platform contains a proprietary pricing index and compliance knowledge base that doesn't exist anywhere else. A new employee can leverage years of experience from their first deal. **Leaving means losing this accumulated intelligence.**

**Layer 3 — Network (after 12+ months)**
When buyers configure their requirements, generators submit their waste streams, and everyone works through the platform — migrating means breaking established relationships and processes. **Leaving means breaking the ecosystem.**

### What a competitor would need to catch up

| To replicate... | They would need... |
|-----------------|-------------------|
| Our AI extraction | 3-6 months of development (achievable) |
| Our pricing index | Years of real deals in real markets (not achievable in a lab) |
| Our compliance rules | Hundreds of expert corrections across dozens of material families (not achievable quickly) |
| Our buyer/generator network | Critical mass of all three actor types (chicken-and-egg barrier) |

---

## Market Research & Competitive Landscape (Optional)

This section is supporting context (urgency + why this is a defensible business). It's not required to understand the Phase 1 build.

### The regulatory clock is ticking

- **California SB253 deadline: August 10, 2026** (5 months from now) — large corporations must disclose their emissions, including Scope 3 (waste). This means they'll need structured data from their waste providers. Brokers who can generate "Supplier Data Packs" automatically have an immediate competitive edge.
- **EPA e-Manifest** is pushing everything digital — paper manifest processing fees are up to 80% higher than electronic. The industry is forced to digitize.
- **EPR laws in 7 states** (CA, CO, ME, MD, MN, OR, WA) require traceability by material type and destination — exactly what our passport captures.
- **The EU is mandating Digital Product Passports** for multiple product categories starting 2026-2028. Battery Passports are obligatory from February 2027. The "passport" concept is becoming global infrastructure.

### Competitors are weak where we're strong

| Competitor | What they do | What they DON'T do |
|---|---|---|
| cieTrade, AMCS, Scrap Dragon | Operations: weight, tickets, fleet, billing | No AI, no evidence layer, no intelligence |
| Wastebits | Waste profiles, e-Manifest, quoting | No AI extraction, no pricing intelligence |
| Encamp ($30M raised) | Compliance reporting | No field capture, no pricing, no buyer artifacts |
| Rubicon (8K+ customers) | Digital waste marketplace | Municipal focus, not broker workflow |

**No one does what we're building:** AI-powered field-to-passport with pricing intelligence, compliance rules, and evidence traceability.

### Validation from funded startups

- **SuperCircle** raised $24M (Dec 2025) building a "waste management OS" for textiles — same concept as ours but for fashion. Validates the market.
- **Encamp** raised $30M proving compliance workflows sell as SaaS when they're painful enough.
- The AI in waste management market is projected to reach **$18.2B by 2033** (27.5% annual growth).

### What gets commoditized vs. what stays valuable

This is the most important finding. AI is evolving fast. Some things we build today will be easy to replicate in 12 months. Others won't.

**Will be commoditized (but still useful as entry point):**
- Extracting data from documents and images — ChatGPT and Claude already do this
- Voice transcription — already a commodity

**Cannot be commoditized (this is our real value):**
- Our pricing database built from real deal outcomes — no public database has this
- Compliance rules tuned to specific materials and states — built from expert corrections over time
- Lab decision recommendations based on real rejection data — impossible without real outcomes
- Multi-actor workflow where buyers approve passports — creates structural switching costs
- Evidence traceability — every data point linked to its source document and validator

**The implication:** AI extraction is how we get in the door (it's impressive in demos, it saves real time). But the pricing data, compliance knowledge, and buyer connections are what make it impossible to leave.

---

## Why This Is Different From "Just Using ChatGPT"

This is a fair question. If AI is the value, why wouldn't someone just use ChatGPT?

| ChatGPT | Waste Deal OS |
|---------|---------------|
| Answers questions in a chat | Lives inside the deal workflow |
| Forgets everything after the conversation | Remembers every deal, price, and outcome |
| Gives generic regulatory answers | Knows state-specific rules tuned to your materials |
| Can't tell you what similar deals cost | Shows you pricing from your own history |
| Can't track what's missing across 10 deals | Dashboard of blockers and completeness per deal |
| Can't share a professional passport with a buyer | Generates buyer-ready documents with evidence trail |
| Anyone can use it | Your data makes it uniquely valuable for YOUR business |
| Will improve at extraction (making basic AI features free) | Our value INCREASES as extraction gets commoditized — we focus on what models can't do: your proprietary data and workflows |

**ChatGPT is a tool. Waste Deal OS is infrastructure.** You use a tool when you need it. You depend on infrastructure because your business runs on it.

The AI industry is moving fast. Companies that built "AI wrappers" (pretty interface over ChatGPT) are dying. Companies that built **systems of action with proprietary data** — like Abridge ($250M raised for clinical AI) and Harvey (legal AI) — are thriving. We're building the latter.

---

## One Critical Ask: Recording Deal Outcomes

There's one thing that makes everything else work: **recording what happens when a deal closes.**

When a deal is won or lost, the system needs to know: at what price? which buyer? why was it lost? was the material rejected? how much did lab tests cost? was the lab test the deciding factor?

This data feeds:
- **Pricing Intelligence** — "similar deals went for $X-Y"
- **Lab Decision Engine** — quantify when tests change outcomes once enough history exists
- **Risk scoring** — quantify how missing/old evidence correlates with rejection once outcomes accumulate

**This cannot be optional.** Every deal that closes without outcome data is a missed opportunity to make the system smarter. We're asking that closing a deal in the system requires filling a short outcome form. It takes 2 minutes and compounds value forever.

---

## What We're Asking From the Team

### Phase 1 needs

1. **2-3 field agents** willing to use the workspace on real deals for 2 weeks and give honest feedback
2. **1 senior engineer** willing to test the review workflow and help codify pricing rules and material-specific lab test knowledge
3. **5-10 real documents** (SDS, lab reports, invoices) to validate AI extraction quality
4. **Feedback on Material Passport structure** — would buyers accept this format?

### Key questions to answer together

1. Are there recognizable "types" of deals that would benefit from different workspace templates?
2. Will the team consistently record deal outcomes (price, win/loss) when deals close? This feeds the pricing intelligence.
3. What do buyers actually expect in terms of documentation format?
4. How much compliance assistance is wanted vs. handled internally?
5. What should the default retention be for working/discovery artifacts (e.g., raw transcripts, drafts) vs retained compliance records?

---

## Summary

| | Before (current) | After (Waste Deal OS) |
|--|---|---|
| **AI role** | Generates business ideas (rejected as too generic) | Extracts data, tracks gaps, suggests pricing, flags compliance |
| **Core artifact** | Proposal with business pathways | Discovery Pack (internal) + Material Passport (export), both with evidence traceability |
| **Time to deliverable** | 1-2 weeks | Hours |
| **Pricing knowledge** | Lives in people's heads | Lives in the system, grows with every deal (data moat) |
| **Compliance** | Manual lookups | AI-assisted with versioned state-specific rules |
| **Lab decisions** | Gut feeling | Data-driven recommendations with cost-benefit from real outcomes |
| **Evidence traceability** | None — "trust me" | Every data point linked to source document, page, and validator |
| **Buyer experience** | PDF by email | Professional link with engagement tracking |
| **Regulatory readiness** | Manual | SB253 data packs, e-Manifest mapping, EPR traceability |
| **Institutional memory** | Walks out the door when people leave | Stays in the system forever |
| **Competitive moat** | None (any tool could replace it) | Outcome data + compliance rules + evidence graph + network |
| **AI commoditization risk** | High (wrapper) | Low (proprietary data + workflows that models can't replicate) |

**The bottom line:** We're not changing what the platform does — we're changing where it creates value. Instead of an AI that competes with the expert's knowledge, we built an AI that amplifies it. And instead of building features that ChatGPT will replicate in 12 months, we're building a system whose value compounds with every deal closed.
