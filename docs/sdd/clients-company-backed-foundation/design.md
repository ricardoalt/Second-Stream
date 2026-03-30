# Design: clients-company-backed-foundation

## Technical Approach
Convert the Clients module from mock-driven to backend-connected by mapping the frontend `/clients` portfolio and `/clients/[id]` profile views to the existing `Company`, `Location`, `CompanyContact`, and `Project` schemas. 

To satisfy the strict constraint of "Do not assume unsupported fields", we will systematically remove or zero-out mock-only features such as company-level timelines, pipeline sums (without N+1 queries), and strategic alerts.

## Architecture Decisions

### Decision: Portfolio List Aggregation Fields
**Choice**: Drop/hide the "Streams" and "Pipeline" count columns from the `/clients` table, and zero out or hide the mock KPIs on the dashboard.
**Alternatives considered**: Introduce N+1 queries to fetch `/projects?company_id={id}` for every row to calculate counts and values.
**Rationale**: `CompanySummary` does not include project/pipeline counts. Calling the projects API per row would degrade performance significantly. We will defer these fields until a native `GET /api/v1/companies/stats` endpoint is implemented.

### Decision: Decommission Add Client Modal Artifact
**Choice**: Remove `frontend/components/features/modals/add-new-client-modal.tsx` as an inactive artifact.
**Alternatives considered**: Keep the modal as dormant code for later reuse.
**Rationale**: Add Client creation is explicitly out of scope for this change. Keeping an unmounted modal creates maintenance noise and warning debt without delivering user value.

### Decision: Profile Waste Streams and Offers
**Choice**: Fetch `GET /api/v1/projects?company_id={id}` and use the result to populate both the "Associated waste streams" and "Offers" tables on the profile.
**Alternatives considered**: Request offers and streams separately.
**Rationale**: Projects serve as the foundational entity for both streams and offers (via the `proposals` relation). A single project request cleanly hydrates both tables without additional backend endpoints.

### Decision: Removal of Mock-Only Sections
**Choice**: Completely remove "Strategic Intelligence", "Account Intelligence", "Win rate", "Open issues", and the "Activity timeline" from the `<ClientDetailPage>`.
**Alternatives considered**: Fake them with placeholder static text.
**Rationale**: The critical review guidance strictly prohibits faking alerts, insights, or company-level timelines. These sections will be reintroduced only when backed by real data contracts.

## Data Flow

```text
# Portfolio Route (/clients)
ClientsPage
 └── GET /api/v1/companies
      └── Renders table using CompanySummary (Drops Streams/Pipeline columns)

# Profile Route (/clients/[id])
ClientDetailPage
 ├── GET /api/v1/companies/{id} ───────────────→ Hydrates CompanyDetail, Locations, Primary Contact
 └── GET /api/v1/projects?company_id={id} ─────→ Hydrates Streams & Offers tables

# Add Client creation flow
Out of scope in this change. Creation remains unimplemented in active Clients surfaces.
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/app/(agent)/clients/page.tsx` | Modify | Remove mock data, integrate `GET /api/v1/companies`, remove unsupported columns (streams/pipeline/status). |
| `frontend/app/(agent)/clients/[id]/page.tsx` | Modify | Replace mock calls with `GET /api/v1/companies/{id}` and `GET /api/v1/projects?company_id={id}`. Remove unsupported intelligence/timeline sections. |
| `frontend/components/features/modals/add-new-client-modal.tsx` | Delete | Decommission dead Add Client modal artifact (inactive and out of scope). |
| `docs/sdd/clients-company-backed-foundation/proposal.md` | Create | Reconstructed proposal artifact for warning-cleanup pass traceability. |
| `docs/sdd/clients-company-backed-foundation/spec.md` | Create | Reconstructed requirement/scenario artifact for archive-time verification. |
| `docs/sdd/clients-company-backed-foundation/tasks.md` | Create | Reconstructed task checklist and completion evidence for this pass. |
| `frontend/components/features/modals/edit-client-modal.tsx` | Modify | Wire to `PUT /api/v1/companies/{id}` and `PUT /api/v1/companies/{id}/contacts/{contact_id}`. Remove the mock `status` dropdown. |
| `frontend/components/features/clients/mock-data.ts` | Delete | Remove all mock data files related to Clients. |
| `frontend/lib/api/companies.ts` | Create | (If not exists) Add fetcher functions for company list, detail, create, and update. |

## Interfaces / Contracts

No new backend interfaces are introduced. The frontend will strictly consume:
- `CompanySummary`
- `CompanyDetail` (with nested `locations` and `contacts`)
- `ProjectSummary` (filtered by `company_id`)
- `CompanyCreate` / `CompanyUpdate`
- `LocationCreate` / `CompanyContactCreate`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Removed dead modal safety | Ensure no stale import/usage references to deleted Add Client modal remain. |
| Integration | Profile Hydration | Ensure both `companies/{id}` and `projects?company_id={id}` are fetched and correctly mapped to Streams and Offers tables. |
| E2E | Client portfolio/profile continuity | Verify `/clients` and `/clients/[id]` render with backend-backed data after cleanup. |

## Migration / Rollout

No database migration required. The frontend will shift directly from local state/mock data to live API calls.

## Open Questions

- Follow-up now clarified by Product Engineering: Add Client parity is a later slice, and the **"Shipping Location & Logistics Hub"** block should persist as the client's first real `Location`.
- This clarification does not change the scope of `clients-company-backed-foundation`; it only defines the correct domain model for the later Add Client slice.
