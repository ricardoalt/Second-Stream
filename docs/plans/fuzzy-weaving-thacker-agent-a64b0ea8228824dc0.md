# Dashboard UI/UX Design Spec
## Operational Waste-Stream Dashboard + Confirmation Drawer

---

## 1. Dashboard Page Layout (`app/dashboard/page.tsx`)

### What changes
The outer `space-y-6` creates uniform gaps that flatten visual hierarchy. The header and bucket tabs should feel like one continuous header zone, not two independent items. The BucketTabs and the panel below them are a single unit — remove the visual gap between them.

### Why
The header-to-bucket-to-panel flow should read as: "where am I" → "what bucket am I in" → "what's in this bucket". Uniform `space-y-6` interrupts this reading path and creates noise. Reducing the gap between BucketTabs and the panel reinforces their parent-child relationship.

### Exact specs

**`DashboardContent` wrapper:** Change `space-y-6` to `space-y-5`.

**Between header and bucket block:** Keep existing gap (`space-y-5` handles it).

**Between BucketTabs and the panel:** Remove the intermediate `<div>` gap entirely. The `mb-4` on the BucketTabs grid already provides 16px (one `--space-md`). The panel itself has `rounded-lg border border-border/40 bg-card/30 p-4`. Keep it exactly. This creates a 16px breath between tabs and panel — enough separation without breaking the visual grouping.

**Panel internal padding:** Change `p-4` to `px-4 pt-3 pb-4` on the tabpanel div. This tightens the top so the column headers (when visible) sit closer to the tab, continuing the vertical flow.

**`total` bucket flex layout:** Change `gap-6` between main and aside to `gap-5`. The sidebar is 320px (`w-80`); this is decorative spacing, not structural.

---

## 2. DashboardHeader

### What changes
- Search input: reduce visual prominence of the border, extend max-width slightly
- CTA button: replace ghost-ish "Discovery Wizard" with a more direct label
- Input clear button (`X`): increase tap target size

### Why
The header is ambient — users don't actively interact with it on every visit. The current `max-w-sm` (384px) is narrow on large viewports, wasting horizontal space. The CTA label "Discovery Wizard" is brand language rather than task language; it should communicate the action.

### Exact specs

**Search container:** Change `max-w-sm` to `max-w-md`. Keep `flex-1 min-w-[200px]`.

**Input:** Current `h-9` is fine. Add `bg-background/60 border-border/50 focus:border-border focus:bg-background` to give it a slightly recessed feel at rest and full presence on focus. Keep `pl-9 pr-9`.

**Search icon:** Change `text-muted-foreground` to `text-muted-foreground/60` at rest. No other changes.

**Clear button hit area:** Wrap the existing `X` button in a `p-1 -m-1` to enlarge the hit target without changing visual size. Keep existing classes.

**CTA button:** Change label to `New Stream`. The `<Plus>` icon stays. Keep `size="sm"` and `gap-1.5`. Use `className="gap-1.5 font-medium"`. Responsive text stays: `hidden sm:inline` for full label, `sm:hidden` for short version (change short to `New`).

No structural changes. This is intentionally minimal — the header is working.

---

## 3. BucketTabs

### What changes
Three things: (a) remove the description text entirely, (b) make the count the clear hero with larger type, (c) tighten vertical padding so the cards feel like navigation, not stat widgets.

### Why
The description text ("Streams awaiting human review", etc.) adds cognitive load without operational value. The user learns what each bucket means from experience, not from 11px tooltip text below a number. The current 3.5/4/1.5-level font hierarchy (label 11px → count 2xl → description 11px) creates visual clutter by returning to small type after the count.

Operational tabs should feel like tabs — compact, scannable horizontally, switching quickly. The current `py-3.5` and presence of description make each card tall enough to feel like a widget rather than a tab selector.

### Exact specs

**Grid:** Change `gap-3` to `gap-2`. This pulls the cards slightly tighter, reinforcing that they are a single navigation unit.

**Button padding:** Change `px-4 py-3.5` to `px-3.5 py-3`. Reduces height from ~88px to ~72px.

**Gap between label and count:** Change `gap-1.5` to `gap-1`.

