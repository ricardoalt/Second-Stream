# Draft Confirmation Modal — UX/UI Redesign Specification

Target file: `frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`

---

## 1. Problem Analysis

Current sheet has three core failures:

1. **Flat information architecture** — 8 fields rendered as identical bordered cards. No hierarchy communicates what is locked, what is urgent, what is informational.
2. **Weak decision affordances** — `h-7 px-2 text-[11px]` buttons with a subtle active state are the primary interaction. Users cannot confidently tell if a field is confirmed, rejected, or undecided.
3. **No readiness signal** — Users must scan all 8 fields to understand how many remain undecided. The warning banner only fires at submit-time or when fields are already missing, not during review.

---

## 2. Layout Architecture

### Modal dimensions

Replace `SheetContent side="right" sm:max-w-2xl` with:

```
DialogContent className="sm:max-w-2xl w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col"
```

Key decisions:
- `p-0 gap-0`: disable DialogContent's default padding and gap so we can control each zone independently
- `max-h-[90vh] flex flex-col`: fixed outer height, inner sections flex to fill
- `overflow-hidden`: clipping container — scroll happens only in the field list zone
- `sm:max-w-2xl` (672px): wide enough for a 3-column value row without feeling cramped; narrower than the Sheet was visually but more focused

### Vertical zones (top to bottom)

```
┌──────────────────────────────────────────────────┐
│  HEADER ZONE                         px-6 pt-5   │  ~80px fixed
│  Title + subtitle + source breakdown             │
├──────────────────────────────────────────────────┤
│  READINESS ZONE                      px-6 py-3   │  ~60px fixed
│  Progress bar + "X of 8 fields confirmed" text   │
│  + warning chips for missing required fields     │
├──────────────────────────────────────────────────┤
│  FIELD LIST ZONE                                 │  flex-1 overflow
│  ScrollArea with grouped sections                │
│    └ Identity group                              │
│    └ Material group                              │
│    └ Operations group                            │
├──────────────────────────────────────────────────┤
│  FOOTER ZONE                         px-6 py-4   │  ~68px fixed
│  Cancel (ghost) + Confirm Draft (primary)        │
└──────────────────────────────────────────────────┘
```

---

## 3. Header Zone

### Structure

```tsx
<DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50">
  <div className="flex items-start justify-between gap-4">
    <div className="space-y-1">
      <DialogTitle className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="h-4 w-4 text-warning shrink-0" />
        Needs Confirmation
      </DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        Review AI-detected fields before creating a persisted stream.
      </DialogDescription>
    </div>
    {/* Source breakdown pills — right-aligned */}
    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
      <SourcePill source="ai_detected" count={aiCount} />
      <SourcePill source="manual_override" count={manualCount} />
      <SourcePill source="pending" count={pendingCount} />
    </div>
  </div>
</DialogHeader>
```

### SourcePill component

Tiny inline summary of how many fields have each source. Renders as a badge-like pill.

```tsx
// Only render if count > 0
<span className={cn(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
  SOURCE_PILL_CLASS_NAMES[source]  // same color tokens as SOURCE_CLASS_NAMES
)}>
  <span className="tabular-nums">{count}</span>
  <span>{SOURCE_SHORT_LABELS[source]}</span>  // "AI" | "Manual" | "Pending"
</span>
```

Source pill color tokens (using existing CSS vars):
- `ai_detected`: `border-info/30 bg-info/8 text-info` (light teal)
- `manual_override`: `border-success/30 bg-success/8 text-success-foreground dark:text-success` (light green)
- `pending`: `border-warning/30 bg-warning/8 text-warning-foreground dark:text-warning` (light amber)

Design rationale: The header gives an immediate snapshot — users understand "this came mostly from AI, 2 are pending" before reading a single field. This is progressive disclosure: aggregate first, detail on scroll.

---

## 4. Readiness Zone

### Structure

