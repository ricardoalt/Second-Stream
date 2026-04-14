**SecondStream**

The Concept Doc

*What we are building, and why it is not a CRM with AI features bolted on.*

**Audience:** full-stack engineers on the SecondStream team.

**Assumed context:** none. If you have just joined the team, this is where you start.

**Status:** canonical. When in doubt about whether to build something, this doc wins over individual tickets.

 

# **1\. The product, in one sentence**

| SecondStream A multi-tenant platform where field agents discover industrial secondary streams through conversation, voice, and evidence — and managers see the pipeline, coaching signals, and commercial opportunities derived automatically from that work, with no duplicate admin. |
| :---- |

 

**Two user roles, one substrate.** Field agents generate evidence. Managers consume derived signal. The same underlying data serves both — never built twice, never reconciled manually.

 

**Terminology rule (non-negotiable).** We never say “waste streams” in any user-facing copy, prompt, or doc. We say “secondary streams” or “second streams.” The reframe from waste to opportunity is the product.

 

# **2\. What “AI-native” means here (and what it doesn’t)**

Every engineer on this team will, at some point, build a feature as “a screen with fields to fill in, plus an AI helper.” That is the pattern your hands know. It is not what we are building. Read this section twice.

## **2.1 The definition**

| AI-native, in one line The primary interaction surface is conversational, multimodal, and intent-driven. Structured records are a byproduct of the agent’s work and the AI’s interpretation — not the thing the user manually produces. |
| :---- |

 

## **2.2 The contrast**

The difference is not cosmetic. It shows up at every layer — schema, API, UI, sequencing of engineering work. The table below is the one we will return to whenever a ticket smells off.

 

| Form-first (what we’re leaving) | AI-native (what we’re building) |
| :---- | :---- |
| Agent opens screen, types answers into fields. | Agent presses and holds, speaks, releases. System does the rest. |
| Required fields block progress. | Partial information is fine. AI tracks what’s known, unknown, and stale. |
| Database stores scalar values. | Database stores beliefs: value \+ source \+ confidence \+ freshness. |
| Agent manually advances pipeline stage. | System derives stage from evidence. Humans cannot set it by hand. |
| Documents live in an “attachments” tab. | Documents are evidence objects with extracted facts, dates, gaps, and links to beliefs. |
| Manager asks agents for status updates. | Manager asks the system natural-language questions and gets grounded answers. |
| Corrections re-open a form. | Corrections are one tap or one spoken sentence, inline. |
| CRUD endpoints mirror the UI. | Intent endpoints (“capture observation,” “update belief”) abstract over how the user expressed the intent. |

 

## **2.3 The tell-tale signs of drift**

If you catch any of these in a spec review, stop the review. These are the symptoms that we are regressing to form-first thinking.

•  	A ticket described as “build a screen to capture X” with X being a list of fields.

•  	A data model where the main entity is a row of columns rather than a collection of beliefs.

•  	A required field anywhere in the capture path.

•  	A dropdown for “stage” or “status” that the user can set.

•  	An AI feature that runs once at submit time instead of continuously as evidence accumulates.

•  	A Figma mockup where the hero element is a form.

•  	The phrase “then the user confirms and saves” — capture should not have a save button.

 

# **3\. The five-layer architecture**

This is the canonical way we describe the system. Every feature maps cleanly to one or more layers. If a proposed feature does not fit, we are either missing a layer or the feature is misconceived.

 

| Layer | Purpose | Owns |
| :---- | :---- | :---- |
| 1\. Ontology | The schema of the world — streams, sites, contacts, documents, beliefs. | Entities, relationships, belief records, confidence/freshness metadata. |
| 2\. Evidence | Turns raw multimodal input into structured belief updates. | Voice, photo, document, and note ingestion; transcription; extraction; classification; linkage to entities. |
| 3\. Readiness | Derives pipeline state from the current set of beliefs. | Stage computation, missing-info detection, blocker identification, staleness decay. |
| 4\. Copilot | The agent-facing surface. Conversational, proactive, correction-first. | Capture UI, dossier views, next-best-question prompts, inline corrections, visit timeline. |
| 5\. Team Outputs | The manager-facing and downstream-consumer surface. | Natural-language pipeline queries, coaching signals, auto-generated briefs, alerts, rollups. |

 

## **3.1 Why these five, in this order**

**Ontology first** because if the data model is wrong, everything else is wrong. Specifically: if we store values instead of beliefs, we cannot build layers 3, 4, or 5 properly. Retrofitting is painful. We commit to the belief model before any feature code.

**Evidence second** because the product is worthless if agents have to type to populate it. Voice, photo, and document ingestion are the capture surface.

**Readiness third** because this is what makes the system feel alive. Without derived state, the app is a notes folder.

**Copilot fourth** because by this point we have something worth wrapping in a UI. The UI’s job is to surface the system’s reasoning and make corrections cheap.

