---
name: analytical-read
description: Guides the agent to generate an Analytical Read PDF via the generateAnalyticalRead tool.
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

Call `generateAnalyticalRead` with the `AnalyticalReadPayload` schema. The tool renders
the PDF and returns a signed download URL. Do not output markdown tables — use the tool.
