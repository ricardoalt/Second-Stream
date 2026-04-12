# SecondStream Agent Harness v1 Spec

**Date:** 2026-04-09  
**Status:** Product + architecture spec draft  
**Depends on:** `docs/plans/2026-04-09-secondstream-agent-harness-plan.md`

---

## 1) Why this spec exists

The plan document defines the product thesis and long-term direction.

This spec answers a narrower question:

**What exactly should `SecondStream Agent Harness v1` be, given the codebase that exists today?**

This spec is intentionally grounded in current reality.
It does not assume that future Evidence Graph, Outcome Ledger, multi-party network, or a final `Stream/Deal` domain model already exist.

---

## 2) Current system vs harness v1

## 2.1 What exists today

Today, SecondStream already has real product capabilities in code:

- company / location / contact management
- multimodal discovery intake
- draft extraction + human review via bulk import
- voice interview upload / transcription / retry / review handoff
- workspace hydration and editing
- questionnaire suggestions review
- offer pipeline and follow-up states
- file upload/list/download/delete
- proposal generation surfaces still present in backend

Current dominant implementation pattern:
- user uploads or enters information
- AI extracts or suggests
- human reviews
- accepted data becomes product truth

Current dominant domain anchors in code:
- `Project`
- `Proposal`
- `workspace_v1`
- `bulk_import`
- `discovery_session`
- `voice_interview`

## 2.2 What the current system does NOT have yet

Today the codebase does **not** yet provide:

- a first-class agent identity model
- a unified tool registry for product capabilities
- durable session/run model for agent execution
- explicit memory architecture for agents
- promoted organization knowledge objects
- a primary broker-facing AI artifact like `Discovery Brief`
- a cross-stream agent inbox / run history
- a dedicated policy/approval layer for agent actions

## 2.3 What Agent Harness v1 adds

Agent Harness v1 adds a new layer on top of current capabilities.

It does **not** replace the current app.
It wraps and organizes the existing product as an agent-operable environment.

In practical terms, v1 adds:

- one first-class agent: `Discovery Completion Agent`
- one first-class artifact: `Discovery Brief`
- one first-class memory model: `session -> run -> observations/artifacts`
- one first-class promotion model: `stream memory -> org knowledge`
- one first-class review surface: broker correction + approval of brief/suggestions

---

## 3) v1 scope

## 3.1 In scope

- one specialist copilot embedded in the stream workspace
- multimodal discovery understanding across files, text, voice, workspace context
- broker-facing `Discovery Brief`
- reviewable `workspace suggestions`
- session/run lifecycle for the first agent
- filesystem-backed durable memory and artifacts
- first historical knowledge collection: `historical waste-stream dossiers`
- cross-stream `agent inbox / run history` for supervision
- bounded organization-level customization

## 3.2 Out of scope

- general autonomous broker OS across all workflows
- automatic external action execution
- auto-writing canonical truth without human review
- buyer/logistics/generator multi-party collaboration UI
- automatic rule changes from repeated corrections
- full Evidence Graph implementation
- full Outcome Ledger implementation
- replacing Postgres truth with filesystem memory
- deep tenant-specific forks of the agent

---

## 4) Product goal of v1

The job of v1 is not “add AI chat”.

The job of v1 is:

**reduce the time and cognitive effort required for a broker to turn messy multimodal discovery input into a trusted current working understanding of the stream.**

Primary KPI:
- `time-to-working-brief`

Definition:
- time from relevant new discovery input or discovery start to broker-approved `current working brief`

---

## 5) Primary user and optimization target

Optimize v1 for:

- waste brokers handling high-complexity discovery
- workflows with documents, voice, ambiguity, and missing information
- cases where evidence quality and next-best-question matter more than fast transactional throughput

Do not optimize first for:

- simple structured cases where everything is already known
- low-context transactional matching only

---

## 6) System model

## 6.0 Architectural constraint: harness ownership and model agnosticism

The harness must be owned by SecondStream and model-agnostic from day one.

Rules:
- all memory, sessions, briefs, knowledge, and artifacts must be persisted in SecondStream-controlled storage
- no critical memory or context management behind a third-party proprietary API
- no provider-managed stateful APIs as the primary memory path
- the LLM is a replaceable execution engine; the harness owns the state
- memory formats must be inspectable, exportable, and portable across providers
- compaction and context assembly must be controlled by SecondStream