**Team Outputs fifth** because manager value is a consequence of the substrate below. Build it last, but design for it from day one — every belief we store must carry enough metadata to answer a manager’s natural-language query without re-querying the agent.

 

## **3.2 The belief record — our single most important commitment**

Every fact the system knows is a belief, not a value. This is the architectural decision that enables everything else. In the data model:

 

Belief {

  id: uuid

  tenant\_id: uuid

  subject\_type: 'stream' | 'site' | 'contact' | 'customer' | ...

  subject\_id: uuid

  attribute: string        	// e.g. 'regulatory\_status', 'volume\_per\_week'

  value: json              	// typed per attribute schema

  confidence: float        	// 0.0 \- 1.0

  freshness: timestamp     	// when this belief was last corroborated

  sources: \[EvidenceRef\]   	// pointers to the evidence that produced it

  superseded\_by: uuid | null   // belief history chain

  confirmed\_by\_human: bool 	// has an agent validated this?

  created\_at, updated\_at

}

 

**Read the last three fields again.** They are what make the system trustworthy. *superseded\_by* gives us belief history. *confirmed\_by\_human* tells the UI what to ask the agent to validate. *sources* is what makes every AI output traceable — click any fact in the dossier, see the voice note or document it came from.

| Engineering commitment We do not ship any feature that writes to an entity using scalar columns for domain facts. Domain facts go through the belief layer. Core identifiers (names, IDs) can remain columns; everything an AI might infer or a human might dispute is a belief. |
| :---- |

 

# **4\. Three canonical user moments**

When you are designing or implementing a feature, hold it against these three scenes. If your feature does not make one of these better — or if it would make one of them worse — the feature is wrong.

 

## **4.1 Moment A — Agent in a warehouse, phone in one hand**

| The scene Rahul is walking a plant in Birmingham with the site’s ops manager. They stop at a tote of mixed film plastic. Rahul pulls out his phone. He presses and holds the app’s capture button. He says: *“New stream at Acme Birmingham — mixed film plastic, about three tonnes a week, contaminated with food residue. Ops manager says they’ve been rejected by recyclers twice this year.”* He snaps two photos of the tote and the label. He releases the button. He keeps walking. Thirty seconds of work. No screen. No typing. No “save.” |
| :---- |

 

**What the system must have done by the time he gets back to his van:**

•  	Transcribed the voice note.

•  	Recognised “Acme Birmingham” as an existing site (or flagged it as a new one needing confirmation).

•  	Created a new stream dossier under that site, or linked to an existing one if the description matches.

•  	Extracted beliefs: stream type (mixed film plastic), volume (\~3 t/week), contamination (food residue), rejection history (two recyclers, this year).

•  	Attached the photos as evidence objects, extracted any label text via OCR, and linked them to the relevant beliefs.

•  	Computed readiness: likely “Discovery complete,” missing items for “Assessment ready” flagged.

•  	Surfaced nothing to Rahul unless it needs his attention. If one belief is ambiguous — say, whether “three tonnes a week” is the stream volume or the tote capacity — that one question waits for him, once.

 

**Anti-pattern to reject:** Rahul opens the app, taps “New Stream,” picks a customer from a dropdown, picks a site from a dropdown, then sees a form with a voice-input field on it. That is form-first capture with voice pasted in. It is not what we are building.

 

## **4.2 Moment B — Manager on Monday morning**

| The scene Priya runs the field team. It is 8:15 on Monday. She opens SecondStream on her laptop. *She types: “Which streams moved to Assessment Ready last week, and which ones are stuck on a missing COA?”* She gets a grounded answer in ten seconds, with every stream clickable back to its dossier and every claim traceable to the evidence behind it. |
| :---- |

 

**What the system must have done to make this possible:**

•  	Stored beliefs, not values — so “missing COA” is a computable query against the evidence graph.

•  	Derived stage from evidence — so “moved to Assessment Ready last week” is a question about the belief history, not about who clicked a dropdown.

•  	Indexed beliefs for natural-language querying — either via a planner over structured queries, or a hybrid retrieval layer over the dossiers.

•  	Tenant-isolated every step of that pipeline.

 

**Anti-pattern to reject:** a dashboard with six static cards showing KPIs the team picked in a workshop. The manager’s questions are not knowable in advance. The interface is conversational, or it fails Moment B.

 

## **4.3 Moment C — Agent correcting the AI**

| The scene Back at the van, Rahul opens the dossier for the stream he just captured. The AI has extracted volume as “3 tonnes per week.” Rahul realises he misspoke — it’s three tonnes per month. He taps the “3 t/week” chip. A short prompt appears: “What’s the correct value?” He presses and holds. He says: “Three tonnes a month, not a week.” He releases. Done. |
| :---- |

 

**What the system must have done:**

•  	Superseded the old belief, preserving the history (the original belief is not deleted — the chain tells us what changed and when).

