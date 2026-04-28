# SecondStream AI Surfaces Roadmap

**Status:** Product/design plan  
**Primary decision:** Phase 1 integrates the existing chat into `AgentShell`; later phases move Stream Detail toward an AI-native, artifact-first workspace.  
**Related docs:**

- `docs/plans/ai-native-workspace.md`
- `docs/the-golden-rules-for-agent-first-productengineering.md`
- `docs/plans/2026-04-15-secondstream-ai-native-workspace-prd.md`
- `docs/plans/2026-04-26-chat-ui-capa-3-streaming-ux-parity.md`

---

## 1. Executive Summary

SecondStream should not become “a normal SaaS app with a chatbot attached.” The long-term product direction is an **AI-native operating workspace** for waste brokers: opportunities, evidence, discovery, proposals, compliance, offers, and future marketplace/logistics workflows should share one operational context.

The recommended path is incremental:

1. **Phase 1 — Integrate Chat into AgentShell**  
   Make the existing `/chat` experience feel native to the platform. Add it to the main navigation, reuse the main app shell, and treat chat history as an internal chat panel rather than a second app sidebar. This is an integration/coherence phase, **not** a decision to make chat the primary stream workflow.

2. **Phase 2 — Add Contextual AI Entry Points**  
   Allow users to open chat from streams/offers/dashboard with page context attached. This turns chat from general conversation into contextual assistance.

3. **Phase 3 — Replace Stream Detail’s Form-First Center with Discovery Brief Workspace**  
   Move the current long-form stream detail experience into a secondary `Structured Capture` surface. Make the primary surface a live, reviewable `Discovery Brief`.

4. **Phase 4 — Introduce Agent Activity / Review Inbox**  
   Expose agent runs, failed runs, pending review, suggested changes, and approval gates in one operational supervision surface.

5. **Phase 5 — Expand to Organization-Wide Agentic Operations**  
   Build toward cross-stream intelligence, compliance/pricing/logistics agents, marketplace/CRM preparation, and controlled automation.

The key product guardrail: **chat is an access surface, not the system of record for stream understanding.** The primary stream workflow should be **artifact-first, review-first, and ingest-first**.

Short version for presentation:

```txt
First, integrate chat into the platform.
Then make AI contextual.
Then move stream work to a reviewable artifact.
Finally, add governance for agent actions.
```

---

## 1.1 Roadmap at a Glance

| Phase | User-facing outcome | What does not change | What it enables |
|---|---|---|---|
| 1. Chat in AgentShell | Chat feels native and discoverable inside the platform | Chat does not become the primary stream workflow | Shared shell, coherent navigation, easier context handoff |
| 2. Contextual AI Entry Points | Users can ask AI about the current stream/offer/dashboard | AI remains read-only unless routed through reviewable suggestions | Page/entity context for future agent actions |
| 3. Discovery Brief Workspace | Stream Detail becomes artifact-first and review-first | Structured fields still exist as secondary capture | Durable stream understanding, provenance, review states |
| 4. Agent Activity / Review Inbox | Users can see runs, failures, pending review, and suggested changes | Agents still do not write canonical truth directly | Trust, auditability, operational supervision |
| 5. Organization-Wide Agentic Operations | AI helps across streams, offers, compliance, CRM/marketplace prep | High-risk actions still require gates | Cross-stream automation and network-level intelligence |

---

## 2. Product Thesis

SecondStream’s core advantage should be that it **maintains operational understanding** of a stream, account, and organization over time.

The AI layer should help answer:

- What do we know?
- What is missing?
- What is in conflict?
- What evidence supports this?
- What should happen next?
- What can safely be automated?
- What needs human review?

This means the product should evolve from:

```txt
Forms + dashboards + separate chat
```

to:

```txt
Operational artifacts + contextual AI + governed agent actions
```

---

## 3. Surface Model

