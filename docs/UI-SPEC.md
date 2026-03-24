# Second Stream — UI Implementation Spec

> **Version:** 1.0  
> **Date:** March 24, 2026  
> **Purpose:** Exact blueprint for building every screen, component, and interaction. An implementor who has never seen the Stitch designs should be able to build the entire UI from this document alone.  
> **Stitch Project:** `Remix of Second Stream` (ID: `17670679837540360144`)  
> **Companion Docs:** [PRD.md](./PRD.md) · [SDD.md](./SDD.md) · [FLOW.md](./FLOW.md) · [Design.md](./Design.md)

---

## 1. Foundation: Theme & Design System

> **All color tokens, typography, elevation rules, and component styling rules are defined in [Design.md](./Design.md).** Read that document first. This section only covers how to apply those rules to the shadcn/ui setup.

### 1.1 shadcn Configuration

```
Base:       shadcn new-york style (keep existing)
Icons:      lucide-react (keep existing)
Fonts:      Manrope (headings) + Inter (body/labels) — see Design.md §3
Roundness:  0.25rem (4px) default — see Design.md §5
```

### 1.2 How to Apply Design.md to shadcn

The existing shadcn theme uses neutral colors. Replace them with the Stitch design system tokens from Design.md:

1. **Colors:** Map Design.md's named colors (primary, surface tiers, on-surface, etc.) to CSS custom properties in `globals.css`, replacing shadcn's default neutral palette.
2. **Typography:** Import Manrope + Inter via Google Fonts. Override shadcn's default font-family.
3. **Borders:** Remove default shadcn borders on cards, tables, and sections. Apply the No-Line Rule (Design.md §2).
4. **Modals/Popovers:** Apply glassmorphism (Design.md §2 — Glass & Gradient Rule).
5. **Buttons:** Primary = gradient fill, Secondary = surface background, Tertiary = ghost (Design.md §5).
6. **Tables:** No row dividers, alternate row colors, uppercase headers (Design.md §5 — Fluid Grid).
7. **Status chips:** round-full shape (Design.md §5).

---

## 2. Global Shell (Layout & Navigation)

The app has 3 layout shells: Auth (no sidebar), Agent, and Admin.

### 2.1 Auth Layout

Simple centered layout for login/register/forgot-password. No sidebar, no top bar.

- Center-aligned card on `--surface` background
- Card uses `--surface-container-lowest` with ambient shadow
- App logo at top
- Used for: `/login`, `/register`, `/forgot-password`

### 2.2 Agent Layout

**Reference:** Stitch screen `726a3229` (Agent Dashboard) — look at the left sidebar and top bar.

