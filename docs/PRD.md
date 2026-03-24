# Second Stream — Product Requirements Document (PRD)

> **Version:** 3.1 — Complete Redesign Specification  
> **Date:** March 23, 2026  
> **Status:** Draft for Review  
> **Source of Truth:** Stitch Project `Remix of Second Stream` (42 screens)  
> **Companion Docs:** [FLOW.md](./FLOW.md) · [SDD.md](./SDD.md) · [Design.md](./Design.md)  
> **Note:** This is a ground-up redesign. Current codebase is not taken into account — implementation starts fresh from these specs.

---

## 1. Vision & Strategy

**Product Name:** Second Stream  
**Core Mission:** Transform unstructured industrial waste discovery into structured, AI-powered commercial proposals. Field agents collect waste stream data through a 4-phase qualification process; the AI generates buyer-ready proposals; admins oversee team performance and pipeline health.

### Value Proposition

- **Discovery:** Multi-modal intake (files, voice, text paste) via a unified Discovery Wizard
- **Qualification:** 4-phase structured assessment captures complete material profiles
- **Oversight:** Admin monitoring with sidebar communications and follow-up control
- **Output:** AI-generated proposals with ESG alignment, economic analysis, and closing probability

### Business Model

B2B multi-tenant SaaS platform for waste logistics organizations.

- **Platform level:** Second Stream team (superadmins / developers) owns and operates the platform.
- **Organization level (tenant):** Each Organization is a paying client that rents the platform. An organization has its own admins (org_admin) and field agents managing a portfolio of client companies with waste streams.
- **Data isolation:** All data is scoped to the organization. Org admins cannot see other tenants' data. Superadmins can access all tenants for support purposes.

---

## 2. User Roles & Personas

### 2.1 Superadmin — Platform Team (Second Stream developers/owners)

- **Role Code:** `superadmin`
- **Scope:** Cross-tenant. Can access all organizations for support, billing, and platform management.
- **Not modeled in Stitch:** This role uses a separate internal admin panel, not the main product UI.

### 2.2 Field Agent — "Alex Fischer"

- **Role Code:** `field_agent`
- **Goal:** Discover waste streams at client sites, qualify them through 4 phases, generate proposals
- **Primary Workflow:** Dashboard → Discovery Wizard (or manual creation) → Phase 1-4 Assessment → Proposal Generation
- **Key Screens:** Agent Dashboard, Waste Stream Management, Stream Detail (Phases 1-4), Client Portfolio, Proposals Pipeline
- **Pain Points Solved:** Replaces spreadsheets/emails with structured intake; AI flags missing info; auto-generates proposals

### 2.3 Administrator — "Steve"

- **Role Code:** `org_admin`
- **Scope:** Within their own Organization (tenant) only.
- **Goal:** Team oversight, pipeline health monitoring, regional logistics
- **Primary Workflow:** Admin Dashboard → Oversight Views → Stream Review → Team Management
- **Key Screens:** Admin Dashboard, Regional Heat Map, Admin Stream Detail (with sidebar comms), Team Management, Agent Profiles
- **Pain Points Solved:** Visibility into agent activity; unblock stale deals via chat; regional tonnage intelligence; team workload balancing

### 2.4 Additional Roles (Backend-Ready, UI Not Yet Designed)

- `contractor` — External partner with limited project access
- `compliance` — Regulatory review role
- `sales` — Commercial/closing role

---

## 3. Domain Model

### 3.1 Core Entities

```
Organization (tenant root)
  ├── User (agents, admins)
  ├── Company (client organizations — e.g., Honda, Toyota)
  │     ├── Location (physical sites — plants, warehouses)
  │     │     ├── WasteStream (individual waste material assessments)
  │     │     │     ├── Phase[1-4] (structured qualification phases)
  │     │     │     ├── Proposal (AI-generated commercial documents)
  │     │     │     ├── StreamFile (SDS, COA, lab reports)
  │     │     │     └── TimelineEvent (activity log)
  │     │     └── LocationContact
  │     └── CompanyContact
  └── DiscoverySession (wizard intake sessions)
```

### 3.2 Waste Stream Lifecycle States

There are two creation paths:
- **AI Discovery:** Discovery Wizard → AI extraction → agent confirms → starts as `draft` (needs agent review before assessment)
- **Manual Creation:** Agent creates stream directly → starts as `active` (skips draft)