The product should use separate AI surfaces with clear jobs.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│                         SecondStream Platform                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Global Chat                                                      │
│     - General AI assistant                                           │
│     - Long conversations                                             │
│     - Thread history                                                 │
│     - Cross-platform questions                                       │
│                                                                      │
│  2. Contextual Ask/Tell                                              │
│     - Small contextual AI entry points                               │
│     - Stream/offer/dashboard aware                                   │
│     - Used to ask or instruct about current work                     │
│                                                                      │
│  3. Stream Workspace                                                 │
│     - Artifact-first surface                                         │
│     - Discovery Brief                                                │
│     - Pending Review                                                 │
│     - Evidence                                                       │
│     - Next Actions                                                   │
│                                                                      │
│  4. Structured Capture                                               │
│     - Secondary form surface                                         │
│     - Precise manual editing                                         │
│     - Coverage model / fallback                                      │
│                                                                      │
│  5. Agent Activity / Review Inbox                                    │
│     - Agent runs                                                     │
│     - Failed runs                                                    │
│     - Suggested changes                                              │
│     - Approval gates                                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Surface Responsibilities

| Surface | Primary job | Should not become |
|---|---|---|
| Global Chat | General AI utility and long-running conversation | The main stream workflow |
| Contextual Ask/Tell | Ask about current page/entity | Free-form chat replacing review |
| Stream Workspace | Understand, review, and govern a stream | A long form or chat transcript |
| Structured Capture | Precise manual edits | Default user experience |
| Agent Activity / Inbox | Operational supervision | Multi-agent mission-control theater |

---

## 4. Phase 1 — Integrate Chat into AgentShell

### Goal

Make the existing chat feel like part of SecondStream, not a separate application.

### Current Problem

The chat currently has its own full-screen route and its own sidebar. That makes it feel disconnected from the main platform shell.

```txt
Current mental model

┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Main Platform                 │     │ Separate Chat App             │
│ - Dashboard                   │ --> │ - Chat sidebar                │
│ - Streams                     │     │ - Threads                     │
│ - Offers                      │     │ - Conversation                │
└──────────────────────────────┘     └──────────────────────────────┘
```

### Proposed Phase 1 Model

Add **AI Assistant** to the main platform navigation, but keep chat sessions inside the chat page area.

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ AgentShell                                                            │
├───────────────┬──────────────────────────────────────────────────────┤
│ App Sidebar   │ Top Bar                                               │
│               ├───────────────────┬──────────────────────────────────┤
│ Dashboard     │ Chat Threads      │ Conversation                      │
│ Streams       │ - Recent          │                                  │
│ Leads         │ - Search          │ AI Assistant                     │
│ Clients       │ - Archive         │                                  │
│ Offers        │ - New chat        │ Composer                         │
│ AI Assistant  │                   │                                  │
│ Settings      │                   │                                  │
└───────────────┴───────────────────┴──────────────────────────────────┘
```

### UX Decisions

- The main sidebar remains stable product navigation.
- Chat threads do **not** appear in the main app sidebar.
- Chat thread history becomes an internal panel inside `/chat`.
- `/chat` should reuse platform tokens, topbar behavior, spacing, and visual hierarchy.
- Mobile can keep a full-screen chat mode if needed.

### Deliverables

- Add `AI Assistant` to the main app navigation.
- Render `/chat` inside `AgentShell` instead of a separate full-screen shell.
- Convert the chat sidebar into a `ChatThreadPanel` inside the chat route.
- Remove duplicate app-level navigation from the chat experience.
- Preserve existing chat capabilities:
  - streaming
  - threads
  - attachments
  - PDFs/tools
  - retry/error states
  - archive/search/rename

### Success Criteria

- Users can access chat from the main platform navigation.
- Switching to chat does not feel like entering a different product.
- Main navigation remains stable and uncluttered.
- Existing chat functionality is preserved.

---

## 5. Phase 2 — Contextual AI Entry Points

### Goal

Make the assistant aware of the page/entity the user is working on.

### Why

General chat is useful, but SecondStream’s AI value comes from operational context: stream, company, location, evidence, proposal, offer, and pipeline state.

### Proposed Interaction

From any relevant page, users can invoke AI with context:

```txt
Stream Detail
┌──────────────────────────────────────────────────────────────┐
│ Stream: Acme Birmingham                                      │
│ Context actions:                                             │
│ [Ask AI about this stream] [Summarize evidence] [Find gaps]  │
└──────────────────────────────────────────────────────────────┘
```

The assistant receives a lightweight context object:

```txt
Context
- type: stream | offer | dashboard | client | global
- entityId: current entity id when applicable
- visible page state: current tab/section
- mode: read-only advisory unless explicitly escalated
```

### UX Decisions

- Context should be visible to the user via a context chip.
- The assistant should show what it is using: stream, files, notes, proposal, offer, etc.
- Contextual chat should default to read-only advisory mode.
- Any suggested write must become a reviewable suggestion, not an automatic database mutation.

### Example

```txt
┌──────────────────────────────────────────────────────────────┐
│ AI Assistant                                                  │
│ Context: Stream · Acme Birmingham · Discovery                 │
│ Sources: 4 files · 2 notes · current workspace fields          │
│ Mode: Read-only advisory                                      │
├──────────────────────────────────────────────────────────────┤
│ User: What is blocking this stream?                           │
│ AI: The main blocker is missing composition evidence.          │
│     The SDS mentions pH but no contaminant breakdown.          │
│     Suggested next action: request COA from site contact.      │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Phase 3 — AI-Native Stream Workspace

