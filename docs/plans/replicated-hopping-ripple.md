# Streams Workspace UI/UX Premium Redesign

## Context
Current workspace looks like a flat, extended questionnaire form. User wants it to match premium reference screenshots: dynamic, clean, intuitive multi-phase wizard with proper visual hierarchy. UI-only changes — zero logic modifications.

## Files to Modify

| File | Lines | Change Scope |
|------|-------|-------------|
| `stream-detail-page-content.tsx` | 503 | Header, layout, phase nav buttons |
| `stream-phase-stepper.tsx` | 69 | Visual overhaul with connecting lines |
| `stream-workspace-form.tsx` | 480 | Section styling, field cards, phase header |
| `stream-quick-capture-card.tsx` | 77 | Premium actionable cards |

## Changes by Component

### 1. `stream-phase-stepper.tsx` — Premium Stepper with Connecting Lines

**Current**: Plain `<ol>` grid, circles with no connections, basic colors.

**Target**: Numbered circles connected by horizontal lines (like reference screenshots).

- Each step circle shows the phase NUMBER (not a dot) when inactive/active, CHECK icon when completed
- Connecting line between steps: completed segments = `bg-primary`, incomplete = `bg-border`
- Active step: `bg-primary text-primary-foreground` filled circle with number
- Inactive: `bg-muted text-muted-foreground` circle with number
- Completed: `bg-primary text-primary-foreground` circle with Check icon
- Labels below: phase number as tiny uppercase label, phase name below
- Use `flex items-center` layout with `flex-1` lines between circles instead of grid
- Container: keep `rounded-xl bg-surface-container-low p-4 shadow-xs`

### 2. `stream-detail-page-content.tsx` — Header + Layout + Phase Navigation

**Current**: Header card with breadcrumb text, badges, small buttons. Form wrapped in a Card with "Questionnaire workspace" title.

**Target**:

#### Header Redesign
- Breadcrumb: uppercase tiny text like ref: `STREAMS > MISSING INFORMATION > {materialName}`
- Title: `"Complete Stream Information"` (font-display text-2xl)
- Remove volume/frequency from header (they're in the questionnaire)
- Remove phase badges from header (stepper shows this)
- Action buttons on the right: "Go to Files" and "Go to Contacts" as outlined buttons with icons (matching reference teal outlined style)
- "Complete Discovery" button stays for phase 4

#### Remove Card Wrapper from Form
- Remove the Card/CardHeader/CardTitle "Questionnaire workspace" wrapper
- Let `StreamWorkspaceForm` render directly — the form sections ARE the visual containers
- Move save-status indicator into a subtle inline badge above the form

#### Add Phase Navigation Buttons (Bottom)
- After the form, add navigation row:
  - Left: "← Back to Phase {N-1}" outline button (hidden on phase 1)
  - Right: "Continue to Phase {N+1} →" primary filled button (on phase 4: "Complete Discovery" button instead)
- These call the existing `handlePhaseSelect` — no new logic needed

### 3. `stream-workspace-form.tsx` — Dynamic Sections + Phase Header

**Current**: Collapsible sections with chevron toggles, Q-number labels, flat `bg-surface-container-low` field cards in 2-col grid.

**Target**:

#### Phase Header (new, inside form)
- Icon (ClipboardList) + "Phase {N}: {Phase Title}" as prominent heading
- Brief subtitle/description per phase (add to STREAM_WORKSPACE_PHASES config OR hardcode in a local map)
- Separator below the header

#### Phase descriptions (local constant, no config change):
```
Phase 1: "Define the material identity, volume, and logistics baseline."
Phase 2: "Specify the current economic baseline and disposal environment."  
Phase 3: "Review composition metrics and certification requirements."
Phase 4: "Identify hidden value levers and strategic alignment goals."
```

#### Section Headers
- Remove collapsible behavior — sections are always expanded (references show no collapse)
- Section header: icon + section name as `text-base font-semibold`, with answered count as subtle text (not badge)
- Add Separator after section header
- Remove "Section" tiny label above section name

#### Question Fields
- Remove `bg-surface-container-low` background from individual fields — use white/transparent with bottom border or subtle grouping
- Remove Q-number label (Q1, Q2, etc.) — not in references
- Field label: `text-sm font-medium` with optional info Tooltip icon
- Required indicator: small asterisk or dot, not a badge
- Keep 2-col grid but make long_text/open_question fields span full width (`md:col-span-2`)
- AI suggestion panel styling stays but gets slightly refined

#### AI Suggestions Banner
- Keep but make more subtle — use a thin accent bar on the left instead of full background

### 4. `stream-quick-capture-card.tsx` — Premium Action Cards

**Current**: Card with title + 3 outline buttons stacked.

**Target**: Each action as its own mini-card with prominent icon.

- Card container: keep current Card wrapper with "Quick Capture" title
- Each action: rounded-xl bordered card (not a button) with:
  - Left: Icon in a `size-10 rounded-xl bg-primary/10` container
  - Right: Title (bold) + description (muted)
  - Entire card is clickable (button role)
  - Hover: `card-lift` effect or subtle shadow increase
- Update descriptions to match references:
  - Upload: "Upload Documents" / "SDS, COA, or Lab Reports"
  - Voice: "Record Voice Note" / "Capture site visit observations"  
  - Paste: "Quick Paste" / "Auto-parse email/text raw data"

### 5. `stream-questionnaire.ts` — Add phase descriptions

Add a `description` field to `StreamQuestionPhaseDefinition` and populate for each phase. This is data-only, not logic.

## New Imports Needed
- `Separator` from shadcn (already available)
- `Tooltip`, `TooltipContent`, `TooltipTrigger` from shadcn (already available)
- Additional lucide icons: `ClipboardList`, `ArrowLeft`, `ArrowRight`, `FileText`, `Mic`, `Sparkles`, `Info`

## Verification
1. `cd frontend && bun run check:ci` — typecheck + lint passes
2. Visual: open `/streams/{id}` page, verify:
   - Stepper shows numbered circles with connecting lines
   - Phase header with icon + title + description
   - Fields are clean without Q-numbers or collapsible headers
   - Quick Capture sidebar has premium card-style actions
   - Phase nav buttons work (Back/Continue)
   - AI suggestions still display and accept/reject works
   - Complete Discovery modal still works on phase 4

## Unresolved Questions
- Should the phase descriptions be hardcoded in the form component or added to the config? (Leaning config for consistency)
- The references show an "Agent Tip" card at the bottom of the sidebar — should we add a placeholder for this? (Leaning no, keep scope tight)