```tsx
<div className="px-6 py-3 border-b border-border/40 bg-muted/30">
  {/* Progress row */}
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-medium text-foreground">
      {confirmedCount} of {TOTAL_FIELDS} fields confirmed
    </span>
    <span className="text-xs text-muted-foreground">
      {pendingRequiredCount > 0
        ? `${pendingRequiredCount} required field${pendingRequiredCount > 1 ? 's' : ''} remaining`
        : 'All required fields complete'}
    </span>
  </div>
  <Progress
    value={(confirmedCount / TOTAL_FIELDS) * 100}
    className={cn(
      "h-1.5",
      confirmedCount === TOTAL_FIELDS
        ? "[&>[data-slot]]:bg-success"   // green when all done
        : pendingRequiredCount > 0
          ? "[&>[data-slot]]:bg-warning"  // amber when required missing
          : "[&>[data-slot]]:bg-primary"  // blue when optional remaining
    )}
  />
  {/* Missing required chips — only when present */}
  {missingBaseFields.length > 0 && (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {missingBaseFields.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/8 px-2 py-0.5 text-[10px] font-medium text-destructive"
        >
          <AlertCircle className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
    </div>
  )}
</div>
```

### Progress bar color logic

| State | Bar color | Right label |
|---|---|---|
| All 8 confirmed | `bg-success` | "Ready to confirm" |
| Required done, optional pending | `bg-primary` | "{n} optional remaining" |
| Required fields missing | `bg-warning` | "{n} required remaining" |

Design rationale: The progress bar communicates exactly where the user is in the review process. Missing required fields surface as destructive chips immediately beneath the bar — no hunting for the submit-time error banner. This is error prevention, not error recovery.

---

## 5. Field List Zone

### ScrollArea wrapper

```tsx
<ScrollArea className="flex-1 min-h-0">
  <div className="px-6 py-4 space-y-5">
    <FieldGroup title="Identity" fields={identityFields} ... />
    <FieldGroup title="Material" fields={materialFields} ... />
    <FieldGroup title="Operations" fields={operationsFields} ... />
  </div>
</ScrollArea>
```

`flex-1 min-h-0` is critical — without `min-h-0`, flex children do not shrink below their content height in column flex containers. The ScrollArea must be inside the flex column to allow the footer and header to stay fixed.

### FieldGroup component

```tsx
<div className="space-y-2">
  {/* Group header */}
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </span>
    <div className="flex-1 h-px bg-border/60" />
    {/* Compact group-level readiness dot */}
    <span className={cn(
      "h-1.5 w-1.5 rounded-full",
      groupAllConfirmed ? "bg-success" : groupHasPending ? "bg-warning" : "bg-muted-foreground/40"
    )} />
  </div>
  {/* Field rows */}
  <div className="space-y-1.5">
    {fields.map(fieldKey => <FieldRow key={fieldKey} ... />)}
  </div>
</div>
```

Group header design: The all-caps label with a horizontal rule creates visual section breaks without heavy borders. The single dot at the right is a micro-readiness indicator — green means the group is done, amber means attention needed. This helps users jump to the right section.

### Field groups

```
Identity:   company, location
Material:   materialType, materialName, composition
Operations: volume, frequency, primaryContact
```

---

## 6. Individual Field Row Design

### Row anatomy (three-row internal structure)