```
[AI Discovery] → draft → active → action_required → proposal_generated → closed_won | closed_lost
[Manual Create] ──────→ active → action_required → proposal_generated → closed_won | closed_lost
```

| Status | Description | Visible To |
|--------|-------------|------------|
| `draft` | Created from AI Discovery Wizard, agent has not yet reviewed/confirmed all extracted data | Agent |
| `active` | Agent is working Phase 1-4 (or was created manually) | Agent, Admin |
| `action_required` | System flagged missing info or stale (>14 days) | Agent, Admin |
| `proposal_generated` | All 4 phases complete, AI proposal created | Both |
| `closed_won` | Deal won | Both |
| `closed_lost` | Deal lost | Both |

**Note:** There is no admin approval gate. The field agent drives the stream from creation all the way through to proposal generation. The admin's role is oversight and support (reviewing data, requesting updates, reassigning agents), not blocking the pipeline.

### 3.3 4-Phase Qualification Lifecycle

Each waste stream has exactly 4 phases:

| Phase | Canonical Name | Purpose | Gate |
|-------|---------------|---------|------|
| 1 | Operational Screening | Basic material identification, volume, logistics | Logistics viability confirmed |
| 2 | Commercial & Economic | Financial baseline, disposal costs, regulatory class | Economic threshold met |
| 3 | Technical & Compliance | Documents (SDS/COA), chemical composition, properties | Valid docs uploaded & verified |
| 4 | Value Discovery | Strategic insights, ESG alignment, AI proposal trigger | All fields complete → proposal generated |

Phase states: `not_started` → `in_progress` → `complete` (or `blocked`)

**Gating rule:** Phase N+1 cannot start until Phase N is `complete`. Exception: Admin can override.

---

## 4. Stitch Screen Inventory

### 4.1 Field Agent Screens (17)

| # | Screen ID | Title | Type |
|---|-----------|-------|------|
| 1 | `726a3229` | Agent Dashboard | Page |
| 2 | `89b6a3a8` | Waste Stream Management: All Streams | Page |
| 3 | `5542d25c` | Waste Streams: Drafts (Inline Edit) | Page |
| 4 | `cc7565f6` | Waste Streams: Urgent Follow-ups | Page |
| 5 | `e5a85c0f` | Client Portfolio: Multi-Location View | Page |
| 6 | `e72313c4` | Client Profile: Waste Streams | Page |
| 7 | `22d43d4d` | Stream Info: Phase 1 | Page |
| 8 | `ef28e245` | Stream Info: Phase 2 | Page |
| 9 | `29f5b758` | Stream Info: Phase 3 | Page |
| 10 | `f8430012` | Stream Info: Phase 4 | Page |
| 11 | `6c3eaf5f` | Proposals Management: Pipeline Summary | Page |
| 12 | `759c0a12` | Proposal Summary (Material/Economic) | Page |
| 13 | `e16ad8a4` | Proposal Summary: Proposal Uploaded | Page |
| 14 | `c70e22c3` | Historical Proposals Archive | Page |
| 15 | `a725c260` | Discovery Wizard Modal | Modal |
| 16 | `72509381` | AI Confirmation Modal | Modal |
| 17 | `27967af7` | Add New Client Modal | Modal |

### 4.2 Admin Screens (16)

| # | Screen ID | Title | Type |
|---|-----------|-------|------|
| 1 | `104573f2` | Admin Dashboard: Steve | Page |
| 2 | `2010d44e` | Team Management | Page |
| 3 | `d0670221` | Admin: Agent Profile (Alex Fischer) | Page |
| 4 | `e6086327` | Admin: Agent Profile with Floating Chat | Page |
| 5 | `35247473` | Admin Waste Stream Detail: Phase 1 Oversight | Page |
| 6 | `4a13355e` | Admin Waste Stream Detail: Phase 2 Oversight | Page |
| 7 | `65f3187a` | Admin Waste Stream Detail: Phase 3 (Wide Header) | Page |
| 8 | `d421201d` | Admin Waste Stream Detail: Phase 4 Oversight | Page |
| 9 | `ac716a16` | Admin Oversight: Follow-up & Status Control | Page |
| 10 | `8c7c31db` | Admin Oversight: Regional Heat Map | Page |
| 11 | `6a38fbe3` | New Stream Request Modal (Admin) | Modal |
| 12 | `22b0cdd2` | Add New Team Member Modal | Modal |
| 13 | `a8301fac` | Edit Agent Profile Modal | Modal |
| 14 | `67d95776` | Assign New Agent Modal | Modal |
| 15 | `4c181901` | Request Update Modal (Chat View) | Modal |
| 16 | `759c0a12` | Proposal Summary: Admin Communication History | Page |

