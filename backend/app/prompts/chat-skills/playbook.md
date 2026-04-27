---
name: playbook
description: Guides the agent to generate a Discovery Playbook PDF via the generatePlaybook tool.
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

Call `generatePlaybook` with the `PlaybookPayload` schema. The tool renders the PDF
and returns a signed download URL. Do not output a markdown list — use the tool.
