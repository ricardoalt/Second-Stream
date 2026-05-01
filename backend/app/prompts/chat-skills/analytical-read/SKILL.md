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

Cover (customer, stream, date — no qualification gate), executive summary prose, optional
safety callouts, one or more analytical tables, and a closing strategic insight.

Each table has: title, headers (list of column names), rows (list of row arrays).
Keep cells concise — tables are rendered at 8.5pt caption size.

## Tool call

Call `generateAnalyticalRead` with flat top-level tool arguments. Do not wrap the
arguments in a `payload` object. The tool renders the PDF and returns a signed download
URL. Do not output markdown tables — use the tool.

Valid tool arguments example:
```json
{"customer":"Acme Metals","stream":"spent caustic","date":"2026-04-29","executive_summary":"The stream has a viable reuse path if sulfur remains inside buyer limits.","tables":[{"title":"Buyer fit","headers":["Buyer","Fit"],"rows":[["Outlet A","Strong"]]}],"strategic_insight":"Confirm sulfur before routing to premium outlets."}
```