### 4.3 Shared Modals (9)

| # | Screen ID | Title |
|---|-----------|-------|
| 1 | `9c7a9100` | Edit Client Profile |
| 2 | `a0c1d390` | Complete Discovery Confirmation |
| 3 | `bb42ab3a` | Send Email Modal |
| 4 | `47b06a63` | Call Client Modal |
| 5 | `2d6cc59b` | Log Activity Modal |
| 6 | `0a3b71ce` | Upload Documents Modal |
| 7 | `706ac0f4` | Quick Paste Modal |
| 8 | `00615def` | Record Voice Memo Modal |
| 9 | `72509381` | Confirmation Modal (generic) |

---

## 5. Functional Specifications

### 5.1 Authentication & Onboarding

**STATUS: Already implemented in current codebase. UI refresh only — no Stitch redesign needed for auth screens.**

| Feature | Requirement |
|---------|-------------|
| Login | Email + password (JWT, 24h tokens) — existing |
| Registration | Admin invitation flow (no self-signup) — existing |
| Forgot Password | Email reset link — existing |
| Onboarding | First-time setup wizard (org + first agent) — TBD |

### 5.2 Agent Dashboard

**Stitch Screen:** "Simplified Agent Dashboard Summary"

| Component | Data | Behavior |
|-----------|------|----------|
| Welcome header | Agent name, date | Static |
| KPI cards | Active Streams, Pending Reviews, Proposals This Month, Revenue Pipeline | Real-time counts from API |
| Recent Activity | Last 5 timeline events across all streams | Click → stream detail |
| My Streams table | Top 10 streams sorted by urgency | Tabs: Active / Action Required / Drafts |
| Quick Actions | Discovery Wizard, Add Client, View All Streams | Modal or navigation triggers |

### 5.3 Discovery Wizard

**Stitch Screens:** "Unified Discovery Wizard Modal" + "Refined AI Confirmation Modal" + "Complete Discovery Confirmation"

**Step 1 — Input Modal:**

- File drag-and-drop (SDS, COA, lab reports, invoices)
- Text paste area
- Voice recording (transcription via backend)
- Must select a Company and optionally a Location before starting
- Supports multiple sources in one session

**Step 2 — AI Processing:**

- Backend creates `DiscoverySession` + `DiscoverySource` records
- AI extracts entities: material name, volume, location, chemical components, disposal method
- Returns structured candidates for review

**Step 3 — Confirmation Modal:**

- Table: `[Field | Extracted Value | Accept/Edit/Reject]`
- Agent reviews each extracted field
- "Confirm" creates WasteStream in `draft` status with Phase 1 pre-filled from AI extraction
- Agent must review draft before it becomes `active`

**Step 4 — Completion:**

- Summary metrics: streams found, locations identified, sources analyzed
- CTA: "Go to Drafts" or "Start Assessment"

#### Manual Creation (Alternative Path)

The agent can also create a waste stream manually (without AI Discovery):
- Opens "Add Stream" or "New Stream Request" modal
- Fills in basic info (material name, client, location)
- Stream is created directly as `active` (skips `draft` status)
- Agent proceeds to Phase 1 immediately

### 5.4 Waste Stream Management

**Stitch Screens:** "Waste Stream Management: All Streams Selected", "Waste Streams: Drafts", "Waste Streams: Refined Urgent Follow-ups"

#### 5.4.1 All Streams View

- Filterable table with columns: Stream Name, Client, Location, Phase, Status, Agent, Last Updated
- Tab filters: All Active | Action Required | Drafts
- Bulk actions: Assign agent, change status
- Search and sort

#### 5.4.2 Drafts View

- Simplified inline editing — form fields inside table rows
- Quick edit: material name, volume, location without opening full workspace
- Actions: Open full workspace, Delete draft, Convert to active

#### 5.4.3 Urgent Follow-ups View