**Label:** Keep `text-[11px] font-semibold uppercase tracking-wider leading-none`. Change color logic:
- Active: `text-foreground/90`
- Inactive: `text-muted-foreground/70`

**Count:** Change `text-2xl` to `text-[26px]` (26px — slightly larger than 2xl/24px, stays within the font-display range). Keep `font-semibold tabular-nums leading-none`. Add `font-display` class to leverage DM Sans weight for numerals.

**Status badge (pill):** Keep as-is but remove from the count row. Move it to sit inline-right of the label on the same line:
```
[LABEL TEXT .............. PILL]
[COUNT                         ]
```
Achieve this by changing the button inner layout from `flex flex-col gap-1` to:
```
flex flex-col gap-1
  row 1: flex items-center justify-between
    <span>LABEL</span>
    <Badge>PILL</Badge>  {only if count > 0}
  row 2: count span
```

Remove the `<span>` description text entirely. No replacement.

**Active state:** Keep `bg-accent/40 border-border/60 shadow-sm ring-1 ring-primary/20`.

**Inactive state:** Keep `bg-card/40 border-border/30`.

**Top border accent:** Keep `border-t-2` with existing semantic colors. This is the clearest semantic differentiator and should stay prominent.

**Status badge sizing:** Change `h-4` to `h-[18px]` and `text-[10px]` to `text-[10px]`. This makes the pill slightly taller than the label text, giving it visual weight as a status indicator rather than a decoration.

---

## 4. PersistedStreamTable

### What changes
- Column header row: reduce visual weight
- Count/sort bar above the headers: combine into single line
- Pagination: de-emphasize "Previous/Next" labels
- Stagger animation: keep but reduce to 0.03s per item

### Why
The column headers currently use `text-[11px] font-semibold uppercase tracking-wider` — same type treatment as the bucket tab labels. Two components with identical label styling compete for the "navigation" signal. Table headers should feel subordinate to bucket tabs.

The count row (`14 streams` + `Recent` sort label) and column header row are visually disconnected even though they serve the same zone. Eliminating the `pb-1` gap between them helps.

### Exact specs

**Count/sort row:** The existing `px-1 pb-1` div. Change count text from `text-xs` to `text-[11px]`. Change the `Recent` label to `text-[11px]`. Add `pb-0` to remove bottom padding and let the border below the column headers handle separation.

**Column headers div:** Change `py-2` to `py-1.5`. Change `font-semibold` to `font-medium`. Keep `text-[11px] uppercase tracking-wider text-muted-foreground`. Change border from `border-b border-border/30` to `border-b border-border/20`. This visually recedes the header row.

**Row gap:** Change `space-y-1.5` on the motion div to `space-y-1`. Rows are already card-like; 4px gap (space-y-1) creates a more compact list feel than 6px.

**Stagger:** Change `staggerChildren: 0.04` to `staggerChildren: 0.03`. 0.04s feels slightly slow with 10+ items.

**Pagination:** Currently uses `Button variant="outline" size="sm"`. No visual change needed. But change label text from `"Previous"` / `"Next"` to `"← Prev"` / `"Next →"` using arrow characters (not Lucide icons) to reduce icon overhead. The `Loader2` spinner on Next stays.

**TableSkeleton:** Currently shows 5 skeletons. Reduce to 4. No other changes.

---

## 5. StreamRow (PersistedRow)

### What changes
- Remove `rounded-lg` from the row border — use `rounded-md` instead
- The left border should be 2px, not the Tailwind `border-l-3` approximation
- Reduce the `gap-4` between columns to `gap-3`
- Name text: keep `font-medium text-sm` but use `font-display` for name
- Sub-line (category + owner): reduce icon size from `h-3 w-3` to `h-2.5 w-2.5`
- Mobile company/location line: currently visible as a third line below category/owner — this creates too many lines. Merge it into the second line (swap with category/owner on mobile)

### Why
Each row currently has three visual layers: name, category+owner, company+location. On mobile all three are stacked, creating rows that are 72px+ tall. For a triage dashboard, rows should scan fast — primary info (name, client) and a single contextual line.

`rounded-lg` (10px radius) on every row creates a "card gallery" feel. `rounded-md` (8px) is still clearly shaped but reads more as a row within a list.

### Exact specs

