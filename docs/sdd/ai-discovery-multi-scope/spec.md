# Spec: ai-discovery-multi-scope

## Overview
AI Discovery SHALL use a confirm-only resolution model. The wizard is only for upload + analyze; real `client` and `location` resolution happens in the final confirmation modal before any waste stream is confirmed.

## Replaced Assumptions
- The previous wizard scope modes `none`, `client`, and `client+location` are removed.
- The wizard SHALL NOT require or expose pre-analysis client/location selection.
- AI suggestions SHALL NOT create entities or count as resolved database assignments.

## Requirements

### Requirement 1 — Wizard starts without prior scope
The discovery wizard MUST allow analysis with valid sources only, without requiring preselected `client` or `location`.

#### Scenario 1.1 — Start from upload-only wizard
- **Given** the agent uploaded valid discovery sources
- **When** the agent starts analysis
- **Then** the session starts without requiring client or location input.

#### Scenario 1.2 — No scope controls in wizard
- **Given** the agent is on the discovery wizard
- **When** the agent prepares a run
- **Then** the wizard does not block on client/location selection.

### Requirement 2 — AI suggestions are advisory only
The system MUST preserve AI-extracted `client` and `location` names as suggestions only. The AI MUST NOT create entities, finalize assignments, or resolve against the database by itself.

#### Scenario 2.1 — Suggested names remain unresolved
- **Given** analysis extracts a client name and a location name
- **When** drafts are shown for confirmation
- **Then** those values appear as suggestions until the user resolves them.

#### Scenario 2.2 — Missing suggestions still allowed pre-confirmation
- **Given** analysis cannot infer a client or location for a draft
- **When** the draft appears in confirmation
- **Then** the draft remains editable but unconfirmable until completed.

### Requirement 3 — Matching and deduplication occur app-side
The application MUST perform client/location matching and suggestion deduplication against database entities outside the AI model.

#### Scenario 3.1 — App-side matching proposes existing client
- **Given** a draft contains a suggested client name matching an existing client
- **When** the confirmation modal loads
- **Then** the app can present that database client as a match candidate without treating it as confirmed.

#### Scenario 3.2 — No autonomous entity creation
- **Given** no existing entity matches a suggestion
- **When** confirmation begins
- **Then** the system does not create a client or location unless the user explicitly chooses create-new.

### Requirement 4 — Client resolution auto-applies by repeated suggestion
When a user resolves a suggested client for one draft, the system MUST auto-apply that same client resolution to other drafts in the same batch that carry the exact same suggested client.

#### Scenario 4.1 — Repeated suggested client reuses resolution
- **Given** multiple drafts in the same confirmation batch share the same suggested client string
- **When** the user resolves that suggestion for one draft
- **Then** the same client resolution is applied to the other matching drafts in that batch.

### Requirement 5 — Resolution is sequential: client then location
The system MUST require client resolution before location resolution. Location choices MUST be resolved within the resolved client only.

#### Scenario 5.1 — Location waits for client
- **Given** a draft has no resolved client
- **When** the user attempts to resolve location
- **Then** the system blocks location resolution until a client is resolved.

#### Scenario 5.2 — Location constrained by resolved client
- **Given** a draft has a resolved client
- **When** the user resolves location
- **Then** the available matches and create-new flow are scoped to that client.

### Requirement 6 — Incomplete drafts stay blocked until confirmation-ready
Each draft MUST have both resolved `client` and resolved `location` before confirmation. Drafts missing either value SHALL remain blocked without blocking already complete drafts.

#### Scenario 6.1 — Draft blocked by missing client or location
- **Given** a draft is missing a resolved client or resolved location
- **When** the user tries to confirm it
- **Then** that draft is blocked from confirmation.

#### Scenario 6.2 — Mixed batch confirms only complete drafts
- **Given** one draft is complete and another is incomplete
- **When** the user confirms the batch
- **Then** only the complete draft can proceed and the incomplete draft stays blocked.

### Requirement 7 — Create-new remains available during confirmation
The confirmation modal MUST keep existing create-new actions usable for unresolved client and location without requiring a separate redesign.

#### Scenario 7.1 — Create new client in confirmation
- **Given** no existing client is suitable for a draft
- **When** the user chooses create-new from confirmation
- **Then** the new client can be used immediately to continue draft resolution.

#### Scenario 7.2 — Create new location after client resolution
- **Given** a client is resolved and no suitable location exists under it
- **When** the user chooses create-new location from confirmation
- **Then** the new location can be used immediately for that draft.

## Out of Scope
- Restoring wizard scope modes `none`, `client`, or `client+location`
- AI-led entity creation or autonomous database resolution
- UI redesign beyond adapting the existing confirmation flow to the confirm-only model