- Streams flagged as stale (>14 days no activity) or missing critical data
- AI-flagged missing fields highlighted
- Priority sorting: most stale first
- Quick action: Open stream, Mark as addressed

### 5.5 Stream Detail — 4-Phase Workspace

**Stitch Screens:** "Stream Info: Phase 1-4" (agent view), "Admin Waste Stream Detail: Phase 1-4 Oversight" (admin view)

**Layout:**

- Header: Stream name, client, location, status badge, assigned agent
- Phase stepper/tabs: Phase 1 | Phase 2 | Phase 3 | Phase 4
- Sidebar (admin only): Communication thread
- Right panel: Document list, Quick Actions (Email, Call, Log Activity)

#### Phase Fields — Representative Only

> **Important:** The specific fields shown in the Stitch screens are **representative placeholders** used to demonstrate the UI/UX layout and interaction patterns. The final field definitions for each phase are **not yet defined** and will be specified in a separate phase-fields document before implementation. Some fields from the Stitch mockups may be reused, others will change.

The Stitch screens demonstrate the following **types** of fields per phase:

- **Phase 1 — Operational Screening:** Text inputs, tag selectors, dropdowns, location fields. Represents basic material identification and logistics data.
- **Phase 2 — Commercial & Economic:** Dropdowns, currency inputs, toggles. Represents financial baseline and regulatory classification.
- **Phase 3 — Technical & Compliance:** File uploads (SDS/COA), repeater rows (chemical composition), numeric inputs. Represents document collection and technical specifications.
- **Phase 4 — Value Discovery:** Textareas, multi-selects. Represents strategic insights and ESG alignment data.

#### Phase 4 — AI Output (generated after completion)

After all 4 phases are complete, the AI generates:
- Executive Summary narrative
- Strategic ESG Alignment section
- Recommended Action Path (Immediate / Next 24h / Strategic)
- Closing Probability Index (0-100%)

#### Agent vs Admin View Differences

| Feature | Agent | Admin |
|---------|-------|-------|
| Edit fields | Own streams only | All streams (override) |
| Phase navigation | Sequential (gated) | Any phase (non-gated) |
| Communication sidebar | Not visible | Visible — chat thread with agent |
| Header | Standard | Wide header with audit info |
| Save actions | Back / Continue | Save Draft / Complete Phase / Request Update |
| Compliance flags | View only | Can mark as verified |
| Pipeline control | Agent drives stream all the way to proposal | Admin monitors and supports, does NOT approve/block |

### 5.6 Client Portfolio

**Stitch Screens:** "Client Portfolio: Multi-Location View", "Client Profile: Waste Streams"

**Portfolio View:**

- Card grid of client companies
- Each card: Company name, industry, location count, stream count, total revenue pipeline
- Filter by sector, status, search
- CTA: Add New Client

**Client Profile View:**

- Company header: Name, industry, sector, contacts
- Locations list with stream counts per location
- Waste streams table for selected location
- Stream frequency and volume summary
- Edit client profile (modal)

### 5.7 Proposals Pipeline

**Stitch Screens:** "Proposals Management: Pipeline Summary", "Proposal Summary", "Proposal Summary: Proposal Uploaded", "Historical Proposals Archive"

**Pipeline View:**

- Summary cards: Total Active, Under Review, Won This Quarter, Revenue Pipeline
- Proposals table: Stream name, client, status, value, created date, agent
- Status workflow: Draft → Under Review → Uploaded → Sent → Negotiation → Won/Lost

**Proposal Detail View:**

- Tabs: Material Info / Economic Analysis / AI Strategic Insights
- Sidebar: Admin communication history
- Actions: Upload PDF, Send to Client (email modal), Mark Won/Lost
- AI-generated content: Executive summary, ESG alignment, recommended actions, closing probability

**Historical Archive:**

- Searchable archive of all past proposals
- Filter by: date range, status (won/lost), client, agent
- Export capability

### 5.8 Admin Dashboard

**Stitch Screen:** "Admin Dashboard: Steve (Fully Synchronized v2)"

| Component | Data |
|-----------|------|
| Team summary | Total agents, active this week, streams per agent avg |
| Pipeline KPIs | Total active streams, proposals generated, win rate |
| Regional overview | Mini heat map or top regions |
| Agent performance table | Agent name, assigned streams, completion rate, avg phase duration |
| Alerts | Stale streams, blocked agents, pending reviews |