•  	Re-computed anything downstream: readiness stage, any buyer-matching heuristics, any manager rollups.

•  	Marked the new belief as confirmed\_by\_human — so it now has higher authority than anything the AI might later infer to the contrary.

 

**Anti-pattern to reject:** tapping the chip opens a modal form with a volume field and a unit dropdown. That is a form. One tap plus one sentence is the bar.

 

# **5\. What the API looks like (shape, not spec)**

To resist CRUD-shaped thinking, the API resists CRUD-shaped endpoints. The public API is organised by intent, not by entity. The entity model lives underneath.

 

## **5.1 The core intent endpoints**

 

| Endpoint | Purpose |
| :---- | :---- |
| POST /observations | Agent captured something. Body: voice/photo/text/document \+ context (location, time, optional site hint). Response: observation ID, immediate acknowledgement. Extraction runs async. |
| GET /streams/:id/dossier | The live dossier view. Returns beliefs grouped by section, with confidence, freshness, sources, and readiness state. Drives the agent UI. |
| POST /beliefs/:id/correction | Human-in-the-loop correction. Accepts a new value (typed, or a new voice/text blob the system parses). Creates a superseding belief with confirmed\_by\_human \= true. |
| GET /streams/:id/readiness | Derived, not stored. Returns current stage, missing items per target stage, blockers, and suggested next actions. |
| POST /queries | The manager’s front door. Natural-language query against the tenant’s pipeline. Returns grounded answer with citations to streams/beliefs/evidence. |
| GET /sites/:id/timeline | All observations and belief changes at a site, in chronological order. The container view for an agent arriving on-site. |

 

**Notice what is not in that list.** No POST /streams. No PATCH /streams/:id. No PUT /streams/:id/stage. Stream records are created as a side effect of observations. Stages are derived. Individual field updates go through the belief correction endpoint, which preserves history.

 

## **5.2 Where forms are allowed to live (for now)**

We are pragmatic about sequencing. Some form-shaped surfaces stay in the MVP — but they are quarantined, and they are never the primary path.

•  	Tenant admin screens (user management, billing, tenant config). These are not the product.

•  	Bulk import / data migration tooling. Forms are fine when you genuinely have tabular data.

•  	Precision edits that one-tap voice correction cannot handle well — e.g. editing a long free-text note. These exist, but are reached from a belief correction flow, not from a “Edit stream” button.

 

| The form quarantine rule If a feature touches domain data (streams, sites, beliefs, evidence, readiness, contacts), the primary path is not a form. Period. Forms may exist as an escape hatch, reachable in at most two taps from the AI-native path — never as the default. |
| :---- |

 

# **6\. Non-negotiables (the things we will not compromise on)**

Everything else on this project is a tradeoff. These are not.

 

| Rule | Why it matters |
| :---- | :---- |
| Beliefs, not values, for all domain facts. | Enables traceability, correction, staleness, confidence — the foundation of trust. |
| Voice note alone must be sufficient to create a stream record. | If a stream requires typed input to exist, we have not built AI-native capture. |
| Pipeline stage is derived, never set by a user. | Manual stage \= admin burden on agent \+ unreliable signal for manager. Both harmful. |
| Every AI-output fact is traceable to its source. | No source \= no trust. Click a fact, see the voice note or document. |
| Confidence and freshness are visible in the UI for facts the AI is unsure about. | Humans need to know where to focus. Hidden uncertainty is a failure mode. |
| Corrections are one tap plus one sentence, maximum. | Correction cost determines whether humans actually correct. Make it cheap or they won’t. |
| Tenant isolation is enforced at the data layer, not the controller. | Multi-tenant safety cannot depend on every endpoint remembering to filter. |
| No domain feature ships with a form as its primary surface. | One exception and the pattern is back. We are strict. |
| No user-facing use of the word “waste.” | Terminology is the product. “Secondary streams.” Always. |

 

# **7\. How to use this doc**

This doc alone will not tell you what to build this sprint. Two companion docs do that:

•  	**The Feature Map** — the full surface area of the product, grouped by the five layers, with AI-native acceptance tests for each.

•  	**The Build Sequence** — the phased plan: what we ship, when, what it unlocks, and what form-first temptations to resist at each phase.

 

When those docs describe a feature, this doc is the test. A feature proposal must:

•  	Name the layer(s) it touches.

•  	Pass the three canonical moments — better for at least one, worse for none.

•  	Avoid every drift signal in section 2.3.

•  	Satisfy every non-negotiable in section 6\.

 

If it does all four, build it. If it fails any, send it back for redesign — even if the ticket is already sized.

 

| Final thought The reason this doc is short is that the idea is simple. The reason we will fight to hold onto it is that it is not the shape our industry builds software in. The questionnaire behind SecondStream is the brain. The forms were the face we almost gave it. We are giving it a different face: a microphone, a camera, and a system that listens. |
| :---- |

   
