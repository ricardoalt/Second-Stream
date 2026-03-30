# Tasks: clients-add-client-foundation

## 1. Backend: Company Account Status
- [x] Add `account_status` column to the backend `Company` model. It MUST be an enum or constrained string allowing only `active` or `prospect`.
- [x] Generate and run the database migration. Ensure the migration sets the default value for existing rows to `active`.
- [x] Update backend API schemas (`CompanyCreate`, `CompanyRead`, `CompanyUpdate`) to accept and return `account_status`.
- [x] Ensure the backend routes correctly process the new field when creating a Company.

## 2. Frontend Schema & State
- [x] Expand `frontend/lib/forms/schemas.ts` to include contact, location fields, and `account_status` for the new Add Client form.
  - Require at least one of `email` or `phone` for the contact.
  - Ensure location fields correctly map the required schema parameters.
- [x] Update `frontend/lib/stores/company-store.ts` (or relevant stores) to expose methods for creating `CompanyContact` and `Location` under a specific `companyId`, if they don't already exist.

## 3. Add Client Modal (Active UI Mount & Integration)
- [x] Implement `frontend/components/features/companies/create-company-dialog.tsx` as a dedicated modal surface that visually matches the Stitch "Add New Client" modal.
- [x] Include the expanded fields for Contact, Location, and wire the status selector to `account_status`.
- [x] Update the `onSubmit` handler to perform the sequential creation workflow:
  - Call `createCompany` including `account_status`. If it fails, halt and show error.
  - If Company succeeds, call `createCompanyContact` with `isPrimary: true`. If it fails, route to `/clients/{companyId}?create=partial-contact`.
  - If Contact succeeds, call `createLocation` with `addressType: 'headquarters'`. Explicitly avoid inferring `addressType` from `customerType`. If it fails, route to `/clients/{companyId}?create=partial-location`.
  - If all succeed, route to `/clients/{companyId}?create=success`.

## 4. Client Profile Banners (Active UI Mount)
- [x] Modify `frontend/app/(agent)/clients/[id]/page.tsx` (or its layout) to read the `?create=` search parameter.
- [x] Render a success or warning banner corresponding to the `create` state (`success`, `partial-contact`, `partial-location`).

## 5. Verification & Hardening
- [x] Verify that `account_status` successfully saves as `active` or `prospect` on creation.
- [x] Verify that the `addressType` payload for the created location strictly passes `headquarters` regardless of `customerType` selection (`buyer`, `generator`, or `both`).
- [x] Verify that partial failure correctly interrupts the submission loop and routes to the profile with the right parameter.
- [ ] Check console and network tab to confirm that no un-mapped fields are sent to the backend.