### 5.9 Admin Oversight Views

**Stitch Screens:** "Admin Oversight: Follow-up & Status Control", "Admin Oversight: Regional Heat Map"

**Follow-up & Status Control:**

- Pending update requests sent to agents
- SLA tracking (time since request)
- Resolution status
- Quick actions: Resend, Reassign, Escalate

**Regional Heat Map:**

- Geographic map showing stream density and tonnage
- Filter by: material type, status, agent
- Click region → drill down to streams in that area

### 5.10 Team Management

**Stitch Screens:** "Team Management", "Admin: Agent Profile", "Agent Profile with Floating Chat", "Add New Member Modal", "Edit Agent Profile Modal"

**Team View:**

- Agent cards/table: Name, role, assigned streams, completion rate, last active
- Actions: View Profile, Edit, Add New Member

**Agent Profile:**

- Header: Avatar, name, role, contact info
- Performance metrics: Streams completed, avg phase duration, win rate
- Assigned streams table
- Floating chat panel (admin → agent direct messaging)
- Edit profile modal

### 5.11 Communication Modals

**Stitch Screens:** Send Email, Call Client, Log Activity, Upload Documents, Quick Paste, Record Voice Memo

| Modal | Purpose | Fields |
|-------|---------|--------|
| Send Email | Email client/contact from stream context | To, Subject, Body, Attachments |
| Call Client | Log a phone call | Contact, Duration, Notes, Outcome |
| Log Activity | Generic activity logger | Type (meeting/call/note), Description, Date |
| Upload Documents | Add files to stream | File drop zone, Document type selector |
| Quick Paste | Paste unstructured text for AI processing | Text area, AI extraction |
| Record Voice Memo | Audio recording with transcription | Record/Stop, Playback, Transcription preview |

---

## 6. RBAC Matrix

| Feature | Field Agent | Org Admin | Superadmin (Platform) |
|---------|-------------|-----------|----------------------|
| View own dashboard | Yes | Yes (admin version) | Internal panel |
| Create streams (Discovery / Manual) | Yes | Yes (New Stream Request) | N/A |
| Edit stream phases | Own streams | All org streams (override) | N/A |
| View all streams | Own streams only | All org streams | All tenants |
| Complete phases → generate proposal | Yes (self-service, no approval needed) | Can also trigger | N/A |
| Request updates (chat) | No | Yes | N/A |
| View heat map | No | Yes | N/A |
| Team management | No | Yes | N/A |
| Reassign agents | No | Yes | N/A |
| View proposals | Own streams | All org proposals | N/A |
| Client portfolio | Own clients | All org clients | N/A |
| Add/edit clients | Yes | Yes | N/A |
| Reports/Analytics | Basic (own metrics) | Full (org-wide) | Platform-wide |
| Manage organizations | No | No | Yes |
| Manage billing/plans | No | No | Yes |

---

## 7. Gap Analysis — Stitch vs. Implementation

### 7.1 Missing Screens (Need Design in Stitch)

| Priority | Screen | Impact | Notes |
|----------|--------|--------|-------|
| P0 | Error states (404, 500, permission denied) | UX completeness | Not in Stitch |
| P1 | Notification Center | Bell icon exists in Stitch but no screen | Needs design |
| P1 | Reports / Analytics page | Nav item exists but no screen | Needs design |
| P1 | Settings / Profile page | User needs to manage their own profile | Needs design |
| P1 | Loading states for all screens | UX polish | Not in Stitch |
| P1 | Empty states for all lists | First-use experience | Not in Stitch |
| P2 | Mobile responsive layouts | Agent nav mentions bottom bar | Not in Stitch |
| P2 | Negotiation / Contracting screens | Referenced in proposal statuses | Not in Stitch |
| P2 | Admin "All Clients" list | Nav item exists, no screen | Not in Stitch |

**Note:** Login / Auth screens already exist in the current codebase and will only receive a UI refresh, not a redesign.

### 7.2 Naming Inconsistencies to Resolve in Stitch

| Issue | Resolution |
|-------|------------|
| "Second Stream" vs "Kinetic Stream" in some screens | Always "Second Stream" |
| Footer year inconsistency | Always "2025 Second Stream" |
| Phase 4: "Value Discovery" vs "Deep Diagnostic" | Standardize to one canonical name |
| Phase names differ between agent/admin steppers | Standardize to canonical names across all views |
| Agent Phase labels vs Admin Phase labels | Use same field labels everywhere |

