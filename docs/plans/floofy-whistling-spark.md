# Draft Confirmation Sheet — UX/UI Redesign

## Context

The draft confirmation modal (`draft-confirmation-sheet.tsx`, 1908 lines) is the critical step where users review AI-detected waste stream data before persisting it. The current design exposes backend implementation details (per-field confirm/reject toggles, source badges) as primary UI affordances, creating cognitive overload. The user's actual task is simple: scan AI values, fix wrong ones, submit. The redesign eliminates unnecessary micro-decisions and cleans up the visual hierarchy.

## Core Changes

### 1. Remove per-field Confirm/Reject buttons

**Why**: 14 buttons (2 × 7 editable fields) that map to no real user intent. The `getPersistedFieldValue()` function already handles the semantics: if value is present → used; if value cleared → treated as empty.

**How**: Auto-derive `decision` from value state:
- User types non-empty value → `decision = "confirm"`
- User clears field → `decision = "reject"`
- Value differs from `initialValue` → `source = "manual_override"`

Update `updateField` callback (~10 lines). Delete `FieldDecisionButton` component. All downstream business logic (validation, API calls, contract building) unchanged — it already reads `decision` + `value` from contract.

### 2. Dialog → Sheet (right panel)

**Why**: Dialog at `max-w-2xl` with `max-h-60vh` scroll forces scrolling to see fields 5-8. Sheet uses full viewport height — all 8 fields fit without scrolling. Keeps dashboard visible on the left, giving context about which row is being reviewed.

**How**: Replace `Dialog`/`DialogContent` with `Sheet`/`SheetContent side="right"`. Override default width: `className="w-full sm:max-w-lg"`. Add `onInteractOutside={(e) => e.preventDefault()}` to prevent accidental closure with unsaved edits.

Note: Sheet uses same `@radix-ui/react-dialog` as Dialog — API is nearly identical. The Location field's Popover/Command nests inside Sheet without focus trap conflicts (both are Radix primitives with portal-based rendering).

### 3. New layout structure

```
SheetContent (right panel, ~480px)
├── SheetHeader
│   ├── "Review Draft" title
│   └── "{Company} — {Location}" + source badge
├── ContextCard (Company locked + Location interaction)
│   ├── Company: read-only text + Lock icon (no Input)
│   └── Location: mode-dependent (locked | combobox | create-new form)
├── StreamDetailsForm (6 fields, compact grid)
│   ├── [Material type]  [Material name]
│   ├── [Volume]         [Frequency]
│   ├── [Composition ─────────────────]
│   └── [Primary contact ─────────────]
├── ValidationBanner (conditional, amber, lists missing field names)
└── SheetFooter
    ├── Status text ("Still needed: Volume" or "Ready to confirm")
    └── [Cancel] [Confirm Draft]
```

### 4. Remove source badges from field rows

**Why**: Most fields are `ai_detected` — the badge communicates the same thing on every row (= noise). Only `pending` (no value) and `manual_override` (user edited) are informative.

**How**:
- `ai_detected` + unedited → subtle `Sparkles` icon (size-3) after the label
- `pending` → no badge, the empty input placeholder itself communicates "nothing found"
- `manual_override` → small `Pencil` icon after the label
- Single source badge in header: "AI Import" or "Voice Interview"

### 5. Remove ReadinessSummary progress bar

**Why**: "5/8 (63%)" weights all fields equally. An optional empty `composition` counts the same as required `volume`. The percentage doesn't answer "Can I confirm now?"

**How**: Replace with a conditional `ValidationBanner`:
- Shows only when required fields are missing
- Lists specific field names: "Still needed: Volume, Frequency"
- When all required fields filled → banner hidden, confirm button turns green

### 6. Remove field group sections

**Why**: 3 groups for 8 fields = over-structured. Group headers + separators consume ~120px vertical space.

**How**: Company + Location become a `ContextCard` (visually distinct card). Remaining 6 fields become a flat 2-column form grid. No group headers, no separators, no section icons.

### 7. Elevate Location field

**Why**: Location in `create_new` mode renders a 4-field sub-form (~180px) inside the same row pattern as single text inputs — jarring visual inconsistency.

**How**: Location gets its own visual zone inside `ContextCard`:
- **Locked**: Read-only display (name + city/state) with Lock icon, `readOnly` (not `disabled`)
- **Existing**: Combobox trigger, same Popover/Command pattern (preserved)
- **Create new**: Expandable sub-card with 4-field grid, "Use existing instead" link

## Component tree (after)

```
DraftConfirmationSheet (orchestrator — all hooks/state/callbacks preserved)
├── ContextCard (new)
│   ├── CompanyDisplay (text + Lock icon)
│   └── LocationControl (refactored from LocationFieldInput)
│       └── LocationCreateForm (mode=create_new)
├── StreamDetailsForm (new)
│   └── FormField × 6 (label above input, 2-col grid)
├── ValidationBanner (new, conditional)
└── Footer (simplified)
```

**Deleted**: `ReadinessSummary`, `FieldGroupSection`, `ConfirmationFieldRow`, `SourceBadge`, `FieldDecisionButton`, `SOURCE_LABELS`, `FIELD_GROUPS`, `FieldGroup` interface, `fieldReadiness` memo

**Preserved (unchanged)**: All contract-building functions (lines 1408-1907), all state hooks, `handleConfirmDraft`, `missingBaseFields` memo, validation logic, location search effect, store integration

## Implementation steps

1. **Update `updateField`** — auto-derive `decision` from value. ~10 lines changed.
2. **Build `ContextCard`** — Company display + Location control (refactor from existing LocationFieldInput). Keep all location state callbacks.
3. **Build `StreamDetailsForm`** — 2-column CSS grid, 6 `FormField` components (label + input). Composition = textarea, rest = input.
4. **Build `ValidationBanner`** — conditional amber banner using existing `missingBaseFields` computation.
5. **Replace container** — Dialog → Sheet, update header/footer.
6. **Delete dead components** — ReadinessSummary, FieldGroupSection, ConfirmationFieldRow, SourceBadge, FieldDecisionButton + related constants.

## UX improvements

- **Auto-focus**: Focus first empty required field on mount. If all filled, focus first editable field.
- **Tab order**: `tabIndex={-1}` on locked fields. Tab only through editable fields.
- **Keyboard submit**: `Cmd+Enter` / `Ctrl+Enter` submits when `isReady`.
- **Locked fields**: Use `readOnly` (not `disabled`) — screen readers can still access the value, users can copy text.

## Accessibility

- `aria-required="true"` on required inputs
- `aria-describedby` linking inputs to error elements
- `aria-live="polite"` on validation banner
- `readOnly` for locked fields (keeps them in accessibility tree)
- Focus return to trigger element on sheet close

## Files to modify

- `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx` — full UI rewrite, business logic preserved
- `frontend/components/features/dashboard/index.ts` — update export if component name changes (likely stays same)

## Verification

1. `cd frontend && bun run check:ci` — type check + lint
2. Manual test: open draft from dashboard → verify all 3 location modes work
3. Manual test: clear a required field → verify validation banner appears
4. Manual test: fill all required fields → verify confirm button turns green
5. Manual test: confirm a draft → verify API calls succeed (patchItem + finalize)
6. Test keyboard: Tab through fields, Cmd+Enter to submit

## Unresolved questions

1. **Popover inside Sheet**: Radix Popover inside Sheet should work (both portal-based), but needs manual testing. If focus trap conflict → fallback to Dialog with same redesign applied.
2. **Reset to AI values**: Should there be an undo/reset per field or globally? Current plan: no reset button (users can retype). Could add later if needed.
