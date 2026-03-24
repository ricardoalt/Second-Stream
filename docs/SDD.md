# Second Stream — Software Design Document (SDD)

> **Version:** 3.1 — Complete Redesign Specification  
> **Date:** March 23, 2026  
> **Status:** Draft for Review  
> **Companion Docs:** [PRD.md](./PRD.md) · [FLOW.md](./FLOW.md) · [Design.md](./Design.md)  
> **Note:** Ground-up redesign. Current codebase not taken into account — implementation starts fresh from these specs.

---

## 1. System Architecture

### 1.1 Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy (async), Alembic, pydantic-ai
- **Package Managers:** bun (frontend), uv (backend)
- **Storage:** S3-compatible (files), PostgreSQL JSONB (flexible data)
- **Auth:** FastAPI Users + JWT (24h tokens)
- **Multi-tenancy:** Organization = paying client (tenant). Superadmin = platform team (Second Stream devs). Row-level isolation per organization.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Domain naming | `WasteStream` | Match industry language and Stitch designs |
| Phase storage | Hybrid: explicit table + JSONB | Queryable status/gating + flexible field data + custom fields |
| Role-based layouts | Route groups `(agent)/` and `(admin)/` | Clean separation of concerns, different sidebars and navigation |
| Communication model | New `stream_communications` table | Admin ↔ agent sidebar chat needs persistent storage |
| No admin approval gate | Agent drives pipeline to proposal | Admin role is oversight/support, not blocking |
| Multi-tenancy model | Organization = tenant, Superadmin = platform | Platform team manages all tenants; org_admin manages their own |
| Phase field definitions | TBD — placeholder only in Stitch | Stitch screens show representative fields for UI/UX layout |

---

## 2. Database Schema

### 2.1 New Tables

#### `waste_stream_phases`

```sql
CREATE TABLE waste_stream_phases (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_stream_id      UUID NOT NULL REFERENCES waste_streams(id) ON DELETE CASCADE,
    organization_id      UUID NOT NULL REFERENCES organizations(id),
    phase_number         INT NOT NULL CHECK (phase_number BETWEEN 1 AND 4),
    phase_name           VARCHAR(50) NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'not_started'
                         CHECK (status IN ('not_started','in_progress','complete','blocked')),

    -- Lifecycle timestamps
    started_at           TIMESTAMPTZ,
    started_by_user_id   UUID REFERENCES users(id),
    completed_at         TIMESTAMPTZ,
    completed_by_user_id UUID REFERENCES users(id),
    reviewed_at          TIMESTAMPTZ,
    reviewed_by_user_id  UUID REFERENCES users(id),

    -- Flexible data
    phase_data           JSONB NOT NULL DEFAULT '{}',
    custom_fields        JSONB NOT NULL DEFAULT '{"fields":[]}',

    -- Timestamps
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(waste_stream_id, phase_number)
);

-- Indexes for common queries
CREATE INDEX ix_wsp_org_status ON waste_stream_phases(organization_id, status);
CREATE INDEX ix_wsp_status_phase ON waste_stream_phases(status, phase_number);
CREATE INDEX ix_wsp_stream ON waste_stream_phases(waste_stream_id);
CREATE INDEX ix_wsp_phase_data_gin ON waste_stream_phases USING gin(phase_data);
```

#### `stream_communications`

```sql
CREATE TABLE stream_communications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_stream_id   UUID NOT NULL REFERENCES waste_streams(id) ON DELETE CASCADE,
    organization_id   UUID NOT NULL REFERENCES organizations(id),
    sender_user_id    UUID NOT NULL REFERENCES users(id),
    message_type      VARCHAR(20) NOT NULL DEFAULT 'message'
                      CHECK (message_type IN ('message','update_request','status_change','note')),
    content           TEXT NOT NULL,
    metadata          JSONB DEFAULT '{}',
    read_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_sc_stream ON stream_communications(waste_stream_id, created_at DESC);
CREATE INDEX ix_sc_org ON stream_communications(organization_id);
```

### 2.2 Core Tables

#### `waste_streams`

