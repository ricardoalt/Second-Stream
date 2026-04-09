# SecondStream Agent Harness Plan

**Date:** 2026-04-09  
**Status:** Living product + architecture plan  
**Purpose:** document the current thesis for turning SecondStream into a vertical AI OS for waste brokers, with an explicit agent harness, filesystem-backed memory, and a phased path from today's codebase.

## Locked decisions so far

- Durable memory root: `organization`
- Derived memory views: `client`, `location`, `stream/deal`
- Harness write policy v1:
  - agents can write freely to memory, notes, artifacts, and clearly marked drafts
  - agents must require human approval for transactional truth changes and sensitive external actions
- First canonical agent: `Discovery Completion Agent`
- Primary output of first canonical agent: `Discovery Brief`
- Primary product surface for `Discovery Brief`: inside the stream workspace
- `Discovery Brief` must also persist as a durable artifact in the memory/filesystem layer
- Chat may explain the brief, but chat is not the canonical surface
- `Discovery Brief` refresh model v1: automatic on relevant product events + explicit manual refresh action
- `Discovery Brief` transparency model: structured rationale, provenance, confidence, assumptions, and change diff; no raw chain-of-thought exposure
- Broker correction model: structured point-level feedback, not only whole-brief voting and not freeform overwrite as the primary path
- `Discovery Brief` to workspace relationship: the brief produces reviewable workspace suggestions; it does not write directly to canonical workspace truth
- First historical knowledge collection: `historical waste-stream dossiers`

---

## 1) Product thesis

SecondStream should be designed as a **vertical AI platform for waste brokers**.

The product is not just:
- a proposal generator
- a CRM
- a document uploader
- a generic chat assistant

The product thesis is:

**SecondStream becomes the operating system where waste brokers structure discovery, accumulate operational intelligence, coordinate deals, and eventually connect the full network around the deal.**

Current center of gravity:
- internal broker workspace
- discovery-first workflow
- human-in-the-loop AI assistance

Long-term direction:
- collaborative network across generator, broker, logistics, buyer, and other involved parties
- SecondStream as the standard operating layer for this category

---

## 2) Core problem

Waste brokerage work is high-variance, knowledge-heavy, and fragmented across:
- calls
- email
- PDFs / SDS / lab reports
- voice notes
- human memory
- regulations
- buyer/outlet constraints

This creates recurring failures:
- missing information freezes deals
- pricing depends on tacit broker memory
- compliance context is hard to trace
- deal context gets lost between steps
- teams cannot scale without hiring more experienced operators

SecondStream should solve this by combining:
- operational workflow
- agent assistance
- durable memory
- auditability
- reusable intelligence

---

## 3) Strategic framing

### What SecondStream is today

In code today, SecondStream already has meaningful foundations for:
- company/location/client management
- multimodal discovery intake
- draft review and confirm-only resolution
- workspace enrichment
- offer pipeline and follow-up states
- voice interview upload/transcription/review flow

### What SecondStream is becoming

SecondStream should evolve from a project/proposal-oriented app into a **domain control plane for waste-broker work**.

That means:
- the app itself becomes the harness for agents
- the broker remains the central operator
- AI helps with discovery, synthesis, memory, and execution
- high-risk actions remain policy- and approval-aware

---

## 4) Harness definition

For SecondStream, **harness** should mean the full operating environment around the agent, not just MCPs or plugins.

The harness includes:
- product APIs and domain actions
- tool registry and schemas
- agent identities and permissions
- session/run management
- memory layers
- approvals and policy rules
- observability and audit trails
- UI/control plane surfaces for humans
- integration surfaces (internal tools, MCPs, external systems)

Mental model:

**The model is only one component. The harness is the product environment that makes the agent useful, safe, and stateful.**

---

## 5) Why filesystem-first matters

Classic RAG should not be the center of the architecture.

RAG can still be useful in narrow places, but it is often:
- heavy to maintain
- weakly grounded in runtime state
- too focused on text injection instead of operational context

For SecondStream, the stronger default is:
- filesystem-backed durable memory
- artifact-oriented context assembly
- explicit folders/files per org/account/stream/run/topic
- retrieval/indexing only where it adds real value

Filesystem-first is attractive because it gives agents:
- human-readable structure
- stable artifacts
- append-friendly memory
- easy inspection and debugging
- natural fit for multi-agent collaboration

This is where **S3 Files** becomes strategically interesting.

Not as a replacement for transactional truth.
As a shared file-native substrate for:
- agent sessions
- durable notes
- precedent libraries
- historical stream dossiers
- pricing context packs
- compliance playbooks
- run artifacts and summaries

---

## 6) Architectural split: truth vs memory

This separation is mandatory.

### A. Transactional truth