### Goal

Move Stream Detail from form-first to artifact-first.

Phase 3 is where AI becomes operationally central, but still not chat-first. The scope guardrail is:

```txt
One visible agent.
One primary artifact.
One main workflow.
```

- **One visible agent:** `Discovery Completion Agent`.
- **One primary artifact:** `Discovery Brief`.
- **One main workflow:** ingest evidence → review brief → accept/correct suggestions → advance next action.

### Source of Truth

This phase follows `docs/plans/ai-native-workspace.md`.

The critical decision from that document:

> The product is not designed for the user to “chat with a bot” as the primary flow. The primary interaction is over a live brief.

### Target Workspace Model

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Stream Workspace: Acme Birmingham                                     │
├──────────────────────────────────────────────┬───────────────────────┤
│ Discovery Brief                              │ Side Panel             │
│                                              │                       │
│ What we know                                 │ Next Actions           │
│ - Fact                                       │ - Request COA          │
│ - Assumption                                 │ - Verify volume        │
│                                              │                       │
│ What is missing                              │ Pending Review         │
│ - Question                                   │ - 3 facts              │
│ - Recommendation                             │ - 1 conflict           │
│                                              │                       │
│ What is in conflict                          │ Evidence               │
│ - Conflict                                   │ - SDS.pdf              │
│                                              │ - Field note           │
│ [Accept] [Incorrect] [Needs verification]    │                       │
├──────────────────────────────────────────────┴───────────────────────┤
│ Ask/Tell about this brief...                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Product Primitives

- **Discovery Brief** — live artifact representing current stream understanding.
- **Pending Review** — human attention queue.
- **Evidence** — files, notes, extracted data, provenance.
- **Next Actions** — suggested operational moves.
- **Structured Capture** — secondary manual form/edit surface.

### Interaction Order

1. **Natural ingest** — user adds voice, notes, files, text, photos.
2. **Inline review** — user reviews typed brief points.
3. **Ask/Tell contextual** — user asks or instructs the agent about a specific point or brief.
4. **Structured Capture** — user manually edits structured fields when precision is required.

### Guardrail

Do not replace the form with a chat transcript. Replace it with a reviewable artifact.

---

## 7. Phase 4 — Agent Activity / Review Inbox

