---
name: sub-discipline-router
description: "Decompose a waste opportunity into distinct sub-streams and assign each to the right specialist lens: solids, aqueous liquids, organic liquids, sludges, gases/vapours, or containerised/lab-pack. Load at the start of a new opportunity, when new evidence reveals another phase/fraction, or when the user describes a multi-phase, multi-container, or site-wide opportunity. Use before deep analysis so the agent does not treat a portfolio as one generic stream."
---

# Sub-discipline router

A single opportunity is rarely a single stream. Refinery visits produce solids, sludges, liquids, and cylinders in one conversation. Decommissioning yields a mixed inventory. A lab clearout is dozens of sub-streams under one customer. The router's job is to notice this before anyone downstream tries to squeeze a portfolio into a single lens.

## Run this first

Run on every new opportunity, before specialist-lens-light, before commercial-shaping, before reporting. Re-run whenever new input surfaces a sub-stream you previously missed — e.g., the producer mentions "we also have a tanker of caustic alongside the catalyst" halfway through the conversation.

## What to produce

A decomposition table — one row per distinct sub-stream. The fields:

```
| # | Sub-stream name | Phase        | Origin process        | Approx quantity | Specialist lens         | Cross-links |
|---|-----------------|--------------|------------------------|-----------------|-------------------------|-------------|
| 1 | Spent FCC catalyst | solid     | FCC regenerator          | ~20 t, one-time  | solids-specialist        | —           |
| 2 | Spent sulfidic caustic | aq. liq | Merox extractor       | ~15,000 gal recur | aqueous-liquids-spec.    | 3 (shared hydrocarbons) |
| 3 | Slop oil               | org. liq | Process slops          | 2,000–4,000 gal  | organic-liquids-spec.    | 2, 4 (shared aromatics) |
| 4 | Tank-bottom sludge     | sludge   | Crude tank cleanout    | ~8 drums          | sludges-specialist       | 3           |
| 5 | Lab / maintenance drums | lab-pack | Lab and shop cleanout | 12 drums, mixed   | containerised-labpack   | —           |
```

## How to identify sub-streams

A sub-stream is any part of the opportunity that would be analysed, routed, or managed differently from another part. Differences that justify decomposition:

- **Physical phase** — solid, aqueous liquid, organic liquid, sludge, gas, mixed. A tanker and a drum pallet are different sub-streams even if the producer describes them together.
- **Origin process** — even for the same phase, different origin processes produce different specifications. Merox spent caustic and ethylene spent caustic are both "spent caustic" and should be different rows.
- **Generator frequency** — a one-time inventory item is commercially different from a recurring stream.
- **Containerisation** — a bulk liquid in a tank is different from the same liquid in drums. The handling paths diverge.
- **Regulatory frame** — if one fraction is PCB-regulated (TSCA) and another is RCRA-regulated, they are different sub-streams.
- **Monetisation path** — if two streams have different plausible outlets (reuse vs disposal), they are different sub-streams.

When in doubt, decompose. You can always consolidate later; you cannot retroactively de-merge a conflated analysis.

## Specialist lens assignment

Every sub-stream gets exactly one primary lens, even if it touches multiple. The six lenses:

- **solids-specialist** — spent catalyst, contaminated soil, filter cake, foundry sands, ash, crushable solids, soot.
- **aqueous-liquids-specialist** — spent acids, spent caustics, process water, rinsate, cooling-tower blowdown.
- **organic-liquids-specialist** — solvents, waste oils, slop oil, off-spec fuels, distillation fractions.
- **sludges-specialist** — tank bottoms, API separator sludge, DAF float, paint sludge, refinery sludges (K-series listings apply).
- **gases-vapours-specialist** — compressed gas cylinders, aerosols, refrigerants, lab gas drums.
- **containerised-labpack-specialist** — mixed drums, lab packs, university or school cleanouts, unknown orphans.

Assign by the dominant phase and by the management paradigm that fits best. A drum of mixed lab chemicals goes to labpack even if some contents are organic liquids — because it will be managed as a lab-pack, not as bulk solvents.

## Cross-links matter