Keep in database-backed product systems:
- organizations
- users / roles / permissions
- companies
- locations
- projects / streams / future deal entities
- workspace state
- follow-up state
- approvals
- official audit events
- external sync state

This remains the system of record.

### B. Agent memory + knowledge layer

Good fit for filesystem-backed storage such as S3 Files:
- per-session working memory
- per-stream durable notes
- historical case folders
- pricing precedent libraries
- outlet requirement packs
- compliance reference packs
- transcript derivatives
- extracted evidence snapshots
- broker briefing packs
- reusable synthesis artifacts

This layer is durable and valuable, but not the canonical source of transactional truth.

Working assumption now locked:
- the durable memory root is the organization
- client, location, and stream/deal views are derived slices over that organization-rooted memory space

### C. Retrieval/index layer

Optional and supplemental:
- metadata catalogs
- search indices
- semantic retrieval where justified
- lightweight vector/keyword hybrids if needed

Retrieval supports the filesystem layer; it does not replace it.

---

## 7) Proposed Agent Harness architecture

### Layer 1. Product system of record

- Postgres-backed business truth
- canonical APIs
- RBAC / org boundaries
- workflow state

### Layer 2. Agent control plane

- agent/session/run lifecycle
- tool registry
- budgets/retries/timeouts
- policy engine
- approval routing
- observability
- replay/audit

### Layer 3. Filesystem knowledge fabric

- shared file-native memory on S3 Files or equivalent
- organized by org / client / location / stream / run / knowledge-domain
- readable by agents and maintainable by humans/operators when appropriate

### Layer 4. Agent workforce

Specialists operating inside the harness:
- discovery
- workspace completion
- pricing precedent
- compliance support
- offer follow-up
- account briefing

### Layer 5. Human control surface

- inspect what the agent knows
- inspect what it wrote to memory
- inspect why it recommended something
- approve or reject sensitive actions
- correct and feed back into the system

---

## 8) What the current codebase already gives us

The existing codebase is not an agent harness yet, but it already exposes useful primitives.

### Existing capabilities that can become tools

- discovery session creation and source attachment
- bulk import review/finalize flows
- workspace read/update/complete-discovery
- company/location/contact/incoming material management
- offer detail and offer pipeline reads
- follow-up state updates
- file upload/list/delete/download
- voice interview creation/status/retry/transcript
- proposal generation and inspection

### Important current implementation truth

The codebase is still semantically anchored in:
- `Project`
- `Proposal`

Even though parts of the UX and workflow already reflect a discovery-first waste-stream direction.

This means the harness should initially integrate with the existing domain model, while acknowledging that a future semantic shift may still be required.

---

## 9) What is missing for a real harness

Current gaps:
- no first-class agent identity model
- no normalized tool registry over product capabilities
- no run/session execution model for autonomous work
- no durable agent memory model
- no approval control plane for agent actions
- no clear separation between speculative agent notes and business truth
- no unified domain control UI for inspecting agent work
- no filesystem knowledge substrate yet

These are not implementation details. They are product requirements for the harness.

---

## 10) Recommended memory model

### Memory type 1: session memory

Purpose:
- what happened during a specific agent run/session
- temporary checkpoints
- notes on unresolved questions
- intermediate synthesis

Example folders:
- `org/{org_id}/sessions/{session_id}/`
- `org/{org_id}/streams/{stream_id}/runs/{run_id}/`

Authority rule:
- agents may write here without human approval

### Memory type 2: stream/deal memory

Purpose:
- reusable long-lived context for one stream/deal
- summaries, historical notes, prior blockers, prior outreach context

Example folders:
- `org/{org_id}/streams/{stream_id}/memory/`
- `org/{org_id}/streams/{stream_id}/evidence/`

Authority rule:
- agents may write derived notes, summaries, and artifacts here without human approval
- agents may not mutate official product truth only by writing here

### Memory type 3: historical knowledge base

Purpose:
- reusable intelligence across deals
- past similar waste streams
- pricing precedents
- outlet fit patterns
- compliance playbooks

Recommended first collection to build:
- `historical waste-stream dossiers`

Why first:
- directly supports the Discovery Completion Agent
- aligns with the current discovery-first product thesis
- can be built from current workflows before deeper pricing/compliance intelligence is mature
- creates the substrate for later pricing and compliance collections

Example folders:
- `org/{org_id}/knowledge/pricing/`
- `org/{org_id}/knowledge/materials/`
- `org/{org_id}/knowledge/outlets/`
- `org/{org_id}/knowledge/compliance/`

Authority rule:
- agents may append curated artifacts, summaries, and precedent packs
- promotion of knowledge into canonical policy or operational defaults should remain human-reviewed in v1

### Memory type 4: cross-agent collaboration artifacts

