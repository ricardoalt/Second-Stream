# Spec: clients-add-client-foundation

## Overview
Enable a real Add Client flow from `/clients`. The modal SHALL be implemented as a dedicated modal surface visually matching the Stitch "Add New Client" modal, and SHALL create one backend `Company`, then one primary `CompanyContact`, then one first real `Location`. The flow is sequential and non-atomic; Discovery Wizard remains the only waste-stream creation path.

## Requirements

### Requirement 1 — Truthful Add Client mapping
The modal MUST map UI fields directly to existing backend contracts and MUST NOT invent fake status, logistics, or address models.

- **Company**: `name` ← Company Name; `industry` ← Industry; `sector` ← Sector; `subsector` ← Subsector; `customerType` is selected by the field agent (`buyer | generator | both`); `account_status` ← Status selector (enum: `active | prospect`). Existing rows SHALL default to `active` in the backend database.
- **Primary contact**: `name`, `title`, `email`, `phone` ← Contact section; `isPrimary` MUST be `true`; only non-empty values are sent; at least one of `email` or `phone` is required (name/title are optional).
- **First location**: `name` ← Shipping Location & Logistics Hub Name; `address` ← Address; `city` ← City; `state` ← State; `zipCode` ← ZIP; `latitude`/`longitude` MAY be sent only if already resolved by the client; `addressType` MUST be `headquarters` because this slice does not collect a truthful location-type choice.

### Requirement 2 — Sequential submit behavior
Submit MUST run in order: Company → primary contact → first location.

- If Company creation fails, the modal MUST stay open, show `We couldn't create this client. No data was saved.`, and create nothing else.
- If primary contact creation fails after Company succeeds, the system MUST stop, MUST NOT attempt Location creation, and SHALL treat the result as partial success.
- If Location creation fails after Company and primary contact succeed, the system SHALL treat the result as partial success.
- No rollback or cleanup job is included in this slice.

### Requirement 3 — Explicit handoff after submit
The terminal route for both full and partial outcomes MUST be the new client profile route.

- **Full success route**: `/clients/{companyId}?create=success`
- **Partial contact route**: `/clients/{companyId}?create=partial-contact`
- **Partial location route**: `/clients/{companyId}?create=partial-location`

The destination page SHALL show a banner matching the route:

- `success`: `Client created. Primary contact and first location are ready.`
- `partial-contact`: `Client created, but we couldn't save the primary contact. The first location was not created. Add the primary contact on this client before continuing.`
- `partial-location`: `Client and primary contact created, but we couldn't save the first location. Add the first location on this client before continuing.`

## Scenarios

### Scenario 1 — Full success
- **Given** a valid Add Client submission
- **When** Company, primary contact, and first location all succeed
- **Then** the agent is routed to `/clients/{companyId}?create=success`
- **And** no waste stream is created.

### Scenario 2 — Contact step fails
- **Given** Company creation succeeds
- **When** primary contact creation fails
- **Then** Location creation is not attempted
- **And** the agent is routed to `/clients/{companyId}?create=partial-contact` with the partial-success banner.

### Scenario 3 — Location step fails
- **Given** Company and primary contact creation succeed
- **When** first location creation fails
- **Then** the agent is routed to `/clients/{companyId}?create=partial-location`
- **And** the destination page explains that the client profile must be completed manually.

## Out of Scope
- Multi-location or multi-contact creation
- Edit Client parity changes beyond required handoff compatibility
- Waste-stream creation from Add Client
- Admin Communication or broader recovery tooling

## Open Questions
- None.