Two sub-streams can share evidence, share risk, or share routing implications. Capture these in the cross-links column.

Examples:
- Spent caustic and slop oil from the same refinery likely share hydrocarbon species — if BTEX is measured in one, the composition inference carries to the other.
- Spent catalyst and tank-bottom sludge from the same unit may share pyrophoric-iron-sulfide risk.
- Aqueous and organic fractions of an API separator output are the same origin — splitting them at the point of decomposition must preserve that.

Cross-links drive shared analytical plans. A shared BTEX analysis on a composite can cover two sub-streams at once — that is a commercial saving that shows up later in the gap list.

## How the router coordinates

After decomposition:

1. For each sub-stream, hand off to the assigned specialist lens (specialist-lens-light in Discovery mode; later specialist review after Discovery).
2. Shared evidence and cross-linked questions propagate back to the router, which then reassembles the specialist outputs into a unified opportunity view.
3. The recomposition is the input to `commercial-shaping`, which sizes and positions the whole opportunity, and to `discovery-reporting`, which produces the three tiers.

Recomposition is not just concatenation. Identify:
- **Shared analytical plan items** — "one BTEX sweep covers sub-streams 2 and 3."
- **Shared safety risks** — pyrophoric risk in spent catalyst implies same risk class in tank-bottom sludge from the same unit.
- **Shared logistics constraints** — if all sub-streams are at one site, a joint manifest and single-day pickup may apply.
- **Sub-stream interdependencies** — one sub-stream may be a feedstock or contaminant of another.

## What to do with single-stream opportunities

Run the router anyway. A one-row decomposition table is still a useful output — it confirms that the opportunity is genuinely one sub-stream, and the assigned lens is explicit. The downstream skills expect the router's output as a given; skipping it because "there's only one stream" is how multi-phase opportunities get missed.

## Worked example — refinery portfolio

Input: "We just visited Baytown. They have spent FCC catalyst (about 20 tonnes one-off, clearing a vessel), ongoing merox spent caustic (around 15,000 gallons a week), slop oil in the process tank farm (2,000–4,000 gallons sitting), tank-bottom sludge from a crude tank cleanout (around 8 drums), and about a dozen drums of lab and maintenance miscellany."

Decomposition:

```
| # | Sub-stream                    | Phase     | Origin                    | Qty                | Lens                       | Cross-links |
|---|-------------------------------|-----------|----------------------------|--------------------|-----------------------------|-------------|
| 1 | Spent FCC catalyst            | solid     | FCC regenerator            | ~20 t, one-off     | solids-specialist           | 4 (pyroph.) |
| 2 | Merox spent caustic           | aq. liq.  | Merox extractor            | ~15,000 gal/wk rec | aqueous-liquids-spec.       | 3 (BTEX)    |
| 3 | Slop oil                      | org. liq. | Process slops              | 2k–4k gal, ad-hoc  | organic-liquids-spec.       | 2, 4 (BTEX) |
| 4 | Crude tank-bottom sludge      | sludge    | Crude tank cleanout        | ~8 drums, one-off  | sludges-specialist          | 1, 3        |
| 5 | Lab / maintenance drums       | lab-pack  | Lab + shop cleanout        | ~12 drums, one-off | containerised-labpack       | —           |
```

Cross-link notes: "Sub-streams 2, 3, 4 likely share hydrocarbon species (BTEX) — a composite BTEX sweep covers three sub-streams. Sub-streams 1 and 4 may share pyrophoric iron sulfide risk if sulfided catalyst present — specialist safety review on each."

This decomposition is now the agenda for specialist-lens-light (or later specialist review after Discovery).

## What this skill never does

- **Does not classify.** Phase, origin, and lens assignment. No RCRA codes, no characteristic determinations.
- **Does not size or position.** That is commercial-shaping. The router tells commercial-shaping what there is to size.
- **Does not reject sub-streams.** Even clearly unviable sub-streams get a row, a lens, and a flag — the decision not to pursue is a commercial decision, not a router decision.
- **Does not second-guess the producer.** If they describe a stream as "spent caustic" and the SDS says otherwise, the router captures both and hands the conflict to sds-interpretation and safety-flagging to resolve.