```
┌─────────────────────────────────────────────────────────┐
│  ROW OUTER (border, radius, padding, state background)  │
│  ┌─────────────────────────────────────────────────┐    │
│  │ TOP BAR: label  [source badge]       [decision] │    │  ~32px
│  ├─────────────────────────────────────────────────┤    │
│  │ INPUT / LOCKED VALUE                            │    │  variable
│  ├─────────────────────────────────────────────────┤    │
│  │ ERROR or LOCK HINT (conditional)               │    │  ~16px
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Row outer container

The border color and background communicate the field's decision state — this is the primary visual feedback mechanism.

```tsx
<div className={cn(
  "rounded-lg border px-3.5 pt-3 pb-3 transition-colors duration-150",
  // Decision state styling
  field.decision === "confirm"
    ? "border-success/40 bg-success/5"
    : field.decision === "reject" && field.value
      ? "border-destructive/30 bg-destructive/5"
      : hasError
        ? "border-destructive/50 bg-destructive/5"
        : "border-border/60 bg-background",
  // Locked field subtle treatment
  !field.editable && "bg-muted/20 border-border/40",
)}>
```

State mapping:
- **Confirmed**: green tint border + faint green background. User sees "this is accepted."
- **Rejected with value**: destructive tint. User sees "this was rejected."
- **Error**: same destructive but stronger border.
- **Undecided/default**: neutral border, white background.
- **Locked**: muted background, softer border — intentionally feels "inert."

### Top bar layout

```tsx
<div className="flex items-center justify-between gap-3 mb-2.5">
  {/* Left: label + source badge */}
  <div className="flex items-center gap-2 min-w-0">
    <Label className={cn(
      "text-sm font-medium shrink-0",
      !field.editable && "text-muted-foreground",
    )}>
      {field.label}
      {field.required && (
        <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
      )}
    </Label>
    <SourceBadge source={field.source} />
    {!field.editable && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0 cursor-default" aria-label="This field is locked" />
        </TooltipTrigger>
        <TooltipContent side="top">
          {field.editabilityReason}
        </TooltipContent>
      </Tooltip>
    )}
  </div>

  {/* Right: decision toggle group */}
  {field.editable && (
    <DecisionToggle
      decision={field.decision}
      onConfirm={() => updateField(field.key, { decision: "confirm" })}
      onReject={() => updateField(field.key, { decision: "reject" })}
      disabled={submitting}
    />
  )}
  {!field.editable && (
    <LockedDecisionIndicator decision={field.decision} />
  )}
</div>
```

Design rationale for the Lock icon: locked fields (company, location) should not display a grayed-out confirm/reject toggle — that would imply editability is possible. Instead a lock icon + tooltip makes the constraint explicit and provides the reason on demand. This is affordance theory: the control communicates its own interactability.

---

## 7. DecisionToggle Component

This is the most critical interaction element. The current implementation uses two separate outline buttons that are too small and visually disconnected.

### Design: inline segmented toggle

```tsx
function DecisionToggle({
  decision,
  onConfirm,
  onReject,
  disabled,
}: {
  decision: DraftConfirmationFieldDecision;
  onConfirm: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Field decision"
      className="inline-flex rounded-md border border-border overflow-hidden shrink-0"
    >
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        aria-pressed={decision === "confirm"}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
          "border-r border-border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          decision === "confirm"
            ? "bg-success text-success-foreground"
            : "bg-background text-muted-foreground hover:bg-success/10 hover:text-success-foreground",
        )}
      >
        <Check className="h-3 w-3" />
        Confirm
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={disabled}
        aria-pressed={decision === "reject"}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          decision === "reject"
            ? "bg-destructive text-destructive-foreground"
            : "bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        <X className="h-3 w-3" />
        Reject
      </button>
    </div>
  );
}
```

### States

| State | Confirm button | Reject button |
|---|---|---|
| Confirm active | `bg-success text-success-foreground` (solid green) | `bg-background text-muted-foreground` (neutral) |
| Reject active | `bg-background text-muted-foreground` (neutral) | `bg-destructive text-destructive-foreground` (solid red) |
| Neither (impossible — default is auto-set in buildFieldState) | Both neutral | Both neutral |
| Hover (confirm) | `hover:bg-success/10 hover:text-success-foreground` | unchanged |
| Hover (reject) | unchanged | `hover:bg-destructive/10 hover:text-destructive` |
| Disabled | `opacity-40 cursor-not-allowed` on both | same |

Design rationale: A single bordered group with two segments reads as a binary choice, which is exactly what it is. The active state fills the segment with a solid semantic color — no ambiguity about what was chosen. The inactive segment stays neutral so the contrast of the active one is maximal. This is substantially more legible than two independent outline buttons where both might look "active" simultaneously.

### LockedDecisionIndicator (non-editable fields)

```tsx
function LockedDecisionIndicator({
  decision,
}: {
  decision: DraftConfirmationFieldDecision;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium",
      decision === "confirm"
        ? "border-success/40 bg-success/10 text-success-foreground dark:text-success"
        : "border-muted-foreground/20 bg-muted text-muted-foreground",
    )}>
      {decision === "confirm"
        ? <><Check className="h-2.5 w-2.5" />Confirmed</>
        : <><X className="h-2.5 w-2.5" />Not set</>}
    </span>
  );
}
```

Locked fields show a read-only status badge instead of interactive controls. Company and location are always confirmed when a value is present; the visual feedback acknowledges that without inviting interaction.

---

## 8. Input Zone (within field row)

### Editable fields

```tsx
{field.editable && (
  <FieldInput
    fieldKey={field.key}
    value={field.value}
    onChange={(value) => updateField(field.key, { value })}
    placeholder={field.placeholder ?? "Pending"}
    disabled={submitting}
    hasError={!!fieldErrors[field.key]}
  />
)}
```

The `FieldInput` component keeps the existing Textarea (composition) / Input split but adds error styling:

```tsx
// Input variant with error state
<Input
  className={cn(
    "h-9 text-sm",
    hasError && "border-destructive focus-visible:ring-destructive/30",
  )}
  ...
