---
name: analytical-read
description: "Support generation of the Analytical Read PDF. Load only when discovery-reporting is preparing Discovery outputs and the agent is about to call generateAnalyticalRead, or when the user explicitly requests an Analytical Read. Use to shape the PDF payload, evidence discipline, and rigorous analytical voice; do not use for the lighter Ideation Brief or Call Playbook."
---

## When to generate an Analytical Read

Generate an Analytical Read when the conversation requires a data-forward document —
tabular comparisons of streams, facilities, volumes, pricing ranges, or regulatory data.
This is typically requested when comparing multiple variants of the same waste stream,
or when a technical stakeholder needs structured evidence to support a routing decision.

## What the Analytical Read captures

Cover, executive summary prose, optional safety callouts, one or more analytical
tables, and a closing strategic insight.

Each table has:
- `title` — section heading
- `headers` — list of column names
- `rows` — list of rows. **Each row is a list of cell objects**, not strings.
  A cell is `{"value": "<text>", "emphasis": "<flag>"}` where `emphasis` is one
  of `normal` (default — omit), `changed`, `outlier`, or `newly_detected`.

Use `emphasis` sparingly — flagging everything teaches the reader to ignore the
highlight. The three flags render with a soft yellow tint and a coloured left
border so reasons stay distinguishable in print.

Keep cells concise — tables are rendered at 8.5pt caption size.

## Cover fields

- **`header_line`** (string, **required**): one rich line of context. Weave customer + portfolio + sites + in-offer summary, e.g. `"ExxonMobil — Gulf Coast Spent Caustic Portfolio · Beaumont (2 barges/mo) + GCGV (1 barge/mo) in offer"`.
- **`evidence_caption`** (string, optional): caption shown beneath the cover subtitle for evidence/producer state flags. Example: `"Updated SDS in evidence (June 2024) · Second Beaumont sample in evidence (April 2026) · Producer offer received"`. Omit when there is nothing notable.

## Tool call

Call `generateAnalyticalRead` with flat top-level tool arguments. Do not wrap the
arguments in a `payload` object. The tool renders the PDF and returns a signed download
URL. Do not output markdown tables — use the tool.

Valid tool arguments example:
```json
{"customer":"Acme Metals","stream":"spent caustic","date":"2026-04-29","header_line":"Acme Metals — Spent Caustic Portfolio · Plant 3 (1 barge/mo) in offer","executive_summary":"The stream has a viable reuse path if sulfur remains inside buyer limits.","tables":[{"title":"Per-site chemistry read","headers":["Property","Feb 2026","Apr 2026"],"rows":[[{"value":"pH"},{"value":"13.7"},{"value":"13.51"}],[{"value":"Iron, mg/kg"},{"value":"8"},{"value":"64.7","emphasis":"outlier"}]]}],"strategic_insight":"Confirm sulfur before routing to premium outlets."}
```
