---
name: discovery-reporting
description: "Produce SecondStream Discovery outputs — Snapshot (inline prose only, 4-5 sentences, never a PDF), Ideation Brief (PDF, loose consultant voice, 1-2 pages), Analytical Read (PDF, rigorous evidenced voice, 2-4 pages), Call Playbook (PDF, reference tool, 1-2 pages), and Full annex (markdown). Trigger when the user asks for a summary, brief, snapshot, report, write-up, handover, or export, and proactively once commercial-shaping has run. The three PDFs serve different cognitive functions and have different voices — Ideation helps the agent see the opportunity, Analytical stress-tests the ideation with evidence, Playbook is a reference tool for during the producer call. Share a common header line across all three (customer, stream, date, version); tailored cover blocks below. Qualification gate and safety flags on Ideation and Analytical; Playbook is a tool, not a record. PDF generation is handled by registered tools that return signed URLs in `tool-output-available`. Do not attempt low-level layout control."
---

# Discovery reporting — three artefacts, three voices

## What this skill is really doing

Not producing a report. Producing three separate tools the field agent uses at three different moments in their workflow.

The artefacts are deliberately separate because they serve different cognitive functions. Combining them into one document collapses three voices into one and produces something that reads fine but helps nobody.

## Trigger

Run proactively once `commercial-shaping` has produced its three output blocks (Ideation content, Analytical content, Playbook content) and the supporting skills (`discovery-gap-analysis`, `safety-flagging`, `qualification-gate`) have run.

Also run on direct request: "summary," "brief," "report," "export," "send to my manager," "put together a write-up."

Produce all outputs (snapshot + 3 PDFs + full annex) together by default. Do not ask the user to choose.

## The four outputs

### Tier 1 — Snapshot (inline markdown, 4-5 sentences of prose)

Prose, not tables. Four to five sentences. Bold one or two key findings inline. End with qualification gate status and safety flags in one sentence.

**Snapshot is inline chat text only.** It is never a PDF, never a tool output, and never a downloadable file. Write it directly into the chat response.

### Tier 2a — Ideation Brief (PDF, 1-2 pages, loose consultant voice)

**Purpose:** help the field agent *see* the opportunity on first read. A 3-minute read. The document that produces the "oh, I get it now" moment.

**Voice — strict rules:**

- **Bullet density is high.** No paragraphs where a list will do.
- **Lettered sub-sections** (A / B / C) within each numbered major section.
- **Each bullet is one fact or one claim.** Not compressed clauses.
- **Emoji pivots allowed** — 🔴 for problem framing, 👉 for implication, ✅/❌ for recommendations, 💡 for insight. Sparingly, as visual anchors.
- **Headers are claims, not labels.** Consumes the section headers produced by `commercial-shaping`'s Ideation output block.
- **No evidence tags** — the Ideation is declarative.
- **No confidence labels inline** — uncertainty stated in plain language in context.

**Structure — five numbered sections from `commercial-shaping` Ideation output:**

1. What you're actually looking at (interpretive read of the stream)
2. How this could be treated (four options, low → medium → high → niche effort)
3. Who could buy it (buyer archetypes by category, as-is vs reprocessed)
4. How to position it (tier frame, messaging anchors)
5. Scale shape (directional, with arithmetic only if inputs are real)

Plus **closing strategic insight** — one sentence, visually set apart, italic centred callout.

**Cover block for Ideation:**

- Shared header line (see below)
- Title: "Ideation Brief"
- One-line subtitle: "A consultant's first read — help you see the opportunity"
- Qualification gate callout (colour-coded)
- Safety flags callout

**Filename:** `[customer-slug]-[stream-slug]_[YYYY-MM-DD]_ideation.pdf`

### Tier 2b — Analytical Read (PDF, 2-4 pages, rigorous evidenced voice)

**Purpose:** stress-test the ideation. Defensible analytical backbone. The artefact a manager reads to judge whether the ideation holds up.

**Voice:**

- Tighter — shorter sentences, less intra-sentence hedging
- Tables and structured blocks preferred over prose for comparative content
- Evidence tags throughout — `[EV-NN]`
- Confidence labels on sized numbers (HIGH / MEDIUM / LOW)
- Per-site specificity; do not aggregate when differences matter
- Section leads in bold as advice-voice sentences; body supports; italic close caveats

**Structure — six sections from `commercial-shaping` Analytical output block:**

1. Per-site chemistry read (table with interpretive commentary per site)
2. Treatment fit — what works for which site
3. Buyer archetype matrix (archetypes × sub-streams, ✓ / borderline / ✗ with reasoning)
4. Phased commercial scenarios (directional outcomes, prerequisites per phase)
5. Sizing (arithmetic if real inputs; qualitative direction if not)
6. Strategic insight (same closing line as Ideation — carried here because this is the defensible version)

**Cover block for Analytical:**

- Shared header line
- Title: "Analytical Read"
- One-line subtitle: "The evidenced case behind the ideation"
- Qualification gate callout
- Safety flags callout

**Filename:** `[customer-slug]-[stream-slug]_[YYYY-MM-DD]_analytical.pdf`