```sql
CREATE TABLE waste_streams (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(id),
    location_id              UUID REFERENCES locations(id),
    user_id                  UUID NOT NULL REFERENCES users(id),
    name                     VARCHAR(255) NOT NULL,
    sector                   VARCHAR(100) NOT NULL,
    status                   VARCHAR(50) NOT NULL DEFAULT 'active'
                             CHECK (status IN ('draft','active','action_required',
                                               'proposal_generated','closed_won','closed_lost')),
    current_phase            INT NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 4),
    progress                 INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    proposal_follow_up_state VARCHAR(32),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_ws_org_status ON waste_streams(organization_id, status);
CREATE INDEX ix_ws_user ON waste_streams(user_id);
CREATE INDEX ix_ws_location ON waste_streams(location_id);
```

**Note:** `status` defaults to `'active'` for manual creation. Discovery Wizard sets it to `'draft'` explicitly.

### 2.3 Complete Entity Relationship Diagram

```
Organization
  ├──1:N──> User
  ├──1:N──> Company
  │           ├──1:N──> Location
  │           │           ├──1:N──> WasteStream
  │           │           │           ├──1:4──> WasteStreamPhase
  │           │           │           ├──1:N──> Proposal
  │           │           │           ├──1:N──> StreamFile
  │           │           │           ├──1:N──> TimelineEvent
  │           │           │           └──1:N──> StreamCommunication
  │           │           └──1:N──> LocationContact
  │           └──1:N──> CompanyContact
  └──1:N──> DiscoverySession
              └──1:N──> DiscoverySource
```

---

## 3. Backend Models

### 3.1 WasteStream (replaces Project)

```python
class WasteStream(BaseModel):
    __tablename__ = "waste_streams"

    organization_id: Mapped[UUID]      # FK → organizations
    location_id: Mapped[UUID | None]   # FK → locations
    user_id: Mapped[UUID]              # FK → users (assigned agent)
    name: Mapped[str]                  # "Spent Acetone", "Used Coolant"
    sector: Mapped[str]                # "Industrial", "Commercial", etc.
    status: Mapped[str]                # draft, active, action_required, proposal_generated, closed_won, closed_lost
    current_phase: Mapped[int]         # 1-4 (active phase number)
    progress: Mapped[int]              # 0-100 (% complete)
    proposal_follow_up_state: Mapped[str | None]  # commercial follow-up state

    # Relationships
    phases = relationship("WasteStreamPhase", cascade="all, delete-orphan",
                         order_by="WasteStreamPhase.phase_number")
    proposals = relationship("Proposal", cascade="all, delete-orphan")
    files = relationship("StreamFile", cascade="all, delete-orphan")
    timeline = relationship("TimelineEvent", cascade="all, delete-orphan")
    communications = relationship("StreamCommunication", cascade="all, delete-orphan")
    location_rel = relationship("Location", back_populates="waste_streams")
    user = relationship("User", back_populates="waste_streams")
```

### 3.2 WasteStreamPhase

```python
class WasteStreamPhase(BaseModel):
    __tablename__ = "waste_stream_phases"

    waste_stream_id: Mapped[UUID]       # FK → waste_streams
    organization_id: Mapped[UUID]       # FK → organizations
    phase_number: Mapped[int]           # 1-4 (indexed, unique per stream)
    phase_name: Mapped[str]             # Canonical name
    status: Mapped[str]                 # not_started, in_progress, complete, blocked

    # Lifecycle
    started_at: Mapped[datetime | None]
    started_by_user_id: Mapped[UUID | None]
    completed_at: Mapped[datetime | None]
    completed_by_user_id: Mapped[UUID | None]
    reviewed_at: Mapped[datetime | None]
    reviewed_by_user_id: Mapped[UUID | None]

    # Data (JSONB)
    phase_data: Mapped[dict]            # Validated per phase_number by Pydantic
    custom_fields: Mapped[dict]         # User-defined additional fields
```

### 3.3 StreamCommunication

```python
class StreamCommunication(BaseModel):
    __tablename__ = "stream_communications"

    waste_stream_id: Mapped[UUID]       # FK → waste_streams
    organization_id: Mapped[UUID]       # FK → organizations
    sender_user_id: Mapped[UUID]        # FK → users
    message_type: Mapped[str]           # message, update_request, status_change, note
    content: Mapped[str]                # Message text
    metadata: Mapped[dict]              # Optional metadata (attachments, etc.)
    read_at: Mapped[datetime | None]    # When recipient read the message
```

### 3.4 Pydantic Validators (per-phase `phase_data`)

