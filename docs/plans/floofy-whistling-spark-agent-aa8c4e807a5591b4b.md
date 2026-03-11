# Draft Confirmation Modal — UX/UI Analysis & Redesign Proposal

**Date**: 2026-03-11
**File under analysis**: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`

---

## Part 1: Deep UX Critique

### 1.1 The Confirm/Reject Mental Model Is Broken

This is the most severe issue. The current design asks users to "Confirm" or "Reject" each individual AI-detected value. The word "reject" implies the value is wrong and the field should be discarded — but the actual behavior encoded in `getPersistedFieldValue()` is more nuanced:

- `decision = "confirm"` → use the current value
- `decision = "reject"` + unchanged value → field is empty (discarded)
- `decision = "reject"` + new value typed → use the NEW value (the "rejection" becomes an edit)

So "reject" silently means "I want to clear this OR overwrite it with something else." This is not how humans think. The buttons are a UI-layer concept leaking through to the user. What the user actually wants is one of three actions:

1. Accept the AI value as-is
2. Edit the AI value to correct it
3. Leave the field empty (only valid for optional fields)

The "Reject" affordance creates a false decision branch that forces users to think about a system-internal concept instead of their goal.

**Real-world impact**: A user sees "Volume: 12 tons/month (AI detected)" and clicks Reject expecting to type a correction — but must realize the field is now in a rejected state where typing also works. Alternatively, they click Reject meaning "this value is wrong, I'll fix it" but leave without typing, accidentally clearing a valid field.

### 1.2 Eight Fields × Five UI Elements Each = 40 Elements to Parse

Per field row the user currently sees:
- Status dot (resolved/unresolved indicator)
- Field label
- Required asterisk
- Source badge (AI detected / Manual / Pending)
- Lock icon OR two decision buttons (Confirm + Reject)
- An input control
- Potentially an error message

That is between 5 and 7 distinct elements per row. At 8 fields, the initial cognitive inventory the user must take before they can act is enormous. Eye-tracking research (Nielsen/Baymard) consistently shows that dense forms cause users to abandon or skim in ways that cause errors.

### 1.3 Source Badges Are High-Noise, Low-Signal

In the typical happy path, every field will be `ai_detected`. The badge then becomes wallpaper — present on every row, adding ink, never communicating anything the user doesn't already know ("this is the AI draft confirmation modal, so of course the values are AI detected"). The only time the badge communicates something meaningful is when a field is `pending` (no value found) or `manual_override` (user previously edited), but these states are already encoded in the row's color and state indicator.

The badge should only appear when its value is non-default. Default state (`ai_detected`) should be assumed and unstyled.

### 1.4 The Readiness Bar Is Misleading

`5/8 (63%)` makes it look like 37% of the work is missing, when in reality only required fields block submission. The formula counts all 8 fields equally, so an optional `composition` field that is `pending` contributes the same "missing" weight as `volume`, which will block the submit. A user who has filled all required fields sees "5/8" and thinks they haven't finished, even if they could already confirm right now.

The bar also uses clinical percentages. In a professional B2B context, what the user needs to know is: "Can I confirm now? If not, which specific required fields are still missing?" The percentage adds nothing to that question.

### 1.5 Three Groups for Eight Fields Is Over-Architecture

Groups (Identity, Material, Operations) with their iconized headers, uppercase labels, divider lines, and separators between groups add ~120px of vertical chrome for what are essentially category labels over 2-3 items each. On a 768px-tall laptop screen with a `max-h-[60vh]` scroll area (~460px), the three group headers consume about 90px, leaving ~370px for actual field rows. That means ~46px per field, barely enough for the label + input with no breathing room.

The grouping would pay for itself if there were 20 fields. For 8 fields it just pushes content below the fold.

### 1.6 Location Field Is a Category Mismatch in a Row Layout

The `LocationFieldInput` component renders either:
- A Popover combobox + "Create new location" ghost button
- Or a 4-field form grid (name, city, state, address) + "Use existing instead" button

Both of these are substantially taller and wider than any other field row. Forcing them into the same padded-card `ConfirmationFieldRow` wrapper that was designed for a single `Input` or `Textarea` creates a visual inconsistency. The location row in `create_new` mode expands the card to ~180px while surrounding rows are ~70px.

### 1.7 The Dialog Container Fights Its Content

`sm:max-w-2xl` (672px) is good. But `max-h-[min(60vh,calc(100dvh-220px))]` means on a 900px screen the scroll area is only 320px tall. Combined with the header (~120px) and footer (~70px), the modal total is ~510px — which is reasonable, but the scroll area being only 320px means the user must scroll to see fields 5-8 immediately on open. "Overview at a glance" fails.

A `Sheet` (right-side panel) could give the full viewport height at ~480px wide, eliminating scroll for most screen sizes, while keeping the main dashboard visible behind the overlay — which provides useful context (the user can see which row they're acting on).

### 1.8 Footer Status Text Duplicates the Readiness Bar

The footer shows `"3 fields still pending"` AND the readiness bar shows `"Missing: Volume, Frequency, Material name or material type"` (truncated with tooltip). These communicate the same thing at different levels of detail. One should be removed or the footer status should replace the readiness bar entirely.

### 1.9 Button Asymmetry in the Footer

The "Cancel" button is `variant="outline" size="sm"` while "Confirm Draft" is `size="default"`. The size difference adds visual asymmetry that is not intentional — both are in the same footer action row. The confirm button also conditionally switches to `bg-success` only when `isReady`, meaning its color flips on the user as they fill in the last required field. That's a feedback mechanism (good) but the color change can feel jarring if it happens mid-interaction.

### 1.10 Lock Icon Has Two Behaviors With Identical Appearance

`company` shows a `Lock` icon without a tooltip (no `editabilityReason` branch taken in `buildFieldState` because it passes an editabilityReason but the check `!field.editable && field.editabilityReason` vs `!field.editable && !field.editabilityReason` means both render a Lock — the difference is whether a Tooltip wrapper appears). Users cannot tell that one Lock is interactive-hoverable while the other is purely decorative.

---

## Part 2: Redesign Proposal

### 2.1 Core Mental Model Shift: "Review & Edit" Instead of "Confirm/Reject Per Field"

Eliminate the per-field Confirm/Reject toggle entirely. Replace it with a single, clear interaction model:

**"Each field shows the AI-detected value pre-filled in an editable input. You can edit any value. Required fields must have a non-empty value before you can confirm."**

This maps directly to how users think: "Is the value right? If yes, leave it alone. If no, fix it." The `decision` state still exists in the data model — it becomes implicit: if the user hasn't touched the input, `decision = "confirm"` is assumed; if the user clears a value entirely, that communicates rejection naturally.

The implementation consequence: remove `FieldDecisionButton` components. Replace with a "mark as unknown" / clear control only on optional fields, represented by a subtle `×` button inside the input (like a clearable input), not a prominent "Reject" button. Required fields cannot be cleared so they don't need this.

### 2.2 Container: Use Sheet (Right-Side Panel)

Switch from `Dialog` to `Sheet` from the right side with `side="right"`.

**Rationale:**
- A right sheet can be `w-[480px]` or `w-[520px]` max-width on desktop, using full viewport height. No scroll area needed — the panel itself scrolls.
- The main dashboard remains partially visible on the left, giving the user contextual anchoring (they can see which row triggered the confirmation).
- On mobile (<768px), a bottom `Drawer` is more natural than a centered dialog that takes the full screen.
- The sheet provides a natural reading flow: top-to-bottom, left-to-right, matching the dashboard triage flow.

**Responsive strategy:**
- `≥768px`: right Sheet at 480px
- `<768px`: bottom Drawer (vaul-based, from the existing `drawer.tsx`)

### 2.3 Header: Contextual, Not Generic

Current header: "Needs Confirmation" + generic description.

Proposed header (two lines):
- Line 1: Company name + stream name (from `contract.fields.company.value` + `contract.fields.materialName.value || "New waste stream"`)
- Line 2: Source type badge (Bulk import / Voice interview) + date relative label

Example: **Acme Corp — Cardboard packaging** | Bulk import · 2 days ago

This tells the user immediately which record they're reviewing, eliminating the need to scroll down to the Company and Material Name rows to understand context.

Remove the Sparkles icon from the header. The icon is decorative. Replace with a simple back/close chevron-left at top-left (sheet convention) and a close X at top-right.

### 2.4 Readiness: Replace Bar with Inline Field Status

Remove the readiness summary bar from the header area entirely. The progress bar as a component adds a full chrome block (~68px) that the user's eye processes as "information about information."

Instead, handle readiness status in three ways:
1. **Field-level**: Required fields that are empty get a red left border and a `(required)` label treatment — immediately visible on the row itself.
2. **Footer**: A single compact line listing the specific missing required fields, shown only when `!isReady`. When ready, show nothing (or a subtle "Ready to confirm" in muted text).
3. **Confirm button**: Disabled with a `title` attribute listing missing fields when not ready; green + enabled when ready. The visual change is the confirmation affordance itself, not a separate progress bar.

### 2.5 Field Layout: Two-Column Card-Free Grid

Remove the per-field card wrapper (the `rounded-lg border border-l-2` container). Replace with a clean table-like two-column layout:

```
Label (col 1, 140px)    |  Input (col 2, flex)
```

This is a proven form layout used in Notion, Linear, and GitHub's settings pages for data-review scenarios. It reduces vertical height per field from ~70px to ~44px (label + input in a single row with 12px padding), so all 8 fields fit in ~352px — well within a sheet's viewable area without scrolling on any reasonably sized screen.

**Left-border treatment**: Retain the colored left border as a status signal, but apply it at the row level rather than a card level. A 2px left border on the row's left edge (applied to a `<tr>` equivalent or a `<div>` with `border-l-2`) does the same status work with far less ink.

Status colors:
- Resolved + unedited: no border (default, clean)
- Resolved + user-edited: `border-l-primary/40` (subtle blue — acknowledges user has modified)
- Missing required: `border-l-destructive/60` (red)
- Missing optional: `border-l-warning/30` (amber — just a soft reminder, not alarming)
- Locked: no border

### 2.6 Source Badges: Conditional Rendering Only

Show `SourceBadge` only when:
- `source === "pending"`: render as `(not detected)` placeholder text in `text-muted-foreground/50 italic` — no badge, just inline text
- `source === "manual_override"`: render a small `Pencil` icon in `text-primary/60` after the field label

Never render a badge for `ai_detected`. That is the default expected state in this modal. The absence of any badge communicates "AI detected" implicitly.

### 2.7 Location Field: Separate Expandable Section

The location field is complex enough to warrant its own treatment. Instead of embedding it in the same row grid as plain text fields:

**Default state (locked mode)**: Show the location name as read-only text in the input column. A small `lock` icon at the end of the text, slightly muted.

**Editable mode**: Show the combobox trigger as normal. When the user switches to `create_new` mode, expand a sub-panel inline (below the location row) — not inside the row card — showing the 4-field form. This is similar to the expandable "Create new" patterns in Linear's issue create flow. The row itself doesn't grow; instead an `AnimatePresence`/framer-motion height-animated div appears below it.

This keeps all other field rows undisturbed visually when the location sub-form expands.

### 2.8 Field Groups: Demote to Subtle Inline Labels

Instead of full group headers (icon + uppercase label + horizontal rule), demote groups to a single line of `text-[11px] text-muted-foreground/60` uppercase category text flush with the left column:

```
IDENTITY
  Company
  Location

