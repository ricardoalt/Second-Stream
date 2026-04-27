---
name: ideation-brief
description: Guides the agent to generate an Ideation Brief PDF via the generateIdeationBrief tool.
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

## Tool call

Call `generateIdeationBrief` with the `IdeationBriefPayload` schema. The tool renders
the PDF and returns a signed download URL. Do not output raw HTML or markdown tables —
use the tool exclusively.

markers_used: list only the emphasis types that actually appear in sections (drives legend).
