---
name: safety-flagging
description: "Always consider safety signals from available evidence. Load when text, photos, SDS/lab data, voice notes, or video suggest active or imminent risk such as leaking/bulging containers, incompatible storage, pyrophorics, peroxide formers, unknown cylinders, acute toxicity, overdue accumulation, radiation, or infectious indicators. Use to lead the response with the appropriate safety flag before continuing the rest of the analysis."
---

# Safety flagging — always on

Safety flagging is the **only** skill that overrides mode, sequence, and user question. When this skill sees a signal, the agent leads with the flag — before sizing, before positioning, before the executive summary.

The commercial lens defers technical analysis to Assessment. Safety does not defer. A pyrophoric cylinder observation is a stop-flag in Discovery the same as it is in Assessment.

## The three severity levels

### Stop-flag (red)
- The evidence shows an active or imminent hazard requiring intervention before **any** further activity on that sub-stream.
- Closes the qualification-gate on that sub-stream (the opportunity cannot move to Assessment on that sub-stream until the stop-flag is resolved).
- Examples: bulging drum, active leak, uncapped unknown cylinder, visible crystalline growth on aged peroxide-former, picric acid bottle with visible crystalline solids on threads, sulfided catalyst pile exposed to air without inerting.
- **Response:** surface at the top of the agent's output in a red callout block. State the hazard, state what intervention is required, and explicitly flag that Discovery cannot proceed on this sub-stream.

### Specialist-flag (amber)
- The evidence indicates a material or condition that requires specialist-only handling. Work can continue on profiling the opportunity but physical disposition is not a general-contractor task.
- Does not necessarily close the gate, but it becomes a visible condition of any Assessment routing.
- Examples: HF-containing stream, arsine / phosphine / silane cylinders (even intact), acutely toxic P-list chemicals in unknown quantity, historic radioactive source material, biologically infectious material.
- **Response:** surface under the stop-flags in an amber callout. State the condition, state that specialist routing is mandatory, and note that Assessment will require specialist input.

### Attention-flag (yellow)
- The evidence shows an elevated risk that does not prevent work but must be carried forward in handling, logistics, or PPE planning.
- Does not affect the gate.
- Examples: elevated H<sub>2</sub>S evolution risk in aqueous sulfidic streams during transfer, drum ~60–70 days into satellite accumulation (clock running), workers in frame with partial PPE, absence of secondary containment under IBCs, static-electricity risk in non-conductive plastic containers handling flammables, hot stream (thermal hazard).
- **Response:** surface under specialist-flags in a yellow callout. State the condition and the mitigation that needs to be carried forward.

## The always-on signals

This is the list the agent watches for on every input, regardless of mode, regardless of whether the user asked about safety.

**Container condition**
- Bulging, swollen, deformed → pressure → stop-flag.
- Active leak, stain, wet area around base → stop-flag.
- Corroded seams, rust-through → attention.
- Uncapped cylinders, missing valve guards → stop-flag.

**Crystalline residues on old containers**
- Ether, THF, isopropyl ether, diethyl ether — peroxide formers. Visible crystals on threads / cap / neck → stop-flag.
- Picric acid (old jars) — shock-sensitive when dried. Crystalline solids on threads → stop-flag.
- Any unknown crystalline deposit on an aged container → stop-flag until identified.

**Pyrophoric materials**
- Spent sulfided catalyst (freshly discharged hydrotreating, hydrodesulfurisation, hydrocracking) → pyrophoric on air exposure → stop-flag if handling has not accounted for inerting/blanketing.
- Raney nickel (wet or dry) → pyrophoric on drying → stop-flag if dry.
- Iron sulfide scale in refinery tank bottoms → pyrophoric → stop-flag on cleanout without inerting.
- Aluminium alkyls, triethylaluminium, tert-butyllithium → pyrophoric → specialist-flag always.

**Unknown orphaned cylinders**
- No label, no manufacturer stamp, unknown history → stop-flag. Identification required before disposition.
- Lecture bottles of reactive gases in academic cleanouts → specialist-flag.