Why this is a v1 constraint, not a future nice-to-have:
- memory is what makes agents valuable over time
- if memory is locked into a provider, SecondStream loses its moat
- model providers are actively building lock-in via stateful APIs and encrypted session state
- SecondStream's competitive advantage is domain-specific operational intelligence owned by the platform

## 6.1 Existing product truth

Keep authoritative truth in current database-backed product systems:

- orgs / users / permissions
- companies
- locations
- projects
- project data / workspace state
- follow-up state
- approvals and official actions

This remains canonical in v1.

## 6.2 New agent layer

Add a harness layer with these concepts:

- `AgentSession`
- `AgentRun`
- `DiscoveryBrief`
- `BriefPoint`
- `WorkspaceSuggestion`
- `MemoryObservation`
- `KnowledgeObject`
- `AgentInboxItem`

These may initially be implemented via a mix of DB metadata + filesystem artifacts.
The exact persistence split can evolve, but the product contracts should be explicit now.

---

## 7) Discovery Completion Agent

## 7.1 Role

The first canonical agent is a **specialist copilot** embedded in the stream workspace.

It is not:
- a system-wide autonomous employee
- a generic chatbot
- a separate voice-only experience

It is:
- a multimodal discovery specialist
- reactive to stream events with bounded proactivity
- focused on understanding, surfacing, and guiding next actions

## 7.2 Allowed inputs

The agent may consume:

- discovery session sources
- bulk-import review state and accepted/rejected drafts
- voice interview transcripts and status
- workspace fields
- context note
- questionnaire answers and reviewed suggestions
- project files / file analyses
- client/company context
- location context
- same-stream history
- similar historical dossiers
- approved org knowledge

## 7.3 Allowed outputs

The agent may produce:

- `Discovery Brief`
- `Workspace Suggestions`
- draft external actions
- durable observations and artifacts
- review candidates for knowledge promotion

It may not in v1:

- mutate canonical truth directly
- execute external actions automatically
- silently resolve material source conflicts

---

## 8) Discovery Brief contract

## 8.1 Purpose

The `Discovery Brief` is the primary broker-facing artifact of the agent.

It answers:

- what do we know?
- what do we not know?
- what is blocking progress?
- what should the broker do next?

## 8.2 Surface

Primary surface:
- embedded inside the stream workspace

Secondary access:
- explain/interrogate via chat
- visible in run history/inbox
- persisted in memory/filesystem layer

## 8.3 Versioning

- every meaningful refresh creates a new version
- one version is marked `current working brief`
- prior versions remain inspectable
- each version records its trigger

## 8.4 Core structure

Fixed sections:

- `What we know`
- `What is missing`
- `Critical blockers`
- `Low-confidence points`
- `Conflicts`
- `Recommended next actions`
- `Source-backed highlights`

Optional sections:

- `Voice-specific observations`
- `Compliance watchouts`
- `Similar past cases`
- `Account context`
- `Logistics notes`

## 8.5 Point types

Each important point in the brief must be explicitly typed:

- `Fact`
- `Assumption`
- `Conflict`
- `Recommendation`
- `Question`

## 8.6 Provenance rule

Every material point must have at least one source reference.

Allowed source classes:

- uploaded document
- transcript or audio snippet
- workspace field
- prior artifact
- historical dossier used as analogy/context
- human-authored observation

If no source exists:
- the point must be labeled as `Assumption` or `Inference`
- it must not be shown as established fact

## 8.7 Conflict rule

When material sources conflict, the brief must:

- mark the point as `Conflict`
- show competing sources
- explain why they conflict
- propose what would resolve the conflict
- optionally emit `Needs verification`

## 8.8 Human override rule

If a broker corrects a point without hard source support:

- accept the correction
- store it as `human-asserted`
- preserve author + timestamp + optional note
- do not silently upgrade it to hard-evidence-backed fact

## 8.9 Role of the brief

The brief is both:

- diagnostic
- prescriptive

It must always include prioritized next-best questions/actions.

---

## 9) Discovery Brief schema

