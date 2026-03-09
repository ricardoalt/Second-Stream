## Common Workflows

### Adding a backend API endpoint
1) Add route: `backend/app/api/v1/<feature>.py`
2) Add service logic: `backend/app/services/<feature>_service.py`
3) Update models if needed: `backend/app/models/`
4) Add Pydantic schemas: `backend/app/schemas/`
5) Add tests: `backend/tests/test_<feature>.py`

### Adding a frontend feature
1) Page: `frontend/app/<feature>/page.tsx`
2) Components: `frontend/components/features/<feature>/`
3) API client: `frontend/lib/api/<feature>.ts`
4) State (if needed): `frontend/lib/stores/`
5) Types: `frontend/lib/types/<feature>.ts`

### Database migrations
1) `cd backend`
2) Autogenerate: `alembic revision --autogenerate -m "<message>"`
3) Review: `backend/alembic/versions/`
4) Apply: `alembic upgrade head`
5) Rollback: `alembic downgrade -1`

### Transfer user between organizations
1) Authenticate as superadmin (token/session required)
2) Use `POST /api/v1/admin/users/{user_id}/transfer-organization` as standard path
3) Include `target_organization_id`, `reason`, and `reassign_to_user_id` when active projects exist
4) Verify response and audit logs (`admin_user_transfer_attempt`)
5) Use direct SQL only as break-glass fallback

### Organization lifecycle (official)
1) Archive org: `POST /api/v1/organizations/{org_id}/archive`
2) Optional archive body: `{"forceDeactivateUsers": true}` to bulk deactivate active users in same transaction
3) Restore org: `POST /api/v1/organizations/{org_id}/restore`
4) Purge-force org: `POST /api/v1/organizations/{org_id}/purge-force`
5) Purge-force requires archived org + 30-day retention + strict confirmations; no DELETE alias flow
6) If purge returns storage cleanup pending, use manifest for manual replay until auto-worker exists
