---
name: discovery-gap-analysis
description: "Produce a Discovery gap list for a waste-stream opportunity, separated into Required blockers and Nice-to-have improvements. Load on substantive intake turns with new evidence, when the user asks what to do next, when reasoning stalls, or before readiness/reporting decisions. Use to turn missing identity, composition, quantity, packaging, logistics, commercial, or producer-context data into the top producer questions."
---

# Discovery gap analysis

Discovery is won by knowing what you do not yet know and knowing which gaps matter. The gap list is the field agent's working instrument: it turns scattered partial evidence into a prioritised action list, and it feeds directly into the qualification-gate.

## Trigger

Run on every substantive intake turn. Run when the user asks "what do I need to find out," "what should I ask next," "what am I missing." Run at the end of any turn where new evidence has come in — the gap list shifts with every piece of evidence resolved or newly surfaced.

## Structure: Required vs Nice-to-have, themed

Two tiers. Each tier is themed to match how the field agent thinks about the opportunity.

### Required — blocks progress to Assessment

A Required gap is one the qualification-gate cares about. Without it, the opportunity cannot move to Assessment without an explicit deferral with rationale.

Criteria for a Required gap:
- It is needed to pin **identity** of the stream (material, origin, physical state).
- It is needed to establish **composition** to a level sufficient for eventual classification (not full CFR determination — that is Assessment — but sufficient to not be guessing).
- It is needed to size the opportunity credibly (volume × confidence × frequency).
- It is the resolution of a **stop-flag** from safety-flagging.
- It is needed for the commercial frame to hold (e.g., without knowing contract status with the incumbent, the commercial frame is speculative).

### Nice to have — improves positioning, pricing, optionality

A Nice-to-have gap is one that strengthens the opportunity but does not block it. Criteria:
- It would improve pricing or buyer matching.
- It would enable a better positioning (e.g., strategic material vs waste-to-dispose).
- It would open optionality (reuse route alternative to disposal route).
- It would reduce Assessment time or cost.
- It would tighten the win-ability diagnostic.

## The themes

Organise both tiers by these themes — they match how field agents think about an opportunity:

1. **Identity and origin** — what the material is, what process generated it, at what point, under what conditions.
2. **Composition and chemistry** — SDS, COA, historic analyses, sampling plan.
3. **Physical properties** — phase, quantity, frequency, specific gravity, pH, flash point.
4. **Packaging and storage** — how the material is held today, how it could be held for export.
5. **Logistics** — location, access, loading infrastructure, transport constraints.
6. **Commercial** — current handling, current vendor and contract, current cost, producer priorities, decision-maker, timeline.
7. **Producer context** — strategic drivers (zero landfill, ESG, EHS mandate), multi-site potential, history of prior attempts.

Commercial and producer-context themes get **priority ordering** in the executive report — the field agent needs the commercial gaps to drive their next conversation. Technical and compliance gaps are no less important, but they are ordered second.

## Output format

```
GAPS — Discovery

REQUIRED

Commercial:
  - Current disposal cost (per month, all-in)
      Why: anchors the commercial value story; needed for sizing the gross opportunity.
  - Current incumbent vendor and contract expiry
      Why: determines the competitive window and the realistic timeline.
  - Decision-maker identity and buying criteria
      Why: without this, the win strategy is guesswork.

Identity and origin:
  - Confirm origin unit and process step for sub-stream 2 (Baytown vs Beaumont merox)
      Why: merox caustic from different feeds (gasoline, kero, LPG) produces materially different
           compositions and routing options.

Composition and chemistry:
  - BTEX / benzene concentration on the caustic fraction
      Why: benzene > 0.5 mg/L TCLP triggers D018 flag in Assessment; affects positioning.
  - Sulfide concentration range (historic, not one sample)
      Why: reactive-waste D003 threshold probability; drives H₂S handling design.

Physical properties:
  - Specific gravity confirmation across sites
      Why: mass conversions; needed for sizing.

Safety (resolution of flagged items):
  - Inerting protocol for spent FCC catalyst cleanout
      Why: stop-flag — pyrophoric on air; must be resolved before Assessment routing.

NICE TO HAVE

Commercial:
  - Zero-landfill or ESG commitment at Baytown
      Why: may unlock non-price budget, elevate positioning to strategic material.
  - Similar streams at other refinery sites (multi-site potential)
      Why: changes account value; commercial becomes portfolio-level, not single-site.

Composition:
  - Historic COA trend (6–12 months)
      Why: drift in sulfide or hydrocarbon indicates process change; informs buyer spec-fit.
  - Chloride trend
      Why: chloride is the spec-fit killer for many reuse routes.

Logistics:
  - On-site loading infrastructure — bulk vs drum
      Why: transport cost and route-fit.

Producer context:
  - What has prevented a better solution so far?
      Why: reveals the narrow hurdle that a new provider may solve — a hidden-value question.
  - Are similar streams generated at other sites under this operator?
      Why: account-expansion signal.

TOP THREE QUESTIONS FOR THE NEXT PRODUCER CONVERSATION

1. Who currently manages this stream, what does that cost you today, and when is the
   contract up for review?  (Unlocks: commercial frame, competitive window.)

2. If we could place the caustic fraction with a buyer rather than a TSDF, would
   segregation from [other streams] be operationally acceptable?  (Unlocks: whether
   "recovered feedstock" positioning is live or dead.)

3. Has anyone previously attempted to reuse or recycle this stream, and what happened?
   (Unlocks: the real barrier — technical, contractual, or inertial.)
```

## Rules

- **Required gaps are specific and testable.** "More information about the stream" is not a gap; "Current vendor and contract expiry" is. The field agent should know exactly what answer would resolve the gap.
- **Every gap has a one-line why-it-matters.** If you cannot state why the gap matters, the gap is not Required.
- **Commercial gaps come first in priority order.** The field agent's day is a series of conversations; the technical gaps rarely resolve without a commercial conversation happening first.
- **Do not duplicate the specialist-lens-light analytical-needs list.** If BTEX testing is an analytical need, it becomes a Required gap only if its absence blocks qualification. In most cases, analytical-needs items are commissioned in parallel with Discovery conversations and only surface as Required when time-critical.
- **The top-three-questions section is the field agent's tool.** It is a compression of the Required list to what matters most in the next conversation. It is not the full list — force yourself to choose three.
- **Re-run every turn.** Each new piece of evidence resolves or reshapes gaps. A gap list from three messages ago is stale.

## What this skill never does

- **Does not declare readiness.** The qualification-gate skill does that. This skill produces the inputs.
- **Does not produce the analytical plan.** That belongs to specialist-lens-light.
- **Does not write the producer outreach script.** It produces the three questions; the agent turns them into the actual call.
- **Does not quote costs or prices for gap-resolution.** "Lab work for BTEX — about $300" is speculation; the gap states what is needed, not what it costs to resolve.
- **Does not over-require.** A gap is Required only when its absence blocks Assessment. Over-requiring traps users in Discovery; under-requiring lets junk into Assessment. Be disciplined.