### Goal

Make agent work observable and governable.

### Why

Agent-first products need trust. Users should see what the agent did, what failed, what is waiting for review, and what changed because of human approval.

### Proposed Surface

```txt
┌──────────────────────────────────────────────────────────────────────┐
│ Agent Activity                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Pending Review                                                        │
│ - Discovery Brief update · Acme Birmingham · 3 facts need review       │
│ - Suggested field update · volume changed from unknown → 3 tons/mo     │
│                                                                      │
│ Running                                                               │
│ - Discovery Completion Agent · processing SDS.pdf                     │
│                                                                      │
│ Failed                                                               │
│ - Proposal generation · missing compliance input                      │
│                                                                      │
│ Completed                                                            │
│ - Evidence summary generated · linked to Stream #42                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Rules

- Agent runs should be traceable.
- Failures should be visible, not silent.
- Suggested changes should require explicit approval when they affect canonical truth.
- The human delegator remains accountable.

---

## 8. Phase 5 — Organization-Wide Agentic Operations

### Goal

Use organization-wide context to automate and optimize brokerage operations.

### Future Capabilities

- Cross-stream intelligence:
  - “Which streams are blocked by missing COA?”
  - “Which offers need follow-up this week?”
  - “Which streams are similar to past successful proposals?”
- Compliance support:
  - evidence gaps
  - permit risks
  - contradictory source detection
- Pricing/proposal support:
  - proposal drafts
  - CAPEX/OPEX explanation
  - closing-risk analysis
- Marketplace/logistics support:
  - provider matching
  - logistics feasibility
  - preparation for CRM/marketplace sync

### Long-Term Model

```txt
Evidence → Discovery Brief → Review → Proposal → Compliance Gate → Offer → CRM/Marketplace Sync
                 ↑              ↑          ↑              ↑
              Memory        Agent Runs   Suggestions    Approval Gates
