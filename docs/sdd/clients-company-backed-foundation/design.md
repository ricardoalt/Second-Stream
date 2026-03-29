# Design: clients-company-backed-foundation

## Technical Approach
Convert the Clients module from mock-driven to backend-connected by mapping the frontend `/clients` portfolio and `/clients/[id]` profile views to the existing `Company`, `Location`, `CompanyContact`, and `Project` schemas. 

To satisfy the strict constraint of "Do not assume unsupported fields", we will systematically remove or zero-out mock-only features such as company-level timelines, pipeline sums (without N+1 queries), and strategic alerts.

## Architecture Decisions

### Decision: Portfolio List Aggregation Fields
**Choice**: Drop/hide the "Streams" and "Pipeline" count columns from the `/clients` table, and zero out or hide the mock KPIs on the dashboard.
**Alternatives considered**: Introduce N+1 queries to fetch `/projects?company_id={id}` for every row to calculate counts and values.
**Rationale**: `CompanySummary` does not include project/pipeline counts. Calling the projects API per row would degrade performance significantly. We will defer these fields until a native `GET /api/v1/companies/stats` endpoint is implemented.

### Decision: Sequential Resource Creation
**Choice**: The `AddNewClientModal` will issue sequential API requests: `POST /api/v1/companies`, then `POST /api/v1/companies/{id}/locations`, then `POST /api/v1/companies/{id}/contacts`.
**Alternatives considered**: Update the backend to accept nested location and contact creation in a single transaction.
**Rationale**: The backend schema (`CompanyCreate`) does not support nested relations. Sequential frontend calls align with existing contracts and avoid blocking the frontend on backend schema changes. If a sub-request fails, the user is navigated to the profile where they can retry adding the location/contact.

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

# Creation Flow (AddNewClientModal)
Submit 
 ├── 1. POST /api/v1/companies ────────────────→ Creates Company
 ├── 2. POST /api/v1/companies/{id}/locations  → (If location filled)
 └── 3. POST /api/v1/companies/{id}/contacts ──→ (If contact filled)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/app/(agent)/clients/page.tsx` | Modify | Remove mock data, integrate `GET /api/v1/companies`, remove unsupported columns (streams/pipeline/status). |
| `frontend/app/(agent)/clients/[id]/page.tsx` | Modify | Replace mock calls with `GET /api/v1/companies/{id}` and `GET /api/v1/projects?company_id={id}`. Remove unsupported intelligence/timeline sections. |
| `frontend/components/features/modals/add-new-client-modal.tsx` | Modify | Update submit handler to issue sequential creation calls. Map fields to `CompanyCreate`, `LocationCreate`, `CompanyContactCreate`. |
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
| Unit | Sequential Client Creation | Mock `fetch` to ensure `POST /locations` and `POST /contacts` are only called if the `POST /companies` call succeeds. |
| Integration | Profile Hydration | Ensure both `companies/{id}` and `projects?company_id={id}` are fetched and correctly mapped to Streams and Offers tables. |
| E2E | Client Creation Flow | Verify a new client can be created and the user is redirected to the active profile page with the real data visible. |

## Migration / Rollout

No database migration required. The frontend will shift directly from local state/mock data to live API calls.

## Open Questions

- None. Scope is tightly bounded by existing contracts.