**Outer div classes:** Change `rounded-lg` to `rounded-md`. Keep everything else including `border border-border/40 bg-card/60 border-l-3`.

**Inner flex container:** Change `gap-4 px-4 py-3` to `gap-3 px-3 py-2.5`. This reduces row height from ~56px to ~48px — meaningful density improvement.

**Name span:** Add `font-display` to leverage DM Sans weight contrast with body text.

**Second line (category + owner):** Keep `text-[11px] text-muted-foreground`. Change icon sizes from `h-3 w-3` to `h-2.5 w-2.5`. Change `gap-x-3` to `gap-x-2.5`.

**Mobile company/location line (third line):** This is the `lg:hidden` div at line 229. Change it to only show company — drop the `locationLabel` from mobile view to reduce stacking. Location is secondary context, visible on desktop. Change `gap-3` to `gap-2`.

**Desktop Client/Location column (`hidden lg:flex`):** Keep `w-36`. Change `text-xs` on company to `text-[12px]` (same size but explicitly named — text-xs is 12px, this is intentional clarity for the implementer). Keep `text-[11px]` for location sub-line.

**Volume column:** Change `w-28 text-right` to `w-24 text-right`. 96px is sufficient for "12 tons/mo".

**ChevronRight:** Change `text-muted-foreground/40` to `text-muted-foreground/30`. Already subtle; this makes it marginally less present at rest.

**Stale badge:** Currently uses `Badge variant="outline"` with full pill styling. Replace with inline text: `<span className="text-[10px] text-warning/80 font-medium">Stale {staleDays}d</span>`. No pill border. The warning color carries the meaning.

---

## 6. DraftRow

### What changes
- Replace triple-badge header with a single visual signal: a left accent line + name is enough
- Remove `border-dashed` — use a solid left-border in amber instead
- Remove the "Pending Review" status badge from the name line
- Keep the source badge but reduce to a colored dot + text (no pill border)
- The dual "Pending" fallbacks in both mobile and desktop company columns should be unified to one

### Why
The current DraftRow signals urgency through: dashed border + amber background + "Pending Review" badge + source badge. Three redundant urgency signals create noise. The amber left-border alone is enough — it's the same semantic language as the bucket tab accent.

"Pending" appears at least 4 times per row (company mobile, location mobile, company desktop, location desktop) when no data exists. This repetition makes the row feel broken rather than in-progress.

### Exact specs

**Container class:** Replace:
```
border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50
```
With:
```
border border-border/30 border-l-[3px] border-l-warning/70 bg-card/50 hover:bg-accent/30 hover:border-border/50
```

Keep `rounded-md` (not `rounded-lg`). Keep `px-4 py-3`.

**Name line:** Remove the `DRAFT_STATUS_BADGE` `Badge` entirely (the amber "Pending Review" pill). Keep stream name `font-medium text-sm` + add `font-display`. Keep source badge but replace the current `Badge variant="outline"` pill with a plain span:
```
<span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">
  {SOURCE_LABELS[row.sourceType]}
</span>
```
This communicates source without competing with the name.

**Context line (company/location):** Instead of showing "Pending" in italic for each individually, show a single unified fallback when both are missing:
- If `companyLabel` exists: show `<Building h-2.5 w-2.5> companyLabel`
- If `companyLabel` is missing but `locationLabel` exists: show `<MapPin> locationLabel`
- If both are missing: show a single `<span className="text-[11px] text-muted-foreground/50 italic">No company linked</span>`
Remove the separate desktop duplicate column for company/location (the `hidden lg:flex` block currently at line 422). The mobile line is sufficient for draft items — desktop users don't need a separate column for drafts. This simplifies the layout significantly.

**Volume:** Keep `w-28 text-right text-xs text-muted-foreground`. Change fallback text from `"Pending"` to `"—"`. A dash is neutral; "Pending" implies a process.

**Review CTA:** Keep the `opacity-0 group-hover:opacity-100` `text-primary` span. Change `"Review →"` to `"Open →"` — shorter, more direct.

**Disabled state:** Keep `opacity-60`. Change hint text from `"Assign company to review"` to `"Needs company"` — 2 words instead of 4.

---

## 7. DraftQueueTable

