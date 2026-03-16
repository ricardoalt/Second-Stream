# Discovery Wizard — UI/UX Polish Pass

## Context
The wizard was recently redesigned (orbital animations, gradient drop zones, stat cards, animated counters). This pass pushes it to premium tier: accessibility, micro-interactions, visual polish, responsive fixes. 8 focused changes, no over-engineering.

## Files
- `frontend/components/features/discovery-wizard/discovery-wizard.tsx`
- `frontend/app/globals.css` (1 addition)

## Reference patterns (reuse, don't reinvent)
- `cn()` — `@/lib/utils` (every other component uses it; wizard still uses template literals)
- `Loader2 + animate-spin` — `companies/page.tsx:53`, `file-uploader-sections.tsx:446`
- `motion-safe:scale-[1.005]` — `inline-drop-zone.tsx:121`
- `aria-live="polite"` — `intake-panel-content.tsx:752`, `tag-input.tsx:208`
- `@media (hover: none)` — `globals.css:2185` (suggestion-row-actions pattern)
- `text-warning` — existing theme color token

---

## Step 1: Imports — add `cn`, `Loader2`

**File:** `discovery-wizard.tsx` lines 1–25

- Add `import { cn } from "@/lib/utils"`
- Add `Loader2` to lucide-react imports

**Why:** `cn()` replaces brittle template-literal class concatenation (matches codebase convention). `Loader2` needed for button loading state (Step 4).

---

## Step 2: Accessibility — aria-live for phase transitions

**File:** `discovery-wizard.tsx` lines 534–579

Add `role="status" aria-live="polite"` to the `<div key={phase}>` wrapper. Add `aria-label` on each sub-view root:
- IdleView: `"Discovery wizard input form"`
- ProcessingView: `"Processing your inputs"`
- ResultView: `"Discovery complete"`
- ErrorView: `role="alert"` (immediate announcement)

**Why:** #1 a11y gap — screen readers get zero feedback on phase transitions.

---

## Step 3: Drop zone — accessibility + drag-over feedback + accepted types

**File:** `discovery-wizard.tsx` lines 650–744

### 3A. Semantic a11y
- Add `role="region"`, `aria-label` (dynamic: changes to "Drop files here" when `dragActive`), `tabIndex={0}`
- Add `onKeyDown`: Enter/Space → `fileInputRef.current?.click()`
- Remove `biome-ignore` comment (no longer needed with `role`)

### 3B. Drag-over text + scale
- Empty state subtitle: change from static "Drag or upload a file" to conditional:
  - `dragActive`: `"Drop files here"` in `text-primary font-medium`
  - default: `"PDF, CSV, XLSX, DOC, TXT, or images up to 10 MB"` (shows accepted types)
- Add `motion-safe:scale-[1.01]` to drag-active classes (matches `inline-drop-zone.tsx` pattern)

### 3C. Switch to `cn()` for drop zone classes
Replace template literal with `cn()` for conditional class composition.

---

## Step 4: Discover button loading state

**File:** `discovery-wizard.tsx` lines 538, 564, 828–835 + IdleView props

**Approach:** Show IdleView for both `idle` AND `submitting` phases. Pass `phase` into IdleView as prop. When `phase === "submitting"`:
- Button shows `<Loader2 className="h-4 w-4 motion-safe:animate-spin" />` + text "Uploading..."
- Button is disabled
- All other inputs disabled too (files, audio, textarea, combobox)

Change ProcessingView condition from `(submitting || processing)` to just `processing`.

**Why:** #3 gap — clicking Discover gives no immediate feedback. Users may double-click.

---

## Step 5: File chip remove buttons — larger touch targets

**File:** `discovery-wizard.tsx` lines 680–686, 700–706
**File:** `globals.css` — append after `@media (hover: none)` block at line 2189

### TSX changes
- Remove button: `h-6 w-6 flex items-center justify-center` (24px visible, was ~12px)
- Add `aria-label={`Remove ${file.name}`}` for screen readers
- Add class `discovery-chip-remove` alongside existing opacity classes

### CSS addition
```css
@media (hover: none) {
	.discovery-chip-remove { opacity: 1; }
}
```
Touch devices always show X (hover-reveal is impossible on touch).

**Why:** #4 gap — touch targets were ~12px, far below 44px recommendation.

---

## Step 6: Cmd+Enter keyboard shortcut

**File:** `discovery-wizard.tsx` — textarea `onKeyDown`

```tsx
onKeyDown={(e) => {
	if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
		e.preventDefault();
		if (canDiscover) onDiscover();
	}
}}
```

Add hint in placeholder: `"Paste notes, waste descriptions, or any relevant text... (⌘Enter to submit)"`

**Why:** #5 gap — standard in Linear, Notion, Slack. Zero-risk, high-satisfaction.

---

## Step 7: Text validation — char counter + warning color

**File:** `discovery-wizard.tsx` lines 792–798

Replace validation message with:
- Countdown text: `"X more characters needed"` in `text-warning` (not `text-muted-foreground`)
- Right-aligned character count: `trimmedText.length` in `tabular-nums`
- `aria-describedby` on textarea linking to hint `id`
- `role="status"` on the hint so screen readers announce changes

Use `cn()` for conditional color: warning below threshold, muted above.

**Why:** #7 gap — current feedback too subtle, no char count, no aria connection.

---

## Step 8: Result stat cards — distinct accent colors

**File:** `discovery-wizard.tsx` lines 891–909

Change from all-emerald to distinct semantic colors:
- MapPin (locations): `bg-blue-500/10 text-blue-600`
- Waves (waste streams): `bg-emerald-500/10 text-emerald-600`
- FileText (drafts): `bg-amber-500/10 text-amber-600`

**Why:** #12 gap — all-emerald creates visual monotony. Distinct colors = scannable at a glance.

---

## Bonus: Footer mobile reflow

**File:** `discovery-wizard.tsx` line 802

Add `flex-wrap` to footer container so CompanyCombobox, Audio button, and Discover button reflow on narrow screens instead of squeezing.

---

## Verification
1. `cd frontend && bun run check:ci` — biome lint + type check pass
2. Manual: open wizard → verify all 4 phases visually
3. Tab through all controls — focus order logical, drop zone focusable
4. Screen reader: verify phase change announcements (VoiceOver on Mac)
5. Resize to mobile width — footer reflows, touch targets adequate
6. Type < 20 chars in textarea — see warning color + char count
7. Cmd+Enter submits when `canDiscover` is true
8. Click Discover — see spinner + "Uploading..." before orbital view
