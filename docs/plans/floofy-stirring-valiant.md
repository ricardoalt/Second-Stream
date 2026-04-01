# Stream Workspace UI/UX Premium Redesign

## Context

The stream workspace (`/streams/[id]`) currently renders a 4-phase guided questionnaire as flat section cards with all fields visible at once. This creates a "government form" feel — long, flat, and overwhelming. The goal is to transform it into a premium, clean, dynamic workspace that feels like a modern SaaS tool (similar to Linear/Notion workspace patterns), not a scrolling form.

**Constraint**: UI/UX only — zero logic changes. Same data flow, same autosave, same AI suggestions.

## Files to Modify

| File | Change Scope |
|------|-------------|
| `frontend/components/features/streams/stream-workspace-form.tsx` | Major — accordion sections, progress tracking, field styling |
| `frontend/components/features/streams/stream-detail-page-content.tsx` | Moderate — header, phase summary bar, sticky navigation |
| `frontend/components/features/streams/stream-phase-stepper.tsx` | Moderate — progress rings, better visual weight |
| `frontend/components/features/streams/stream-quick-capture-card.tsx` | Minor — premium polish, tighter styling |

## Reusable Components

- `Accordion` / `AccordionItem` / `AccordionTrigger` / `AccordionContent` — `@/components/ui/accordion`
- `Progress` — `@/components/ui/progress` (thin progress bar, Radix-based)
- `Badge` — `@/components/ui/badge` (status indicators)
- `Tooltip` / `TooltipTrigger` / `TooltipContent` — `@/components/ui/tooltip`
- `Separator` — `@/components/ui/separator`
- `motion` from `framer-motion` (already used in streams-all-table, streams-drafts-table)
- Design tokens: `bg-surface-container-lowest`, `bg-surface-container-low`, `font-display`, `shadow-xs`

---

## Change 1: Accordion Sections in `stream-workspace-form.tsx`

**Current**: Flat section cards — all fields in phase visible simultaneously in `rounded-xl bg-surface-container-lowest p-5 shadow-xs` containers.

**New**: Accordion-based sections with progressive disclosure.

### Section trigger (collapsed state)
```
[icon] Section Name                    3/9 completed  [===----] [▼]
```
- Left: section icon in `rounded-lg bg-primary/10` container (existing pattern) + section name
- Center-right: completion badge `"X/Y"` in a `Badge` variant + thin `Progress` bar (80px wide, h-1.5)
- Right: chevron indicator (from Accordion primitive)
- Completed sections: success tint — green check icon replaces section icon, `bg-success/5` background

### Section content (expanded state)
- Same 2-column field grid as current
- Add `motion.div` wrapper with stagger animation for fields (`delay: index * 0.03`, `opacity` + `y: 8`)
- Better spacing: `gap-y-6 gap-x-8` (up from `gap-y-5 gap-x-6`)

### Accordion behavior
- `type="multiple"` — allow multiple sections open simultaneously
- `defaultValue`: first section with incomplete fields opens by default
- Compute from `answers` prop: count non-empty answers per section

### Helper function (pure UI computation, no logic change)
```ts
function countSectionCompletion(questions: StreamQuestionDefinition[], answers: Record<string, string>): { completed: number; total: number }
```
Counts truthy entries in `answers` for the section's question IDs.

### Styling changes to AccordionItem
- Override default `border-b` with `rounded-xl bg-surface-container-lowest shadow-xs border-0 mb-3`
- AccordionTrigger: `p-5 hover:no-underline` (remove default underline)
- AccordionContent: `px-5 pb-5`
- Active/open state: subtle `ring-1 ring-primary/10` highlight

---

## Change 2: Enhanced Field Rendering in `stream-workspace-form.tsx`

### Completed field styling
- When `value` is truthy and no AI suggestion: add subtle `border-success/20` left border on the field container
- Label gets a tiny `Check` icon (10px, text-success/50) after the text

### Empty field styling
- Unchanged (current neutral style)

### AI suggestion strip
- Current: flat `bg-primary/5` strip
- New: slight glassmorphism — `bg-primary/5 backdrop-blur-sm border-primary/10` with a subtle gradient shimmer on the AI badge
- Suggestion text slightly larger: `text-xs` (up from `text-[11px]`)