MATERIAL
  Material type
  ...
```

The label takes 24px vertical space instead of the current ~40px, and can be merged with the first row in the group using top padding, reducing group overhead to near zero.

Alternatively: drop groups entirely given only 8 fields. The field order itself (company → location → materialType → materialName → composition → volume → frequency → primaryContact) already encodes the logical grouping implicitly. Only add group dividers if user testing reveals confusion about the grouping.

### 2.9 Interaction Flow Improvements

**Auto-focus**: On mount, auto-focus the first empty required field, not the first field. This skips over locked fields and pre-filled AI values the user doesn't need to touch, landing them directly at what needs attention.

**Tab order**: Tab should traverse only editable fields in the FIELD_ORDER sequence. Locked fields should be skipped in the tab order (`tabIndex={-1}` on locked inputs).

**Keyboard submit**: `Cmd+Enter` / `Ctrl+Enter` submits the form when `isReady`. Standard behavior for modal forms in pro tools.

**Input highlighting on focus**: When a field receives focus, highlight its left-border more strongly and lighten its row background slightly to communicate "you are editing this field." This replaces the per-field confirm/reject toggle as the "active editing" signal.

**Confirm button state transitions**:
- Disabled + default styling: not ready
- Enabled + green (`bg-success`): ready — no mid-interaction surprise since it only turns green when truly complete
- Loading spinner: submitting

### 2.10 Accessibility

**Sheet vs Dialog ARIA**: `Sheet` from shadcn still uses `role="dialog"` and `aria-modal="true"`. This is correct. Ensure `aria-labelledby` points to the header title containing company + stream name (more specific and useful for screen readers than "Needs Confirmation").

**Field status**: Each row needs `aria-required="true"` on required inputs. Error messages should use `aria-describedby` pointing the input to its error element.

**Status region**: The footer missing-fields text should be `aria-live="polite"` so screen readers announce changes as fields are filled.

**Lock state**: Locked inputs should use `readOnly` not `disabled` — `readOnly` inputs are still keyboard-navigable and screen-reader accessible as content; `disabled` removes them from the accessibility tree and prevents copy.

**Focus trap**: The sheet should trap focus within itself while open (shadcn Dialog/Sheet handles this via Radix primitives, but verify the location Popover doesn't break the trap).

**Color contrast**: `text-muted-foreground/50` on empty field placeholders needs to be checked — WCAG AA requires 4.5:1 for normal text. At `oklch(0.45 0.05 255)` at 50% opacity on `oklch(0.97 0.01 247)` background this likely fails. Use `text-muted-foreground` (full opacity, ~4.8:1 estimated) for all user-readable content, reserving reduced opacity only for purely decorative ink.

---

## Part 3: Component Structure Recommendation

### 3.1 File Structure

Keep the component in a single file (business logic doesn't change). Rename to `draft-confirmation-panel.tsx` to reflect the Sheet/panel paradigm (the current filename `draft-confirmation-sheet.tsx` is already appropriate).

### 3.2 Component Decomposition

```
DraftConfirmationPanel                  (main: state, data loading, submit handler)
  ├── DraftPanelHeader                  (company name, stream label, source type, close)
  ├── DraftFieldList                    (maps over FIELD_ORDER, no groups by default)
  │   ├── FieldRow                      (replaces ConfirmationFieldRow)
  │   │   ├── FieldLabel                (label text, required marker, manual-override icon)
  │   │   └── FieldControl              (switches on fieldKey)
  │   │       ├── ReadOnlyField         (locked fields: text + lock icon)
  │   │       ├── TextFieldControl      (editable text/textarea)
  │   │       └── LocationFieldControl  (combobox + expandable create-new sub-form)
  │   └── LocationCreateSubform         (AnimatePresence expand when mode=create_new)
  └── DraftPanelFooter                  (missing fields text + Cancel + Confirm)
