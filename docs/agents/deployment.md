## Deployment

### Backend
```bash
# Build Docker image
cd backend
docker build -t waste-platform-backend .
```

### Frontend
- Build via `bun run build` (deploy pipeline handles hosting).

### Notes
- Backend and frontend deploy independently; keep versions aligned via atomic commits in the monorepo.
- `backend/scripts/healthcheck_bulk_import_worker.py` reads `/proc/*/cmdline`; Linux/container-only healthcheck path.
