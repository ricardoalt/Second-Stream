## Debugging

### Backend
- Logs: `cd backend && docker-compose logs app`
- Shell: `cd backend && docker-compose exec app bash`
- DB: `cd backend && docker-compose exec postgres psql -U postgres -d h2o_allegiant`
- Redis: `cd backend && docker-compose exec redis redis-cli`

### Frontend
- Build errors: `cd frontend && bun run build`
- Lint + types: `cd frontend && bun run check:ci`

### Common issues
- Module not found (backend): check `pyproject.toml`, rebuild image.
- Type error (frontend): ensure `frontend/lib/types/` matches API responses.
- DB connection failed: verify PostgreSQL is running and env vars are correct.
- AI generation timeout: check OpenAI API key/quota.