### 7.3 Architecture Targets (Ground-Up Redesign)

Since this is a complete redesign, the target architecture is:

| Area | Target |
|------|--------|
| Domain entity | `WasteStream` model |
| Phase structure | Explicit `WasteStreamPhase` table with JSONB field data |
| Frontend routes | `/streams/[id]` |
| API routes | `/api/v1/streams/` |
| Stores | `stream-store` |
| Role-based layouts | Separate agent/admin layouts with role-conditional routing |
| Admin nav | Full admin dashboard + oversight + team management |
| Multi-tenancy | Organization-scoped with superadmin cross-tenant access |

---

## 8. Success Metrics

| Metric | Measurement |
|--------|-------------|
| Intake Velocity | Time: Discovery Wizard open → Draft created |
| Draft Resolution | Time: Draft → Active (agent starts assessment) |
| Phase Completion Rate | % of streams completing all 4 phases |
| Admin Response Time | Time: Admin request update → Agent addresses it |
| Proposal Win Rate | Won proposals / Total proposals |
| Stale Stream Recovery | % of action_required streams returning to active within 7 days |

---

## 9. Technical Constraints & Decisions

### 9.1 Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Domain naming | WasteStream | Match industry language and Stitch designs |
| Phase storage | Hybrid (explicit table + JSONB) | Queryable phases + flexible field data + custom fields |
| Multi-tenancy | Organization = tenant (paying client); Superadmin = platform team | Clean separation of platform vs tenant |
| Auth | FastAPI Users + JWT | Existing, proven — keep and refresh UI only |
| AI proposals | pydantic-ai agent | Triggered after Phase 4 completion |
| Frontend framework | Next.js + shadcn/ui + Tailwind v4 | Stack decision |
| Backend framework | FastAPI + PostgreSQL + SQLAlchemy | Stack decision |
| State management | Zustand | Client-side state |
| Agent pipeline autonomy | No admin approval gate | Field agent drives stream to proposal without admin sign-off |
| Phase fields | Not yet defined | Stitch shows placeholder fields for UI/UX demonstration only |

### 9.2 Implementation Strategy (Decided)

| Layer | Strategy | Detail |
|-------|----------|--------|
| **Frontend** | **Build from scratch** | Complete redesign — new routes, layouts, components, stores. Reuse only: shadcn/ui base components, Tailwind theme, auth pages (UI refresh), generic utils. |
| **Backend** | **Adapt existing codebase** | 46% of files unchanged, 42% need mechanical renames (`project_id` → `waste_stream_id`), only 3% needs full rebuild. All AI agents, auth, storage, and infrastructure carry over. |
| **Database** | **Migration** | Create new tables (`waste_stream_phases`, `stream_communications`), rename `projects` → `waste_streams`, migrate JSONB data into phase records. |

**Why not rebuild backend from scratch?** 88% of backend code is reusable. The AI agents (proposal, document analysis, image analysis, notes analysis, bulk import extraction), auth system, S3 storage, email service, voice transcription, and all core infrastructure work identically in the new model. Only 3 files out of ~100 need a full rewrite.

**Why rebuild frontend from scratch?** Every route, layout, component, store, and API client changes. The current frontend has no role-based layouts, no phase workspace, no admin oversight views. Adapting would be slower than building fresh.

See SDD.md Section 7 for the complete file-by-file reuse inventory.

---

## 10. Open Decisions & Pending Items

Items that must be resolved before or during implementation. Grouped by priority.

### 10.1 Must Resolve Before Implementation (Blocking)

#### Phase Field Definitions

The specific fields for each of the 4 phases are not yet defined. The Stitch screens show placeholder fields to demonstrate layout and interaction patterns, but the actual data captured per phase needs to be specified.

**What's needed:**
- For each phase (1-4): exact list of fields, their data types, required/optional, validation rules
- Which fields come from AI extraction (pre-filled from Discovery Wizard)
- Which fields support dropdown options vs free text
- Whether the same fields apply to all industries/sectors or if they vary

**Depends on:** Domain expert input (what data do waste logistics companies actually need to qualify a stream?)

#### Stitch Screen Redesign Execution

The current Stitch project has the right screens but needs a redesign pass. Several screens need to be updated or created:

