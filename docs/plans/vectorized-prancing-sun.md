# Discovery Wizard — Premium UI/UX Redesign

## Context

The Discovery Wizard was implemented with functional-but-plain styling. This redesign transforms it into a visually premium interface using the project's existing glass morphism design system, Framer Motion animations, and aquatic theme — matching the user's wireframes while adding polish.

**Single file change:** `frontend/components/features/discovery-wizard/discovery-wizard.tsx`

## Import Changes

**Add:**
- `AnimatePresence, motion` from `"framer-motion"`
- `ArrowDown, Users` from `"lucide-react"`
- `DialogTitle` from `"@/components/ui/dialog"`

**Remove:**
- `Separator` from `"@/components/ui/separator"` (replaced by custom separator)
- `ReactElement` type import (unused after rewrite)

## Animation Constants (module-level, after CONSTANTS block)

```ts
const phaseVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};
const phaseTransition = { duration: 0.3, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const staggerItem = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
const resultCardVariants = {
  initial: { opacity: 0, scale: 0.92, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
};
```

## Main Render — AnimatePresence

Wrap all phase rendering in `<AnimatePresence mode="wait">`. Each phase gets `<motion.div key={phaseKey} variants={phaseVariants} ...>` for smooth cross-fade transitions.

```tsx
<DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" showCloseButton={!isBlocking}>
  <AnimatePresence mode="wait">
    {phase === "idle" && <motion.div key="idle" ...><IdleView .../></motion.div>}
    {(phase === "submitting" || phase === "processing") && <motion.div key="processing" ...><ProcessingView .../></motion.div>}
    {phase === "result" && result && <motion.div key="result" ...><ResultView .../></motion.div>}
    {phase === "error" && <motion.div key="error" ...><ErrorView .../></motion.div>}
  </AnimatePresence>
</DialogContent>
```

## IdleView Layout (matches wireframes)

