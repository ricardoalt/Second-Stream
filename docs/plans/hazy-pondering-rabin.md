# Plan: Add Client Dialog UI/UX Redesign

## Context

Current Add Client dialog has visual noise (bordered section cards, white-on-white inputs, decorative badge) and a broken UX for Industry/Sub-Industry selects (20 sectors, ~170 subsectors in flat dropdowns that overflow). Reference design shows flat, tinted, compact layout with all fields at same depth.

Map component is OUT OF SCOPE.

## File to modify

`frontend/components/features/clients/add-client-dialog.tsx`

## Changes

### 1. Simplify header — remove badge row
- Delete `<div>` with Building2 icon-badge and "Client onboarding" Badge (lines 175-183)
- Tighten `DialogHeader` gap: `gap-2` -> `gap-1.5`
- Remove unused `Badge` import

### 2. Flatten section cards
- Primary Contact section: strip `rounded-xl border border-border/15 bg-surface-container-low/70 p-5 shadow-xs` -> just `space-y-5`
- Shipping Location section: same
- Add `<Separator />` between sections for visual separation

### 3. Tighten spacing
- Form body `gap-8` -> `gap-6`

### 4. Tint all inputs — `bg-white` -> `bg-surface-container-low/60`
All 11 occurrences:
- `InputWithIcon` helper, `SelectWithIcon` helper
- Sub-Industry trigger, Notes Textarea, Contact Title, 5x Shipping Location inputs

### 5. Merge Sub-Industry + Notes into one 2-column row
- Currently Sub-Industry alone in half-width row, Notes below full-width
- Combine into `md:grid-cols-2` side by side

### 6. Replace Industry Select with searchable grouped Combobox
**Problem**: 20 sectors in a flat Select = overflows off screen.

**Solution**: Local `IndustryPicker` component using Popover + Command primitives:
- Trigger styled like `InputWithIcon` (h-10, tinted bg, Factory icon, chevron)
- Popover content: `CommandInput` for search + `CommandGroup` per SECTOR_GROUP
- 5 groups: Production & Manufacturing, Materials & Construction, Food & Agriculture, Services & Infrastructure, Technology & Specialized
- Each `CommandItem` shows sector label, stores sector `id` as value
- `max-h-[300px]` on `CommandList` (already set by default in command.tsx)
- On select: call `updateField("sector", id)` + clear subsector

**Imports to add**: `Check`, `ChevronsUpDown` from lucide-react; `Command`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList` from ui/command; `Popover`, `PopoverContent`, `PopoverTrigger` from ui/popover; `SECTOR_GROUPS`, `getSectorsByGroup` from sectors-config

### 7. Replace Sub-Industry Select with searchable Combobox
**Problem**: Up to 11 subsectors per sector — less severe but still benefits from search.

**Solution**: Local `SubIndustryPicker` component using same Popover + Command pattern:
- Trigger: same styling, disabled when no sector selected
- Flat list (no groups needed — subsectors are already filtered by sector, max ~11)
- `CommandInput` for filtering + `CommandItem` per subsector
- On select: call `updateField("subsector", id)`

### 8. Clean up imports
- Remove: `Badge`
- Add: `Separator`, `Check`, `ChevronsUpDown`, Command primitives, Popover primitives, `SECTOR_GROUPS`, `getSectorsByGroup`

## Component structure after changes

```
IndustryPicker    — Popover+Command, grouped by SECTOR_GROUPS
SubIndustryPicker — Popover+Command, flat list filtered by sector
SectionHeading    — unchanged
FormField         — unchanged
InputWithIcon     — bg-white -> bg-surface-container-low/60
(SelectWithIcon   — still used for Client Type only)
```

## Verification
- `cd frontend && bun run check:ci` (typecheck + lint)
- Visual: open dialog, confirm flat layout, tinted inputs, no section cards, no badge
- Industry picker: search works, groups render, selection stores sector id
- Sub-Industry picker: updates when sector changes, search works
- Form submit still works (no logic changed)