### What changes
- Column headers need to match the new DraftRow structure (no separate Client column)
- Add a visible count + urgency line above the table
- Change empty state icon from `AlertTriangle` to a checkmark-style icon

### Why
The `AlertTriangle` icon for "no drafts to confirm" creates cognitive dissonance — it's an error icon, but an empty queue is a positive state ("all caught up"). This is an error-prevention principle: icons must match semantic tone.

With the DraftRow desktop column simplified (no separate Client/Location column), the column headers should match.

### Exact specs

**Column headers div:** Remove the `Client / Location` column header span entirely. Change the remaining headers:
```
<div className="hidden md:flex items-center gap-3 px-3 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border/20">
  <span className="flex-1">Draft stream</span>
  <span className="w-24 text-right">Volume</span>
  <span className="w-12" /> {/* CTA spacer */}
</div>
```

**Count line:** Add above column headers:
```
<div className="flex items-center justify-between px-1 pb-1">
  <span className="text-[11px] text-muted-foreground tabular-nums">
    {listTotal} {listTotal === 1 ? "draft" : "drafts"} awaiting confirmation
  </span>
</div>
```

**Empty state:** Change `icon={AlertTriangle}` to a different icon. Use `CheckCircle2` from lucide-react. Change title to `"Queue is clear"`. Keep description `"All caught up! No drafts awaiting review."`.

**Row gap:** Change `space-y-1.5` to `space-y-1`. Matches PersistedStreamTable.

**Skeleton:** The `border-dashed border-amber-500/20` on skeleton rows should become `border border-border/30 border-l-[3px] border-l-warning/30` to match the new DraftRow style.

---

## 8. DraftPreviewRail

### What changes
- Remove the `Card` wrapper's amber dashed border — use a left accent strip instead
- Drastically simplify `DraftPreviewCard` to 2 lines max
- Remove the `AlertTriangle` warning about missing company from the card — it belongs in the confirmation sheet, not the preview
- Remove the "Detected from import" / "Detected from voice review" bottom line
- Remove the company/location details block entirely from preview cards

### Why
The DraftPreviewRail is ambient awareness, not an action surface. Its job is: "here are N drafts, click one to review." Full company/location/volume details in the preview card duplicate what the confirmation sheet shows, creating information overload before the user has committed to reviewing anything.

The amber dashed `Card` border creates a second redundant amber zone alongside the DraftRow items in the main table. In the total bucket, users see amber DraftRow items in the main column AND an amber panel on the right — double-signaling.

### Exact specs

**Card outer:** Remove `border-dashed border-amber-500/30 bg-amber-500/5`. Replace with:
```
rounded-lg border border-border/30 border-l-[3px] border-l-warning/60 bg-card/60
```
Keep `backdrop-blur-sm`.

**CardHeader:** Keep `pb-3`.

**Title:** Change `FileQuestion` icon to `Sparkles` icon (already imported elsewhere). Change `text-sm font-display font-medium` — keep. Change title text from `"AI Extracted, Awaiting Confirmation"` to `"Needs Confirmation"`. This matches the sheet title and is shorter.

**Header description paragraph:** Remove entirely (the "Detected streams waiting for a quick human review..." text).

**Count badge:** Keep `bg-amber-500/15 text-amber-600 dark:text-amber-400`. Keep `ml-auto`.

**DraftPreviewCard — complete restructure:**

Current card has: AI extracted label + name + source badge + "Awaiting confirmation" + company row + location row + volume row + warning banner + "Review draft" label. That is 8 elements.

New card: 2 lines only.

```
Line 1: stream name (truncated, font-medium text-sm font-display)
Line 2: source label (text-[10px] uppercase tracking-wide text-muted-foreground/60) + if no company: "· No company" in text-warning/70
```

No company/location block. No volume. No warning banner. No "Review draft" text.

The hover affordance stays: `group-hover:opacity-100` arrow icon on the right.

New card class:
```
group w-full text-left rounded-md border border-border/30 bg-background/70 px-3 py-2
transition-colors duration-150
hover:bg-accent/40 hover:border-border/50 cursor-pointer
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

New card interior:
```
<div className="flex items-center justify-between gap-2">
  <div className="min-w-0 space-y-0.5">
    <span className="block text-sm font-medium font-display truncate">
      {item.streamName}
    </span>
    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/60">
      {item.sourceType === "bulk_import" ? "Import" : "Voice"}
      {!item.companyLabel && (
        <span className="text-warning/80"> · No company</span>
      )}
    </span>
  </div>
  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