> **Important:** The specific fields below are **placeholder examples** from the Stitch mockups. The final field definitions for each phase are **not yet defined**. The architecture supports any field schema per phase — each phase gets its own Pydantic model that validates `phase_data` JSONB.

```python
# Example structure — final fields TBD
class Phase1Data(BaseModel):
    """Operational Screening — placeholder fields."""
    # Fields will be defined before implementation
    pass

class Phase2Data(BaseModel):
    """Commercial & Economic — placeholder fields."""
    pass

class Phase3Data(BaseModel):
    """Technical & Compliance — placeholder fields."""
    pass

class Phase4Data(BaseModel):
    """Value Discovery — placeholder fields."""
    ai_output: dict | None = None  # Populated by AI after completion

PHASE_VALIDATORS = {
    1: Phase1Data,
    2: Phase2Data,
    3: Phase3Data,
    4: Phase4Data,
}
```

The pattern is: each `phase_data` JSONB is validated against the corresponding Pydantic model. When the final fields are defined, these models will be populated with the actual field definitions, types, and required/optional flags.

### 3.5 Custom Fields Schema

```python
class CustomFieldDefinition(BaseModel):
    key: str               # "client_priority_level"
    label: str             # "Client Priority"
    type: Literal["text", "number", "select", "multi_select", "date", "toggle"]
    options: list[str] | None = None  # For select/multi_select
    value: str | float | bool | list[str] | None = None


class CustomFieldsContainer(BaseModel):
    fields: list[CustomFieldDefinition] = []
```

---

## 4. API Routes

### 4.1 Streams (replaces `/projects`)

```
GET    /api/v1/streams                              # List streams (filtered by role)
POST   /api/v1/streams                              # Create stream
GET    /api/v1/streams/{id}                         # Get stream detail with phases
PATCH  /api/v1/streams/{id}                         # Update stream metadata
DELETE /api/v1/streams/{id}                         # Archive stream
```

### 4.2 Phase Operations

```
GET    /api/v1/streams/{id}/phases                  # Get all 4 phases
GET    /api/v1/streams/{id}/phases/{number}         # Get specific phase
PATCH  /api/v1/streams/{id}/phases/{number}         # Update phase data
POST   /api/v1/streams/{id}/phases/{number}/start   # Start phase (gated)
POST   /api/v1/streams/{id}/phases/{number}/complete # Complete phase (gated)
```

**Phase Gating Service Logic:**

```python
class PhaseGatingService:
    async def can_start_phase(self, stream_id: UUID, phase_number: int) -> bool:
        """Phase N can start only if Phase N-1 is complete (or N == 1)."""
        if phase_number == 1:
            return True
        prev_phase = await self.get_phase(stream_id, phase_number - 1)
        return prev_phase.status == "complete"

    async def can_complete_phase(self, stream_id: UUID, phase_number: int) -> bool:
        """Phase can complete only if all required fields are filled."""
        phase = await self.get_phase(stream_id, phase_number)
        validator = PHASE_VALIDATORS[phase_number]
        try:
            validator.model_validate(phase.phase_data)
            return True
        except ValidationError:
            return False

    async def admin_override_start(self, stream_id: UUID, phase_number: int, admin_id: UUID):
        """Admin can bypass gating."""
        # Log override in timeline + start phase
```

### 4.3 Communications (Admin ↔ Agent)

```
GET    /api/v1/streams/{id}/communications          # Get chat thread
POST   /api/v1/streams/{id}/communications          # Send message
POST   /api/v1/streams/{id}/request-update          # Admin requests update (creates communication + changes status)
```

### 4.4 Discovery (adapt existing)

```
POST   /api/v1/discovery/sessions                   # Create session
POST   /api/v1/discovery/sessions/{id}/sources      # Add source (file/text/audio)
POST   /api/v1/discovery/sessions/{id}/process      # Trigger AI extraction
POST   /api/v1/discovery/sessions/{id}/confirm      # Confirm → create WasteStream draft
```

### 4.5 Proposals (adapt to streams)

```
GET    /api/v1/streams/{id}/proposals               # List proposals for stream
POST   /api/v1/streams/{id}/proposals/generate      # Trigger AI proposal (Phase 4 gate)
GET    /api/v1/proposals/{id}                       # Get proposal detail
PATCH  /api/v1/proposals/{id}/status                # Update status (won/lost/etc.)
GET    /api/v1/proposals                            # Pipeline list (all proposals)
GET    /api/v1/proposals/archive                    # Historical archive
```

