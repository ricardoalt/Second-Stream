## Performance Considerations

### Backend
- Database: prefer `selectinload()` to avoid N+1 queries.
- Caching: use Redis via `backend/app/services/cache_service.py`.
- Long-running tasks: AI generation uses async workers (6 per Gunicorn instance).
- Rate limiting: Redis-backed middleware.

### Frontend
- Code splitting: Next.js handles per-route bundles.
- Images: use `next/image`.
- State persistence: Zustand stores persist to localStorage (watch size).
- API caching: consider React Query for future optimization.