/>
```

### Locked fields (company, location)

Do not render `<Input>`. Render a locked value display:

```tsx
{!field.editable && (
  <div className={cn(
    "flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-3 h-9",
  )}>
    {field.value
      ? <span className="text-sm text-muted-foreground">{field.value}</span>
      : <span className="text-sm text-muted-foreground/50 italic">Not set</span>
    }
  </div>
)}
```

Design rationale: Rendering a `<Input disabled>` for locked fields creates a paradox — it looks like a field that can be edited. A styled non-interactive `<div>` with the same geometry communicates "this is a display, not a control." This is the difference between a disabled affordance and an absent affordance.

---

## 9. Error and Hint Zone (bottom of field row)

```tsx
{/* Error message */}
{fieldErrors[field.key] && (
  <p
    role="alert"
    className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive"
  >
    <AlertCircle className="h-3 w-3 shrink-0" />
    {fieldErrors[field.key]}
  </p>
)}

{/* Lock hint — only for non-editable, no error */}
{!field.editable && field.editabilityReason && !fieldErrors[field.key] && (
  <p className="mt-1.5 text-[11px] text-muted-foreground/70">
    {field.editabilityReason}
  </p>
)}
```

Note: Lock hint is suppressed when there is an error, so both never render simultaneously.

---

## 10. Source Badge (SourceBadge subcomponent)

Replace the current outline Badge + className with a typed component:

```tsx
const SOURCE_BADGE_CLASSES: Record<DraftConfirmationFieldSource, string> = {
  ai_detected:
    "border-info/40 bg-info/10 text-info-foreground dark:text-info",
  manual_override:
    "border-success/40 bg-success/10 text-success-foreground dark:text-success",
  pending:
    "border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
};

const SOURCE_ICONS: Record<DraftConfirmationFieldSource, ComponentType<{className?: string}>> = {
  ai_detected: Sparkles,    // from lucide-react
  manual_override: Pencil,  // from lucide-react
  pending: Clock,           // from lucide-react
};