### 4.6 Admin Oversight

```
GET    /api/v1/admin/oversight/follow-ups           # Pending follow-ups with SLA tracking
GET    /api/v1/admin/oversight/regional             # Regional heat map data (aggregated)
GET    /api/v1/admin/oversight/stale-streams        # Streams needing attention (>14 days)
GET    /api/v1/admin/team                           # Team overview with metrics
GET    /api/v1/admin/team/{user_id}                 # Agent profile with performance data
```

### 4.7 Clients (existing — keep as-is)

```
GET    /api/v1/companies                            # Client portfolio
POST   /api/v1/companies                            # Create company
GET    /api/v1/companies/{id}                       # Company detail with locations
PATCH  /api/v1/companies/{id}                       # Update company
```

---

## 5. Frontend Architecture

### 5.1 Routing Structure

```
app/
├── (auth)/                           # Auth layout (no sidebar)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
│
├── (agent)/                          # Agent layout
│   ├── layout.tsx                    # AgentSidebar: Dashboard, Streams, Clients, Proposals
│   ├── dashboard/page.tsx            # Agent Dashboard
│   ├── streams/
│   │   ├── page.tsx                  # All Streams (tabs: Active, Action Required, Drafts)
│   │   ├── drafts/page.tsx           # Drafts inline edit
│   │   ├── follow-ups/page.tsx       # Urgent follow-ups / stale
│   │   └── [id]/page.tsx             # Stream Detail (4-phase workspace)
│   ├── clients/
│   │   ├── page.tsx                  # Client Portfolio
│   │   └── [id]/page.tsx             # Client Profile
│   └── proposals/
│       ├── page.tsx                  # Proposals Pipeline
│       ├── archive/page.tsx          # Historical Archive
│       └── [id]/page.tsx             # Proposal Detail
│
├── (admin)/                          # Admin layout
│   ├── layout.tsx                    # AdminSidebar: Dashboard, Oversight, Team, Clients, Analytics
│   ├── dashboard/page.tsx            # Admin Dashboard
│   ├── oversight/
│   │   ├── page.tsx                  # Oversight main
│   │   ├── heat-map/page.tsx         # Regional Heat Map
│   │   └── follow-ups/page.tsx       # Follow-up & Status Control
│   ├── team/
│   │   ├── page.tsx                  # Team Management
│   │   └── [id]/page.tsx             # Agent Profile
│   ├── clients/
│   │   ├── page.tsx                  # All Clients (admin view)
│   │   └── [id]/page.tsx             # Client Detail
│   └── streams/
│       └── [id]/page.tsx             # Admin Stream Detail (wide header + comms sidebar)
│
└── (shared)/                         # Shared pages (both roles)
    ├── settings/page.tsx
    └── profile/page.tsx
```

### 5.2 Feature Components

```
components/features/
├── streams/
│   ├── stream-table.tsx              # Reusable data table (sortable, filterable)
│   ├── stream-detail-header.tsx      # Stream header (role-conditional)
│   ├── phase-stepper.tsx             # Phase 1-4 tab/stepper navigation
│   ├── phase-form.tsx                # Phase form dispatcher (routes to phase-specific)
│   ├── phase-1-form.tsx              # Operational Screening fields
│   ├── phase-2-form.tsx              # Commercial & Economic fields
│   ├── phase-3-form.tsx              # Technical & Compliance fields
│   ├── phase-4-form.tsx              # Value Discovery fields
│   ├── draft-inline-row.tsx          # Inline edit row for Drafts view
│   ├── admin-wide-header.tsx         # Admin override header with audit info
│   └── stale-stream-card.tsx         # Warning card for follow-ups view
│
├── communications/
│   ├── chat-sidebar.tsx              # Admin ↔ Agent persistent chat panel
│   └── request-update-modal.tsx      # Admin sends update request
│
├── discovery/
│   ├── discovery-wizard-modal.tsx    # Multi-modal intake (file + text + voice)
│   ├── ai-confirmation-modal.tsx     # Extraction review table
│   └── discovery-complete.tsx        # Completion summary with metrics
│
├── proposals/
│   ├── proposal-pipeline.tsx         # Pipeline summary with status cards
│   ├── proposal-detail.tsx           # Detail view with tabs (Material/Econ/AI)
│   └── proposal-archive.tsx          # Historical archive with search
│
├── clients/
│   ├── client-portfolio.tsx          # Company card grid
│   ├── client-profile.tsx            # Company detail (locations + streams)
│   ├── add-client-modal.tsx          # New client form
│   └── edit-client-modal.tsx         # Edit client form
│
├── admin/
│   ├── admin-dashboard.tsx           # Admin KPIs + team overview + alerts
│   ├── heat-map.tsx                  # Regional geographic visualization
│   ├── follow-up-control.tsx         # SLA tracking dashboard
│   ├── team-management.tsx           # Agent list with performance metrics
│   └── agent-profile.tsx             # Individual agent profile + chat
│
└── modals/
    ├── email-modal.tsx               # Send email from stream context
    ├── call-modal.tsx                # Log phone call
    ├── activity-modal.tsx            # Generic activity logger
    ├── document-upload-modal.tsx     # Upload files to stream
    ├── quick-paste-modal.tsx         # AI text processing
    ├── voice-memo-modal.tsx          # Audio recording + transcription
    └── assign-agent-modal.tsx        # Reassign stream to different agent
```

