---
name: playbook
description: "Support generation of the Discovery Call Playbook PDF. Load only when discovery-reporting is preparing Discovery outputs and the agent is about to call generatePlaybook, or when the user explicitly requests a producer-call playbook. Use to shape question sets, talk tracks, and why-it-matters prompts for the field call; do not use as a regulatory record."
---

## When to generate a Playbook

Generate a Discovery Playbook when a live discovery call is imminent and the rep needs
a structured conversation guide. The Playbook is a TOOL, not a record — it has no
qualification gate. Generate it after enough discovery to know which themes matter.

## What the Playbook captures

Cover (customer, stream, date — no gate), optional opening context, and numbered themes.
Each theme has: title, body explanation, probe questions for the call, and
"why it matters" bullets that help the rep understand the commercial stakes.

Themes should be ordered by priority for the call — most important first.
Aim for 3–6 themes; more than 8 is unwieldy for a live conversation.

## Tool call

Call `generatePlaybook` with flat top-level tool arguments. Do not wrap the arguments
in a `payload` object. The tool renders the PDF and returns a signed download URL. Do
not output a markdown list — use the tool.

Valid tool arguments example:
```json
{"customer":"Acme Metals","stream":"spent caustic","date":"2026-04-29","opening_context":"Use the call to confirm chemistry and logistics constraints.","themes":[{"number":1,"title":"Chemistry guardrails","body":"Confirm the limits that decide outlet fit.","probe_questions":["What is the latest sulfur result?"],"why_it_matters":["Sulfur drives buyer eligibility."]}]}
```