Purpose:
- one agent leaves artifacts another can consume
- enable bounded multi-agent collaboration without stuffing everything into prompt context

Example folders:
- `org/{org_id}/streams/{stream_id}/artifacts/discovery/`
- `org/{org_id}/streams/{stream_id}/artifacts/pricing/`
- `org/{org_id}/streams/{stream_id}/artifacts/compliance/`

Authority rule:
- agents may read and write these artifacts without approval
- these artifacts are working products, not canonical transaction records

Recommended rule:

**Memory is durable and inspectable. Truth is transactional and authoritative.**

Policy corollary:
- no agent write into memory alone changes official workspace truth, lifecycle state, or external-system state

---

## 11) Initial agent roster

Do not start with a swarm.

Start with one orchestrator and a few bounded specialists.

### Recommended first canonical agent: Discovery Completion Agent

Why first:
- aligns with the strongest product thesis: discovery-first
- aligns with what the code already supports
- creates immediate value for brokers
- naturally benefits from session memory and historical precedent

Responsibilities:
- read discovery sources
- summarize what is already known
- detect missing critical information
- propose next-best questions
- suggest workspace/questionnaire completion
- prepare a broker-ready discovery brief

Primary output:
- `Discovery Brief` as the main artifact of the agent

Primary product surface:
- embedded in the stream workspace as part of the broker's normal operating flow

Durability rule:
- every Discovery Brief should also be persisted as a durable artifact in the memory/filesystem layer for auditability, reuse, and cross-agent consumption

Chat rule:
- chat may explain, summarize, or answer questions about the Discovery Brief
- chat is not the canonical place where the brief lives

Refresh rule:
- the Discovery Brief should refresh automatically on relevant events such as:
  - new discovery source added
  - voice/document/text processing completed
  - meaningful draft review decisions accepted/rejected
  - material workspace or questionnaire changes
  - important new evidence added
- the broker must also have an explicit manual `Refresh Brief` action

Transparency rule:
- the Discovery Brief should expose:
  - conclusions
  - concise rationale
  - provenance / source references
  - confidence
  - assumptions
  - change summary versus the prior version
- the Discovery Brief should not expose raw chain-of-thought or unfiltered internal reasoning traces as the primary UX

Correction rule:
- the broker should be able to act on individual important points in the brief
- recommended point-level actions:
  - `Accept`
  - `Mark incorrect`
  - `Needs verification`
  - `Add note`
  - `Promote to workspace suggestion` when applicable
- recommended brief-level actions:
  - `Refresh`
  - `Approve as current working brief`
- avoid making whole-brief thumbs-up/down the primary feedback mechanism
- avoid freeform human overwrite of the brief as the primary correction path in v1

Brief-to-workspace rule:
- the Discovery Brief may emit structured `workspace suggestions`
- those suggestions should be reviewable and promotable by the broker
- the Discovery Brief itself must not write directly into canonical workspace truth
- accepted suggestions may then update workspace truth through the normal reviewable product path

The `Discovery Brief` should contain:
- what is already known
- what is missing
- what is currently blocking progress
- which facts have low confidence
- which questions should be asked now
- which sources support each important point
- recommended next action for the broker

Why this output is preferred:
- visible and auditable
- useful even before deeper autonomy exists
- easy to persist into memory/artifact layers
- aligned with discovery-first value instead of generic chat

### Next likely specialists

1. Workspace Completion Agent
   - convert sources into structured workspace progress
   - propose field/questionnaire values
   - explain confidence and blockers

2. Pricing Precedent Agent
   - search historical cases
   - retrieve pricing analogs and tradeoffs
   - produce a pricing context brief, not an autonomous final decision

3. Compliance Support Agent
   - identify regulatory questions
   - surface missing required artifacts
   - prepare compliance research pack

4. Offer Follow-Up Agent
   - synthesize stream status, risks, and next commercial action
   - help prepare outreach and follow-up briefs

---

## 12) Tooling philosophy

The harness should not expose hundreds of vague tools.

Prefer a small, legible set of domain actions with stable schemas.

### Example tool groups

#### Domain read tools
- `get_company`
- `get_location`
- `get_stream`
- `list_open_streams`
- `get_offer_pipeline`

#### Discovery tools
- `create_discovery_session`
- `attach_discovery_source`
- `start_discovery_review`
- `review_discovery_drafts`
- `resolve_company_or_location`

#### Workspace tools
- `get_workspace`
- `update_workspace_fields`
- `update_questionnaire_answers`
- `refresh_workspace_insights`
- `complete_discovery`

#### Knowledge tools
- `load_stream_memory`
- `write_session_memory`
- `load_pricing_precedents`
- `load_outlet_requirements`
- `materialize_broker_briefing`