**"Review all drafts" CTA:** Change variant from `ghost` to `outline`. Change classes:
```
w-full text-xs font-medium text-foreground/70 hover:text-foreground
```
Remove amber color tokens from the button — it's a navigation action, not an alert.

**Remaining overflow line:** Keep `+{remaining} more in Needs Confirmation` but change to `text-[11px]` and remove the amber color. Plain `text-muted-foreground`.

---

## 9. ProposalSubfilters

### What changes
- Remove the instructional paragraph entirely
- Change inactive chip style to use thin border + neutral text
- Change active chip to use a filled semantic-neutral style (not `bg-primary`)
- Add a subtle separator line above the chip row

### Why
The "Filter proposals by follow-up stage." paragraph is instructional text that any operational user ignores after one use. It adds 20px of visual weight before a purely interactive control.

The current active chip uses `bg-primary text-primary-foreground` — the primary blue fill is the same color as the CTA button. The confirmation action and the filter state should not share the same visual weight.

### Exact specs

**Remove:** The `<p className="text-xs text-muted-foreground">` paragraph entirely.

**Container:** Change from `space-y-2` div to:
```
<div className="pt-3 border-t border-border/20 -mx-4 px-4">
  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
```
The `-mx-4 px-4` extends the border to the panel edges for full-width visual separation.

**Inactive chip:** Replace `Badge variant="outline" hover:bg-accent/50 text-muted-foreground` with:
```
h-6 px-2.5 rounded-full border border-border/50 text-[11px] font-medium text-muted-foreground/80
bg-transparent hover:bg-accent/50 hover:text-foreground transition-colors
```

**Active chip:** Replace `bg-primary text-primary-foreground hover:bg-primary/90` with:
```
h-6 px-2.5 rounded-full border border-foreground/20 text-[11px] font-medium text-foreground
bg-foreground/8 hover:bg-foreground/12
```
This is a contained neutral — clearly selected but not as loud as the primary blue.

**Right fade gradient:** Keep the `md:hidden` gradient mask for mobile scrollability.

---

## 10. DraftConfirmationSheet

This is the most consequential redesign. The current form treats all 8 fields equally: same padding, same border, same confirm/reject button pair. The redesign introduces three tiers:

- **Tier 1 — Locked anchor fields** (company, location): Read-only display, no decision buttons, visually anchored at top
- **Tier 2 — Required editable fields** (materialName/materialType, volume, frequency): Full confirm/reject UI with emphasis
- **Tier 3 — Supplementary fields** (composition, primaryContact): Collapsed by default, expandable

### Why
The confirm/reject toggle per field is a good interaction model but the equal-weight layout buries the fields that actually block confirmation. Users spend time scanning all 8 fields before knowing that only 5 truly matter. The 3-tier system makes the blocking vs. supplementary distinction visually obvious.

Non-editable fields (company, location) shouldn't have confirm/reject buttons at all — they're locked. Showing disabled buttons creates a perception of incompleteness ("why can't I click this?"). Showing a lock indicator is more honest.

### Sheet structure changes

**Width:** Keep `sm:max-w-2xl`.

**SheetHeader:**
- Keep `Sparkles h-4 w-4 text-warning`.
- Title: Keep `"Needs Confirmation"`.
- Description: Change to `"Review AI-detected fields. Required fields must have a value before confirming."` — shorter and more task-oriented.

**Loading state:** Keep `Loader2 py-16` centered.

### Content area restructure

Replace the current flat `space-y-3` field list with a three-section layout:

---

**Section A — Stream anchor** (company + location)

Above all other content. No section label needed.

Container: `rounded-md bg-muted/30 border border-border/30 divide-y divide-border/20 mb-4`