```
┌─────────────────────────────────────────────────────────┐
│ Top Bar (fixed, full width)                             │
│ ┌──────────┬──────────────────────────────────────────┐ │
│ │ Logo     │    Search (optional)    │ 🔔 │ Avatar ▾ │ │
│ └──────────┴──────────────────────────────────────────┘ │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ Sidebar    │  Main Content Area                         │
│            │                                            │
│ Dashboard  │  (scrollable, padded)                      │
│ Streams    │                                            │
│ Clients    │                                            │
│ Proposals  │                                            │
│            │                                            │
│            │                                            │
│ ─────────  │                                            │
│ Settings   │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

**Sidebar specs:**
- Width: 240px (collapsed: 64px icon-only)
- Background: `--surface-container-low` with subtle `backdrop-filter: blur(12px)`
- Nav items: Icon + Label, using `--on-surface-variant` default, `--primary` when active
- Active item has a `--surface-container-lowest` background pill
- "Second Stream" logo at top with teal accent
- Collapsible on smaller screens
- Bottom section: Settings link + user info

**Top Bar specs:**
- Height: 56px
- Background: `--surface-container-lowest` (white)
- Right side: notification bell icon, user avatar with dropdown
- No bottom border (No-Line Rule) — use subtle shadow: `box-shadow: 0 1px 3px rgba(11, 29, 43, 0.04)`

**Agent nav items:**
1. Dashboard (home icon)
2. Streams (layers icon) — sub-items: All, Drafts, Follow-ups
3. Clients (building icon)
4. Proposals (file-text icon)

### 2.3 Admin Layout

**Reference:** Stitch screen `104573f2` (Admin Dashboard) — look at the left sidebar.

Same shell structure as Agent, but different nav items:

**Admin nav items:**
1. Dashboard (home icon)
2. Oversight (eye icon) — sub-items: Heat Map, Follow-ups, All Streams
3. Team (users icon)
4. Clients (building icon)
5. Analytics (bar-chart icon)

The sidebar also shows an "Organization" label/badge at the top below the logo to indicate which tenant the admin is managing.

### 2.4 Role Detection & Redirect

On app load:
- Check user role from JWT/session
- `field_agent` → Agent layout
- `org_admin` / `admin` → Admin layout
- `superadmin` → Internal panel (separate, not in scope)
- Unauthenticated → Auth layout (login)

---

## 3. Page Specs — Field Agent Views

### 3.1 Agent Dashboard

**Stitch Screen:** `726a3229` — "Simplified Agent Dashboard Summary"  
**Route:** `/(agent)/dashboard`

**Layout (top to bottom):**

1. **Welcome header**
   - "Good morning, Alex" + date
   - Right side: "Discovery Wizard" primary CTA button (gradient)

2. **KPI Cards row** (4 cards in a horizontal row)
   - Card style: `--surface-container-lowest` background, ambient shadow
   - Each card: icon + metric number (display-lg) + label (label-sm)
   - Cards: Active Streams | Pending Reviews | Proposals This Month | Revenue Pipeline

3. **Recent Activity feed**
   - Timeline-style list of last 5 events
   - Each entry: avatar, action text, timestamp, stream name (clickable)
   - No separating lines — use spacing + subtle background alternation

4. **My Streams table** (condensed)
   - Tabs above table: Active | Action Required | Drafts
   - Table columns: Stream Name, Client, Phase (progress dots), Status (chip), Last Updated
   - Clicking any row → navigate to stream detail
   - "View All Streams" link at bottom

### 3.2 Waste Stream Management

**Route:** `/(agent)/streams`

Three sub-views accessible via tabs or sub-routes:

#### 3.2.1 All Streams

**Stitch Screen:** `89b6a3a8` — "Waste Stream Management: All Streams Selected"  
**Route:** `/(agent)/streams` (default tab)

- **Header:** "Waste Streams" title + "New Stream" button (manual creation) + "Discovery Wizard" button
- **Tabs:** All Active | Action Required | Drafts
- **Search bar** + filter dropdowns (Client, Phase, Status)
- **Data table** (Fluid Grid style — no row dividers):
  - Columns: Checkbox | Stream Name | Client | Location | Phase (1-4 indicator) | Status (chip) | Agent | Last Updated | Actions (⋯ menu)
  - Alternate row colors: `--surface` / `--surface-container-low`
  - Headers: uppercase, `label-sm`, `--secondary` color, `letter-spacing: 0.05em`
  - Hover: row background shifts to `--surface-container`
- **Bulk action bar** (appears when checkboxes selected): Assign Agent, Change Status, Archive

#### 3.2.2 Drafts

**Stitch Screen:** `5542d25c` — "Waste Streams: Drafts (Simplified Inline Edit)"  
**Route:** `/(agent)/streams/drafts`

- Same table structure but rows are **inline-editable**
- Each row shows: material name (editable text), volume (editable number), location (editable dropdown)
- Row actions: "Open Full Workspace" button, delete icon
- Purpose: quickly review and fix AI-generated drafts without navigating to full detail

#### 3.2.3 Urgent Follow-ups

**Stitch Screen:** `cc7565f6` — "Waste Streams: Refined Urgent Follow-ups"  
**Route:** `/(agent)/streams/follow-ups`

- Card-based layout instead of table
- Each card shows: stream name, client, reason for flag (stale / missing info), days since last activity
- Warning styling: `--error-container` background accent
- AI-flagged missing fields listed as chips on each card
- CTA per card: "Open Stream" / "Mark as Addressed"

### 3.3 Stream Detail — 4-Phase Workspace

**Stitch Screens:** `22d43d4d` (Phase 1), `ef28e245` (Phase 2), `29f5b758` (Phase 3), `f8430012` (Phase 4)  
**Route:** `/(agent)/streams/[id]`

This is the core workspace. Layout:

```
┌──────────────────────────────────────────────────────────┐
│ Stream Header                                            │
│ [Stream Name] [Client] [Location] [Status chip] [Agent]  │
├──────────────────────────────────────────────────────────┤
│ Phase Stepper: [1 ✓] [2 ●] [3 ○] [4 ○]                  │
├──────────────────────────────────────┬───────────────────┤
│                                      │                   │
│  Phase Form (scrollable)             │  Right Panel      │
│                                      │                   │
│  - Field groups                      │  Documents list   │
│  - AI suggestions                    │  Quick Actions:   │
│  - Save / Complete buttons           │  📧 Email         │
│                                      │  📞 Call          │
│                                      │  📝 Log Activity  │
│                                      │  📎 Upload        │
│                                      │  📋 Quick Paste   │
│                                      │  🎙️ Voice Memo   │
│                                      │                   │
└──────────────────────────────────────┴───────────────────┘
```

**Stream Header:**
- Full width, `--surface-container-lowest` background
- Stream name (headline-md), client name, location, status chip, assigned agent avatar
- Breadcrumb: Streams > Client Name > Stream Name

**Phase Stepper:**
- Horizontal step indicator
- States: completed (✓ teal), active (● filled), locked (○ gray outline), blocked (⚠ amber)
- Clicking a completed phase navigates back (read-only review)
- Clicking a locked phase shows tooltip: "Complete Phase N first"

**Phase Form area:**
- Background: `--surface` (main page color)
- Form sections grouped by white space (spacing-10) NOT by borders or fieldsets
- Input fields: `--surface-container-highest` background, `--primary` focus ring (ghost border)
- Required field labels have a teal dot indicator
- "Back" and "Continue" / "Complete Phase" buttons at bottom

**Right Panel:**
- Width: 320px, fixed
- Background: `--surface-container-low`
- Top section: uploaded documents list (file name, type, date, status)
- Bottom section: Quick action buttons (icon + label, vertical stack)
- Each quick action opens a modal

### 3.4 Client Portfolio

**Stitch Screen:** `e5a85c0f` — "Client Portfolio: Multi-Location View"  
**Route:** `/(agent)/clients`

- **Header:** "Client Portfolio" title + "Add New Client" button + search bar
- **Card grid** (3 columns on desktop, 2 tablet, 1 mobile):
  - Card: `--surface-container-lowest`, ambient shadow
  - Content: Company name (title-md), industry badge, location count, stream count, total pipeline value ($)
  - Footer: last activity date
  - Click → Client Profile

### 3.5 Client Profile

**Stitch Screen:** `e72313c4` — "Client Profile: Waste Streams"  
**Route:** `/(agent)/clients/[id]`

- **Company header:** Name (headline-md), industry, sector, edit button
- **Contacts section:** Company contacts list (name, role, email, phone)
- **Locations section:** Cards or rows for each location
  - Each location: name, city/state, stream count
  - Click location → filters the streams table below
- **Waste streams table:** Filtered by selected location
  - Same columns as All Streams table
  - Click → Stream Detail

### 3.6 Proposals Pipeline

**Stitch Screen:** `6c3eaf5f` — "Proposals Management: Pipeline Summary"  
**Route:** `/(agent)/proposals`

- **Summary cards row** (4 KPI cards): Total Active | Under Review | Won This Quarter | Revenue Pipeline
- **Proposals table:**
  - Columns: Stream Name | Client | Status (chip) | Value ($) | Created Date | Agent
  - Status chips: Draft, Uploaded, Sent, Negotiation, Won, Lost (each a different color)
  - Click → Proposal Detail

### 3.7 Proposal Detail

**Stitch Screen:** `759c0a12` — "Proposal Summary"  
**Route:** `/(agent)/proposals/[id]`

- **Header:** Stream name, client, proposal version, status chip
- **Tabs:** Material Info | Economic Analysis | AI Strategic Insights
- **Action buttons:** Upload PDF, Send to Client, Mark Won/Lost (status dropdown)
- **Tab content:** Varies — text sections, data tables, AI-generated narrative
- The AI Strategic Insights tab shows: Executive Summary, ESG Alignment, Recommended Action Path, Closing Probability gauge

### 3.8 Historical Proposals Archive

**Stitch Screen:** `c70e22c3` — "Historical Proposals Archive"  
**Route:** `/(agent)/proposals/archive`

- **Search bar** + date range filter + status filter (Won/Lost) + client filter
- **Archive table:** Same columns as pipeline but with outcome column and date closed

---

## 4. Page Specs — Admin Views

### 4.1 Admin Dashboard

**Stitch Screen:** `104573f2` — "Admin Dashboard: Steve"  
**Route:** `/(admin)/dashboard`

**Layout (top to bottom):**

1. **Welcome header** — "Welcome back, Steve" + org name
2. **KPI Cards row:** Total Agents | Active Streams | Proposals Generated | Win Rate
3. **Agent Performance table:**
   - Columns: Agent (avatar + name) | Assigned Streams | Completion Rate | Avg Phase Duration | Status
   - Click → Agent Profile
4. **Alerts panel** (right side or below): Stale streams, pending follow-ups, agents needing attention

### 4.2 Admin Oversight: Heat Map

**Stitch Screen:** `8c7c31db` — "Admin Oversight: Regional Heat Map"  
**Route:** `/(admin)/oversight/heat-map`

- Geographic map (full width) showing circles/markers by region
- Circle size = tonnage, color = density of streams
- Filters: Material type, status, agent
- Click region → drawer or panel with stream list for that area

### 4.3 Admin Oversight: Follow-up Control

**Stitch Screen:** `ac716a16` — "Admin Oversight: Follow-up & Status Control"  
**Route:** `/(admin)/oversight/follow-ups`

- Table of pending admin requests to agents
- Columns: Stream | Agent | Request Message | Sent Date | SLA (days elapsed) | Status (Pending/Resolved)
- SLA indicator: green (<3 days), amber (3-7 days), red (>7 days)
- Actions: Resend, Reassign, View Stream

### 4.4 Admin Stream Detail

**Stitch Screens:** `35247473` (Phase 1), `4a13355e` (Phase 2), `65f3187a` (Phase 3), `d421201d` (Phase 4)  
**Route:** `/(admin)/streams/[id]`

Same as Agent Stream Detail (Section 3.3) but with these additions:

```
┌──────────────────────────────────────────────────────────┐
│ WIDE HEADER (admin-only, extra audit info)               │
│ [Stream] [Client] [Agent avatar+name] [Status] [Audit]  │
│ Created: date | Last activity: date | Phase duration     │
├──────────────────────────────────────────────────────────┤
│ Phase Stepper: [1 ✓] [2 ✓] [3 ●] [4 ○]  (non-gated)   │
├──────────────────────────────┬──────────┬────────────────┤
│                              │          │                │
│  Phase Form                  │  Right   │  Chat Sidebar  │
│  (all fields editable)       │  Panel   │                │
│                              │          │  [Message 1]   │
│                              │          │  [Message 2]   │
│                              │          │  [...]         │
│                              │          │                │
│  Admin actions:              │          │  [Type here]   │
│  Request Update / Reassign   │          │  [Send]        │
│                              │          │                │
└──────────────────────────────┴──────────┴────────────────┘
```

**Wide Header differences:**
- Shows audit info: created date, last activity, phase durations
- Assigned agent with avatar (clickable → agent profile)
- Admin action buttons: "Request Update", "Reassign Agent"

**Phase Stepper:**
- NON-gated — admin can jump to any phase regardless of completion
- Shows all phase statuses at a glance

**Chat Sidebar:**
- Width: 320px, right-most panel
- Background: `--surface-container-low`
- Glassmorphism effect on top portion
- Message thread: bubbles (admin = right-aligned teal, agent = left-aligned gray)
- Input at bottom: text field + send button
- Message types: regular message, update request (highlighted), status change (system message)

### 4.5 Team Management

**Stitch Screen:** `2010d44e` — "Team Management"  
**Route:** `/(admin)/team`

- **Header:** "Team" title + "Add Team Member" button
- **Agent cards grid** (or table):
  - Avatar, name, role, assigned streams count, completion rate, last active
  - Status indicator: green (active today), amber (inactive 3+ days), gray (offline)
  - Click → Agent Profile

### 4.6 Agent Profile

**Stitch Screens:** `d0670221` (Profile), `e6086327` (with Floating Chat)  
**Route:** `/(admin)/team/[id]`

- **Profile header:** Large avatar, name, role, contact info, "Edit Profile" button
- **Performance metrics row:** 4 cards — Streams Completed, Win Rate, Avg Phase Duration, Active Streams
- **Assigned streams table:** Same columns as streams table, filtered to this agent
- **Floating chat panel:** Toggleable chat panel (slides in from right)
  - Same design as stream chat sidebar
  - Direct messaging between admin and agent (not stream-specific)

---

## 5. Modal Specs

All modals use glassmorphism: `background: rgba(255,255,255,0.85)`, `backdrop-filter: blur(16px)`, ambient shadow, round-4 corners.

### 5.1 Discovery Wizard Modal

**Stitch Screen:** `a725c260`  
**Trigger:** "Discovery Wizard" button in dashboard/top bar

- **Full-screen overlay** (not a small dialog — takes 80% viewport width, 90% height)
- **Step 1:** Select Company (combobox) + optionally select Location
- **Step 2:** Three input zones side by side:
  - File drop zone (drag-and-drop, accepts SDS/COA/PDF/XLSX)
  - Text paste area (textarea with placeholder)
  - Voice recorder (record button, waveform visualization, stop button)
- Multiple sources can be added in one session
- **Step 3:** "Process" button → loading state → AI confirmation
- Close button (X) top right

### 5.2 AI Confirmation Modal

**Stitch Screen:** `72509381`  
**Trigger:** After Discovery Wizard AI processing completes

- **Review table:** Each row = one extracted field
  - Columns: Field Name | Extracted Value | Confidence (%) | Action (Accept/Edit/Reject)
  - Edit mode: inline editing of extracted value
  - Confidence shows colored badge: green (>80%), amber (50-80%), red (<50%)
- **Bottom actions:** "Confirm & Create Draft" (primary), "Back to Wizard" (secondary)

### 5.3 Complete Discovery Confirmation

**Stitch Screen:** `a0c1d390`  
**Trigger:** After AI Confirmation is accepted

- Summary cards: Waste Streams Found, Locations Identified, Sources Analyzed
- List of created draft streams
- CTAs: "Go to Drafts" | "Start Assessment" (for first stream)

### 5.4 Add New Client Modal

**Stitch Screen:** `27967af7`  
**Trigger:** "Add New Client" button in Client Portfolio

- Form fields: Company Name, Industry (dropdown), Sector (dropdown), Subsector
- Location section: Name, City, State, Address (first location)
- Contact section: Name, Role, Email, Phone (first contact)
- Status selector dropdown (Active, Prospect, Inactive)
- Actions: "Create Client" (primary), "Cancel" (secondary)

### 5.5 Edit Client Profile Modal

**Stitch Screen:** `9c7a9100`  
**Trigger:** "Edit" button in Client Profile

- Pre-filled form with same fields as Add Client
- Additional: Add Location button, Add Contact button
- Actions: "Save Changes" (primary), "Cancel" (secondary)

### 5.6 Send Email Modal

**Stitch Screen:** `bb42ab3a`  
**Trigger:** "Email" quick action in Stream Detail

- To field (pre-populated with client contact)
- Subject field
- Rich text body editor
- Attachment button (link to uploaded stream files)
- Send button (primary)
- Creates TimelineEvent on send

### 5.7 Call Client Modal

**Stitch Screen:** `47b06a63`  
**Trigger:** "Call" quick action in Stream Detail

- Contact selector (dropdown of client contacts)
- Phone number display
- Duration input (minutes)
- Notes textarea
- Outcome selector: Connected, Voicemail, No Answer, Scheduled Callback
- "Log Call" button (primary)
- Creates TimelineEvent on save

### 5.8 Log Activity Modal

**Stitch Screen:** `2d6cc59b`  
**Trigger:** "Log Activity" quick action in Stream Detail

- Activity type selector: Meeting, Site Visit, Note, Other
- Date picker
- Description textarea
- "Log Activity" button (primary)
- Creates TimelineEvent on save

### 5.9 Upload Documents Modal

**Stitch Screen:** `0a3b71ce`  
**Trigger:** "Upload" quick action in Stream Detail

- Document type selector: SDS, COA, Lab Report, Invoice, Other
- Drag-and-drop file zone
- Multiple files allowed
- Upload progress bar
- Creates StreamFile records

### 5.10 Quick Paste Modal

**Stitch Screen:** `706ac0f4`  
**Trigger:** "Quick Paste" quick action in Stream Detail

- Large textarea for pasting unstructured text (email, notes, raw data)
- "Process with AI" button
- After processing: shows extracted fields with accept/reject (similar to AI Confirmation)
- Accepted fields auto-populate the current phase form

### 5.11 Record Voice Memo Modal

**Stitch Screen:** `00615def`  
**Trigger:** "Voice Memo" quick action in Stream Detail

- Record button (large, centered)
- Recording state: waveform visualization + timer
- Stop button
- Playback controls after recording
- Transcription preview (populated after AI processing)
- "Save & Process" button
- AI extracts relevant fields from transcription → updates phase form

### 5.12 Assign New Agent Modal

**Stitch Screen:** `67d95776`  
**Trigger:** "Reassign" action in Admin Stream Detail

- Agent selector dropdown/combobox (shows name, avatar, current stream count)
- Reason textarea
- "Reassign Stream" button (primary)
- Previous agent notified, timeline event created

### 5.13 Request Update Modal

**Stitch Screen:** `4c181901`  
**Trigger:** "Request Update" action in Admin Stream Detail

- Chat-style view showing recent messages
- Text input at bottom
- Can reference specific phase or field
- "Send Request" button
- Creates StreamCommunication record, agent notified

### 5.14 Add Team Member Modal

**Stitch Screen:** `22b0cdd2`  
**Trigger:** "Add Team Member" in Team Management

- Form: First Name, Last Name, Email, Role (dropdown: Field Agent, Org Admin)
- "Send Invitation" button
- Creates user with invitation email

### 5.15 Edit Agent Profile Modal

**Stitch Screen:** `a8301fac`  
**Trigger:** "Edit" button in Agent Profile

- Pre-filled form: name, email, role, location
- "Save Changes" button

---

## 6. Shared Component Library

Components built on top of shadcn/ui, customized for the Stitch design system.

### 6.1 Existing shadcn Components (Reuse & Customize Theme)

These shadcn components carry over with theme customization only:

`Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Label`, `Form`, `Dialog`, `Sheet`, `Drawer`, `DropdownMenu`, `Command`, `Combobox`, `Popover`, `HoverCard`, `Tooltip`, `Tabs`, `Table`, `Badge`, `Avatar`, `Progress`, `Skeleton`, `ScrollArea`, `Separator`, `Accordion`, `Collapsible`, `AlertDialog`, `Toast`

**Custom theme overrides needed:**
- Buttons: gradient primary, ghost secondary, ghost tertiary
- Inputs: `--surface-container-highest` background, `--primary` focus ring
- Dialogs: glassmorphism background
- Tables: no row dividers, alternate colors, uppercase headers
- Badges: round-full for status chips

### 6.2 New Compound Components (Build)

These are new components specific to Second Stream, built on top of shadcn primitives:

| Component | Built from | Purpose |
|-----------|-----------|---------|
| `<AppSidebar>` | Sheet + NavigationMenu | Role-conditional sidebar with collapse |
| `<TopBar>` | Custom | Logo, search, notifications, avatar |
| `<PhaseStepper>` | Custom (Tabs-inspired) | Horizontal 4-phase progress indicator |
| `<PhaseForm>` | Form + dynamic fields | Phase-specific form with field groups |
| `<StreamTable>` | Table + Checkbox + Badge | Filterable data table with bulk actions |
| `<DraftInlineRow>` | Table + Input | Editable table row for Drafts view |
| `<AdminWideHeader>` | Custom | Extended stream header with audit info |
| `<ChatSidebar>` | ScrollArea + Input | Message thread panel for admin↔agent |
| `<ChatBubble>` | Custom | Individual message in chat thread |
| `<KPICard>` | Card | Metric display with icon and label |
| `<StatusChip>` | Badge | Color-coded status indicator (round-full) |
| `<FileDropZone>` | Custom | Drag-and-drop file upload area |
| `<VoiceRecorder>` | Custom | Audio recording with waveform |
| `<ConfidenceBadge>` | Badge | Colored confidence percentage |
| `<TimelineEntry>` | Custom | Activity feed item with avatar and timestamp |
| `<StaleStreamCard>` | Card | Warning-styled card for follow-ups |
| `<FloatingChatPanel>` | Sheet | Slide-in chat panel for agent profile |

---

## 7. Implementation Order

The recommended order for building, starting with the foundation and layering features:

### Sprint 1: Foundation + Shell

```
1. Theme setup (colors, fonts, tokens in globals.css)
2. <AppSidebar> component (both agent and admin variants)
3. <TopBar> component
4. Agent layout shell (/(agent)/layout.tsx)
5. Admin layout shell (/(admin)/layout.tsx)
6. Auth layout shell + login page (UI refresh)
7. Role detection + redirect logic
8. Empty page shells for all routes (with loading states)
```

### Sprint 2: Core Components

```
1. <StreamTable> (reusable across all stream list views)
2. <StatusChip> + <KPICard> + <TimelineEntry>
3. <PhaseStepper> component
4. <PhaseForm> dispatcher + individual phase form shells
5. <ChatSidebar> + <ChatBubble>
6. <AdminWideHeader>
7. <FileDropZone> + <VoiceRecorder>
```

### Sprint 3: Agent Pages

```
1. Agent Dashboard (KPIs, activity feed, streams table)
2. All Streams page (table + tabs + search + filter)
3. Drafts page (<DraftInlineRow>)
4. Follow-ups page (<StaleStreamCard>)
5. Stream Detail (header + stepper + phase forms + right panel)
```

### Sprint 4: Modals + Discovery

```
1. Discovery Wizard modal (file drop + paste + voice)
2. AI Confirmation modal (review table)
3. Complete Discovery Confirmation
4. All quick action modals (email, call, log, upload, paste, voice)
```

### Sprint 5: Admin Pages

```
1. Admin Dashboard (KPIs, agent table, alerts)
2. Admin Stream Detail (wide header + chat sidebar)
3. Follow-up Control page
4. Heat Map page
5. Request Update modal + Assign Agent modal
```

### Sprint 6: Team + Clients + Proposals

```
1. Team Management page
2. Agent Profile page + <FloatingChatPanel>
3. Client Portfolio page (card grid)
4. Client Profile page (locations + streams)
5. Proposals Pipeline page
6. Proposal Detail page (tabs)
7. Historical Archive page
8. Add/Edit Client modals
9. Add/Edit Team Member modals
```

---

## 8. Stitch Screen Reference Map

Quick lookup: which Stitch screen corresponds to which page/modal.

| Page/Modal | Stitch Screen ID | Stitch Title |
|-----------|-----------------|-------------|
| Agent Dashboard | `726a3229` | Simplified Agent Dashboard Summary |
| All Streams | `89b6a3a8` | Waste Stream Management: All Streams |
| Drafts | `5542d25c` | Waste Streams: Drafts (Inline Edit) |
| Follow-ups | `cc7565f6` | Waste Streams: Urgent Follow-ups |
| Stream Detail P1 | `22d43d4d` | Stream Info: Phase 1 |
| Stream Detail P2 | `ef28e245` | Stream Info: Phase 2 |
| Stream Detail P3 | `29f5b758` | Stream Info: Phase 3 |
| Stream Detail P4 | `f8430012` | Stream Info: Phase 4 |
| Client Portfolio | `e5a85c0f` | Client Portfolio: Multi-Location View |
| Client Profile | `e72313c4` | Client Profile: Waste Streams |
| Proposals Pipeline | `6c3eaf5f` | Proposals Management: Pipeline Summary |
| Proposal Detail | `759c0a12` | Proposal Summary |
| Proposal Uploaded | `e16ad8a4` | Proposal Summary: Uploaded |
| Proposals Archive | `c70e22c3` | Historical Proposals Archive |
| Admin Dashboard | `104573f2` | Admin Dashboard: Steve |
| Admin Stream P1 | `35247473` | Admin Waste Stream Detail: Phase 1 |
| Admin Stream P2 | `4a13355e` | Admin Waste Stream Detail: Phase 2 |
| Admin Stream P3 | `65f3187a` | Admin Waste Stream Detail: Phase 3 |
| Admin Stream P4 | `d421201d` | Admin Waste Stream Detail: Phase 4 |
| Heat Map | `8c7c31db` | Admin Oversight: Regional Heat Map |
| Follow-up Control | `ac716a16` | Admin Oversight: Follow-up & Status Control |
| Team Management | `2010d44e` | Team Management |
| Agent Profile | `d0670221` | Admin: Agent Profile |
| Agent + Chat | `e6086327` | Admin: Agent Profile with Floating Chat |
| Discovery Wizard | `a725c260` | Unified Discovery Wizard Modal |
| AI Confirmation | `72509381` | Refined AI Confirmation Modal |
| Discovery Complete | `a0c1d390` | Complete Discovery Confirmation |
| Add Client | `27967af7` | Add New Client Modal |
| Edit Client | `9c7a9100` | Edit Client Profile |
| Send Email | `bb42ab3a` | Send Email Modal |
| Call Client | `47b06a63` | Call Client Modal |
| Log Activity | `2d6cc59b` | Log Activity Modal |
| Upload Documents | `0a3b71ce` | Upload Documents Modal |
| Quick Paste | `706ac0f4` | Quick Paste Modal |
| Voice Memo | `00615def` | Record Voice Memo Modal |
| Assign Agent | `67d95776` | Assign New Agent Modal |
| Request Update | `4c181901` | Request Update Modal (Chat View) |
| Add Team Member | `22b0cdd2` | Add New Member Modal |
| Edit Agent | `a8301fac` | Edit Agent Profile Modal |
| New Stream (Admin) | `6a38fbe3` | New Stream Request Modal |