```

### 3.3 State Model Simplification

The `decision` field on `DraftConfirmationFieldState` can be simplified:

- For **locked fields**: decision is always `"confirm"` — no interaction needed
- For **editable fields**: decision = `"confirm"` if value is non-empty; decision = `"reject"` if user has explicitly cleared an optional field

This can be computed from the value itself rather than stored as separate state. Consider: `decision` is only truly needed at submit time to differentiate between "user cleared this" vs "AI found nothing." A simpler model: treat empty value on a non-required field as implicit rejection. Only required fields need explicit tracking of "was this deliberately left empty?"

This doesn't require changing the backend contract — only how the frontend manages the state transition.

### 3.4 FieldRow Layout Spec

```tsx
// Row height: ~44px for single-line inputs, auto for textarea/location
<div
  className={cn(
    "grid grid-cols-[140px_1fr] items-center gap-3 px-0 py-2.5",
    "border-l-2 pl-3 -ml-3",           // left-border status
    "rounded-r-sm",
    error  && "border-l-destructive/60",
    !error && isEmpty && isRequired && "border-l-warning/40",
    !error && !isEmpty && wasEdited && "border-l-primary/30",
    !error && !isEmpty && !wasEdited && "border-l-transparent",
    !field.editable && "border-l-transparent",
  )}