This is a logical product schema, not necessarily the first physical storage schema.

```ts
type DiscoveryBrief = {
  id: string
  streamId: string
  organizationId: string
  sessionId: string
  runId: string
  version: number
  status: "pending_review" | "current_working_brief" | "superseded" | "archived"
  trigger:
    | "new_source"
    | "processing_complete"
    | "draft_review_change"
    | "workspace_change"
    | "manual_refresh"
    | "broker_correction"
  summary: string
  sections: DiscoveryBriefSection[]
  recommendationStates: RecommendationStateSummary[]
  approvedAt?: string
  approvedByUserId?: string
  createdAt: string
  updatedAt: string
}

type DiscoveryBriefSection = {
  key:
    | "what_we_know"
    | "what_is_missing"
    | "critical_blockers"
    | "low_confidence_points"
    | "conflicts"
    | "recommended_next_actions"
    | "source_backed_highlights"
    | "voice_specific_observations"
    | "compliance_watchouts"
    | "similar_past_cases"
    | "account_context"
    | "logistics_notes"
  title: string
  points: BriefPoint[]
}

type BriefPoint = {
  id: string
  type: "fact" | "assumption" | "conflict" | "recommendation" | "question"
  text: string
  confidence?: "low" | "medium" | "high"
  sourceRefs: SourceRef[]
  rationale?: string
  assumptionNote?: string
  brokerFeedbackState?:
    | "accepted"
    | "accepted_now"
    | "accepted_deferred"
    | "mark_incorrect"
    | "needs_verification"
  brokerNote?: string
}

type SourceRef = {
  sourceType: "document" | "audio" | "transcript" | "workspace" | "artifact" | "historical_dossier" | "human_observation"
  sourceId: string
  label: string
  snippet?: string
  page?: number
  timestampSec?: number
}
```

---

## 10) Workspace Suggestion contract

## 10.1 Purpose

The brief must not write directly to canonical workspace truth.

Instead, it may emit `Workspace Suggestions` for broker review.

## 10.2 Core rule

- agent suggests
- broker reviews
- accepted suggestions become truth through normal product path

## 10.3 Suggested logical schema

```ts
type WorkspaceSuggestion = {
  id: string
  streamId: string
  briefId: string
  suggestionType: "base_field" | "questionnaire_answer" | "context_note" | "custom_field"
  targetKey: string
  proposedValue: unknown
  confidence?: "low" | "medium" | "high"
  sourceRefs: SourceRef[]
  rationale?: string
  state: "pending_review" | "accepted" | "rejected" | "deferred"
  reviewedAt?: string
  reviewedByUserId?: string
}
```

---

## 11) Session / run contract

## 11.1 Mental model

- `session` = live context for the stream while the operational problem remains materially the same
- `run` = one concrete execution of the agent inside that session

## 11.2 Session creation

A session is created when:

- agent work starts for a stream that does not already have an active matching session

## 11.3 New run creation

A run is created on:

- new evidence relevant to the stream
- processing completion
- broker correction requiring recomputation
- manual `Refresh Brief`
- meaningful workspace change

## 11.4 Session closure

Close current session and open a new one when:

- a major phase transition happens
- owner changes materially
- the discovery problem is redefined
- a major new evidence block changes the case substantially
- the stream enters a meaningfully different lifecycle stage

## 11.5 Logical schema

```ts
type AgentSession = {
  id: string
  organizationId: string
  streamId: string
  agentType: "discovery_completion"
  status: "active" | "closed"
  openedBecause: string
  closedBecause?: string
  createdAt: string
  closedAt?: string
}

type AgentRun = {
  id: string
  sessionId: string
  trigger:
    | "new_source"
    | "processing_complete"
    | "draft_review_change"
    | "workspace_change"
    | "manual_refresh"
    | "broker_correction"
  status: "queued" | "running" | "completed" | "failed" | "needs_review"
  startedAt?: string
  completedAt?: string
  errorSummary?: string
}
```

---

## 12) Memory model

## 12.1 Durable memory root

Root at `organization`.

Derived views:

- `client`
- `location`
- `stream/deal`

## 12.2 Memory classes

### Session memory
- session summaries
- run summaries
- key observations
- links to artifacts