### 5.3 Zustand Stores

```
lib/stores/
├── stream-store.ts              # WasteStream list + CRUD (replaces project-store)
├── phase-store.ts               # Phase data + custom fields per stream
├── communication-store.ts       # Chat thread per stream
├── dashboard-store.ts           # Dashboard KPIs (adapt existing)
├── company-store.ts             # Client portfolio (keep existing)
├── location-store.ts            # Location data (keep existing)
├── proposal-store.ts            # Proposal pipeline + detail
├── discovery-store.ts           # Discovery wizard session state
├── team-store.ts                # Team management data (new)
└── organization-store.ts        # Org context (keep existing)
```

### 5.4 API Client Layer

```
lib/api/
├── streams.ts                   # WasteStream CRUD + phase operations
├── phases.ts                    # Phase start/complete/update
├── communications.ts            # Chat send/receive
├── discovery-sessions.ts        # Discovery wizard API (adapt existing)
├── proposals.ts                 # Proposal CRUD + generation (adapt existing)
├── companies.ts                 # Client portfolio (keep existing)
├── admin.ts                     # Admin oversight endpoints (new)
├── team.ts                      # Team management endpoints (new)
└── client.ts                    # Base HTTP client (keep existing)
```

---

## 6. Phase Gating Logic

### 6.1 Rules

| Rule | Description |
|------|-------------|
| Sequential gating | Phase N+1 cannot start until Phase N is `complete` |
| Required field validation | Phase cannot complete without all required fields (Pydantic validation) |
| Admin override | Admin can bypass gating for any phase |
| Phase 3 document gate | SDS and COA must be uploaded AND status = `valid` |
| Phase 4 AI trigger | Completing Phase 4 automatically triggers AI proposal generation |
| Progress calculation | `progress = (completed_phases / 4) * 100` |

### 6.2 State Machine

```
                    start()
not_started ──────────────────> in_progress
                                    │
                    complete()      │  block()
                    ┌───────────────┤──────────> blocked
                    │               │               │
                    ▼               │   unblock()   │
                 complete <─────────┘───────────────┘
```

### 6.3 Auto-Status Updates

When phase status changes, the parent WasteStream status updates automatically:

| Phase Event | Stream Status Update |
|-------------|---------------------|
| Phase 1 started (from draft) | `draft` → `active` |
| Any phase blocked | → `action_required` |
| Phase unblocked | → `active` |
| Phase 4 completed | AI proposal triggered → `proposal_generated` |

**Note:** There is no `pending_review` or `approved` state. The field agent drives the stream from creation to proposal generation without admin sign-off. The admin's role is oversight and support only.

---

## 7. Implementation Strategy

### 7.1 Overall Approach

| Layer | Strategy | Rationale |
|-------|----------|-----------|
| **Frontend** | **Build from scratch** | Everything changes: routes, layouts, components, stores. Not worth adapting. Reuse only: shadcn/ui base components, Tailwind theme config, generic utils. |
| **Backend** | **Adapt existing codebase** | 88% of files are reusable (46% as-is, 42% with mechanical renames). Only 3% needs full rebuild. AI agents, auth, storage, and all infrastructure carry over. |
| **Database** | **Migration** | Create new tables, rename `projects` → `waste_streams`, migrate JSONB data into phase records. |

