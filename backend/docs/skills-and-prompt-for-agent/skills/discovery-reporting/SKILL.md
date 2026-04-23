---
name: discovery-reporting
description: Produce SecondStream Discovery reports at three levels — Snapshot (inline, narrative prose, four to five sentences), Executive Discovery Report (structured as a senior-operator briefing to a field agent, PDF format), and Full Discovery Report (comprehensive markdown evidence annex). Trigger when the user asks for a summary, brief, snapshot, report, write-up, handover, or export, and proactively once commercial-shaping has run on the opportunity. The Executive Report follows an eight-section briefing architecture — What this really is, Why it matters to the producer, What could be done with it, Who would want it, How to position and sell it, Commercial scenarios, Strategic insight, What to ask next. Each section leads with a bold advice-voice sentence. Qualification gate and safety flags always visible. Produce the executive tier as a downloadable PDF via reportlab. Use reportlab sub and super XML tags for chemical formulae — never Unicode subscripts.
---

# Discovery reporting — briefing pattern, advice voice

## What this skill is really doing

You are producing a briefing document in the voice of a senior commercial operator talking to a field agent twenty minutes before a producer conversation. Not a structured dossier. Not a CRM extract. A **briefing**.

The reader should finish the executive report with:
- A clear mental model of what the opportunity *is*
- A concrete view of directions they could take with the producer
- The one question they absolutely have to get answered
- A closing line they can carry in their head into the call

If they finish it and have to re-read to find the action, the skill has failed its job.

## Trigger

Run proactively once `commercial-shaping` has produced its seven content blocks and its smart-questions set, and `discovery-gap-analysis`, `safety-flagging`, and `qualification-gate` have produced their outputs.

Also run on direct request: "summary," "brief," "report," "export," "send to my manager," "put together a write-up."

Produce all three tiers together by default.

## The three tiers

### Tier 1 — Snapshot (inline markdown, 4–5 sentences of prose)

Not a table. Not a field list. **Four or five sentences of prose** that a reader absorbs in ten seconds and can recall afterwards.

Structure the snapshot as: what the opportunity really is (the Block 1 reading, compressed to one sentence) → the key insight or finding that differentiates it → scale sense → the one thing the agent has to do next → safety / gate status as one closing sentence.

Bold the most important concrete finding inline.

Example of the shape (not to be copied literally — the shape, not the content):

> ExxonMobil is running a Gulf Coast RFQ on spent sulfidic caustic they're treating as one stream, but **the four sites are four different materials** — 25× sulfide range, 10× chloride range, and GCGV is actually a separate legal entity from the refining sites. Scale is portfolio-level once volumes land. The single move that decides this opportunity is getting the producer to consider segregated per-site routing rather than a single portfolio award. Safety: H₂S attention-flag, no stop-flags. Qualification gate: CLOSED on commercial unknowns — one producer call fixes it.

**Rules:**
- Prose, not tables.
- Four to five sentences maximum.
- Bold one or two key findings inline — the ones the agent should remember if they remember nothing else.
- End with gate status + safety, in one sentence.

### Tier 2 — Executive Discovery Report (PDF, eight-section briefing pattern)

The core deliverable. Eight sections in this exact order, each built around a block from `commercial-shaping` and supporting skills. The voice pattern is constant: **lead sentence in bold → supporting detail → closing caveat**.

#### Section 1 — What this really is

The interpretive reading of the stream. Consumes `commercial-shaping` Block 1 (problem reading).

**Lead:** The one-sentence interpretive claim. The commercial truth about the material.
**Body:** The chemistry evidence that supports the reading. Per-sub-stream divergence if relevant.
**Close:** The implication for how to frame the opportunity.

This is where the GCGV-is-a-separate-LLC kind of insight surfaces. Findings that reshape how the agent should think about the opportunity live here, not in a back section.

#### Section 2 — Why this costs / hurts / matters for the producer

The producer-side framing. Consumes `commercial-shaping` Block 2 (producer pain).

