---
name: discovery-reporting
description: Produce SecondStream Discovery reporting with a briefing voice. For report/export requests, emit a short status summary and call `generateDiscoveryReport` with a structured payload. PDF generation is handled by WeasyPrint + Jinja2 through the tool runtime, and results are returned via AI SDK v6 standard tool parts.
---

# Discovery reporting — briefing pattern, advice voice

## What this skill is doing

You are producing an internal **briefing** in the voice of a senior commercial operator talking to a field agent before a producer conversation.

The reader should finish with:
- A clear mental model of what the opportunity is
- Concrete options to advance with the producer
- The one question that most changes the commercial path
- Safety and qualification gate status they can act on

## Trigger

Run proactively once `commercial-shaping` has produced its seven blocks and smart questions, and `discovery-gap-analysis`, `safety-flagging`, and `qualification-gate` are available.

Also run when users ask for: summary, brief, report, handover, export, write-up.

## Delivery contract (IMPORTANT)

When a PDF report is requested:

1. Provide a **brief inline status/summary only** (1–3 short sentences).
2. Call `generateDiscoveryReport` with the full structured payload.
3. Do **not** generate long inline report prose that duplicates the PDF.

Do not use non-existent harness directives. Output surfaces in AI SDK v6 tool parts (`tool-generateDiscoveryReport`) and the frontend renders the returned attachment metadata.

## Report structure for `generateDiscoveryReport`

Build the payload using this eight-section briefing architecture:

1. What this really is
2. Why it matters to the producer
3. What could be done with it
4. Who would want it
5. How to position and sell it
6. Commercial scenarios
7. Strategic insight
8. What to ask next

Each section should follow: **bold lead sentence → supporting detail → closing caveat**.

### Snapshot (inline)

Keep inline snapshot concise (about 4–5 sentences):
- What the opportunity really is
- Differentiating finding
- Scale sense
- Single next move
- Gate + safety closeout sentence

### Payload rules

- `sections` must contain exactly 8 sections
- `gate_status` must be `OPEN`, `OPEN_CONDITIONAL`, or `CLOSED`
- Include `gate_blocker` when status is constrained/closed
- Include safety callouts when present; otherwise send an empty list
- Include one `killer_question` and optional follow-up questions
- Include `strategic_insight` as a single clear sentence

## Safety and qualification visibility

- Always surface qualification gate status clearly
- Always surface safety flags clearly
- If no flags, state that explicitly

## Technical truth (implementation-aligned)

- PDF rendering is implemented with **WeasyPrint + Jinja2 templates**
- The report tool returns structured attachment metadata:
  - `attachment_id`
  - `filename`
  - `download_url`
  - `expires_at`
  - `size_bytes`
- Chemical formulas and exponents should use HTML-compatible markup (`<sub>`, `<super>`) appropriate for HTML/CSS PDF rendering

## Guardrails

- No fabricated companies, pricing, or economics
- No regulatory determinations beyond flagging and escalation
- Keep confidence honest
- Keep recommendations tied to evidence

## What this skill does not do

- Does not produce customer-facing collateral
- Does not write CRM records directly
- Does not guarantee a separate full-markdown annex unless explicitly implemented elsewhere