### Stream memory
- durable stream observations
- broker notes
- brief history
- local playbook-like learnings

### Historical dossiers
- structured historical stream cases
- used for analogy, not direct fact transfer

### Org knowledge
- promoted and curated reusable knowledge

## 12.3 Important rule

Do not make raw transcripts/conversation logs the primary durable memory.

Persist primarily:

- summaries
- curated observations
- artifacts
- broker corrections
- source references

---

## 13) Human-authored observations

Important human notes must enter memory as first-class observations.

Logical schema:

```ts
type HumanAuthoredObservation = {
  id: string
  organizationId: string
  scopeType: "stream" | "client" | "location" | "organization"
  scopeId: string
  type: string
  summary: string
  whyItMatters: string
  authorUserId: string
  source: "human"
  linkedArtifactIds?: string[]
  createdAt: string
}
```

---

## 14) Historical waste-stream dossier contract

## 14.1 Purpose

The first reusable knowledge collection is `historical waste-stream dossiers`.

These are not copies of old truth into new truth.
They are structured analogical memory.

## 14.2 Allowed automatic reuse

The agent may use them for:

- similar-case context
- question generation
- pattern recognition
- likely blocker recognition
- watch-outs

The agent may not use them as automatic facts for the new case.

## 14.3 Example dossier shape

```ts
type HistoricalWasteStreamDossier = {
  id: string
  organizationId: string
  sourceStreamId: string
  materialFamily?: string
  shortSummary: string
  whatWasMissing: string[]
  whatUnblockedIt: string[]
  importantConflicts: string[]
  usefulQuestions: string[]
  outcomeNotes?: string[]
  evidenceRefs: SourceRef[]
  createdAt: string
}
```

---

## 15) Organization knowledge contract

## 15.1 Promotion rule

All learnings begin in `stream` scope.

Promotion to `organization` scope happens only when:

- the learning is confirmed across `2+` independent streams, or
- a human explicitly approves it for strategic / operational / compliance value

## 15.2 Knowledge object shape

```ts
type KnowledgeObject = {
  id: string
  organizationId: string
  title: string
  type:
    | "pattern"
    | "playbook"
    | "constraint"
    | "compliance_rule"
    | "pricing_precedent"
    | "account_note"
  summary: string
  whyItMatters: string
  topicKey: string
  sourceStreamRefs: string[]
  evidenceCount: number
  confidence?: "low" | "medium" | "high"
  ownerUserId: string
  status: "draft" | "approved" | "stale" | "superseded" | "archived"
  lastReviewedAt?: string
  createdAt: string
  updatedAt: string
}
```

## 15.3 Ownership

- every promoted knowledge object has human owner
- default owner in v1 should be admin / senior operator
- agent may suggest, but not be accountable owner

---

## 16) Agent inbox / run history contract

## 16.1 Purpose

This is **not** a universal human work inbox.

It is a supervision surface for the agent system.

## 16.2 Contents

Show items such as:

- new or refreshed briefs pending review
- failed runs
- review candidates from repeated corrections
- pending workspace suggestions
- pending org knowledge promotions
- stale brief warnings
- activity history per stream

## 16.3 Logical item shape

```ts
type AgentInboxItem = {
  id: string
  organizationId: string
  streamId?: string
  itemType:
    | "brief_pending_review"
    | "run_failed"
    | "workspace_suggestions_pending"
    | "knowledge_promotion_pending"
    | "repeated_correction_candidate"
    | "brief_stale"
  priority: "low" | "medium" | "high"
  title: string
  summary: string
  relatedRunId?: string
  relatedBriefId?: string
  createdAt: string
  resolvedAt?: string
}
```

---

## 17) Approval and silence semantics

## 17.1 Approval boundary

Agent may freely write:

- memory
- artifacts
- summaries
- drafts
- review candidates

Agent may not freely do:

- write canonical truth directly
- execute external actions
- change official workflow states
- sync external systems

## 17.2 Silence rule

No interaction means:

- `pending_review`
- never implicit approval

Work may continue if no hard gate is blocked, but silence does not authorize progression.

---

## 18) Triggers and flow

## 18.1 Main v1 flow

