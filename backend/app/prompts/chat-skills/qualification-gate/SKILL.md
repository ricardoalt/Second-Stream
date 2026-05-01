---
name: qualification-gate
description: "Assess whether a Discovery opportunity is ready to move to Assessment. Always consider the gate from metadata on substantive Discovery turns; load when the user asks readiness/next steps, when a required gap is resolved, when preparing a report, or when deciding whether to propose crossing into Assessment. Use to state the exact blocking criterion or the rationale for opening the gate."
---

# Qualification gate

The gate is the point where an opportunity moves from Discovery to Assessment. Discovery produces **commercial confidence** on a stable evidence base; Assessment produces **regulatory and technical confidence** for routing, pricing, and contracting. The gate enforces the sequence — Assessment on shaky evidence produces wrong RCRA codes, wrong DOT specs, and wrong routing, and the cost of those errors is high.

The gate is not a wall. It is a **visible event**: the agent tells the user the gate is open (or why it is closed), and the user decides whether to cross.

## The six criteria

All six must be met for the gate to open.

### 1. Identity pinned

- **Material is named** and the naming is consistent with evidence (producer words match SDS; COA matches the described material; photos match the description).
- **Physical state confirmed** (solid, liquid, sludge, gas, mixed — and which phases in multi-phase).
- **Origin process stated** at a medium-confidence level (not "wastewater" but "Merox extractor caustic from gasoline treating").
- **Sub-stream identity is pinned per sub-stream** — a portfolio opportunity passes this criterion only if every sub-stream on the router's table is identified.

### 2. Composition documented or with committed analytical plan

- SDS available and read (even if older — aged SDS counts if the producer has confirmed the spec is still representative).
- **OR** a COA / lab report is available and current.
- **OR** an analytical plan is committed — specific parameters, sampling point, target lab, target date. "We'll get an SDS sometime" is not a committed plan; "BTEX, sulfide, pH, SG by [lab] on a composite sample drawn [date]" is.

Hand-wave intentions don't pass. The criterion exists to ensure that whatever Assessment does, it is not extrapolating from scratch.

### 3. Quantity and frequency stated with confidence

- **A number**, not a qualitative word. "Ongoing" does not pass; "about 15,000 gallons weekly, producer verbal, unconfirmed against manifests" does.
- **Confidence label** — HIGH (manifest history), MEDIUM (producer-stated with corroborating evidence), LOW (producer-stated uncorroborated, one conversation).
- **Frequency stated** — per week, per month, per quarter, one-off, irregular.

Sizing has to be credible enough that the commercial size estimate from `commercial-shaping` is defensible.

### 4. All identified sub-streams decomposed

- `sub-discipline-router` has run and produced a decomposition table.
- Every sub-stream has a specialist lens assigned.
- Cross-links between sub-streams are documented.
- Single-stream opportunities pass this criterion trivially — but the router's output must still be present.

### 5. Required gaps closed or explicitly deferred with rationale

- Every Required gap from `discovery-gap-analysis` is either answered (and the answer is in the evidence) or has a **written rationale for deferral** from the user.
- Rationale means: this Required gap is not going to be answered before Assessment, and here is why that is acceptable — e.g., "composition confirmation deferred to Assessment sampling — producer declines pre-sampling."
- The field agent's deferral rationale goes in the evidence catalogue. Deferred gaps carry forward to Assessment as explicit open-items.

This is the relief valve. Without it the gate would trap opportunities indefinitely; with it the gate can open on thinner evidence than ideal, at the user's explicit choice, with a visible trail.

### 6. No unresolved stop-flag safety concerns

- Every stop-flag from `safety-flagging` is either resolved (e.g., inerting protocol confirmed) or has moved the associated sub-stream out of scope.
- Specialist-flags do **not** close the gate. They carry forward as conditions on Assessment routing.
- Attention-flags do not close the gate. They carry forward as handling considerations.

The reason stop-flags close the gate: they indicate active hazards that shouldn't be the subject of commercial planning until the hazard is stabilised. Moving an active-hazard opportunity to Assessment routing risks compounding the error by producing a transport or disposal recommendation against a container that needs emergency-response handling first.

## Running the check

On every substantive Discovery turn, silently run through the six criteria and record status. Report the current status at the top of every full report (snapshot, executive, full). Report the status in the chat when the user asks.

Status shapes:

- **OPEN** — all six criteria met. Propose crossing to Assessment explicitly with a one-line rationale.
- **OPEN with conditions** — all six met, but one or more criteria met via deferral rationale (criterion 5 used). Propose crossing while stating the deferred items.
- **CLOSED** — one or more criteria not met. State which criteria, and what would close each.

## How to propose crossing

When the gate is OPEN, the agent proposes the crossing — it is never silent. Example language:

> The qualification gate is **OPEN**. Identity, composition, quantity, sub-stream decomposition, Required gaps, and safety flags all clear. Proposed next step: move sub-streams 2 and 3 to Assessment for RCRA classification, routing, and DOT specs. Sub-stream 1 (spent FCC catalyst) remains in Discovery pending inerting protocol confirmation.

When OPEN with conditions:

> The qualification gate is **OPEN with conditions**. Five of six criteria cleanly met; criterion 2 (composition) met by deferral — producer declines pre-sampling, and Assessment will commission analytical work as part of its scope. Proposed next step: cross sub-streams 2 and 3, holding sub-stream 1 in Discovery pending stop-flag resolution.

When CLOSED:

> The qualification gate is **CLOSED**. Blocking criteria:
>  - Criterion 3 (quantity/frequency): sub-stream 4 has no producer-stated volume, only "a few drums."
>  - Criterion 6 (safety): stop-flag on sub-stream 1 (pyrophoric catalyst) unresolved — inerting protocol not confirmed.
>
> What would close the gate: verified volume (even a range) for sub-stream 4, and confirmation of the catalyst cleanout inerting plan.

## Gate crossing is never silent

If the user says "produce the Assessment report" or "give me the RCRA codes," and the gate is CLOSED, the agent does **not** silently comply. The agent states the gate status, names the blocker, and offers either to continue Discovery or to cross under explicit user override (which is recorded in the caveats section of every downstream report).

Explicit user override is legitimate — sometimes commercial urgency trumps the gate's caution — but it must be visible. The override becomes part of the opportunity's record.

## Per-sub-stream gating (when portfolios diverge)

A portfolio opportunity may have some sub-streams ready for Assessment while others are not. The gate operates per-sub-stream in that case:

- Sub-stream 2 (merox caustic, identity clear, composition documented, size confirmed): **OPEN.**
- Sub-stream 1 (spent catalyst, stop-flag unresolved): **CLOSED.**
- Sub-stream 5 (lab drums, identity not pinned per-container): **CLOSED.**

The commercial-shaping output and executive report can then stage Assessment for the open sub-streams while Discovery continues on the closed ones.

## What this skill never does

- **Does not make the commercial decision.** The gate is about evidence readiness, not commercial desirability. A well-qualified opportunity that the user does not want to pursue can be closed without moving to Assessment.
- **Does not produce the Assessment output.** It enables the handoff.
- **Does not override safety.** Stop-flags close the gate regardless of user urgency. A user override on a stop-flag is a **safety override** and requires separate sign-off outside the scope of this skill.
- **Does not forget deferrals.** Every deferred gap is tagged and carried forward to Assessment as an explicit condition.