Each anchor field renders as a 2-column display row:
```
px-3 py-2 flex items-center justify-between gap-3
  left:
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium w-20 shrink-0">
      {field.label}
    </span>
    <span className="text-sm text-foreground font-display font-medium truncate">
      {field.value || "—"}
    </span>
  right:
    <span className="text-[10px] text-muted-foreground/60 italic shrink-0">
      {field.editabilityReason truncated to "Locked" for brevity}
    </span>
```

No confirm/reject buttons. No source badge. The lock is communicated by the flat display (no input field) and the "Locked" label.

If `field.source === "pending"` and value is empty, show the field name dimmed with `text-muted-foreground/40` and value as `"Not linked"`.

---

**Required fields banner** (replaces info/warning banners):

Remove both the grey info banner and the amber warning banner. Replace with a single inline status line:

```
<div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
  <span>Required:</span>
  {REQUIRED_DISPLAY_FIELDS.map(key => {
    const hasValue = Boolean(getPersistedFieldValue(contract.fields[key]));
    return (
      <span key={key} className={cn(
        "inline-flex items-center gap-1",
        hasValue ? "text-success/80" : "text-destructive/70"
      )}>
        {hasValue ? "✓" : "·"} {FIELD_LABELS[key]}
      </span>
    );
  })}
</div>
```

`REQUIRED_DISPLAY_FIELDS` = `["materialName", "volume", "frequency"]` (company and location are in the anchor section above; no need to list them again).

Use actual Unicode checkmark `✓` and bullet `·`. No Lucide icons here — too heavy for an inline status line.

---

**Section B — Required editable fields**

Section label:
```
<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Required fields</p>
```

Fields in order: `materialType`, `materialName`, `volume`, `frequency`.

For `materialType` and `materialName`, show them as a visual pair — they're alternatives. Wrap them in:
```
<div className="rounded-md border border-border/40 overflow-hidden divide-y divide-border/30">
  <FieldCard key="materialType" ... />
  <FieldCard key="materialName" ... />
</div>
```
Add a label row above this pair:
```
<p className="text-[11px] text-muted-foreground mb-1.5">Material — at least one required</p>
```

Then `volume` and `frequency` as individual cards in `space-y-2`.

**FieldCard redesign for Tier 2:**

Current: `rounded-lg border border-border/50 p-3 space-y-3`

New: Remove the border from individual cards within the material pair (they share the outer border). For standalone required fields:
```
rounded-md border border-border/40 bg-card/80 px-3 py-2.5
```

**Confirm/Reject buttons:** The current `h-7 px-2 text-[11px] Button variant="outline"` toggle is functional. Improve:
- Confirm active: `border-success/50 bg-success/15 text-success-foreground dark:text-success` (green tint — confirmed means ready)
- Reject active: `border-destructive/30 bg-destructive/8 text-destructive` (red tint)
- Inactive (both): `border-border/40 bg-transparent text-muted-foreground/70 hover:text-foreground hover:bg-accent/50`
- Keep `h-7 px-2 text-[11px] gap-1`
- The `<Icon className="h-3 w-3 mr-1" />` stays but remove the `mr-1` margin (use `gap-1` on button instead)

**Source badge in Tier 2:** Keep but make it a flat label, not a pill:
```
<span className={cn(
  "text-[10px] uppercase tracking-wide font-medium",
  field.source === "ai_detected" && "text-info/80",
  field.source === "manual_override" && "text-success/80",
  field.source === "pending" && "text-warning/70",
)}>
  {SOURCE_LABELS[field.source]}
</span>
```
No border. No background. Color alone carries the semantic meaning.

**Error message:** Keep `text-xs text-destructive`. Prepend a `·` character: `· {error}`. Small but more scannable in a dense form.

**FieldInput for Tier 2 fields:** Add to Input: `className="h-8 text-sm"` (reduce from default h-9 to h-8). For Textarea (composition): keep `rows={3}`.

---

**Section C — Supplementary fields**

Fields: `composition`, `primaryContact`.

Collapsed by default using a disclosure pattern:

```
<button
  type="button"
  onClick={() => setSupplementaryOpen(prev => !prev)}
  className="w-full flex items-center justify-between px-1 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
>
  <span className="font-medium uppercase tracking-wide">Optional fields</span>
  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", supplementaryOpen && "rotate-180")} />
</button>
```