1. User starts or continues discovery through current system.
2. Sources arrive through discovery session, bulk import, voice, files, or workspace edits.
3. Relevant event creates an `AgentRun`.
4. Agent reads bounded context:
   - stream state
   - client/location context
   - same-stream history
   - similar dossiers
   - approved org knowledge
5. Agent writes/updates:
   - brief draft/version
   - stream observations
   - workspace suggestions
   - run summary
6. Broker sees refreshed brief in workspace.
7. Broker reviews points and suggestions.
8. Accepted suggestions flow into canonical workspace truth through existing reviewable product path.
9. Broker may approve the brief as `current working brief`.
10. Knowledge promotion candidates are queued when repeated patterns or reusable learnings appear.

## 18.2 Event table

| Event | Expected v1 behavior |
|---|---|
| New discovery source added | Create run or enqueue refresh |
| Voice/doc/text processing completed | Refresh brief |
| Broker corrects brief point | Create run, update observations |
| Workspace changed materially | Create run or refresh |
| Manual refresh | Create run immediately |
| Same error corrected repeatedly | Create review candidate |

---

## 19) Integration with current codebase

## 19.1 Reuse current surfaces

Harness v1 should reuse current capabilities wherever possible.

### Existing APIs that already map well to tools

- discovery sessions
- bulk import runs/items/finalize/review
- voice interviews and transcript retrieval
- workspace hydrate / update / review suggestions / complete discovery
- company and location data
- file management
- offers pipeline projection

## 19.2 Most likely first attachment points

### Backend
- `workspace` endpoints as canonical broker-facing truth/update surface
- `discovery_session` + `bulk_import` + `voice_interview` as source intake and review pipeline
- `project_data` and current workspace shape as the initial truth target for accepted suggestions

### Frontend
- stream workspace as the primary `Discovery Brief` surface
- add right-rail/panel/section for the brief and point-level review
- add lightweight inbox/history route or surface for agent supervision

## 19.3 Important implementation truth

This spec does not require an immediate rename from `Project` to `Stream`.

v1 should integrate with current domain terms while keeping semantic drift documented.

---

## 20) What will feel different to the user

## 20.1 Today

Today the workflow feels like:

- input comes in
- AI extracts some things
- human reviews pieces
- workspace gets updated
- operator manually synthesizes the real current understanding in their own head

The system helps with extraction and review.
It does not yet produce one durable, explainable operating understanding of the stream.

## 20.2 With harness v1

The workflow becomes:

- input comes in
- agent synthesizes current understanding into a `Discovery Brief`
- broker reviews one coherent artifact instead of mentally reconstructing the case alone
- important points are typed, sourced, and correctable
- accepted insights become structured suggestions
- durable observations and historical memory accumulate behind the scenes

The difference is not “more AI”.
The difference is:

**SecondStream starts holding the broker's working understanding of the case as a product artifact.**

That is the bridge from app to operating system.

---

## 21) Why this matters strategically

Without this harness layer, SecondStream remains a useful workflow app with AI features.

With this harness layer, SecondStream begins to compound:

- every stream creates reusable memory
- every correction can become structured learning
- every approved brief raises the quality of future context assembly
- every organization gradually builds doctrine, not just records

This is how the product moves from:

- extraction tools
to
- broker intelligence system
to
- eventually network operating layer

---

## 22) Immediate next implementation artifacts

The next documents or implementation tasks should define:

1. exact API/storage contract for `DiscoveryBrief`
2. exact API/storage contract for `WorkspaceSuggestion`
3. exact API/storage contract for `AgentSession` and `AgentRun`
4. exact API/storage contract for `KnowledgeObject`
5. UI spec for:
   - workspace brief surface
   - point review interactions
   - inbox/history surface
6. event-trigger matrix mapped to current backend flows
7. memory/filesystem layout for durable artifacts

---

## 23) Final summary

Today, SecondStream mostly helps the broker collect and review information.

Agent Harness v1 changes that by adding one missing layer:

**a durable, inspectable, reviewable current understanding of the stream, generated by an agent but governed by the broker.**

That is why v1 matters.

It is not the final platform.
It is the first moment where SecondStream starts acting like an OS instead of only a set of screens and workflows.
