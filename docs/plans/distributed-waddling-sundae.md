# Plan: Draft Confirmation Modal UI Refinement

## Context
The AI Discovery confirmation modal review table feels visually cramped/misaligned around Volume/Units/Frequency/Actions columns. The modal works correctly — this is purely visual/layout polish. No redesign, no behavior changes, no Quick Entry involvement.

## File
`frontend/components/features/discovery/draft-confirmation-modal.tsx`

## Changes (7 surgical edits, ~20 lines)

### 1. Rebalance grid column proportions
**Line 501** — `DESKTOP_TABLE_COLUMNS_CLASS`
- Material Name: 2fr → 1.6fr (still widest)
- Volume: 0.8fr → 0.9fr, Units: keep 0.9fr but min 112→104px
- Frequency: 1.2fr → 1.1fr
- Actions: 1.35fr/228px → 1fr/180px (reclaimed by Change 6)
- Net: ~0.55fr redistributed from Material+Actions into data columns

### 2. Left-align all data columns
**Lines 660-662** (header) + **Lines 829, 839, 849** (body)
- Remove `text-right` from Volume/Frequency, `text-center` from Units
- Left-alignment is standard for mixed text/numeric review tables with free-text values
- Actions column keeps `text-right` (standard for action columns)

### 3. Semantic badge variants (replace raw Tailwind colors)
**Lines 762-806** — 4 elements
- "Needs client/location resolution": `variant="outline"` + raw amber classes → `variant="warning-subtle"`
- "Ambiguous location suggestion": `variant="outline"` + raw blue classes → `variant="info-subtle"`
- AI suggests location `<span>` → `<Badge variant="info-subtle">`
- Match candidate found `<span>` → `<Badge variant="info-subtle">`
- Gains: dark mode support via semantic tokens, consistency with design system

### 4. Row vertical rhythm
**Line 746** — `py-4` → `py-5` (+4px total per row)

### 5. Fix header/body alignment offset
**Line 658** — Add `pl-3` to Material Name header
**Line 751** — Material Name cell: `pl-2 pr-2` → `pl-3 pr-1` (clears 3px status bar)

### 6. Icon-only Discard button
**Lines 931-956** — `size="sm"` → `size="icon-sm"`, remove "Discard" text label
- Tooltip already provides "Discard this stream" for discoverability
- Saves ~50-60px per row in Actions column

### 7. Empty state spacing
**Lines 1276-1279** — Remove `px-2`, `py-8` → `py-12`

## What is NOT changed
- Footer status text, edit expansion panel, all confirm/reject/edit logic
- All animation/motion behavior, free-text Units/Frequency inputs
- Quick Entry (not in this file), modal shell width (1240px)

## Verification
- `cd frontend && bun run check:ci`
- Visual: open modal with 3+ candidates, verify column alignment, badge rendering, Discard icon-only, row spacing