**Lead:** One sentence on where the structural pain sits for this producer with this material.
**Body:** Cost / risk / friction / regulatory / reputational components, grounded in evidence.
**Close:** The read on whether the producer has named the pain themselves or whether it's latent (and therefore part of the agent's job to surface).

#### Section 3 — What could be done with it

The treatment options ladder. Consumes `commercial-shaping` Block 3 (treatment options).

**Lead:** One sentence naming the realistic anchor — the option that matches this stream's chemistry and this opportunity's shape today.
**Body:** Three to four options in effort order (low / medium / high), each with: what it is, what comes out, when it fits, effort scale. No specific vendor equipment names. No firm CAPEX.
**Close:** The pathway forward — which option is the realistic near-term move, and which is the longer-term upside.

#### Section 4 — Who would want it

The buyer archetype landscape with per-site/per-sub-stream fit-check. Consumes `commercial-shaping` Block 4.

**Lead:** One sentence naming the core segmentation — the pattern the agent should carry into the buyer conversation.
**Body:** A small table or structured list. Each archetype: who (by use-case), what they want, per-sub-stream fit-check (✓ / borderline / ✗), commercial direction (gate-fee / neutral / rebate / stronger-rebate).
**Close:** The commercial implication — which archetypes are live options, which are stretch, which are floor.

No company names. Categories only.

#### Section 5 — How to position and sell it

The positioning-craft layer. Consumes `commercial-shaping` Block 5.

**Lead:** One sentence naming the positioning frame. The "what you're selling" line the agent can deploy in the conversation.
**Body:** What to call it, what not to call it, two to three messaging anchors matched to the evidence.
**Close:** The single positioning move that matters most for this opportunity (e.g., "don't quote as one stream").

Keep this tight — half a page. Positioning advice is easy to bloat.

#### Section 6 — Commercial scenarios

The phased narrative arc. Consumes `commercial-shaping` Block 6.

**Lead:** One sentence naming the realistic anchor phase and the upside phase.
**Body:** Three or four phases in order: Stop the bleeding / Neutralise the cost / Turn into margin / Portfolio optimisation (or equivalent — only include phases honestly achievable from current evidence). Each phase: objective, activity, outcome direction (no fabricated dollars), prerequisite.
**Close:** The phased path forward and what would unlock the next phase.

No invented dollar figures. Directional outcomes. Real prerequisites.

#### Section 7 — Strategic insight

The closing one-liner. Consumes `commercial-shaping` Block 7.

One sentence, set apart visually (larger font, italic, or box callout). Not a paragraph. One sentence.

The shape: "This is not X — it's Y. Win if you Z."

#### Section 8 — What to ask next

The smart-questions set from `commercial-shaping`. The lead question — the one the agent would ask if they only got one — gets its own callout box, visually prominent.

**Layout:**
- **KILLER QUESTION** (in a callout box, bold, larger font): the lead question, with why-it-matters underneath.
- **If the conversation opens up** (secondary heading): the remaining four to six questions, each with its type tag and why-it-matters. Lower visual weight than the killer question.

The field agent skimming the PDF should see the killer question within two seconds of landing on this section.

### Tier 3 — Full Discovery Report (markdown, comprehensive annex)

Unchanged architecturally from v2 — this tier keeps the structured-dossier voice because it's the evidence base, and dossier-voice is appropriate there.

Structure:
1. Executive block mirror (same content as Tier 2, for self-contained reading)
2. Per-sub-stream deep dive (specialist-lens-light outputs in full)
3. Evidence catalogue (EV-001, EV-002… with source, date, authority, description)
4. Assumption register (assumptions → test that would confirm or falsify → status)
5. Open regulatory / handling / logistics agenda (for Assessment)
6. Safety annex (every flag, severity, resolution path, status)
7. Document control

Produce this as a markdown file alongside the PDF.

## Qualification gate and safety flags

### Gate status placement

**Visible at the top of every tier.** In the snapshot: one sentence at the end. In the executive PDF: a status line in the cover block at the top of page 1, colour-coded (green = OPEN, amber = OPEN with conditions, red = CLOSED) with the one-line blocker statement if CLOSED. In the full markdown: in the document control block and in the executive mirror.

