# Apply Progress: clients-add-client-foundation

## Completed
- Added backend `Company.account_status` support (`active|prospect`) in model/schema plus migration defaulting existing rows to `active`.
- Added focused backend test coverage updates for `accountStatus` create/list behavior.
- Added dedicated Add Client modal surface for `/clients` with Stitch-aligned structure and expanded Company + Primary Contact + First Location fields.
- Implemented sequential create flow: Company → primary contact (`isPrimary: true`) → first location (`addressType: headquarters`).
- Added explicit handoff routing to `/clients/[id]?create={success|partial-contact|partial-location}`.
- Added Client Profile banners keyed off `?create=` state.
- Added frontend flow unit tests validating `headquarters` address type and partial-failure interruption logic.
- Enabled backend test container migrations (`RUN_MIGRATIONS=true`) so the exercised runtime schema includes `companies.account_status` before pytest execution.
- Aligned spec language with implemented behavior (`customerType` is user-selected; primary contact requires email or phone).
- Added focused flow tests for full success, location failure (`partial-location`), and company failure propagation (modal error path in caller).
- Fixed location create ZIP validation path so missing ZIP is rejected at schema level and invalid ZIP errors serialize without runtime crashes.
- Enforced Add Client taxonomy at schema + payload boundaries so `sector` must be a known taxonomy sector and `subsector` must belong to that selected sector.
- Added focused taxonomy tests for strict `sector/subsector` validation and payload derivation behavior.

## Verification run in this environment
- ✅ `bun test ./lib/add-client-flow.test.ts` (frontend)
- ✅ `bunx tsc --noEmit --pretty false` (frontend)
- ✅ `docker compose run --rm tests pytest -v tests/test_crud_companies_locations.py -k "list_companies or create_company_success or prospect_account_status"` (backend focused account-status path)
- ⚠️ `docker compose run --rm tests pytest -v tests/test_crud_companies_locations.py` still has 2 unrelated pre-existing failures:
  - `test_create_location_missing_zip` (expected 422, got 201)
  - `test_create_location_invalid_zip` (validation error serialization crash in `app/main.py`)

## Follow-up verification (narrow ZIP fix pass)
- ⚠️ Attempted: `uv run python -m pytest tests/test_crud_companies_locations.py -k "create_location_success or create_location_missing_zip or create_location_invalid_zip or update_location_missing_zip_rejected_when_none or update_location_missing_zip_allowed_when_existing"`
  - Blocked in this environment by missing native dependency required during app import: `libgobject-2.0-0` (WeasyPrint import failure).
- ✅ Schema-level smoke verification via `uv run python` confirms:
  - `LocationCreate` without `zipCode` raises a serializable validation error (`type=missing`, loc=`zipCode`).
  - `LocationCreate` with invalid `zipCode` (`1234`) raises a serializable validation error (`type=zip_code_format`, loc=`zipCode`).
  - Valid `zipCode` (`78701`) passes.

## Follow-up verification (taxonomy cleanup pass)
- ✅ `bunx biome check "lib/add-client-flow.ts" "lib/add-client-flow.test.ts" "lib/forms/schemas.ts" "lib/forms/schemas.add-client.test.ts" "lib/sectors-config.ts"` (frontend targeted files)
- ✅ `bun test "lib/add-client-flow.test.ts" "lib/forms/schemas.add-client.test.ts"` (frontend taxonomy-focused tests)

## Remaining verification
- Perform manual browser network verification for unmapped-field payload checks.
