# Plan: Company/Location Classification + ZIP (Unified Product + UX + Tech)

**Generated**: 2026-02-26  
**Estimated Complexity**: Medium

## Overview
Ship 3 additions end-to-end, optimized for non-technical users and low-friction operations:
- Company classification: `customerType` = `buyer | generator | both`
- Location classification: `addressType` = `headquarters | pickup | delivery | billing`
- Address completeness: `zipCode` in create/edit, persisted + clearly displayed

This doc merges implementation scope (`docs/plans/2026-02-26-company-location-classification-zip-plan.md`) and UX proposal (`docs/ux-proposal-company-location-classification.md.resolved`) into one source of truth.

## Product decisions (locked)
- UX style: keep existing dialog/card patterns (shadcn + current spacing/validation/toasts).
- Naming contract:
  - DB/model: `customer_type`, `address_type`, `zip_code`
  - API/UI: `customerType`, `addressType`, `zipCode`
- ZIP is required in manual create/edit location flows.
- ZIP format v1: US `12345` or `12345-6789`.
- ZIP-city-state correspondence in v1: format validation is blocking; city/state match check is deferred to phase 2 unless a trusted local dataset is added this sprint.
- Backward safety: keep DB `zip_code` nullable to avoid breaking existing/bulk-import rows; enforce required at UI + manual CRUD API endpoints only (import/voice unchanged this phase).

## Acceptance mapping
- Create/edit company: user can select `Buyer | Generator | Both`; saved + displayed.
- Create/edit location: user can select `Headquarters | Pick-up | Delivery | Billing`; saved + displayed.
- Create/edit location: user can input ZIP; saved + displayed.
- Edit existing entities: changed types/ZIP persist correctly.

## UX specification

### Form order
- Company dialog:
  1) Company Name*  
  2) Customer Type* (new)  
  3) Sector/Subsector*  
  4) Contact fields  
  5) Notes
- Location dialog:
  1) Location Name*  
  2) Address Type* (new)  
  3) City* + State*  
  4) Address  
  5) ZIP Code* (new)  
  6) Notes

### Components
- `customerType`: `Select` (3 options)
- `addressType`: `Select` (4 options)
- `zipCode`: `Input type="text" inputMode="text" autoComplete="postal-code"` (preserve leading zeros; allow ZIP+4 hyphen)

### Microcopy (final)
- Customer Type
  - Label: `Customer Type`
  - Placeholder: `Select type...`
  - Error: `Please select a customer type`
  - Helper: `Defines how we do business with this company.`
- Address Type
  - Label: `Address Type`
  - Placeholder: `Select type...`
  - Error: `Please select an address type`
  - Helper: `Defines how this location is used operationally.`
- ZIP Code
  - Label: `ZIP Code`
  - Placeholder: `e.g. 90210`
  - Error: `Enter a valid ZIP code (12345 or 12345-6789)`
  - Required error: `ZIP code is required`

### Read display
- Company card: add `customerType` badge near sector badge.
- Company detail: add `Customer Type` row before Industry section.
- Location cards (within company detail): show `addressType` badge + append ZIP to `City, State`.
- Location detail: show `Address Type` (badge) and `ZIP Code` rows in Location Information card.

### Interaction states
- Empty: muted placeholders.
- Error: red border + inline error text (existing style).
- Submit loading: disable fields + show `LoadingButton` spinner.
- Edit: prefilled values for all new fields.

## Technical plan

## Sprint 1: Backend contracts + migration (test-first)
**Goal**: persist + validate new fields in API/DB.  
**Done when**:
- create/update/get/list include new fields
- invalid enum and invalid ZIP return `422`
- missing ZIP in manual create/update endpoints returns `422`
- migration upgrade/downgrade passes

### 1.1 Tests first (confirm with user before coding backend)
- `backend/tests/test_crud_companies_locations.py`
  - create/update company with `customerType`
  - create/update location with `addressType` + `zipCode`
  - get/list include new fields
  - invalid enum -> `422`
  - missing ZIP in create/update manual endpoints -> `422`
  - invalid ZIP format -> `422`

### 1.2 Models + schemas
- `backend/app/models/company.py`
- `backend/app/models/location.py`
- `backend/app/schemas/company.py`
- `backend/app/schemas/location.py`
- Add enums/fields in create/update/read.
- Keep ZIP string; include ZIP in `full_address` when present.

### 1.3 Migration
- `backend/alembic/versions/<new_revision>.py`
- Idempotent enum creation (same style as incoming-material migration).
- Add columns, backfill defaults:
  - `customer_type = both`
  - `address_type = headquarters`
  - `zip_code = null`
- Keep `zip_code` nullable at DB level for backward compatibility.
- Implement downgrade for columns/enums.

### 1.4 API pass-through
- `backend/app/api/v1/companies.py`
- Ensure handlers pass schemas without custom mapping hacks.

## Sprint 2: Frontend forms + display
**Goal**: effortless create/edit/view for non-technical users.

### 2.1 Types + validation
- `frontend/lib/types/company.ts`
- `frontend/lib/forms/schemas.ts`
- Add `CustomerType`, `AddressType`, `zipCode` with same FE/BE rules.

### 2.2 Company dialog (create + edit)
- `frontend/components/features/companies/create-company-dialog.tsx`
- Insert `Customer Type` immediately after company name.
- Ensure edit flow reuses same field + validation so `customerType` persists on company edit.

### 2.3 Location dialog + edit gap
- `frontend/components/features/locations/create-location-dialog.tsx`
- Add `Address Type` + required `ZIP Code`.
- Reuse dialog in edit mode from:
  - `frontend/app/companies/[id]/locations/[locationId]/page.tsx`
- Minimum edit support: change `addressType` and `zipCode`.

### 2.4 Read views
- `frontend/components/features/companies/company-card.tsx`
- `frontend/app/companies/[id]/page.tsx`
- `frontend/app/companies/[id]/locations/[locationId]/page.tsx`
- Render badges/text exactly per UX spec.

## Sprint 3: Verify
- Backend: `cd backend && make check`
- Frontend: `cd frontend && bun run check:ci`
- Manual smoke:
  1) create company with customer type
  2) create location with address type + ZIP
  3) edit both
  4) verify list/detail cards show values

## Risks + mitigations
- FE/BE enum mismatch -> centralize constants in FE types + backend enums.
- ZIP rule drift -> mirror backend regex in FE schema; backend remains authority.
- Existing rows without ZIP -> DB nullable + UI prompts ZIP on edit.
- Bulk-import/voice missing new fields -> out of scope in this phase, no breakage due DB nullable.

## Rollback
- Revert backend schema/API first.
- Downgrade migration.
- Remove/hide UI fields + displays.
- Re-run checks.

## Deferred (phase 2)
- Strict ZIP-city-state correspondence check via trusted dataset/service.
- Bulk-import/voice extraction support for `addressType` and `zipCode`.
