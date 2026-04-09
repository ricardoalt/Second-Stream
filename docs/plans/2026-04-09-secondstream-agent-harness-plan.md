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
- First agent identity: a specialist copilot embedded in the stream workspace, not a general autonomous system-wide agent
- `Discovery Brief` versioning model: explicit versions with history and diffs, but only one `current working brief` active at a time
- Knowledge promotion policy v1: all learnings start at `stream` scope and promote to `organization` scope only after `2+ independent stream confirmations` or explicit human approval for strategic/compliance value
- Agent control plane UI v1: hybrid model with primary surface in the stream workspace and secondary cross-stream inbox/run history surface
- `Agent inbox / run history` v1 scope: supervision of agent work only, not a universal broker work inbox
- Promoted organization knowledge should use a structured `knowledge object` shape, even if stored in filesystem-backed artifacts underneath
- Every promoted organization knowledge object must have an explicit human owner; default v1 owner should be an admin/senior operator
- Chat role v1: secondary interrogation/explanation surface over artifacts like the `Discovery Brief`, not the primary work surface
- Session memory durability v1: curated summaries, key observations, and artifacts by default; not full raw conversational transcripts as the primary durable memory
- Agent execution model: `session` as the live stream context and `run` as each material agent execution within that session
- Session closure rule: sessions close on material stream-context changes, not arbitrary timeouts as the primary rule
- Initial `knowledge object` taxonomy: `pattern`, `playbook`, `constraint`, `compliance_rule`, `pricing_precedent`, `account_note`
- Harness learning loop v1: capture structured high-signal broker feedback, not broad low-signal behavioral telemetry as primary learning input
- Repeated correction policy v1: repeated error patterns create review candidates for org knowledge or rule adjustment, but do not silently change global behavior
- Discovery Brief provenance rule v1: every material point needs explicit source reference; otherwise it must be marked as assumption/inference
- Historical dossier reuse rule v1: reuse historical dossiers automatically for comparative context, questions, and patterns, not as automatic facts for the new case
- External action policy v1 for the first agent: prepare external actions, do not execute them automatically
- Voice policy v1: voice is a first-class input to the Discovery Completion Agent inside one unified multimodal discovery experience, not a separate primary agent experience
- Discovery Brief progression gate v1: broker approval plus minimum completeness/provenance conditions, not an automatic score alone
- Knowledge/artifact lifecycle policy: govern by states such as `draft`, `approved`, `stale`, `superseded`, `archived` rather than deletion as the primary mechanism
- Memory visibility policy v1: role + scope based visibility, with broader access for approved org knowledge and narrower access for local stream memory
- Primary KPI for the first agent: `time-to-working-brief`
- Initial optimization target: waste brokers handling high-complexity discovery with heavy documents, voice, and multi-variable cases
- Harness v1 should integrate with the current `Project/Proposal` domain while explicitly treating future `Stream/Deal` convergence as expected domain evolution, not blocked work
- Discovery Completion Agent proactivity model v1: mostly reactive with bounded proactivity inside the stream
- Discovery Completion Agent context policy v1: automatic access to bounded lateral context (`client`, `location`, same-stream history, similar dossiers, approved org knowledge) but not broad unfiltered organization memory
- Source conflict policy v1: expose conflicts explicitly in the Discovery Brief rather than resolving them silently by default
- Discovery Brief structure v1: fixed core structure with optional dynamic sections
- Discovery Brief role v1: diagnostic plus prescriptive, with prioritized next-best questions/actions always included
- Organization customization policy v1: bounded customization via config, playbooks, approved knowledge, and thresholds; no deep tenant-specific agent forks
- Discovery Brief UI should explicitly distinguish `Fact`, `Assumption`, `Conflict`, `Recommendation`, and `Question` as separate point types
- Important human notes should be stored as first-class structured observations, not isolated freeform text
- Recommendation feedback should separate correctness from execution timing
- Human overrides without hard source support should be accepted but explicitly marked as `human-asserted` until further verification
- Discovery artifact model v1: one primary unified `Discovery Brief` per stream, with optional supporting sub-artifacts behind it
- Silence policy v1: no broker interaction means `pending review`, never implicit approval

## North star

The final objective is not just to ship a useful v1 copilot.

The final objective is:

**SecondStream becomes the operating system and intelligence layer for waste brokers, then expands into the shared platform where the full deal network can coordinate around trusted context, reusable knowledge, and controlled AI execution.**

This means every v1 decision should be judged twice:
- does it create immediate value now?
- does it set up the right path for phase 2, phase 3, and the long-term platform?

Rule for this document:
- every important v1 decision should remain traceable to the longer-term target state
- if a v1 choice is intentionally temporary, that should be explicit

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

Execution model:
- `session` = the active working context for a stream while the operational context remains materially the same
- `run` = one concrete agent execution within that session
- multiple runs may belong to the same session when triggered by refreshes, new evidence, broker corrections, or similar events
- avoid making every run its own isolated session
- avoid making one endless session the only execution container for a stream

Session closure rule:
- close the current session and open a new one when the stream context changes materially, for example:
  - a meaningful phase transition
  - a new primary human owner
  - the core discovery problem is resolved or redefined
  - a major new block of evidence changes the case substantially
  - the current brief becomes materially obsolete
  - the stream enters a different lifecycle stage requiring different agent behavior
- do not use arbitrary timeout alone as the primary session boundary

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

UI model v1:
- primary surface lives inside the stream workspace where the broker already operates
- secondary surface exists as a cross-stream `agent inbox / run history` for pending reviews, errors, approvals, and run inspection
- do not make a standalone mission-control console the primary product surface in v1

`Agent inbox / run history` scope v1:
- supervise agent work across streams
- show new or refreshed briefs requiring attention
- show failed runs
- show pending approvals
- show pending suggestion reviews
- show pending promotions to organization knowledge
- show run/activity history per stream
- do not make this a universal broker work inbox in v1

Visibility rule:
- stream-local memory should follow role + stream/account scope
- stream owners and directly involved operators should see local session memory, briefs, artifacts, and suggestions
- senior/admin roles should additionally see organization-level governance surfaces such as review candidates, promotions, and stale/superseded knowledge
- approved organization knowledge may have broader visibility inside the organization than local stream memory

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

Recommended stance:
- do not block harness v1 on a full domain renaming or migration
- do document that `Project/Proposal` may later converge into a more canonical `Stream/Deal` model if product semantics demand it
- treat this as planned domain convergence, not ignored debt

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

Durability rule:
- persist curated session summaries
- persist key observations
- persist links or pointers to relevant artifacts
- persist meaningful broker corrections and important changes
- do not treat full raw conversational transcripts as the primary durable memory by default

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

Human-authored observation rule:
- important broker-authored notes should be promoted into first-class structured observations
- these should preserve their human origin explicitly
- recommended fields:
  - `type`
  - `summary`
  - `why_it_matters`
  - `author`
  - `scope`
  - `source = human`
  - relevant stream/brief/artifact links
- these observations may influence future briefs and may later become promotion candidates when appropriate

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

Reuse rule for historical dossiers:
- agents may automatically use historical dossiers for:
  - comparative context
  - question generation
  - pattern recognition
  - likely constraints to inspect
  - `watch out for this` style guidance
- agents should not automatically reuse historical dossier facts as established truth for the new stream
- historical dossiers are analogical support, not direct fact transfer

Promotion policy:
- all learnings should begin in `stream` scope
- promotion into `organization` knowledge should happen only when:
  - the same learning is confirmed across `2+` independent streams, or
  - a human explicitly approves it for strategic, operational, or compliance relevance
- organization knowledge should remain curated doctrine/playbook memory, not a dump of raw stream learnings

Organization knowledge object shape:
- `title`
- `type`
- `summary`
- `why_it_matters`
- `source_stream_refs`
- `evidence_count`
- `confidence`
- `owner`
- `last_reviewed_at`
- `topic_key`
- `status`

Initial taxonomy for `type`:
- `pattern`
- `playbook`
- `constraint`
- `compliance_rule`
- `pricing_precedent`
- `account_note`

Recommended lifecycle states for organization knowledge:
- `draft`
- `approved`
- `stale`
- `superseded`
- `archived`

Lifecycle rule:
- do not treat deletion as the primary lifecycle path
- preserve history and state transitions so that old knowledge can remain inspectable even when no longer current