### Safety flags placement

**Immediately under the snapshot or cover block, before Section 1.** Colour-coded callout (red = stop-flag, amber = specialist-flag, yellow = attention-flag). If no flags, the callout says "No safety flags raised" on a neutral background. Never buried.

## PDF output — technical requirements

Save to `/mnt/user-data/outputs/` with filename pattern:

```
[customer-slug]-[stream-slug]_[YYYY-MM-DD]_discovery-exec.pdf
```

Save the Tier 3 markdown to the same directory with `_discovery-full.md` suffix.

Call `present_files` at the end of the response with the PDF first.

### Layout

- **US Letter, 1-inch margins.** Field agent's manager prints these.
- **Clean Helvetica.** No custom fonts.
- **Cover block (top of page 1):** Customer name, Stream name, Report date, SecondStream version tag, Qualification-gate status line (colour-coded). Keep tight — 4-5 lines total, not a full banner.
- **Section headers** left-aligned, bold, 14pt. 
- **Section lead sentences** in 11pt bold. These are the advice-voice openers — typographically set apart so a skim-reader can extract the advice voice by scrolling the section leads only.
- **Body text** 10pt regular.
- **Closing sentences** in italic, same size as body.
- **Snapshot on page 1.** If it overflows, tighten — do not break it onto page 2.
- **Safety callout** on page 1, under the snapshot.
- **Strategic insight (Section 7)** gets its own visual treatment — centred, italic, 13pt, on its own small space. It should feel like a closing statement, not a bullet.
- **Killer question callout (Section 8)** gets a bordered box, bold, same visual weight class as the safety callout.
- **Evidence tags** ([EV-001], etc.) in slightly smaller, muted colour so they don't dominate text.
- **Confidence labels** (HIGH / MEDIUM / LOW) inline with subtle colour.
- **Footer** shows version number matching the header. Do not let them disagree.

### Subscripts and superscripts — CRITICAL

Never use Unicode subscript/superscript characters (₂, ⁰, etc.). Helvetica does not contain those glyphs — they render as solid black boxes.

Use reportlab's `<sub>` and `<super>` tags inside Paragraph objects:

```python
Paragraph("H<sub>2</sub>S risk in enclosed transfer", styles['Body'])
Paragraph("10<super>3</super>–10<super>4</super> tons/year range", styles['Body'])
```

Applies to every chemical formula, scientific notation, unit exponent, and footnote marker.

## Rules across all three tiers

- **Lead with interpretation.** Every section opens with an advice-voice sentence. The reader extracts the advice by reading only the leads.
- **Findings that reshape the deal surface early.** GCGV-is-a-separate-LLC, the producer-is-transferring-off-spec-material kind of insights go in Section 1 or Section 2, not in a back section.
- **Evidence tags throughout.** Every factual claim in the executive tier references an evidence catalogue item in the full report.
- **No invented companies.** "Permitted CWT facility," "industrial alkaline user," "pulp-mill operator." Categories only.
- **No fabricated dollars.** Directional outcomes and qualitative effort scales. Real arithmetic on real inputs is fine; arithmetic on invented inputs is not.
- **No RCRA classifications, LDR determinations, DOT packaging specs, or routing recommendations.** Flags only. Assessment-mode work is named and deferred, not performed.
- **Confidence honest.** LOW stays LOW. Unknown stays Unknown.
- **Qualification-gate status visible at the top of every tier.** Safety flags visible immediately after the snapshot/cover. Neither buried.
- **Version numbers match** between header and footer.

## What this skill does not do

- Does not produce customer-facing collateral. The executive report is internal handover.
- Does not produce proposal documents, cost estimates, or signed outputs.
- Does not write CRM records — that's an integration concern.

## Output contract

End the response with:

1. A brief message stating what was produced (one to two lines, not a report summary).
2. `present_files` call with the PDF first, then the full markdown.
3. A short note on gate status and the single next action (one to two sentences, not a repeat of the report).