### Field entrance animation
- Wrap each `QuestionField` in `motion.div` with:
  - `initial={{ opacity: 0, y: 8 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `transition={{ delay: index * 0.03, duration: 0.2 }}`

---

## Change 3: Phase Summary Bar in `stream-detail-page-content.tsx`

Insert between `StreamPhaseStepper` and the main content grid.

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Stream Snapshot    5 of 9 fields · 2 AI ready  │  [====-------] 56%
└─────────────────────────────────────────────────────────┘
```

- Single-line bar: `rounded-xl bg-surface-container-low/60 px-5 py-3`
- Left: phase label (bold) + field completion count + AI suggestion count
- Right: `Progress` component (120px, h-1.5) + percentage text
- Compute from `questionnaireAnswers` and `questionnaireSuggestions` for active phase

---

## Change 4: Enhanced Header in `stream-detail-page-content.tsx`

### Current
- Breadcrumb + "Complete Stream Information" title + Files/Contacts buttons

### New
- Same breadcrumb (keep)
- Material name as primary heading: `font-display text-2xl font-bold` (currently generic title)
- Subtitle: "Complete Stream Information" moves to a `text-sm text-muted-foreground` subtitle
- Add overall progress: `Badge` with "X/31 fields completed" in the header row
- Files/Contacts buttons: unchanged but add file count badge if available

---

## Change 5: Enhanced Phase Stepper in `stream-phase-stepper.tsx`

### Current
- Basic circles (size-8/10) with numbers or checkmarks + connector lines

### New
- Circles stay similar size but get a subtle progress ring around them
- Each step shows a mini `CircularGauge`-inspired ring (SVG, 36px) showing that phase's completion %
- Active phase: `ring-2 ring-primary/30 ring-offset-2` glow effect + larger shadow
- Completed phase: solid `bg-success` fill with white check (instead of primary color)
- Connector lines: use gradient transition from completed to incomplete instead of binary color

### Implementation
- Add a `phaseCompletionPercent` prop: `Record<StreamPhase, number>` (0-100)
- Compute in parent from `questionnaireAnswers` per phase
- Render a tiny SVG ring (circumference math, same pattern as `CircularGauge` but 36px diameter, 3px stroke)
- Keep labels below, add percent text on hover via `Tooltip`

---

## Change 6: Sticky Phase Navigation in `stream-detail-page-content.tsx`

### Current
- Phase nav buttons at bottom of form column, scroll away

### New
- Wrap in `sticky bottom-0` container with `bg-background/80 backdrop-blur-sm` + top border
- Add `py-3 -mx-1 px-1` for breathing room
- Save status text remains centered between prev/next buttons
- Subtle `shadow-[0_-4px_12px_rgba(0,0,0,0.04)]` for floating effect

---

## Change 7: Quick Capture Sidebar Polish in `stream-quick-capture-card.tsx`

### Current
- "Quick Capture" heading + drop zone + 3 action buttons

### New
- Wrap entire sidebar in a `rounded-xl bg-surface-container-lowest shadow-xs p-4` card
- "Quick Capture" heading: add `Sparkles` icon (tiny, 12px) next to text
- Drop zone: slightly smaller padding, `py-3` instead of `py-4`
- Action buttons: more compact — reduce icon container from `size-11` to `size-9`, `rounded-lg` instead of `rounded-xl`
- Add subtle gradient border on hover: `hover:ring-1 hover:ring-primary/20`

---

## Implementation Order

1. `stream-workspace-form.tsx` — accordion + field progress (biggest visual impact)
2. `stream-detail-page-content.tsx` — header + phase summary + sticky nav
3. `stream-phase-stepper.tsx` — progress rings
4. `stream-quick-capture-card.tsx` — polish

## Verification

1. `cd frontend && bun run check:ci` — lint/type check
2. Visual: navigate to `/streams/[id]` — verify:
   - Sections collapse/expand with animation
   - Progress indicators update as fields are filled
   - AI suggestion banners render correctly in accordion context
   - Phase stepper shows completion rings
   - Bottom nav is sticky
   - Quick capture sidebar matches polish
3. Responsive: check `xl` breakpoint grid behavior (sidebar wraps below on smaller screens)
4. No logic changes: autosave still triggers, AI accept/reject still works, phase navigation still works