### 7.2 Backend Reuse Inventory

Full file-by-file analysis of what to keep, adapt, rebuild, or create new.

#### Summary

| Category | Files | % | What it means |
|----------|-------|---|---------------|
| **KEEP as-is** | 49 | 46% | No changes needed — works for the redesign |
| **ADAPT** | 44 | 42% | Core logic stays, rename FKs/relationships (`project_id` → `waste_stream_id`) |
| **REBUILD** | 3 | 3% | Concept needed but implementation doesn't fit new model |
| **NEW** | 6 | — | Entirely new files for Phase and Communication features |

#### Models (`backend/app/models/`)

| File | Category | What changes |
|------|----------|-------------|
| `base.py` | KEEP | Generic base model, no changes |
| `user.py` | ADAPT | Rename `projects` relationship → `waste_streams` |
| `organization.py` | KEEP | Multi-tenancy root, unchanged |
| `project.py` | REBUILD | → New `waste_stream.py` with phase-gated lifecycle |
| `project_input.py` | ADAPT | Rename references, reusable AI input schemas |
| `proposal.py` | ADAPT | FK → `waste_streams`, trigger from Phase 4 |
| `proposal_output.py` | KEEP | Pure Pydantic AI output, model-agnostic |
| `proposal_rating.py` | ADAPT | FK constraints → `waste_streams` |
| `company.py` | KEEP | No changes |
| `company_contact.py` | KEEP | No changes |
| `location.py` | ADAPT | Rename `projects` relationship → `waste_streams` |
| `location_contact.py` | KEEP | No changes |
| `file.py` | ADAPT | `ProjectFile` → `StreamFile`, FK → `waste_streams` |
| `feedback.py` | KEEP | Organization-scoped, independent |
| `feedback_attachment.py` | KEEP | No changes |
| `discovery_session.py` | ADAPT | Output creates WasteStream + Phases instead of Project |
| `incoming_material.py` | KEEP | Location-scoped, independent |
| `intake_note.py` | ADAPT | FK `project_id` → `waste_stream_id` |
| `intake_suggestion.py` | ADAPT | FK `project_id` → `waste_stream_id` |
| `intake_unmapped_note.py` | ADAPT | FK `project_id` → `waste_stream_id` |
| `timeline.py` | ADAPT | FK `project_id` → `waste_stream_id` |
| `voice_interview.py` | KEEP | Company/location-scoped, independent |
| `bulk_import.py` | ADAPT | `created_project_id` → `created_waste_stream_id` |
| `bulk_import_output.py` | ADAPT | Rename to WasteStream naming |
| `bulk_import_ai_output.py` | KEEP | Already uses "waste_streams" naming |
| `workspace_insights_output.py` | KEEP | Model-agnostic |
| `notes_analysis_output.py` | KEEP | Model-agnostic |
| `image_analysis_output.py` | KEEP | Model-agnostic |
| `document_analysis_output.py` | KEEP | Model-agnostic |
| `external_opportunity_report.py` | KEEP | Model-agnostic |
| `organization_purge_manifest.py` | KEEP | Organization-scoped |
| **`waste_stream_phase.py`** | **NEW** | 4-phase table with status, gating, JSONB data |
| **`stream_communication.py`** | **NEW** | Admin↔agent chat messages per stream |

#### API Routes (`backend/app/api/v1/`)

| File | Category | What changes |
|------|----------|-------------|
| `auth.py` | KEEP | Auth unchanged |
| `health.py` | KEEP | Health endpoints unchanged |
| `organizations.py` | KEEP | Org management unchanged |
| `projects.py` | REBUILD | → New `streams.py` with phase-aware endpoints (1500+ lines, deeply coupled to old model) |
| `proposals.py` | ADAPT | FK lookups → WasteStream, Phase 4 trigger |
| `companies.py` | ADAPT | Cascade references → WasteStream |
| `project_data.py` | ADAPT | → `waste_stream_data.py` |
| `files.py` | ADAPT | Project → WasteStream references |
| `intake.py` | ADAPT | Project → WasteStream dependency |
| `feedback.py` | KEEP | Organization-scoped |
| `voice_interviews.py` | KEEP | Company/location-scoped |
| `bulk_import.py` | ADAPT | Creates WasteStream instead of Project |
| `workspace.py` | ADAPT | Project dep → WasteStream dep |
| `discovery_sessions.py` | ADAPT | Output → WasteStream creation |
| `admin_proposal_ratings.py` | ADAPT | Join → WasteStream |
| `admin_users.py` | KEEP | Platform admin, independent |
| **`phases.py`** | **NEW** | Phase CRUD + gating + transitions |
| **`communications.py`** | **NEW** | Chat endpoints per stream |