#### Human-control tools
- `request_approval`
- `record_correction`
- `show_rationale`
- `escalate_to_broker`

### Baseline approval policy

Agents may act without approval when they are:
- writing session memory
- writing working notes
- generating briefings
- generating research packs
- generating clearly marked drafts
- materializing derived artifacts in the filesystem knowledge fabric

Agents must require approval when they are:
- changing canonical workspace truth as final accepted data
- changing official deal or offer states
- creating or linking critical entities under ambiguity
- sending external communications
- synchronizing external systems such as CRM or marketplace
- closing workflow stages
- taking actions with commercial, compliance, or external consequences

---

## 13) Role of S3 Files

S3 Files should be evaluated as the likely substrate for the filesystem knowledge fabric.

### Why it fits

- file-native access for agents
- shared workspace across compute/services/agents
- low-friction read/write mental model
- easier artifact handling than pure object-storage APIs
- good fit for active working sets plus large historical corpora

### Where it should help

- per-stream dossiers
- pricing precedent folders
- compliance reference packs
- session/run artifacts
- shared artifacts across agents
- operator-inspectable memory snapshots

### Where it should not be abused

- not a replacement for product database truth
- not the source of canonical status transitions
- not the only audit layer
- not a substitute for RBAC and workflow semantics

---

## 14) Lessons from current agent products

### Harness lesson

High-value agent products are increasingly defined by their harness:
- tool environment
- policies
- approval surfaces
- runtime boundaries
- context ownership

The app is the harness.

### Filesystem lesson

Filesystem-centric workflows are attractive because they make state, artifacts, and collaboration more inspectable and more grounded than prompt-only architectures.

### OpenClaw-style lesson worth carrying over

Useful transferable patterns:
- control plane, not just chat
- session as first-class object
- durable inspectable memory
- explicit compaction/writeback mindset
- workspace boundaries

Patterns that do not transfer directly:
- personal-assistant trust model
- broad host/device control by default
- consumer companion framing
- filesystem memory as the only source of truth

---

## 15) Phased plan

### Phase 0: Harness framing and contracts

Goal:
- define the harness explicitly before shipping agent sprawl

Deliverables:
- domain tool inventory
- agent identity model
- session/run model
- memory taxonomy
- approval boundaries

### Phase 1: Discovery agent inside current product

Goal:
- ship one high-value agent aligned with current codebase

Deliverables:
- Discovery Completion Agent
- session memory per stream/run
- broker-facing explanation and rationale surface
- durable notes written to filesystem layer

### Phase 2: Knowledge fabric

Goal:
- make historical context reusable across deals

Deliverables:
- stream dossiers
- pricing precedent library
- compliance/outlet knowledge packs
- memory write/read rules

### Phase 3: Specialist agents

Goal:
- move from one agent to a bounded workforce

Deliverables:
- pricing specialist
- compliance specialist
- follow-up specialist
- orchestrator-to-specialist handoff rules

### Phase 4: Multi-party collaboration

Goal:
- expand beyond internal broker workspace into network workflows

Possible future surfaces:
- buyer-facing contexts
- logistics coordination surfaces
- shared evidence packages
- external collaboration with controlled permissions

---

## 16) Immediate implications for roadmap thinking

Features should be judged by this question:

**Does this strengthen SecondStream as an operating environment for waste-broker intelligence and execution?**

Good candidates:
- memory and evidence structures
- knowledge reuse across streams
- approvals and auditability
- agent-readable domain tools
- broker-facing control surfaces

Weak candidates:
- generic chatbot features with no workflow leverage
- flashy agent swarms without bounded responsibilities
- premature channel sprawl
- filesystem memory treated as a shortcut around domain modeling

---

## 17) Open questions

1. Should the future canonical domain object remain `Project`, or evolve to `Stream`, `Deal`, or a split model?
2. Which actions should always require human approval in v1?
3. What should be the first durable knowledge collection:
   - pricing precedents
   - waste-stream historical dossiers
   - compliance/outlet requirement packs
4. How much of agent memory should be human-editable versus machine-only?
5. What is the right control-plane UI for brokers: side panel, dedicated inbox, run timeline, or a mix?
6. When multi-party collaboration arrives, does the broker remain the sole orchestrator, or can external actors contribute directly into shared deal memory?

---

## 18) Current recommendation

Lock these as working assumptions for refinement:

- SecondStream is a **vertical AI OS for waste brokers**.
- The **application itself is the harness**.
- The current product center is the **internal broker workspace**.
- The first canonical agent should be the **Discovery Completion Agent**.
- The long-term moat is **workflow + memory + knowledge + network**, not model access alone.
- **Filesystem-backed memory** should be treated as a strategic layer, with **S3 Files** as a strong candidate substrate.

This document should keep evolving as product, architecture, and code converge.