Ownership rule:
- every promoted organization knowledge object must have an explicit human owner
- in v1, the default owner should be an admin or senior operator from the broker team
- the agent may suggest ownership, but should not become the accountable owner

Why this shape matters:
- keeps organization knowledge curated and governable
- makes filesystem-backed knowledge queryable and inspectable
- prepares the path for future review workflows, stale detection, and semi-automated promotion

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

Identity and placement:
- the first agent should behave as a specialist copilot embedded in the stream workspace
- it should not present itself as a general autonomous system-wide operator in v1
- its capabilities should remain bounded to discovery, workspace assistance, and memory-backed synthesis

Responsibilities:
- read discovery sources
- summarize what is already known
- detect missing critical information
- propose next-best questions
- suggest workspace/questionnaire completion
- prepare a broker-ready discovery brief

Multimodal input rule:
- voice should be a first-class input to this agent
- documents, text, notes, workspace context, and voice should flow into one unified multimodal discovery model
- do not split voice into a separate primary agent experience in v1

Proactivity rule in v1:
- the agent should be mostly reactive to relevant stream events such as new evidence, refresh actions, corrections, and meaningful workspace changes
- bounded proactivity is allowed for:
  - reminding about unresolved critical blockers
  - resurfacing materially stale briefs
  - suggesting action when an important blocker sits unresolved
- avoid aggressive or noisy proactive behavior in v1

Context access rule in v1:
- the agent should automatically access bounded lateral context such as:
  - client/company context
  - location context
  - same-stream history
  - similar historical waste-stream dossiers
  - relevant approved organization knowledge
- the agent should not automatically pull broad unfiltered organization memory by default

External action boundary in v1:
- the agent may prepare external actions such as:
  - draft emails
  - request-for-information drafts
  - call preparation notes
  - follow-up summaries
  - suggested next messages
  - document request checklists
- the agent should not automatically execute external actions in v1

Primary output:
- `Discovery Brief` as the main artifact of the agent

Artifact boundary:
- in v1, each stream should have one primary unified `Discovery Brief`
- the brief may include multiple sections and may depend on supporting sub-artifacts internally
- do not expose multiple parallel mini-briefs as the primary broker-facing artifact in v1

Recommended structure:
- fixed core sections:
  - `What we know`
  - `What is missing`
  - `Critical blockers`
  - `Low-confidence points`
  - `Conflicts`
  - `Recommended next actions`
  - `Source-backed highlights`
- optional dynamic sections when relevant:
  - `Voice-specific observations`
  - `Compliance watchouts`
  - `Similar past cases`
  - `Account context`
  - `Logistics notes`

Point-type model:
- important items in the brief should be explicitly typed in the UI, not only implied in prose
- initial point types:
  - `Fact`
  - `Assumption`
  - `Conflict`
  - `Recommendation`
  - `Question`
- this distinction should remain visible to the broker during review and correction

Human override rule:
- when a broker corrects a fact without hard documentary/source support, the system should accept the correction
- the corrected point should retain explicit metadata such as:
  - human author
  - timestamp
  - optional note/rationale
  - `human-asserted` status until further verification
- human overrides should not silently become equivalent to hard-evidence-backed facts

Primary product surface:
- embedded in the stream workspace as part of the broker's normal operating flow

Durability rule:
- every Discovery Brief should also be persisted as a durable artifact in the memory/filesystem layer for auditability, reuse, and cross-agent consumption

Chat rule:
- chat may explain, summarize, or answer questions about the Discovery Brief
- chat is not the canonical place where the brief lives
- chat is a secondary interrogation surface, not the primary workflow surface
- chat should help answer questions such as:
  - why something is marked as a blocker
  - what evidence was used
  - what changed since the prior version
  - what next question or action is recommended

Refresh rule:
- the Discovery Brief should refresh automatically on relevant events such as:
  - new discovery source added
  - voice/document/text processing completed
  - meaningful draft review decisions accepted/rejected
  - material workspace or questionnaire changes
  - important new evidence added
- the broker must also have an explicit manual `Refresh Brief` action
- each meaningful refresh should create a new brief version
- only one version should be marked as the `current working brief`
- prior versions should remain accessible through history and diff views
- each version should record why it was produced (event trigger or manual refresh)

