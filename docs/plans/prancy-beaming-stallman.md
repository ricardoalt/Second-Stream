# Draft Confirmation: Sheet → Dialog Migration

## Context

The `DraftConfirmationSheet` is the final human gate before an AI-detected waste stream becomes a persisted record. Currently it uses a right-side Sheet (`max-w-lg`), but this pattern is wrong for a **decision/action** flow — it should be a centered Dialog that commands full attention. Additionally, per-field Confirm/Reject buttons add ~12 micro-decisions that are mostly redundant (AI values already default to "confirmed"). This plan migrates to a centered Dialog with simplified field rendering.

## Files to Modify

1. `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx` — primary (all UI changes)
2. `frontend/app/dashboard/page.tsx` — consumer (import rename, line 9 + 100)

## Reference Files (read-only)

- `frontend/components/ui/dialog.tsx` — Dialog primitive (supports `className` override, `showCloseButton`, `onInteractOutside`)
- `frontend/components/ui/scroll-area.tsx` — ScrollArea for scrollable body
- `frontend/components/features/dashboard/components/premium-project-wizard.tsx:244-270` — pattern reference for `Dialog + ScrollArea + sticky footer` layout
- `frontend/lib/location-resolution.ts` — unchanged dependency
- `frontend/lib/types/dashboard.ts` — types unchanged

## Steps

### 1. Replace Shell: Sheet → Dialog

Replace `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription` imports with `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`.

```
DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0"
```

Keep `onInteractOutside` handler (Popover-inside-Dialog needs it). Follow `premium-project-wizard.tsx:244-270` pattern.

### 2. Restructure Layout: Header / ScrollArea / Footer

```
DialogContent (p-0, flex flex-col, max-h-[90vh])
  ├── Header (border-b, non-scrollable)
  │     ├── DialogHeader (icon + title + description)
  │     ├── Progress indicator ("X of Y fields resolved")
  │     └── ContextSection (Company read-only + Location controls)
  ├── ScrollArea (flex-1, scrollable body)
  │     ├── Material fields section
  │     └── Operations fields section
  └── Footer (border-t, non-scrollable)
        ├── Validation status text (replaces ValidationBanner)
        └── Cancel + Confirm buttons
```

Add `ScrollArea` import from `@/components/ui/scroll-area`.

### 3. Add Progress Indicator

New `useMemo` computing `resolvedCount` / `totalFieldCount` by iterating all field keys + location + company, checking `getPersistedFieldValue` and `isLocationFieldResolved`. Display as `"X of Y fields resolved"` in the header between title and context section.

### 4. Remove Per-Field Confirm/Reject Buttons

**Delete components:**
- `FieldDecisionButton` (lines 1141-1177)
- `SourceBadge` (lines 1091-1135)
- `ValidationBanner` (lines 806-842)
- `ConfirmationFieldRow` (lines 990-1085)

**Implicit decision logic:** New `handleFieldValueChange` callback wraps `updateField`:
- Non-empty value → `{ value, decision: "confirm" }`
- Empty value → `{ value, decision: "reject" }`

This preserves `getPersistedFieldValue` semantics with zero changes to that function.

### 5. Replace ConfirmationFieldRow with SimpleFieldRow

New simplified component:
- Label + required asterisk + subtle AI sparkle icon (Tooltip on hover: "AI detected")
- Input (or Textarea for composition)
- Error message
- No bordered card, no color-coded left border, no resolved dot, no confirm/reject buttons

### 6. Simplify ContextCard → ContextSection

- Remove outer bordered card styling → use `bg-muted/20 px-6 pb-4` (header area)
- Remove `SourceBadge` from company and location
- Remove `FieldDecisionButton` from location (location decision set implicitly by `updateLocationState` which already sets `decision: "confirm"`)
- Remove `updateField` from props (no longer needed — location updates go through `updateLocationState`)
- Keep full `LocationFieldInput` logic unchanged (combobox + create-new)

### 7. Cleanup Imports

**Remove:** `Sheet`/`SheetContent`/`SheetDescription`/`SheetHeader`/`SheetTitle`, `Badge`, `ChevronRight`, `User`, `X`, `ComponentType`
**Remove constant:** `SOURCE_LABELS`
**Add:** `Dialog`/`DialogContent`/`DialogDescription`/`DialogHeader`/`DialogTitle`, `ScrollArea`

### 8. Rename Export

`DraftConfirmationSheet` → `DraftConfirmationDialog`

### 9. Update Consumer

`frontend/app/dashboard/page.tsx`:
- Line 9: update import
- Line 100: update JSX tag

## What Does NOT Change

- All business logic: contract building, validation rules, submit flow, location state machine
- All pure functions: `buildDraftConfirmationContract`, `getPersistedFieldValue`, `buildProjectNormalizedData`, `buildReviewNotes`, etc.
- `LocationFieldInput` and `FieldInput` sub-components
- Store types, API types, location-resolution utilities
- Keyboard shortcut (Cmd+Enter), auto-focus effect
- All hooks: loadDraftContext, location lookup, missingBaseFields memo

## Verification

1. `cd frontend && bun run check:ci` (Biome + Next.js build with type checking)
2. Manual test: open draft confirmation → Dialog centered, fields simplified, location combobox works, Cmd+Enter submits, submit flow creates record