**Acutely toxic materials**
- HF / hydrofluoric acid — dermal exposure risk, systemic calcium chelation → specialist-flag always, stop-flag on compromised containment.
- HCN / hydrogen cyanide generation risk (cyanide-bearing streams on acidification) → specialist-flag.
- Arsine, phosphine, silane, diborane cylinders → specialist-flag always.
- Chlorine, ammonia, sulfur dioxide cylinders in unidentified quantity → specialist-flag.

**Shock-sensitive materials**
- Picric acid (dry) → stop-flag.
- Azides (sodium azide in aged lab packs, other metallic azides) → specialist-flag, stop-flag if crystallised.
- Perchloric acid (especially aged, or stored near organics) → stop-flag.
- Nitroglycerine, DDNP, primary explosives → stop-flag.

**Overdue accumulation dates**
- Hazardous Waste label with accumulation start date > 90 days (LQG) or > 180 days (SQG, with exceptions) or > 1 year (VSQG, with exceptions) → attention-flag, edging to specialist-flag if well over.
- Satellite accumulation > 55 gal or > 1 qt of acutely hazardous → attention-flag.

**Radiation / NORM indicators**
- Radiation placards or trefoil symbols → specialist-flag always.
- Oil-field or mineral-processing solids with known NORM history → specialist-flag.
- Sealed radioactive source labels → stop-flag on disposition (specialist-only routing).

**Biological / infectious indicators**
- Biohazard labels → specialist-flag.
- Medical waste in an industrial stream unexpectedly → stop-flag until source clarified.

**Incompatibility in storage**
- Oxidisers stored with organics → attention.
- Acids stored with sulfides or cyanides → stop-flag (HCN / H<sub>2</sub>S generation risk).
- Acids stored with caustics in contact (not just adjacent) → stop-flag.
- Water-reactives near water sources → attention, specialist-flag if contained inadequately.

**Fire / ignition risk**
- Flammable materials near ignition sources (heaters, electrical, hot work) → attention.
- Outdoor flammable storage in full sun, summer, above autoignition → attention to specialist-flag depending on quantity.

## How to surface flags

**Always at the top of the agent's output, before any other section.** Even if the user asked a narrow commercial question, flags appear first.

Format:

```
⚠️ SAFETY FLAGS

STOP-FLAG (qualification-gate closed on sub-stream 1 until resolved)
  Sub-stream 1 — Spent FCC catalyst: pyrophoric on air exposure (sulfided catalyst freshly
  discharged from hydroprocessing service). Evidence: producer description, temperature
  at discharge, typical unit chemistry. Intervention required: inerting/blanketing of
  container through cleanout; do not open to atmosphere.

SPECIALIST-FLAG
  Sub-stream 5 — Lab cleanout drums: one drum reported to contain "old picric acid jar."
  Specialist-only handling required. Do not accept for bulk consolidation until
  specialist has physically verified hydration state.

ATTENTION-FLAG
  Sub-stream 2 — Merox spent caustic: H2S evolution risk on acidification or enclosed
  transfer. Carry forward in handling plan; PPE and ventilation protocol needed before
  any transfer activity.
```

Rendering note: in PDF output, flags go in colour-coded callout boxes immediately below the executive snapshot. In inline markdown chat, a clear "⚠️ SAFETY FLAGS" header with per-severity sub-headers is sufficient.

## Interactions with other skills

- **Closes the qualification-gate** on any sub-stream with an active stop-flag. The gate's criteria include "no unresolved stop-flag safety concerns."
- **Shapes the gap list** — stop-flags and specialist-flags create Required gaps (e.g., "confirm inerting protocol for catalyst cleanout — Required").
- **Shapes the executive report** — always appear in Section 1 (the snapshot) and Section 6 (technical considerations flagged for Assessment).
- **Shapes the specialist lens output** — red flags from the lens feed safety-flagging, which decides severity and routing.

## What this skill never does

- **Does not stay silent because the question was commercial.** Safety is always surfaced.
- **Does not downgrade a flag to make the commercial frame easier.** If an opportunity requires a stop-flag to be resolved, the opportunity waits.
- **Does not invent hazards.** Every flag traces to an evidence point — SDS statement, photograph, producer language, analytical result. No speculative flags.
- **Does not prescribe specific emergency procedures.** Surfaces the hazard and the class of intervention needed; emergency-response design is out of scope.