Transparency rule:
- the Discovery Brief should expose:
  - conclusions
  - concise rationale
  - provenance / source references
  - confidence
  - assumptions
  - change summary versus the prior version
- the Discovery Brief should not expose raw chain-of-thought or unfiltered internal reasoning traces as the primary UX

Provenance rule:
- every material point in the Discovery Brief should include at least one explicit source reference
- valid source references may include:
  - uploaded document
  - transcript or audio snippet
  - workspace field
  - prior artifact
  - historical dossier used as analogy/context
- if a point lacks source support, it must be labeled as `assumption` or `inference`, not presented as established fact

Conflict rule:
- when material sources conflict, the brief should:
  - mark the point as `conflict`
  - show the competing sources
  - explain why they conflict
  - propose what evidence or verification step would resolve the conflict
  - emit `Needs verification` style guidance when appropriate
- do not silently auto-resolve source conflicts by default in v1

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

Recommendation action model:
- recommendation feedback should distinguish correctness from execution timing
- recommended states:
  - `accepted_now`
  - `accepted_deferred`
  - `rejected`
  - `needs_verification`
- do not collapse every non-executed recommendation into implicit rejection

Learning rule:
- in v1, the harness should learn primarily from structured, high-signal broker feedback
- examples of high-signal feedback:
  - `Mark incorrect`
  - `Needs verification`
  - `Accept`
  - `Add note`
  - `Promote to workspace suggestion`
  - accept/reject workspace suggestions
  - approve/reject promotion to organization knowledge
- do not treat broad low-signal behavioral telemetry as the primary learning source in v1

Repeated correction rule:
- when the same class of error is corrected repeatedly, the system should:
  - record the repetition pattern
  - create a review candidate for organization knowledge and/or rule adjustment
  - surface that candidate in the `agent inbox / run history`
- in v1, repeated corrections should not silently change global system behavior automatically

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

Operational role:
- the Discovery Brief should not be only a passive diagnosis of current state
- it should also include prioritized next-best questions and next-best actions so the broker knows what to do now

Progression gate in v1:
- advancing past the brief should require:
  - broker action such as `Approve as current working brief`
  - no critical blockers left unclassified
- critical workspace suggestions reviewed or explicitly deferred
- sufficient provenance on material points
- do not use an automatic agent score as the sole gate for progression

Silence rule:
- if the broker does not interact with a newly created or refreshed brief, it remains `pending review`
- do not interpret silence as implicit approval
- allow continued work when no critical gate is blocked, but do not promote sensitive changes or transitions because of inaction alone
- bounded resurfacing is allowed when the brief becomes stale or critical blockers remain unresolved

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

The purpose of phases is not only sequencing.
It is to keep the final objective visible while making deliberate incremental moves.

### Phase 0: Harness framing and contracts

Goal:
- define the harness explicitly before shipping agent sprawl

Deliverables:
- domain tool inventory
- agent identity model
- session/run model
- memory taxonomy
- approval boundaries

How this sets up the future:
- creates the control vocabulary that all later agents and network workflows will depend on

### Phase 1: Discovery agent inside current product

Goal:
- ship one high-value agent aligned with current codebase

Deliverables:
- Discovery Completion Agent
- session memory per stream/run
- broker-facing explanation and rationale surface
- durable notes written to filesystem layer

How this sets up the future:
- proves that SecondStream can produce trusted, inspectable, durable AI work inside the broker workflow
- creates the first reusable memory and artifact loops

### Phase 2: Knowledge fabric

Goal:
- make historical context reusable across deals

Deliverables:
- stream dossiers
- pricing precedent library
- compliance/outlet knowledge packs
- memory write/read rules

How this sets up the future:
- turns local deal work into reusable organization intelligence
- prepares the substrate for stronger specialists and higher-confidence automation

### Phase 3: Specialist agents

Goal:
- move from one agent to a bounded workforce

Deliverables:
- pricing specialist
- compliance specialist
- follow-up specialist
- orchestrator-to-specialist handoff rules

How this sets up the future:
- evolves from one embedded copilot into a bounded agent workforce without jumping prematurely into a messy swarm

### Phase 4: Multi-party collaboration

Goal:
- expand beyond internal broker workspace into network workflows

