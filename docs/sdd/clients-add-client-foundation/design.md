# Design: clients-add-client-foundation

## Technical Approach

We will upgrade the existing `Add Client` (currently just `CreateCompanyDialog`) into a multi-step submission flow within a dedicated modal surface that visually matches the Stitch "Add New Client" modal. The form will collect Company, Primary Contact, and First Location data. On submit, it will sequentially call the backend APIs. If a step fails, the flow stops and routes to the client profile with a partial-success state, leaving the remaining entities uncreated.

We will also update the backend `Company` model and schema to natively support `account_status` (enum: `lead`, `active`) so the UI status selector has a truthful backend destination. The lifecycle starts at `lead` and transitions to `active` after first stream creation.

Crucially, we will **hardcode `addressType = 'headquarters'`** for the first location, rather than inferring it from `customerType`. The UI does not collect a truthful location-type choice, and `customerType` is a commercial relationship, not a physical-site classifier.

## Architecture Decisions

### Decision: Sequential vs Atomic Creation
**Choice**: Sequential creation (Company → Contact → Location) orchestrated by the frontend.
**Alternatives considered**: A new backend atomic endpoint (`POST /companies/onboard`).
**Rationale**: We lack an atomic onboard endpoint in the backend and creating one is out of scope for this frontend slice. The sequential frontend approach is explicit, uses existing contracts, and handles partial failure by routing to the profile with a clear recovery message.

### Decision: Location `addressType` mapping
**Choice**: Hardcode `addressType = 'headquarters'` for the first location.
**Alternatives considered**: Inferring `addressType` from `customerType` (e.g., `generator` -> `pickup`).
**Rationale**: The product review explicitly rejected inference because `customerType` does not dictate the physical site type. `headquarters` is the safest truthful default when no explicit choice is provided.

### Decision: Company Account Status
**Choice**: Add an `account_status` column to the `Company` model with an enum of `lead | active`.
**Alternatives considered**: Keeping status as a purely frontend visual artifact, or a separate state model.
**Rationale**: A company's status is lifecycle-managed: created as `lead`, then converted to `active` when operational onboarding progresses (first stream creation). Keeping this as a constrained enum provides truthful CRM state while preventing arbitrary transitions.

### Decision: State Management & Form
**Choice**: Expand the `CreateCompanyDialog` into a dedicated modal surface that visually matches the Stitch "Add New Client" modal, housing a TanStack Form for Company, Contact, and Location fields.
**Alternatives considered**: A wizard with multiple screens, or keeping the exact current UI.
**Rationale**: Implementing a dedicated modal surface matching Stitch ensures visual alignment with the design system. We will expand the validation schema and handle the sequential API calls in the `onSubmit` handler.

## Data Flow

    UI Form (Add Client Modal)
         │
         ├── 1. POST /companies (name, industry, sector, subsector, customerType, account_status)
         │      ↓ (Returns companyId)
         ├── 2. POST /companies/{companyId}/contacts (name, title, email, phone, isPrimary: true)
         │      ↓ (Returns contactId)
         └── 3. POST /companies/{companyId}/locations (name, address, city, state, zipCode, addressType: 'headquarters')

    If any step fails, catch the error, stop execution, and route to `/leads/{companyId}?create={status}`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/models/company.py` (or equiv) | Modify | Add `account_status` (Enum: `lead`, `active`) to the Company model. Generate/run alembic migration and align defaults/migration values with lifecycle-managed `lead → active`. |
| `backend/schemas/company.py` (or equiv) | Modify | Add `account_status` to create, read, and update schemas. |
| `frontend/lib/forms/schemas.ts` | Modify | Expand `companySchema` or create an `addClientSchema` that includes Contact, Location, and `account_status`. |
| `frontend/components/features/companies/create-company-dialog.tsx` | Modify | Add UI fields for Contact, Location, and wire up the status selector to `account_status`. Update `onSubmit` to perform the sequential API calls. Hardcode `addressType: 'headquarters'`. Handle routing on success/partial-success. |
| `frontend/lib/stores/company-store.ts` | Modify | Expose or use existing methods for creating contacts and locations. |
| `frontend/app/(agent)/leads/[id]/page.tsx` | Modify | Read `?create=` search param to show the appropriate success or partial-success banner. |

## Interfaces / Contracts

The submission payload to the backend endpoints will look like:
```typescript
// 1. Company
{ name, industry, sector, subsector, customerType, account_status, notes }

// 2. Contact
{ name, title, email, phone, isPrimary: true }

// 3. Location
{ name, address, city, state, zipCode, addressType: "headquarters" }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Validation & Model | Verify Contact/Location validation. Test `account_status` validation (only `lead` or `active` allowed) in the backend. |
| Integration | Sequential submission | Mock API calls. Verify Contact is not called if Company fails. Verify Location is not called if Contact fails. |
| E2E | Flow completion | Fill the form, submit, verify it routes to `/leads/{id}?create=success` with `addressType=headquarters` sent to the server. |

## Migration / Rollout
Database migration will add `account_status` to `Company`, align legacy values to `lead`, and set lifecycle-consistent defaults. The frontend feature replaces the current stub modal with a fully functional sequential submission matching the Stitch design.

## Open Questions
- None.