```
┌─ DialogTitle: "Discovery Wizard" (centered, font-display) ── [X] ┐
│                                                                     │
│  ┌─ Drop zone (glass-liquid-subtle, rounded-xl, dashed) ────────┐ │
│  │                                                                │ │
│  │  Empty: 4 file-type icons (PDF/CSV/XLSX/IMG) in row           │ │
│  │         "Upload Files" + "Drag or upload files for discovery"  │ │
│  │                                                                │ │
│  │  Filled: aqua-floating-chip per file + audio                  │ │
│  │          [Add files] [Add audio] ghost buttons                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ──────────── h-px bg-border/40 ── [↓ ArrowDown circle] ───────── │
│                                                                     │
│  textarea (bg-muted/30, rounded-xl, ring-primary/20 focus)        │
│                                                                     │
│  ┌─ Toolbar (border-t border-border/30 bg-muted/20) ─────────────┐│
│  │ [CompanyCombobox]  [🎤 rounded-full]  [Discover gradient+shadow]││
│  └────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Design system classes used:
| Element | Classes |
|---------|---------|
| Drop zone | `glass-liquid-subtle rounded-xl border-2 border-dashed border-border/50` |
| Drag active | `border-primary/60 bg-primary/[0.06] shadow-water` |
| File type icons (empty) | `rounded-lg bg-primary/[0.06] p-2.5` + tiny uppercase labels |
| File chips | `aqua-floating-chip` (existing class: gradient bg, rounded-full, backdrop-blur) |
| Separator | Custom: `h-px bg-border/40` + absolute-centered circle with `ArrowDown` icon |
| Textarea | `bg-muted/30 border-border/40 rounded-xl focus:ring-primary/20` |
| Toolbar | `border-t border-border/30 bg-muted/20 px-8 py-4` |
| Mic button | `rounded-full hover:bg-primary/[0.06] hover:text-primary` |
| Discover button | `rounded-xl font-display bg-gradient-to-r from-primary to-primary/90 shadow-water hover:shadow-water-lg` |

### Key details:
- Padding: `px-8` throughout (generous whitespace)
- `DialogTitle` for a11y (centered, `font-display text-xl font-semibold`)
- Empty drop zone: clickable `<button>` wrapping file-type icons + text
- Filled drop zone: chips with `<X>` remove buttons + "Add files"/"Add audio" ghost buttons
- Separator: absolute-positioned circle (`rounded-full border border-border/40 bg-background p-1.5`) centered on a thin line

## ProcessingView — Layered Framer Motion Circles

```
┌─────────────────────────────────────────────┐
│                                             │
│              ╭ ripple ring 1 ╮              │
│            ╭ ripple ring 2 ╮                │
│          ╭ rotating ring ╮                  │
│        ╭ breathing orb (shadow-water) ╮     │
│            🌊 Waves icon (float)            │
│                                             │
│        "Analyzing your inputs..."           │
│          "This may take a moment"           │
└─────────────────────────────────────────────┘
```

5 layered `motion.div` elements:
1. **Outer ripple 1**: `border-2 border-primary/20`, scale 1→1.8, opacity fade, 2.5s loop
2. **Outer ripple 2**: same but scale 1→1.6, 0.8s delay offset
3. **Middle ring**: `bg-primary/[0.08]`, scale pulse + rotate 0→360, 4s loop
4. **Inner orb**: `bg-gradient-to-br from-primary/30 to-primary/10 shadow-water`, breathing scale
5. **Center**: `Waves` icon with `y: [0, -4, 0]` float, 2s loop

Text: `font-display text-base font-semibold` with AnimatePresence on phase text change.
Container: `py-24` for prominent centered animation per wireframe.
`DialogTitle className="sr-only"` for a11y.

## ResultView — Vertical Stat Tiles

```
┌─────────────────────────────────────────────┐
│                                             │
│          ╭ success icon (bg-success/10) ╮   │
│               🌊 Waves (success)            │
│                                             │
│            "Ready for review"               │
│     "Drafts have been created..."           │
│                                             │
│  ┌─ aqua-metric-tile ──────────────────┐   │
│  │ [aqua-metric-icon MapPin] 3 found locations │
│  └─────────────────────────────────────┘   │
│  ┌─ aqua-metric-tile ──────────────────┐   │
│  │ [aqua-metric-icon Waves] 5 Waste streams    │
│  └─────────────────────────────────────┘   │
│  ┌─ aqua-metric-tile ──────────────────┐   │
│  │ [aqua-metric-icon Users] 2 contacts         │
│  └─────────────────────────────────────┘   │
│                                             │
│         [Go to dashboard] (gradient)        │
└─────────────────────────────────────────────┘
```

- `staggerContainer` on parent, `resultCardVariants` on each tile (0.1s stagger delay)
- Stats: `result.summary.locationsFound`, `result.summary.wasteStreamsFound`, `result.summary.draftsNeedingConfirmation`
- Each tile: `aqua-metric-tile flex items-center gap-4` with `aqua-metric-icon` for the icon box
- Count: `font-display text-2xl font-bold tabular-nums`
- Button: same gradient + shadow-water style
- `DialogTitle className="sr-only"` for a11y

## ErrorView — Minimal Premium Polish

Same structure as current but with:
- `font-display` headings
- `rounded-xl` buttons
- Gradient + shadow-water on "Try Again" CTA
- `bg-destructive/10` icon circle
- `DialogTitle className="sr-only"` for a11y

## fileIcon helper

Keep existing `fileIcon()` function — maps file extensions to lucide icons (`FileText`, `FileSpreadsheet`, `Image`).

## Verification

1. `cd frontend && bun run check:ci` — biome + build must pass
2. Manual: open wizard → verify glass drop zone, file-type icons, separator with arrow
3. Manual: add files → verify aqua-floating-chip styling, remove buttons
4. Manual: click Discover → verify AnimatePresence transition to processing view
5. Manual: verify layered animation circles render smoothly
6. Manual: verify result tiles use aqua-metric-tile with stagger animation
7. Manual: verify error view premium styling
8. Manual: verify close/reset, DialogTitle a11y
