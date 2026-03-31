# Plan: Fix Discovery Wizard Modal UI/UX

## Context

The Discovery Wizard modal has poor space utilization. In AI Discovery tab, sections overflow and content is cut off. In Quick Entry, the modal feels cramped. Root cause: 850px modal width, excessive section padding (p-6), single-column stacking of lightweight sections (Client + Location are just one select each but occupy full-width cards), and a `max-w-3xl` inner constraint that wastes horizontal space.

## Changes

### 1. Widen modal — `discovery-wizard.tsx:408`
- `w-[min(92vw,850px)]` → `w-[min(94vw,960px)]`
- Gives ~110px more horizontal breathing room

### 2. AI Discovery: 2-column top row for Client + Location — `idle-view.tsx:741-832`
- Wrap Client Information and Assign Default Location sections in a `grid grid-cols-1 md:grid-cols-2 gap-4` layout
- These are each a single select — no reason for them to stack vertically
- This cuts ~150px of vertical space, making Upload Files and Dictate Notes visible without scroll
- Remove `max-w-3xl` from AI Discovery inner container (modal width already constrains)

### 3. Tighten section cards — `idle-view.tsx` all section elements
- Reduce card padding: `p-6` → `p-5`
- Reduce heading margin: `mb-4` → `mb-3`
- Reduce inter-section spacing: `space-y-6` → `space-y-4`

### 4. Compact header — `idle-view.tsx:491-525`
- `pt-5 pb-4` → `pt-5 pb-3`
- Tab row: `mt-4` → `mt-3`

### 5. Upload Files section: tighter empty state — `idle-view.tsx:920-953`
- Reduce empty state padding: `px-6 py-8` → `px-6 py-6`

### 6. Dictate Notes section: more compact — `idle-view.tsx:957-993`
- Already good, just benefits from reduced card padding

### 7. Footer: balanced spacing
- AI tab footer: `py-5` → `py-4` (match Quick Entry footer)

### 8. Quick Entry tab
- Already uses 2-column grid — benefits from wider modal
- Verify spacing with new modal width — no structural changes expected

## Files to modify
- `frontend/components/features/discovery-wizard/discovery-wizard.tsx` (line 408 — modal width)
- `frontend/components/features/discovery-wizard/views/idle-view.tsx` (lines 489-1065 — layout restructure)

## Verification
1. `cd frontend && bun run check:ci` — typecheck + lint
2. Visual check: both tabs at ≥1024px viewport — all AI Discovery content should be visible without scroll
3. Visual check: both tabs at 768px viewport — responsive collapse to single column
4. Verify Quick Entry 2-column layout still renders correctly at new width

## Unresolved
- None — this is a pure UI/spacing change, no logic modifications.