Possible future surfaces:
- buyer-facing contexts
- logistics coordination surfaces
- shared evidence packages
- external collaboration with controlled permissions

How this reaches the north star:
- shifts SecondStream from internal broker workspace to network operating layer while keeping the broker as the orchestrating center of trust

### Phase 5: Platform standard

Goal:
- make SecondStream the standard memory, workflow, and coordination fabric for the category

Possible future capabilities:
- shared schemas for materials, evidence, and outcomes
- portable buyer/outlet requirement packs
- broker-to-broker intelligence exchange under policy
- controlled external APIs/MCPs over the harness
- cross-org benchmark and intelligence products where business model allows

Why this matters:
- this is the level where the moat compounds across workflow, memory, knowledge, and network

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

Good candidates because they help both:
- the short-term broker workflow
- the long-term path to multi-agent and multi-party coordination

Weak candidates:
- generic chatbot features with no workflow leverage
- flashy agent swarms without bounded responsibilities
- premature channel sprawl
- filesystem memory treated as a shortcut around domain modeling

## 17) KPI frame for the first agent

Primary KPI:
- `time-to-working-brief`

Definition:
- time from relevant new discovery input or start of discovery work to a broker-approved `current working brief`

Why this is the primary KPI:
- measures real workflow acceleration
- reflects whether the artifact is actually useful enough to approve
- avoids vanity metrics about raw model output volume

Recommended secondary KPIs:
- `% of briefs approved without major correction`
- human review time per brief
- `% of workspace suggestions accepted`
- `% of material points with provenance`
- `% of critical blockers detected before external follow-up`

## 18) Initial operator target

Optimize the first agent and harness iteration for:
- waste brokers handling complex discovery
- cases with substantial documents, voice, ambiguity, and cross-variable reasoning
- workflows where missing information, evidence quality, and context synthesis are major pain points

Do not optimize v1 primarily for:
- the simplest transactional cases
- low-context workflows where the broker already has everything structured up front

Why this target matters:
- this is where the agent delivers the most differentiated value
- this is where memory, provenance, multimodality, and briefs matter most
- this better aligns the product with its long-term moat

---

## 19) Open questions

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

## 20) Current recommendation

Lock these as working assumptions for refinement:

- SecondStream is a **vertical AI OS for waste brokers**.
- The **application itself is the harness**.
- The current product center is the **internal broker workspace**.
- The first canonical agent should be the **Discovery Completion Agent**.
- The long-term moat is **workflow + memory + knowledge + network**, not model access alone.
- **Filesystem-backed memory** should be treated as a strategic layer, with **S3 Files** as a strong candidate substrate.

## 21) Organization customization

Allow bounded organization-level customization in v1 through:
- playbooks
- approved organization knowledge
- output preferences
- blocker definitions / thresholds
- review and confidence thresholds where useful

Do not allow in v1:
- deeply forked tenant-specific agent implementations
- completely different workflow logic per organization
- giant custom prompt trees that bypass the shared harness model

Why this boundary matters:
- gives brokers meaningful vertical fit
- preserves maintainability of the core agent/harness
- creates a sane path for future specialization without fragmenting the product

This document should keep evolving as product, architecture, and code converge.

## 22) Evolution map for current locked decisions

This section exists to avoid treating v1 choices as the final shape.

### Durable memory root = organization

Why now:
- maximizes reuse and aligns with broker-centered operations

Likely later evolution:
- richer derived views by account, market, buyer, outlet, and cross-stream topic

### Specialist copilot first

Why now:
- lowest-risk path to trusted value

Likely later evolution:
- bounded specialist workforce, then orchestrator layer, then selected external-facing agent workflows

### Discovery Brief as primary artifact

Why now:
- visible, auditable, and useful in the strongest current workflow

Likely later evolution:
- additional artifacts such as pricing briefs, compliance briefs, account briefs, buyer-facing evidence packages, and eventually passport-like outputs

### Workspace-first primary UI

Why now:
- value lives where brokers already work

Likely later evolution:
- stronger transversal control plane, richer inbox, team supervision surfaces, and external collaboration surfaces

### Stream-to-org promotion gating

Why now:
- keeps organization knowledge high-signal

Likely later evolution:
- semi-automated promotion pipelines with stronger confidence rules, owner workflows, and review SLAs