>
  <FieldLabel field={field} />
  <FieldControl ... />
</div>
```

### 3.5 Footer Spec

```tsx
<div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
  {!isReady && (
    <p className="text-xs text-warning-foreground" aria-live="polite">
      Still needed: {missingBaseFields.join(", ")}
    </p>
  )}
  {isReady && (
    <p className="text-xs text-muted-foreground">Ready to confirm</p>
  )}
  <div className="flex gap-2 ml-auto">
    <Button variant="outline" size="sm" onClick={closeDraftConfirmation}>
      Cancel
    </Button>
    <Button
      size="sm"               // match Cancel size — visual symmetry
      disabled={!isReady || submitting || loading}
      className={cn(isReady && "bg-success text-success-foreground")}
      onClick={handleConfirmDraft}
    >
      {submitting ? <Spinner /> : <Check />}
      {submitting ? "Confirming…" : "Confirm"}
    </Button>
  </div>
</div>
```

---

## Part 4: Container Decision — Sheet vs Dialog

### Sheet (Recommended)

**Pros:**
- Full-height panel: no scroll area needed on any screen ≥600px tall
- Dashboard remains visible behind the overlay: context is preserved
- Standard right-panel pattern for "review record" workflows (used in Linear, GitHub PRs, Figma right panel)
- Wider interaction surface for the location create-new sub-form
- `w-[480px]` on desktop, smooth slide-in animation from the right

**Cons:**
- Less "interrupting" than a centered dialog — if the action truly requires full focus, a modal might be more appropriate. But for a review task this is actually a benefit.
- On small screens, a right sheet becomes a full-width overlay without the partial-behind-view benefit.

### Dialog (Current)

**Pros:**
- Stronger focus interrupt (appropriate for destructive or high-stakes confirmations)
- Universally understood pattern
- Better on very small screens

**Cons:**
- Forces scroll area with height cap
- Hides the row that triggered the confirmation
- Limited width (max-w-2xl = 672px) constrains the location sub-form

### Verdict

Use Sheet on desktop (`≥768px`), bottom Drawer on mobile. This is already set up in the codebase — `sheet.tsx` and `drawer.tsx` both exist. The trigger can conditionally render one or the other based on a `useMediaQuery("(min-width: 768px)")` hook or by using the `vaul-drawer-direction` approach that shadcn recommends for responsive dialogs.

---

## Part 5: Interaction Pattern — Before vs After

### Before (current flow)

1. User opens confirmation from dashboard row
2. Sees loading spinner (good)
3. Sees readiness bar "3/8 (37%)" — confused, thinks a lot is missing
4. Scans three group headers before seeing first field
5. Sees "Confirm / Reject" buttons on each row — must decide what to click first
6. Clicks Reject on a field they want to fix, types new value — works, but model is unclear
7. Misses that Volume is required and still pending because it's below the fold
8. Clicks Confirm Draft — gets validation error toast
9. Scrolls to find the red field
10. Fills in Volume
11. Clicks Confirm Draft again

### After (proposed flow)

1. User opens confirmation from dashboard row
2. Panel slides in from right (sheet)
3. Sees header: "Acme Corp — Cardboard packaging · Bulk import"
4. Sees pre-filled fields, auto-focus lands on the first empty required field (Volume, say)
5. No Confirm/Reject buttons — the values are just inputs. They type the volume value.
6. Footer shows "Still needed: Frequency" — they look for Frequency, fill it in
7. Footer changes to "Ready to confirm"
8. Confirm button turns green
9. Press Confirm (or Cmd+Enter)
10. Panel closes, toast success

Two fewer decision points (no per-field confirm/reject), one fewer mental model to understand (no reject semantics), scroll eliminated, required gaps surfaced in real-time.

---

## Part 6: Unresolved Questions

1. **Decision persistence**: Does the backend need explicit `decision = "reject"` for optional fields, or is sending `null`/empty value sufficient to indicate the field was intentionally left blank? If so, the per-field decision toggle can be fully removed. If not, a minimal "clear this field" control (just an `×` in the input) is the right replacement.

2. **Location picker on mobile**: In bottom-Drawer mode, the location Popover combobox may not render correctly (popover inside a drawer can have z-index or pointer-event issues). Verify with Radix's known issues list.

3. **`wasEdited` tracking**: The proposed left-border treatment for "user-edited" fields requires tracking which fields have been changed from their AI-detected initial value. `initialValue` is already stored in `DraftConfirmationFieldState`, so `wasEdited = field.value !== field.initialValue` is computable. Just confirm this doesn't create any re-render churn.

4. **Sheet backdrop click**: Should clicking the backdrop close the sheet? For a "draft confirmation" flow, probably not (data would be lost). Set `onInteractOutside={(e) => e.preventDefault()}` and rely only on the explicit Cancel or close button. Confirm this matches the intended UX — it's a more opinionated choice than the current dialog which closes on backdrop.

5. **Group labels vs no groups**: Drop groups entirely (8 fields is short enough) or keep demoted labels? User test with 2-3 internal users to determine if they need the category cues.