function SourceBadge({ source }: { source: DraftConfirmationFieldSource }) {
  const Icon = SOURCE_ICONS[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        SOURCE_BADGE_CLASSES[source],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {SOURCE_LABELS[source]}
    </span>
  );
}
```

Adding an icon to the source badge makes the three sources distinguishable at a glance without relying solely on color — important for accessibility.

---

## 11. Footer Zone

```tsx
<div className="px-6 py-4 border-t border-border/50 bg-background flex items-center justify-between gap-3">
  {/* Left: informational hint when there are validation errors */}
  <div className="flex-1 min-w-0">
    {Object.keys(fieldErrors).length > 0 && !submitting && (
      <p className="text-xs text-destructive flex items-center gap-1.5">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Complete required fields above before confirming.
      </p>
    )}
  </div>

  {/* Right: actions */}
  <div className="flex items-center gap-2 shrink-0">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => closeDraftConfirmation()}
      disabled={submitting}
      className="text-muted-foreground hover:text-foreground"
    >
      Cancel
    </Button>
    <Button
      size="sm"
      onClick={() => { void handleConfirmDraft(); }}
      disabled={submitting || loading || !contract || missingBaseFields.length > 0}
      className={cn(
        "min-w-[120px]",
        missingBaseFields.length === 0 && !submitting && "bg-success hover:bg-success/90 text-success-foreground",
      )}
    >
      {submitting ? (
        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Confirming...</>
      ) : (
        <><Check className="h-3.5 w-3.5 mr-1.5" />Confirm Draft</>
      )}
    </Button>
  </div>