#### Services (`backend/app/services/`)

| File | Category | What changes |
|------|----------|-------------|
| `proposal_service.py` | ADAPT | Project → WasteStream lookups, Phase 4 trigger |
| `project_data_service.py` | ADAPT | → `waste_stream_data_service.py` |
| `workspace_service.py` | ADAPT | Project → WasteStream references |
| `timeline_service.py` | ADAPT | `project_id` → `waste_stream_id` |
| `intake_service.py` | ADAPT | Project → WasteStream |
| `intake_ingestion_service.py` | ADAPT | Project → WasteStream |
| `intake_document_pipeline.py` | ADAPT | Project → WasteStream |
| `intake_field_catalog.py` | KEEP | Static field catalog |
| `bulk_import_service.py` | ADAPT | Creates WasteStream + Phases |
| `bulk_import_ai_extractor.py` | KEEP | Model-agnostic |
| `discovery_session_service.py` | ADAPT | Minor FK updates |
| `s3_service.py` | KEEP | Storage abstraction |
| `storage_delete_service.py` | KEEP | Storage cleanup |
| `cache_service.py` | KEEP | Cache abstraction |
| `email_service.py` | KEEP | Email abstraction |
| `idempotency.py` | KEEP | Hash utility |
| `document_text_extractor.py` | KEEP | Text extraction utility |
| `organization_lifecycle_service.py` | ADAPT | Cascade → WasteStream |
| `admin_user_transfer_service.py` | ADAPT | Reassign → WasteStream |
| `voice_*.py` (4 files) | KEEP | Voice pipeline, model-agnostic |
| **`phase_gating_service.py`** | **NEW** | Sequential phase validation + Phase 4 → proposal trigger |
| **`stream_communication_service.py`** | **NEW** | Chat CRUD per stream |

#### AI Agents (`backend/app/agents/`)

| File | Category | What changes |
|------|----------|-------------|
| `proposal_agent.py` | ADAPT | Trigger from Phase 4, adapt context references |
| `image_analysis_agent.py` | KEEP | Model-agnostic |
| `document_analysis_agent.py` | KEEP | Model-agnostic |
| `notes_analysis_agent.py` | KEEP | Model-agnostic |
| `workspace_insights_agent.py` | KEEP | Model-agnostic |
| `bulk_import_extraction_agent.py` | KEEP | Already outputs WasteStream naming |

#### Core (`backend/app/core/`) — 100% KEEP

All infrastructure files (config, database, auth backend, user manager, startup checks) are model-agnostic. Zero changes needed.

#### Schemas (`backend/app/schemas/`)

| File | Category | What changes |
|------|----------|-------------|
| `common.py` | KEEP | Generic base schemas |
| `user_fastapi.py` | KEEP | Auth schemas |
| `org_user.py` | KEEP | Org provisioning |
| `organization.py` | KEEP | Org CRUD |
| `project.py` | REBUILD | → New `waste_stream.py` schemas |
| `dashboard.py` | REBUILD | → New phase-based dashboard schemas |
| `proposal.py` | ADAPT | `project_id` → `waste_stream_id` |
| `company.py` | KEEP | Unchanged |
| `company_contact.py` | KEEP | Unchanged |
| `location.py` | ADAPT | Project refs → WasteStream |
| `location_contact.py` | KEEP | Unchanged |
| `incoming_material.py` | KEEP | Unchanged |
| `file.py` | ADAPT | `project_id` → `waste_stream_id` |
| `intake.py` | ADAPT | `project_id` → `waste_stream_id` |
| `timeline.py` | ADAPT | `project_id` → `waste_stream_id` |
| `workspace.py` | ADAPT | Minor rename |
| `voice_interview.py` | KEEP | Unchanged |
| `bulk_import.py` | ADAPT | `created_project_id` → `created_waste_stream_id` |
| `discovery_session.py` | KEEP | Session-scoped |
| `feedback.py` | KEEP | Org-scoped |
| `template.py` | ADAPT | May need phase-aware structure |
| `admin_user_transfer.py` | ADAPT | `reassigned_projects_count` rename |
| `proposal_rating.py` | KEEP | Proposal-scoped |
| **`waste_stream_phase.py`** | **NEW** | Phase CRUD schemas |
| **`stream_communication.py`** | **NEW** | Chat message schemas |

