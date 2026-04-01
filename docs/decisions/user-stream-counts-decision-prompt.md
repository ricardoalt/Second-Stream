# Backend Decision Required: User Stream Counts for Team Management UI

## Context
We need to display "Active Streams" count per user in the Team Management table (frontend reference design). The UI shows:
- Agent Identity (avatar + name + email)
- Role
- Active Streams count with visual bar
- Status (Active/Inactive)
- Actions

## Current Data Architecture

### Existing Backend Endpoints:
1. `GET /organizations/current/users` → Returns users without stream counts
2. `GET /projects/dashboard` → Returns PersistedStreamRow[] with `ownerUserId: string | null`

### Existing Frontend Logic:
- `groupStreamsByOwner()` already groups streams by ownerUserId
- Streams have ownership relationship established

## Decision Options

### Option A: Frontend Aggregation (No Backend Changes)
**Implementation:**
- Frontend calls both endpoints
- Counts streams per user using existing `ownerUserId` field
- Displays calculated counts

**Pros:**
- Zero backend changes
- Works immediately
- No database migrations

**Cons:**
- Extra API call (dashboard fetch)
- Frontend computes aggregations
- Slightly more network overhead
- Counts may become stale between refreshes

### Option B: Backend Enhancement (Recommended for Scale)
**Implementation:**
Add `streamsCount` field to user response:

```typescript
// GET /organizations/current/users
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  // NEW FIELD:
  streamsCount: number; // Active streams owned by this user
}
```

**Backend Implementation Options:**
1. **Computed on query:** JOIN + COUNT in SQL query
2. **Cached field:** Add streams_count column, updated via triggers or batch job
3. **Hybrid:** Compute on read with short-term caching

**Pros:**
- Single API call
- Better performance at scale
- Consistent data source
- Easier to add filters (e.g., only count active streams)

**Cons:**
- Requires backend changes
- May need database query optimization
- Testing required

## Questions for Backend Team

1. **What is the expected scale?** 
   - How many users per organization typically?
   - How many streams per user on average?

2. **What counts as "Active Streams"?**
   - All streams where ownerUserId = user.id?
   - Only streams with specific status (not archived, isActive)?
   - Need filtering by bucket (total, proposal, etc.)?

3. **Real-time requirements?**
   - Does the count need to be real-time or is eventual consistency acceptable?
   - Cache TTL considerations?

4. **Performance preference?**
   - Is the extra JOIN acceptable or prefer denormalized/cached count?

## Deliverable Needed

Please provide:
1. **Recommended approach** (A or B) with technical justification
2. **If Option B:** Proposed API contract change and rough implementation approach
3. **Performance impact assessment**
4. **Estimated effort** (if backend changes needed)

## Files Referenced
- `frontend/components/features/workspace/team-members-page-content.tsx` (UI)
- `frontend/components/features/admin/users-table.tsx` (table component)
- `frontend/lib/api/organizations.ts` (current users API)
- `frontend/lib/types/dashboard.ts` (PersistedStreamRow with ownerUserId)
- `frontend/lib/types/user.ts` (User interface)

## Reference UI Design
The table should look like:
```
┌────────────────────┬───────────────┬──────────────┬─────────┬─────────┐
│ AGENT IDENTITY     │ ROLE          │ ACTIVE STREAMS│ STATUS  │ ACTIONS │
├────────────────────┼───────────────┼──────────────┼─────────┼─────────┤
│ [AF] Alex Fischer  │ Org Admin     │ ████████ 14   │ Active  │   ⋮    │
│ alex@co.com        │               │               │         │        │
├────────────────────┼───────────────┼──────────────┼─────────┼─────────┤
│ [SJ] Sarah Jenkins │ Field Agent   │ █████░░░ 9    │ Active  │   ⋮    │
│ sarah@co.com       │               │               │         │        │
└────────────────────┴───────────────┴──────────────┴─────────┴─────────┘
```

---

**Decision Deadline:** Please respond with recommendation within this conversation so we can coordinate frontend/backend implementation.