### Tier 2c — Call Playbook (PDF, 1-2 pages, reference voice)

**Purpose:** a tool the field agent opens *during* the producer conversation. Not a document to read before — a document to flip through during. Structured so they can find any theme in seconds.

**Voice:**

- No narrative, no beliefs, no caveats
- No evidence tags, no confidence labels, no gate status — it's a tool, not a record
- Questions phrased in the voice the agent will actually say them
- Sub-questions indented under parents where natural

**Structure — fixed 11-theme set from `commercial-shaping` Playbook output block:**

1. Volume & Frequency (first — non-negotiable)
2. Source & Process (critical for segmentation)
3. Quality & Consistency
4. Physical Handling & Logistics
5. Current Disposal Model (baseline economics)
6. Regulatory & Compliance
7. Infrastructure & CAPEX Flexibility
8. Commercial Objectives
9. Risk Tolerance & Operations
10. Market Flexibility (critical for upside)
11. Smart Questions (high-impact pull-out — 3-5 killer questions restated)

Each theme has: numbered header with descriptive tag, italic framing line, 3-6 questions (with sub-indents where natural), and a **"👉 Why it matters:"** block with bulleted implications (2-4 items).

Sparse themes are marked, not skipped. A theme with no stream-specific content says "Standard diligence — no stream-specific questions here" with a short context line, then moves on.

**Cover block for Playbook:**

- Shared header line
- Title: "Call Playbook"
- One-line subtitle: "Open during the producer call. Flip to any theme."
- **No gate callout, no safety callout** — this is a tool, not a record
- A brief orientation line: "The killer questions are in Theme 11. The questions you need to ask first are in Theme 1."

**Filename:** `[customer-slug]-[stream-slug]_[YYYY-MM-DD]_playbook.pdf`

### Tier 3 — Full annex (markdown)

Structure:
1. Executive mirror (snapshot + Ideation + Analytical content for self-contained reading)
2. Per-sub-stream deep dive
3. Evidence catalogue (EV-NN with source, date, authority, description)
4. Assumption register
5. Open regulatory / handling / logistics agenda (for Assessment)
6. Safety annex
7. Document control

## Shared elements across the three PDFs

### Shared header line

At the top of every PDF, above the tailored cover block:

```
[Customer name] — [Stream name] · [Site list or portfolio description] · [Report date]
Discovery [Artefact name] · SecondStream Discovery Agent v3 · Internal handover
```

This line is identical across all three PDFs so the agent sees they are three parts of one opportunity.

### Qualification gate callout (Ideation + Analytical only)

Colour-coded: green = OPEN, amber = OPEN with conditions, red = CLOSED. Contains the one-line blocker statement if CLOSED.

### Safety flags callout (Ideation + Analytical only)

Colour-coded: red = stop-flag, amber = specialist-flag, yellow = attention-flag. If no flags, says "No safety flags raised" on a neutral background. Never buried.

## PDF output — technical requirements

PDF generation is handled entirely by the registered tools (`generateIdeationBrief`, `generateAnalyticalRead`, `generatePlaybook`).

Call the appropriate tool with the structured payload. The tool renders the PDF and returns signed URLs in `tool-output-available`. Do NOT attempt to control low-level layout, fonts, spacing, or page geometry.

Do not save files to disk, do not reference local filesystem paths, and do not attempt to present files via harness directives. PDF attachments are returned through AI SDK standard tool parts and rendered by the frontend.

### Subscripts and superscripts

Never use Unicode subscript/superscript characters (₂, ⁰, etc.). Use HTML entities in the payload instead: `H&lt;sub&gt;2&lt;/sub&gt;S`, not `H₂S`.

Applies to every chemical formula, scientific notation, and unit exponent in all three PDFs.

### Emoji handling

Emojis in the Ideation and Playbook (🔴 👉 ✅ ❌ 💡) should be rendered as text at body size. If the renderer cannot display a glyph, it substitutes a text equivalent automatically. Do not let emoji rendering failure corrupt the layout.

## Rules across all three PDFs

- **Lead the Ideation with interpretation, not description.**
- **Lead the Analytical with evidenced advice.**
- **Keep the Playbook free of claims.**
- **Findings that reshape the deal** (separate legal entity, internal-reuse signal, etc.) surface in the Ideation's Section 1 and the Analytical's Section 1.
- **No invented companies** in any artefact.
- **No fabricated dollars** in any artefact. Directional outcomes only unless inputs are real.
- **No RCRA classifications, LDR determinations, DOT specs, or routing commitments** in any artefact.
- **Confidence honest** in Analytical. Ideation doesn't carry inline confidence labels but doesn't overstate either.
- **Qualification gate and safety flags visible** at the top of Ideation and Analytical. Not on Playbook.
- **Version number** matches between header and footer on every PDF.

## What this skill does not do

- Does not produce customer-facing collateral. All three PDFs are internal handover.
- Does not produce one combined PDF. Three separate files is the deliverable shape — do not collapse them.
- Does not write CRM records.

## Output contract

End the response with:

1. A brief message stating what was produced (one to two lines, naming the three PDFs).
2. A short note on qualification gate status and the single next action (one to two sentences, not a repeat of the reports).
