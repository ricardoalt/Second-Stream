# Polish Pass: Needs Confirmation Dialog

## Context

Redesign already implemented (Sheet→Dialog, groups, readiness bar, semantic colors). This pass addresses 14 micro-interaction, contrast, and accessibility issues found in UX review. Single file change.

## File

`frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx`

## Changes

### 1. Decision buttons — size + inactive state (HIGH)
`FieldDecisionButton`: `h-6 px-1.5 text-[10px] gap-0.5` → `h-7 px-2 text-xs gap-1`, icon `size-2.5` → `size-3`.
Replace `!active && "opacity-50 hover:opacity-80"` with `!active && "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"`.
Active states keep current success/destructive colors.

### 2. Resolved row left-border accent (HIGH)
`ConfirmationFieldRow` resolved state: add `border-l-2 border-l-success/40`.
Unresolved: add `border-l-2 border-l-warning/60`.
Error: add `border-l-2 border-l-destructive/50`.
Matches `stream-row.tsx` BUCKET_BORDER convention.

### 3. ScrollArea height fix (HIGH)
`max-h-[60vh]` → `max-h-[min(60vh,calc(100dvh-220px))]`.
Prevents dialog overflow on 720px viewports where header+footer consume ~220px.

### 4. Footer CTA size (MEDIUM)
Confirm button: `size="sm"` → `size="default"`. Cancel stays `size="sm"`.

### 5. ReadinessSummary overflow (MEDIUM)
Wrap status text in `truncate max-w-[260px]`. Add Tooltip with full missing-fields list on hover.
Requires adding Tooltip imports.

### 6. Group header spacing (MEDIUM)
Group header div: add `mb-1`. Separator: `my-0.5` → `my-1.5`.

### 7. Source badge legibility (MEDIUM)
`text-[9px] h-4 gap-0.5` → `text-[10px] h-[18px] gap-1`. Icon `size-2` → `size-2.5`.

### 8. Lock icon tooltip (MEDIUM)
Wrap Lock icon in `Tooltip` showing `editabilityReason`. Bump `size-3` → `size-3.5`, `muted-foreground/50` → `muted-foreground/70`.
Add `cursor-not-allowed` on row div when `!field.editable`.
Remove the bottom text `editabilityReason` paragraph (now in tooltip).

### 9. Textarea resize (MEDIUM)
Add `resize-none` to composition Textarea className.

### 10. Accessible indicator dot (LOW)
Add `aria-hidden="true"` to the resolved/pending indicator div.

### 11. aria-live on readiness (LOW)
Add `aria-live="polite" aria-atomic="true"` to ReadinessSummary status text container.

### 12. DialogTitle leading (LOW)
Add `leading-snug` to DialogTitle className.

### 13. bg-warning/3 → bg-warning/8 (LOW)
Unresolved field row: `bg-warning/3` → `bg-warning/8`.

### 14. Footer status text contrast (LOW)
Pending state: `text-muted-foreground` → `text-warning-foreground dark:text-warning`.

## Additional import needed

```ts
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

## Verification

- `cd frontend && bun run check:ci`
- Manual: open draft, verify decision buttons feel clickable (not faded), resolved rows show green left accent, scroll works on small viewport, lock fields show tooltip on hover, footer CTA is visually dominant