</div>
```

Design decisions:
- **Ghost Cancel** rather than outline: the secondary action should recede visually. Ghost with muted foreground is clearly secondary without adding border noise next to the primary button.
- **Confirm Draft turns green** when all required fields are satisfied: positive reinforcement, communicates "you're ready." The button color change is a micro-signal that eliminates the need to re-read the readiness zone.
- **Confirm Draft is disabled** when `missingBaseFields.length > 0`: prevents premature submit. The inline footer error message explains why, without a toast.
- **`min-w-[120px]`**: prevents layout shift between "Confirm Draft" and "Confirming..." states.
- **Footer is `bg-background`** not transparent so it doesn't bleed the scrollable field list when content scrolls behind it.

---

## 12. Loading State

Replace the centered spinner with a skeleton layout that matches the section structure:

```tsx
{loading && (
  <div className="flex-1 px-6 py-4 space-y-5">
    {/* Readiness skeleton */}
    <div className="space-y-2">
      <div className="h-3 w-40 rounded bg-muted animate-pulse" />
      <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
    </div>
    {/* Group skeletons */}
    {["Identity", "Material", "Operations"].map((group) => (
      <div key={group} className="space-y-2">
        <div className="h-2.5 w-16 rounded bg-muted/80 animate-pulse" />
        {Array.from({ length: group === "Material" ? 3 : group === "Identity" ? 2 : 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    ))}
  </div>
)}
```

Skeleton loading preserves spatial familiarity — the user knows where the Identity section will be before it loads.

---

## 13. Complete State Map

| Scenario | Visual treatment |
|---|---|
| Loading | Skeleton layout matching section structure |
| Field: confirmed, has value | Row: green border + bg, toggle: Confirm segment filled green |
| Field: rejected, had value | Row: red tint border + bg, toggle: Reject segment filled red |
| Field: locked, confirmed | Row: muted bg, lock icon, read-only value div, LockedDecisionIndicator |
| Field: error | Row: red border, error message with icon below input |
| Field: source = ai_detected | Sparkles icon + teal badge |
| Field: source = manual_override | Pencil icon + green badge |
| Field: source = pending | Clock icon + amber badge |
| Required fields missing | Warning chips in readiness zone, progress bar amber, Confirm button disabled |
| All required fields met | Progress bar primary or success, Confirm button turns green |
| Submitting | All inputs + buttons disabled, Confirm button shows spinner + "Confirming..." |
| Submit error | Toast (existing pattern), buttons re-enabled |

---

## 14. Component Hierarchy

```
DraftConfirmationDialog                          (renamed from DraftConfirmationSheet)
  Dialog                                         (replaces Sheet)
  DialogContent                                  (p-0, max-h-90vh, flex col)
    DialogHeader                                 (px-6 pt-5 pb-4, border-b)
      DialogTitle                                (Sparkles icon + "Needs Confirmation")
      DialogDescription
      SourcePillGroup                            (new: AI/Manual/Pending counts)
        SourcePill × 3
    ReadinessZone                               (new: px-6 py-3, border-b, muted bg)
      Progress                                   (shadcn Progress component)
      MissingFieldChips                          (conditional)
    ScrollArea (flex-1 min-h-0)
      div (px-6 py-4 space-y-5)
        FieldGroup × 3                           (Identity / Material / Operations)
          GroupHeader
          FieldRow × n
            FieldRowOuter                        (border, bg, state-driven)
              TopBar
                Label + RequiredAsterisk
                SourceBadge                      (new typed component)
                LockIcon + Tooltip               (conditional, non-editable)
                DecisionToggle                   (new segmented toggle)
                LockedDecisionIndicator          (new, non-editable only)
              InputZone
                FieldInput                       (existing, + error class)
                LockedValueDisplay               (new div, non-editable only)
              ErrorAndHintZone
                ErrorMessage                     (conditional)
                LockHint                         (conditional)
    FooterZone                                   (px-6 py-4, border-t, bg-background)
      FooterInlineError                          (conditional)
      Button (ghost) "Cancel"
      Button (primary→success) "Confirm Draft"
```

---

## 15. Imports to add / change

Remove: `Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle`

Add:
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Check, Clock, Lock, Pencil, Sparkles, X } from "lucide-react";
```

Remove existing: `Sparkles` (keep — already imported), `Check`, `X` (keep).
Add new: `AlertCircle`, `Clock`, `Lock`, `Pencil`.

---

## 16. Derived values needed in render

These values must be computed before the render (useMemo or inline):

```tsx
const confirmedCount = contract
  ? FIELD_ORDER.filter((k) => contract.fields[k].decision === "confirm").length
  : 0;

const aiCount = contract
  ? FIELD_ORDER.filter((k) => contract.fields[k].source === "ai_detected").length
  : 0;
const manualCount = contract
  ? FIELD_ORDER.filter((k) => contract.fields[k].source === "manual_override").length
  : 0;
const pendingSourceCount = contract
  ? FIELD_ORDER.filter((k) => contract.fields[k].source === "pending").length
  : 0;

const pendingRequiredCount = missingBaseFields.length;

const TOTAL_FIELDS = FIELD_ORDER.length; // 8
```

---

## 17. Accessibility requirements

- `role="group"` on DecisionToggle with `aria-label="Field decision"` (already in spec above)
- `aria-pressed` on each toggle button (already in spec above)
- `role="alert"` on field error messages (already in spec above)
- Lock icon uses `aria-label="This field is locked"` — icon itself is non-decorative
- Required asterisk uses `aria-hidden="true"` — Label already conveys required via field.required
- Progress element: Radix ProgressPrimitive.Root already sets `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `DialogTitle` and `DialogDescription` are always rendered (Radix a11y requirement) — currently satisfied
- Keyboard: Tab order is header → (readiness zone non-interactive) → field rows → footer. Within each field row: Label (non-interactive) → DecisionToggle confirm button → DecisionToggle reject button → Input/Textarea
- Focus trap: handled by Radix Dialog primitive
- Escape to close: handled by Radix Dialog — already calls `closeDraftConfirmation()` via `onOpenChange`

---

## 18. Responsive behavior

The dialog uses `sm:max-w-2xl`. Below the `sm` breakpoint (640px), it falls back to `max-w-[calc(100%-2rem)]` which is full-width minus 16px margin. The field groups stack naturally. The DecisionToggle is `shrink-0` so it will not compress — on very narrow screens the top bar may need to become a two-row layout:

For mobile, wrap the top bar in `flex-wrap`:
```tsx
<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-2.5">
```

This allows the decision toggle to drop to a second line if the label+badge combination is wide.

---

## 19. Unresolved questions

None — all behavioral logic (validation, submit flow, data building) is explicitly unchanged. The spec covers purely visual/structural changes.