```

---

## 9. Design Principles

### Principle 1 — Chat is a surface, not the product

Chat is useful for exploration and refinement, but the durable product value should live in artifacts, suggestions, evidence, and review states.

### Principle 2 — Artifact-first for operational work

If the AI generates something users must trust, compare, approve, or audit, show it as an artifact with provenance and review controls.

### Principle 3 — Human review must be explicit

Silence is never approval. Agent suggestions stay pending until accepted.

### Principle 4 — The agent should use product-level abstractions

Do not make the agent operate as if it is clicking UI buttons or calling raw CRUD endpoints. Expose semantic capabilities: ingest evidence, generate brief, detect conflicts, emit suggestions, retrieve context.

### Principle 5 — Memory belongs to SecondStream

Agent memory, sessions, runs, briefs, and observations should be persisted in SecondStream-controlled storage, not hidden inside a model provider.

### Principle 6 — Keep v1 focused

For the workspace: one visible agent, one primary artifact, one main workflow.

---

## 10. Anti-Patterns to Avoid

| Anti-pattern | Why it is dangerous |
|---|---|
| Chat as primary stream workflow | Turns operational state into a transcript; hard to audit and review |
| Chat threads inside main sidebar | Mixes product navigation with conversation history |
| Agent writes canonical truth directly | Risks corrupting the system of record |
| Form remains default workspace | Recreates current cognitive load |
| Agent personality dominates UI | Makes AI feel like a character instead of product capability |
| Invisible context | Users cannot trust answers if they do not know what the AI used |
| Output as text only | No diff, provenance, review state, or approval path |

---

## 11. Proposed Navigation Evolution

### Phase 1 Navigation

```txt
App Sidebar
├─ Dashboard
├─ Streams
├─ Leads
├─ Clients
├─ Offers
├─ AI Assistant
└─ Settings
```

### Later Navigation

```txt
App Sidebar
├─ Dashboard
├─ Streams
├─ Leads
├─ Clients
├─ Offers
├─ AI Assistant
├─ Agent Activity       (when mature enough)
└─ Settings
```

Do not add chat threads to the main sidebar.

---

## 12. Presentation Narrative

Use this narrative when presenting the plan:

1. **Today:** We have a capable AI chat, but it is visually and operationally separate from the platform.
2. **First step:** Bring chat into the main platform shell so it feels native and discoverable.
3. **Next:** Make AI contextual to streams, offers, and dashboard work.
4. **Then:** Redesign Stream Detail around the Discovery Brief, not a long form and not a chat transcript.
5. **Finally:** Treat agents as governed product actors with runs, tools, memory, review states, and approval gates.

Short version:

```txt
Integrate chat first. Then make it contextual. Then move the stream workspace to artifact-first. Then govern agent work.
```

---

## 13. Implementation Sequence

### Step 1 — Chat in AgentShell

- Route `/chat` through the main layout.
- Add `AI Assistant` nav item.
- Convert chat sessions sidebar into internal chat panel.
- Preserve all existing chat behavior.

### Step 2 — Context Object

- Add a generic page/entity context model.
- Start with read-only context.
- Show context chips in the UI.

### Step 3 — Contextual Entry Points

- Add “Ask AI about this stream”.
- Add “Summarize evidence”.
- Add “Find gaps”.
- Add “Draft follow-up”.

### Step 4 — Discovery Brief Workspace

- Introduce Discovery Brief as primary stream artifact.
- Add typed points: Fact, Assumption, Conflict, Question, Recommendation.
- Add inline review actions.
- Move current form to Structured Capture.

### Step 5 — Suggestions + Review

- Agent emits reviewable Workspace Suggestions.
- Accepted suggestions update canonical truth through normal product paths.
- Rejected/deferred suggestions stay auditable.

### Step 6 — Agent Activity

- Show runs, failures, pending review, and completed outputs.

---

## 14. Open Questions

1. For Phase 2, should contextual chat open inside `/chat` with context, or as a right-side drawer from the current page?
2. What is the minimum useful context for Phase 2: stream metadata only, or also evidence summaries and current offer/proposal state?
3. What typed point schema should the first Discovery Brief use exactly?
4. What write actions are safe for the agent to propose in v1?
5. What should the first Agent Activity view expose: all runs, only failures, or only pending review?
6. When should `Agent Activity` become a first-class sidebar item versus staying hidden behind admin/review flows?

---

## 15. Appendix — Concise Prompt for a Second Opinion Agent

Use this prompt with another agent:

```txt
Review SecondStream’s AI roadmap.

Goal: Phase 1 should integrate the existing `/chat` into `AgentShell` so AI feels native to the platform. Later phases should evolve Stream Detail into an artifact-first workspace centered on a Discovery Brief, with explicit human review and no chat-first workflow.

Read:
- docs/plans/2026-04-28-ai-surfaces-roadmap.md
- docs/plans/ai-native-workspace.md
- docs/the-golden-rules-for-agent-first-productengineering.md
- frontend/app/chat/*
- frontend/app/(agent)/layout.tsx

Evaluate:
1. Is the phase order correct?
2. Does Phase 1 improve coherence without pushing the product toward chat-first UX?
3. How should the chat thread sidebar work inside the main platform shell?
4. What should be clarified or removed for a team presentation?
5. What key risks or missing guardrails remain?

Return: concise recommendation, tradeoffs, and suggested edits.
```

---

## 16. Final Recommendation

Proceed with Phase 1 as planned: **integrate the existing chat into AgentShell**.

But treat that as the start of the AI surface model, not the final product direction.

The long-term goal is:

```txt
Global Chat for general AI assistance
+ Contextual Ask/Tell for page-aware help
+ Discovery Brief Workspace for stream understanding
+ Structured Capture for precise manual edits
+ Agent Activity for governance
```

This gives the team a practical first step while protecting the deeper AI-native product vision.
