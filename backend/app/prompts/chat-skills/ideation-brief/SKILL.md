---
name: ideation-brief
description: "Support generation of the Ideation Brief PDF. Load only when discovery-reporting is preparing Discovery outputs and the agent is about to call generateIdeationBrief, or when the user explicitly requests an Ideation Brief. Use to shape the PDF payload, structure, and loose consultant voice; do not use for inline chat-only summaries."
---

## When to generate an Ideation Brief

Generate an Ideation Brief when the conversation has surfaced enough information to frame
a commercial opportunity — typically after the discovery exchange has established gate status,
key opportunity sections, and a strategic insight. The user may ask explicitly ("generate the
brief", "create the ideation document") or the conversation may naturally reach a point where
a brief is the logical next deliverable.

## What the Ideation Brief captures

A structured PDF that tells the commercial story: qualification gate, opportunity sections
with emphasis markers, and a closing strategic insight.

Gate values: OPEN | OPEN_CONDITIONAL | CLOSED

Section emphasis types (optional per section):
- "insight" — commercial insight that changes the deal
- "caution" — nuance that changes routing or pricing
- "gap"     — information still needed before moving forward

## Cover fields

- **`header_line`** (string, **required**): one rich line of context. Weave
  customer + portfolio + sites + in-offer summary so a reader picks up the
  situation in a single glance. Example: `"ExxonMobil — Gulf Coast Spent Caustic Portfolio · Beaumont (2 barges/mo) + GCGV (1 barge/mo) in offer"`. Avoid trailing dates — the document already shows the date elsewhere.
- **`evidence_caption`** (string, optional): caption shown beneath the cover subtitle to flag what evidence or producer state is present. Example: `"Updated SDS in evidence (June 2024) · Second Beaumont sample in evidence (April 2026) · Producer offer received"`. Omit when there is nothing notable to flag.

## Tool call

Call `generateIdeationBrief` with flat top-level tool arguments. Do not wrap the
arguments in a `payload` object. The tool renders the PDF and returns a signed download
URL. Do not output raw HTML or markdown tables — use the tool exclusively.

Valid tool arguments example:
```json
{"customer":"Acme Metals","stream":"spent caustic","date":"2026-04-29","header_line":"Acme Metals — Spent Caustic Portfolio · Plant 3 (1 barge/mo) in offer","gate_status":"OPEN","sections":[{"title":"Commercial fit","lead":"Buyer demand is active.","body":"The stream matches current outlet specs.","emphasis":"insight"}],"strategic_insight":"Prioritize outlets that already accept this chemistry.","markers_used":["insight"]}
```

markers_used: list only the emphasis types that actually appear in sections (drives legend).