### 7.3 Frontend Strategy

**Build from scratch.** The frontend is a complete redesign — routes, layouts, components, stores, and API client all change.

**Reuse from current frontend:**
- `shadcn/ui` components (`components/ui/`) — buttons, inputs, dialogs, tables, etc.
- Tailwind CSS theme configuration
- `lib/api/client.ts` — base HTTP client (axios/fetch wrapper)
- `lib/api/auth.ts` — auth API calls
- Auth pages (`login/`, `register/`, `forgot-password/`) — UI refresh only
- Generic utilities

**Do NOT reuse:**
- Page components (all new routes)
- Feature components (all new data model)
- Zustand stores (all new state shape)
- Feature-specific API clients (new endpoints)

### 7.4 Implementation Sequence

```
Phase 1: Database
  ├── Create waste_stream_phases table
  ├── Create stream_communications table
  ├── Rename projects → waste_streams (migration)
  ├── Migrate project_data JSONB → phase records (data script)
  └── Update FK references across all tables

Phase 2: Backend — New files (3 models + 2 API routes + 2 services)
  ├── models/waste_stream.py (REBUILD from project.py)
  ├── models/waste_stream_phase.py (NEW)
  ├── models/stream_communication.py (NEW)
  ├── api/v1/streams.py (REBUILD from projects.py)
  ├── api/v1/phases.py (NEW)
  ├── api/v1/communications.py (NEW)
  ├── services/phase_gating_service.py (NEW)
  ├── services/stream_communication_service.py (NEW)
  ├── schemas/waste_stream.py (REBUILD)
  ├── schemas/dashboard.py (REBUILD)
  ├── schemas/waste_stream_phase.py (NEW)
  └── schemas/stream_communication.py (NEW)

Phase 3: Backend — Adapt existing (44 files, mechanical renames)
  ├── Global: project_id → waste_stream_id across all FK references
  ├── Global: Project → WasteStream in imports and relationships
  ├── Proposal: add Phase 4 trigger, change FK
  ├── Discovery: output creates WasteStream + 4 phases
  ├── Bulk Import: finalization creates WasteStream
  └── Admin services: cascade through WasteStream

Phase 4: Frontend — New app from scratch
  ├── Auth pages (UI refresh of existing)
  ├── Agent layout + sidebar + routes
  ├── Admin layout + sidebar + routes
  ├── Stream management views
  ├── 4-Phase workspace
  ├── Discovery wizard
  ├── Admin oversight views
  ├── Proposals pipeline
  ├── Team management
  ├── Client portfolio
  └── All modals
```

---

## 8. Sprint Plan

| Sprint | Focus | Key Deliverables |
|--------|-------|-------------------|
| 1 | Database + Backend core | DB migration (rename + new tables), `WasteStream` model, `WasteStreamPhase` model, `StreamCommunication` model, `/streams` CRUD, phase gating service |
| 2 | Backend adaptation + Frontend shell | Adapt 44 backend files (mechanical renames), Agent/Admin layouts, routing, sidebar nav, auth UI refresh |
| 3 | Stream Management | All Streams table, Drafts inline view, Follow-ups view, stream-store, stream-table component |
| 4 | 4-Phase Workspace | Phase stepper, Phase 1-4 forms, phase-store, save/complete flow, admin wide header |
| 5 | Discovery Wizard | Adapt existing discovery → create WasteStream draft, AI confirmation, completion summary |
| 6 | Admin Oversight | Admin dashboard KPIs, heat map, follow-up control, communication sidebar, request-update modal |
| 7 | Proposals | Pipeline view, proposal detail (tabs), AI generation from Phase 4, archive, status management |
| 8 | Team + Clients | Team management, agent profiles, floating chat, client portfolio, client profile, modals |
| 9 | Modals + Polish | All communication modals (email, call, activity, upload, paste, voice), error states, mobile responsive |

**Note:** Sprint plan is tentative and subject to timeline review.