When open: render `composition` and `primaryContact` as standard FieldCards (same Tier 2 style but without the required-field emphasis). Use an `AnimatePresence`/`motion.div` with `initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}` transition.

Add local state: `const [supplementaryOpen, setSupplementaryOpen] = useState(false);`

Auto-open supplementary if either field has a non-empty AI-detected value: `useState(() => Boolean(contract?.fields.composition.value || contract?.fields.primaryContact.value))`.

---

**SheetFooter:**

Current: Cancel + Confirm Draft buttons.

Changes:
- Add `border-t border-border/30 pt-4` to the footer for visual separation from the scrolling content
- Cancel button: Keep `variant="outline"`. Change label to `"Discard"` — more precise than "Cancel" (the user is discarding a potential confirmation, not cancelling a neutral action)
- Confirm button:
  - Disabled state: Keep `disabled` when `submitting || loading || !contract`
  - Add `missingBaseFields.length > 0` as an additional disabled condition
  - When `missingBaseFields.length > 0` and not submitting: show a tooltip on hover — `"Complete required fields first"` — using `TooltipTrigger asChild` wrapping the button
  - Button label: Change from `"Confirm Draft"` to `"Confirm Stream"`. The object being confirmed is the waste stream, not the draft. This is more meaningful to the user.
  - Submitting state: Keep Loader2 + `"Confirming..."`.

**Missing fields count badge near footer CTA:** When `missingBaseFields.length > 0`, show above the footer:
```
<div className="px-4 pt-2 pb-0">
  <p className="text-[11px] text-destructive/80">
    {missingBaseFields.length} required {missingBaseFields.length === 1 ? "field" : "fields"} incomplete
  </p>
</div>
```
This is distinct from the inline required-field status row above the form — this is a submission-gate warning.

---

## Implementation Order

1. BucketTabs (highest visual impact, standalone)
2. DraftRow + DraftQueueTable (they share logic)
3. DraftPreviewRail DraftPreviewCard (standalone)
4. StreamRow PersistedRow (high-frequency render, test carefully)
5. DraftConfirmationSheet (most complex — do last, test all field states)
6. Dashboard page layout + DashboardHeader (cosmetic, low risk)
7. ProposalSubfilters (isolated, low risk)
8. PersistedStreamTable (column headers + pagination only)

---

## Accessibility Notes

- `BucketTabs`: The ARIA `role="tab"` + `aria-selected` + `aria-controls` pattern is already correct. Keep it. After removing description text, ensure the tab's accessible name still communicates enough context. The label text alone (`"Total"`, `"Needs Confirmation"`) is sufficient with `aria-label` on the grid already set.
- `DraftRow`: After removing "Pending Review" badge, the accessible name of the button becomes just the stream name. Add `aria-description` with source type: `aria-description={`${SOURCE_LABELS[row.sourceType]} source, awaiting confirmation`}`.
- `DraftConfirmationSheet`: The disclosure toggle for supplementary fields must have `aria-expanded={supplementaryOpen}` and `aria-controls="supplementary-fields"`. The supplementary div should have `id="supplementary-fields"`.
- `FieldDecisionButton`: The current `Button` component handles `disabled` prop correctly. Ensure the tooltip on the Confirm Stream button uses `role="tooltip"` (shadcn Tooltip handles this).
- All `text-[10px]` elements: Ensure parent container has sufficient contrast. The `text-muted-foreground/60` used in several places (10px, ~60% opacity) may not meet WCAG AA at small sizes. At 10px, WCAG requires 4.5:1 contrast. `muted-foreground` is `oklch(0.45 0.05 255)` — against `card` background `oklch(0.99)`, this is approximately 7:1. At `/60` opacity it drops to ~4.2:1. Use `/70` minimum for 10px text.

## Color Token Consistency Note

The amber-specific Tailwind values (`amber-500`, `amber-600`, etc.) are used in 6 different places across the dashboard. The design system uses `warning` (OKLCH) as the semantic token. Replace all `amber-500/30`, `amber-500/10`, `amber-600 dark:amber-400` usages with `warning/30`, `warning/10`, `warning-foreground dark:warning` respectively. The visual difference is negligible (warning is `oklch(0.72 0.15 85)`, close to amber) but the semantic consistency is meaningful for dark mode correctness and future token updates.
