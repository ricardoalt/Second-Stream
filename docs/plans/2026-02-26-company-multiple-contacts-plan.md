# Plan: Company Multiple Contacts

**Generated**: 2026-02-26  
**Complexity**: Medium

## Goal
Support create/view/edit/delete many contacts under 1 company profile.

## Scope
- New entity: `company_contacts` (1:N company).
- Keep `location_contacts` separate (no link in v1).
- Company profile shows full contacts list + CRUD.

## Non-goals
- No merge/unify company vs location contacts.
- No address-book dedupe engine.

## Locked decisions
- `is_primary` in v1: yes.
- Default sort: `name ASC`.
- Phone validation v1: basic (trim/length), no strict intl format.
- Cleanup migration (`contact_name/email/phone`) in separate release.
- Remove legacy contact inputs from company create/edit UI in release A.
- Permissions: same policy as company edit.

## Sprint 1 - Backend contracts (TDD first)
**Done when**: API CRUD works + AC covered + tests green.

1) Tests first (confirm tests with user before impl per backend TDD rule)
- `backend/tests/test_crud_companies_locations.py` or new `backend/tests/test_company_contacts.py`
  - create company contact, linked to company
  - company detail returns all contacts
  - update one contact keeps others unchanged
  - delete one contact keeps others unchanged
  - set/unset `is_primary` keeps at most one primary per company
  - archived company blocks create/update/delete (parity with company edit)
  - second primary assignment returns deterministic conflict (no 500)
  - authz/tenant isolation

2) Data model + schemas
- Add model: `backend/app/models/company_contact.py`
- Add schemas: `backend/app/schemas/company_contact.py`
- Add relationship on company model: `Company.contacts`
- Fields: `name,email,phone,title,notes,is_primary`.
- Enforce one primary per company (DB partial unique index + service validation).

3) Endpoints
- In `backend/app/api/v1/companies.py`:
  - `POST /companies/{company_id}/contacts`
  - `PUT /companies/{company_id}/contacts/{contact_id}`
  - `DELETE /companies/{company_id}/contacts/{contact_id}`
- Read path in v1: `CompanyDetail.contacts` only (no separate list endpoint).
- Guard endpoints with same permission policy as company edit.
- Map primary unique-violation to deterministic `409 Conflict` response.

## Sprint 2 - Migration + safe cutover
**Done when**: no data loss; rolling deploy safe.

1) Migration A (additive, safe)
- New table `company_contacts`.
- FK `(company_id, organization_id)` -> `companies(id, organization_id)` + cascade.
- Index `(organization_id, company_id)`.
- DB check (trim-aware): `num_nonnulls(NULLIF(BTRIM(name), ''), NULLIF(BTRIM(email), ''), NULLIF(BTRIM(phone), '')) >= 1`.
- `is_primary BOOLEAN NOT NULL DEFAULT FALSE`.
- Partial unique index: `UNIQUE (organization_id, company_id) WHERE is_primary IS TRUE`.
- Add read/sort index: `(organization_id, company_id, name, id)`.
- If table has live writes, create/drop indexes `CONCURRENTLY` via Alembic `autocommit_block()`.

2) App release A (compat window)
- Backend write path uses dual-write during rollout:
  - writes `company_contacts`
  - keeps legacy `companies.contact_name/contact_email/contact_phone` in sync
- Keep reads on legacy company fields in this compat window.

3) Backfill (idempotent + race-safe)
- For each company with any of `contact_name/contact_email/contact_phone`:
  - canonicalize (`trim`) name/email/phone.
  - process in deterministic batches (stable order by company id).
  - run under single-job advisory lock to prevent concurrent backfill workers.
  - lock company row (`FOR UPDATE`) before insert/primary assignment.
  - use retry-safe insert (`INSERT ... SELECT ... WHERE NOT EXISTS`) keyed by canonical values + company/org.
  - set inserted row `is_primary=true` when company has no primary yet.
- Verify counts pre/post + rerun inserts 0.

4) App release B (read switch)
- Backend reads only `company_contacts` after backfill verification passes.
- Backend writes only `company_contacts`.
- Frontend company profile uses new contacts endpoints/UI.

5) Lifecycle parity
- Add `company_contacts` to org lifecycle cleanup registry.

6) Migration B (cleanup, later release)
- Drop `companies.contact_name/contact_email/contact_phone`.
- Remove remaining legacy fields from backend schemas/types/API.

## Sprint 3 - Frontend UX
**Done when**: company profile can manage many contacts cleanly.

1) Types + API client
- `frontend/lib/types/company.ts`
- `frontend/lib/api/companies.ts`

2) UI
- Add `CompanyContactsCard` on company profile:
  - list all contacts (sorted `name ASC`)
  - add/edit dialog (inline validation)
  - delete confirm (show contact name)
  - set one contact as Primary (radio/toggle)
- Explicit states: loading, empty, API error/retry.
- Reuse current location-contact UX patterns for consistency.
- Remove single-contact fields from company create/edit dialog.

## Sprint 4 - Verify
- Backend: `cd backend && make check`
- Frontend: `cd frontend && bun run check:ci`
- Manual smoke:
  - create 3 contacts under 1 company
  - edit 1, verify other 2 unchanged
  - delete 1, verify remaining intact

## Risks
- Partial deploy mismatch between app versions and schema stage.
- Legacy data with empty/invalid values.
- Permission drift between company-edit and company-contact CRUD.

## Rollback
- If after Migration A only: rollback safe (legacy columns still exist).
- After Migration B: restore from DB backup/snapshot.

## Resolved questions
- `is_primary`: yes.
- Sort default: `name ASC`.
- Phone validation: basic.
- Cleanup drop columns: separate release.
- Remove company legacy contact inputs in release A: yes.
- Permissions: same as company edit.