**Screens to update:**
- Fix branding inconsistencies (always "Second Stream", footer "2025")
- Standardize phase names across all agent and admin views
- Unify field labels between agent and admin
- Merge duplicate Proposal Summary screens (currently 2 screens for 1 view)
- Merge duplicate Agent Profile screens (profile + floating chat = 1 screen with toggleable panel)

**Screens to create:**
- Error states (404, 500, permission denied)
- Loading states for all screens
- Empty states for all lists (first-use experience)
- Manual stream creation modal (agent creates without Discovery Wizard)

### 10.2 Should Resolve During Implementation (Important)

#### Notification System

How users get notified about events. Currently undecided.

**Open questions:**
- What triggers a notification? (admin request update, stream assigned, phase completed, stream stale, proposal generated, etc.)
- Delivery channels: in-app only? Email too? Push notifications?
- Is there a Notification Center screen? (bell icon exists in Stitch nav but no screen designed)
- Do notifications have read/unread state?
- Real-time delivery (websockets) or polling?

#### Reports & Analytics

Both agent and admin navs reference Reports/Analytics but no screen is designed.

**Open questions:**
- What metrics does the agent see? (their own performance, their streams, their win rate?)
- What metrics does the admin see? (org-wide, per-agent comparison, trends over time?)
- Are reports exportable (CSV, PDF)?
- Is there a date range filter?
- Are there charts/graphs or just tables?

#### Chat / Communication Real-Time Behavior

The admin↔agent communication sidebar is designed but the technical behavior is undecided.

**Open questions:**
- Is the chat real-time (websockets) or does it refresh on page load / manual refresh?
- Are there typing indicators, read receipts?
- Can the agent reply from the stream detail, or only from a notification?
- Can attachments be sent in chat messages?
- Is there a standalone chat/messaging view, or only within stream context?

### 10.3 Can Resolve Later (Nice to Have)

#### Mobile Responsive Design

The Stitch design system mentions a mobile bottom navigation bar (Dash / Streams / + / Reports), but no mobile-specific screens are designed.

**Open questions:**
- Is mobile a priority for MVP?
- Do agents use the app in the field on phones, or mostly on laptops/tablets?
- Which screens need mobile optimization first?

#### Onboarding Flow

No first-time user experience is designed.

**Open questions:**
- What happens when an org admin first signs up? Setup wizard?
- What happens when a field agent gets their invitation and logs in for the first time?
- Is there a guided tour / tooltips / getting started checklist?

#### Superadmin Panel

The platform team (Second Stream developers) needs to manage tenants, but this is a separate internal tool.

**Open questions:**
- Is this a separate app or a section within the same app?
- What can superadmins do? (create orgs, manage billing, impersonate users, view metrics?)
- Priority relative to the main product?

#### Negotiation & Contracting Screens

The proposal status dropdown references "Negotiation" but no screens exist for this state.

**Open questions:**
- Is there a distinct negotiation phase after proposal is sent?
- Does the agent track negotiation back-and-forth in the app or outside?
- Is there a contracting/signature flow?

#### Custom Fields Per Phase

The architecture supports custom fields (user-defined additional fields per phase), but the UX for managing them is not designed.

**Open questions:**
- Who creates custom fields? Org admin only, or field agents too?
- Are custom fields defined at the org level (all streams get them) or per-stream?
- What field types are supported? (text, number, select, date, toggle, file?)
- Is there a "custom field builder" UI, or are they configured via settings?

---

## 11. Document Status Tracker

| Document | Version | Status | Covers |
|----------|---------|--------|--------|
| PRD.md | 3.2 | Draft | Product requirements, RBAC, gap analysis, open decisions, implementation strategy |
| SDD.md | 3.2 | Draft | Technical architecture, DB schema, API routes, components, backend reuse inventory, sprint plan |
| FLOW.md | 3.2 | Complete | User journeys, lifecycle, navigation map (non-technical audience) |
| Design.md | 1.0 | Complete | Design system tokens, color, typography, component rules |
| UI-SPEC.md | 1.0 | Complete | UI implementation blueprint — every page, modal, component spec with Stitch screen references |
| Phase Fields | — | **Not started** | Field definitions per phase (blocking for implementation) |
| Notification Spec | — | **Not started** | Notification triggers, channels, UX |
| Analytics Spec | — | **Not started** | Metrics, charts, export |
