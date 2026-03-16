# Draft Confirmation Sheet — UX/UI Redesign (Revised)

## Context

Redesign the draft confirmation modal to be cleaner, more intuitive, and easier to scan — while preserving the explicit per-field Confirm/Reject interaction, all business logic, and the existing state machine.

## Changes

### 1. Dialog → Sheet (right panel)

Replace `Dialog` with `Sheet side="right"` (`w-full sm:max-w-lg`). Dashboard stays visible. Full viewport height eliminates scrolling for 8 fields. Add `onInteractOutside={(e) => e.preventDefault()}` to prevent accidental closure.

Imports: swap `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` → `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`.

### 2. Context card (Company + Location)

Top visual block separating "what are we reviewing?" from "what are the values?":

- **Company**: Read-only text display (no `<Input>`), Lock icon, `editabilityReason` tooltip. Visually distinct — rounded card with `bg-muted/30` border.
- **Location**: Own visual prominence inside the context card. All 3 modes preserved:
  - `locked`: read-only text + Lock icon
  - `existing`: combobox trigger (existing Popover/Command pattern)
  - `create_new`: expandable sub-form (4 fields: name, city, state, address)
- Location gets more vertical space and a subtle background treatment to signal "this is the complex interaction here."

### 3. Subtler field groups

Keep Identity/Material/Operations grouping but reduce chrome:
- Remove group icons (`Building2`, `FlaskConical`, `Truck`)
- Replace with text-only group label: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60`
- Remove the `<Separator>` between groups — use `mt-4` spacing instead
- Remove the `flex-1 h-px bg-border/40` horizontal rule next to labels
- Net: ~60px saved, grouping preserved for scanability

### 4. Actionable readiness feedback (replace progress bar)

Delete `ReadinessSummary` component (progress bar + percentage).

Replace with a **validation banner** positioned between body and footer:
- **Not ready**: Amber banner: `"Still needed: Volume, Frequency"` (specific field names)
- **Ready**: Green banner: `"Ready to confirm"` with Check icon
- Uses existing `missingBaseFields` computation, no logic changes
- `aria-live="polite"` for accessibility

Footer status text mirrors this (replaces the current dual readiness display).

### 5. Reduce source badge noise

Keep `SourceBadge` component but change rendering strategy:
- `ai_detected`: **Demote** — smaller, more muted styling. Change from a colored badge to a subtle inline `Sparkles` icon (`size-2.5 text-muted-foreground/50`) next to the label. No text label, just icon. This is the default expected state and shouldn't dominate.
- `manual_override`: **Keep prominent** — current badge styling with `User` icon, success colors. This is useful signal.
- `pending`: **Keep prominent** — current badge styling with `AlertCircle` icon, warning colors. This is useful signal.

### 6. Location field improvements

Inside the context card, Location gets dedicated treatment:
- **Combobox** (existing mode): full-width trigger, shows selected location name + city/state subtitle
- **Create-new form**: visually contained in a sub-card with dashed border (`border-dashed border-warning/30`), 2-column grid for city/state, "Use existing location instead" link at bottom
- **Mode transition**: smooth — keep existing `updateLocationState`/`startCreateNewLocation`/`switchLocationBackToLocked` callbacks unchanged

### 7. Minor UX polish

- **Auto-focus**: Focus first empty required field on sheet open
- **Keyboard submit**: `Cmd+Enter`/`Ctrl+Enter` submits when `isReady`
- **Locked fields**: Use `readOnly` instead of `disabled` where applicable (screen reader accessible, copyable text)
- **Button sizing**: Both Cancel and Confirm use consistent sizing
- **Field row cleanup**: Tighten padding, reduce border-l-2 weight to border-l, slightly smaller resolved indicators

## What stays unchanged

- Per-field Confirm/Reject buttons — preserved exactly
- `DraftConfirmationFieldDecision` ("confirm" | "reject") — no changes
- All contract-building functions (lines 1408-1907)
- `handleConfirmDraft` submission flow
- `missingBaseFields` and `fieldReadiness` memos
- Validation logic and required field rules
- Location state machine (locked/existing/create_new)
- Store integration (`useDashboardActiveDraft`, `useDashboardActions`)
- All API calls (patchItem, finalize, searchRunLocations)
- Backend — zero changes

## Component structure (after)

```
DraftConfirmationSheet (orchestrator — all hooks/state/callbacks preserved)
├── SheetHeader (title + company/location context subtitle + source badge)
├── ContextCard (new wrapper)
│   ├── CompanyDisplay (read-only text + Lock + tooltip)
│   └── LocationControl (combobox | create-new form | locked display)
├── Field groups (subtler headers, no icons/separators)
│   ├── Material group label
│   │   └── ConfirmationFieldRow × 3 (materialType, materialName, composition)
│   ├── Operations group label
│   │   └── ConfirmationFieldRow × 3 (volume, frequency, primaryContact)
├── ValidationBanner (replaces ReadinessSummary)
└── SheetFooter (status text + Cancel + Confirm)
```

**Deleted**: `ReadinessSummary`, `FIELD_GROUPS` array (replaced with inline rendering), `FieldGroup` interface, `fieldReadiness` memo

**Preserved**: `ConfirmationFieldRow`, `FieldDecisionButton`, `FieldInput`, `LocationFieldInput`, all helper functions

## Implementation steps

1. **Container swap**: Dialog → Sheet. Update imports, wrapper JSX, header/footer structure.
2. **Context card**: Extract Company + Location from field groups into a dedicated `ContextCard` section above the fields. Company becomes text display. Location keeps all existing interaction but in elevated visual treatment.
3. **Subtler groups**: Remove Identity group (company/location now in context card). Keep Material and Operations as text-only labels with spacing, no icons/rules/separators.
4. **Validation banner**: Delete ReadinessSummary. Add conditional banner using `missingBaseFields`.
5. **Source badge rework**: Make `ai_detected` a subtle icon-only indicator. Keep `manual_override` and `pending` badges prominent.
6. **Polish**: Auto-focus, keyboard submit, consistent button sizing, tighter row spacing.
7. **Run checks**: `cd frontend && bun run check:ci`

## Files to modify

- `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx` — main changes
- `frontend/components/features/dashboard/index.ts` — only if export name changes (unlikely)

## Verification

1. `cd frontend && bun run check:ci` — type check + lint
2. Manual: open draft → verify Sheet slides in from right, dashboard visible
3. Manual: verify Company locked display, Location combobox + create-new modes
4. Manual: verify Confirm/Reject buttons work per field
5. Manual: verify `manual_override` and `pending` badges visible, `ai_detected` demoted
6. Manual: clear required field → verify validation banner shows specific names
7. Manual: fill all required → verify banner shows "Ready to confirm"
8. Manual: confirm draft → verify API calls succeed (no regressions)
