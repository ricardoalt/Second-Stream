# Intelligence Report Detail View — UX/UI Design Specification

## Codebase Context (What I Found)

**Design system tokens (globals.css):**
- Primary: `oklch(0.63 0.12 256)` — a cool periwinkle blue
- Success: `oklch(0.73 0.14 154)` — green (used for `intelligence_report` bucket left-border accent)
- Info: `oklch(0.55 0.15 235)` — blue (used for `waiting_to_send` proposal state)
- Warning: `oklch(0.72 0.15 85)` — amber
- Custom utilities: `glass-nav`, `aqua-floating-chip`, `shadow-water`, `bg-card/60`, `backdrop-blur-xl`
- Typography: Geist (sans), DM Sans (display), JetBrains Mono (mono)
- Radius: `--radius-lg: 1rem` for cards, `--radius-sm: 0.625rem` for inputs

**Existing pattern: `stream-row.tsx` → `ReportQuickViewButton`**
Already has a Sheet-based snapshot for intelligence_report rows. The new detail view lives inside the full project page (`/project/[id]`) — not a separate route.

**Navigation: clicking a row in `intelligence_report` bucket → `routes.project.detail(row.projectId)` → `/project/[id]`**. The current project page has Overview / Questionnaire / Files / Proposals tabs. The intelligence report content maps to the *Overview* tab.

**No dedicated intelligence report route exists yet** — the design question is whether to:
A. Add a new `?tab=intelligence` tab inside the existing `ProjectTabs`
B. Surface it as a new dedicated route `/project/[id]/intelligence`
C. Expand the existing Overview tab to include the intelligence report section

Option A is the right architectural choice: it follows the established `ProjectTabs` pattern with `?tab=` URL sync, uses the same lazy-loading Suspense skeleton pattern, and avoids route proliferation.

---

## 1. Information Architecture Decision

The detail view is NOT a separate page. It is a new tab (`intelligence`) added to `ProjectTabs` in `/frontend/components/features/projects/project-tabs.tsx`.

Route: `/project/[id]?tab=intelligence`

From the dashboard `intelligence_report` bucket, clicking a row navigates to this tab directly. The existing `stream-row.tsx` `handleClick` already routes to `routes.project.detail(row.projectId)` — we extend `routes.project` with an `intelligence(id)` builder that appends `?tab=intelligence`.

**Tab order:** Overview | Questionnaire | Files | Intelligence | Proposals

The Intelligence tab sits between Files and Proposals because it is the output of analysis, and Proposals is what you produce after reviewing it.

---

## 2. Component Architecture

```
IntelligenceTab                          (new, lazy-loaded)
├── IntelligenceHeader                   (breadcrumb-level context strip)
├── StreamSummaryCard                    (collapsible, uses Collapsible primitive)
│   ├── SummaryText                      (prose paragraph)
│   └── CompositionPanel                 (chemical breakdown + hazard badges)
├── InsightsPanel                        (left column on lg+)
│   ├── InsightSection (×5)              (accordion-style, uses Accordion)
│   └── each: icon + title + prose
└── ProposalUploadPanel                  (right column on lg+)
    ├── UploadDropzone                   (file drag-drop area)
    ├── UploadedFilePreview              (file name + remove button)
    ├── SubmitButton                     (primary CTA)
    └── ProposalSentConfirmDialog        (Dialog, post-upload)
```

---

## 3. Layout Specification

### Page-level grid

```
[IntelligenceHeader — full width]
[StreamSummaryCard — full width, collapsible]
[lg: two-column grid | mobile: stacked]
  col-1 (flex-1, min-w-0): InsightsPanel
  col-2 (w-80 shrink-0):   ProposalUploadPanel
```

Tailwind structure:
```
<div className="space-y-5">
  <IntelligenceHeader />
  <StreamSummaryCard />
  <div className="flex flex-col lg:flex-row gap-5">
    <div className="flex-1 min-w-0">
      <InsightsPanel />
    </div>
    <aside className="w-full lg:w-80 shrink-0">
      <ProposalUploadPanel />
    </aside>
  </div>
</div>
```

The `w-80` (320px) sidebar matches the existing `DraftPreviewRail` sidebar width in `dashboard/page.tsx`. Visual consistency requires this.

---

## 4. Component Specifications

### 4.1 IntelligenceHeader

**Purpose:** Lightweight context strip — replaces the wireframe's "Waste stream name / primary contact / client / location" block. The project header (`project-header.tsx`) already shows the name, so this strip provides *intelligence-specific* metadata only.

```tsx
// Visual: pill-chip row, no border, horizontally scrollable on mobile
<div className="flex flex-wrap items-center gap-2 text-sm">
  {/* Ready badge — uses existing success token */}
  <Badge
    variant="outline"
    className="border-success/40 bg-success/10 text-success-foreground dark:text-success gap-1.5"
  >
    <CheckCircle2 className="h-3 w-3" />
    Intelligence Ready
  </Badge>

  {/* Primary contact */}
  {primaryContact && (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <User className="h-3.5 w-3.5" />
      {primaryContact}
    </span>
  )}

  {/* Report date */}
  <span className="text-muted-foreground text-xs">
    Generated {formatRelativeDate(reportGeneratedAt)}
  </span>
</div>
```

**Accessibility:** `role="status"` on the badge so screen readers announce "Intelligence Ready".

---

### 4.2 StreamSummaryCard

**Purpose:** Expandable card showing the AI-generated stream description. Default: collapsed (shows first 2 lines of summary). Expanded: shows full prose + chemical composition table + hazard badges.

**Why collapsible (not always open):** The primary action is reviewing Insights + uploading a proposal. The summary is supporting context, not primary focus. Progressive disclosure keeps the viewport clean on first load.

```tsx
<Card className="border-border/40 bg-card/60">
  <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors rounded-t-xl py-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-success" />
            Stream Summary
          </CardTitle>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              summaryOpen && "rotate-180"
            )}
          />
        </div>
        {/* Preview (always visible) */}
        {!summaryOpen && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 font-normal">
            {summaryText}
          </p>
        )}
      </CardHeader>
    </CollapsibleTrigger>

    <CollapsibleContent>
      {/* tw-animate-css provides data-[state=open]:animate-collapsible-down */}
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Full summary prose */}
        <p className="text-sm text-foreground/90 leading-relaxed">{summaryText}</p>

        {/* Chemical composition — only if data present */}
        {composition && composition.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chemical Composition
            </p>
            <div className="space-y-2">
              {composition.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-sm text-foreground/80 w-40 shrink-0">
                    {item.name}
                  </span>
                  {/* Proportional bar */}
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-[width] duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium tabular-nums text-foreground/70 w-10 text-right">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hazard badges */}
        {hazards && hazards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hazards.map((hazard) => (
              <Badge
                key={hazard}
                variant="outline"
                className="border-warning/40 bg-warning/8 text-warning-foreground dark:text-warning text-xs"
              >
                {hazard}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

**Animation:** The existing `tw-animate-css` import in `globals.css` provides `data-[state=open]:animate-collapsible-down` / `data-[state=closed]:animate-collapsible-up`. Use these on `CollapsibleContent` via Tailwind.

**Keyboard:** `CollapsibleTrigger` renders as a `<button>`, so Enter/Space toggle works natively. Focus ring uses `focus-visible:ring-2 focus-visible:ring-ring`.

---

### 4.3 InsightsPanel

**Purpose:** Structured breakdown of the AI's intelligence report across 5 sections. The wireframe shows a flat bullet list — upgrade to an `Accordion` so each section is individually expandable. This reduces scroll depth and allows users to navigate directly to the section they need.

**Why Accordion over flat list:** B2B users scanning for specific info (e.g., Regulations or Logistics) benefit from collapsible sections. They do not need to read everything linearly. The Accordion UI pattern is already used implicitly in the existing `draft-confirmation-sheet.tsx` via `ChevronsUpDown` toggles.

The project uses `accordion.tsx` in `components/ui/` (confirmed in glob). Use `type="multiple"` to allow multiple open sections simultaneously — users may want to compare Executive Summary with Regulations.

**5 insight sections and their icons:**
1. Executive Summary — `Sparkles` (primary, open by default)
2. Stream Description — `FlaskConical` (chemistry icon from lucide)
3. Regulations — `Shield`
4. Logistics Recommendations — `Truck`
5. Environmental Stewardship — `Leaf`

```tsx
<Card className="border-border/40 bg-card/60">
  <CardHeader className="px-5 pt-5 pb-3">
    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" />
      Intelligence Insights
    </CardTitle>
    <CardDescription>
      AI-generated analysis for this waste stream
    </CardDescription>
  </CardHeader>
  <CardContent className="px-5 pb-5">
    <Accordion type="multiple" defaultValue={["executive-summary"]} className="space-y-1">
      {INSIGHT_SECTIONS.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="border border-border/30 rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-accent/30 hover:no-underline [&[data-state=open]]:bg-accent/20 transition-colors">
            <span className="flex items-center gap-2.5 text-left">
              <section.icon className="h-4 w-4 shrink-0 text-primary/70" />
              {section.label}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </CardContent>
</Card>
```

**Empty/loading state:** When `insightsData` is null (report not yet generated), show a `Skeleton` structure of 5 collapsed accordion items.

---

### 4.4 ProposalUploadPanel

**Purpose:** Upload a proposal document (PDF) and mark it as sent to the client. This is the primary action in the Intelligence Report context — it gates the stream moving to the `proposal` bucket.

**Wireframe improvement:** The wireframe shows a generic "Upload proposal area + Submit button". The production design needs: file format validation, upload progress, uploaded state with file preview, and a post-submit confirmation flow.

```tsx
<Card className="border-border/40 bg-card/60 sticky top-[5.5rem]">
  {/* sticky: keeps the upload panel in view as user scrolls insights */}
  <CardHeader className="px-5 pt-5 pb-3">
    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
      <Upload className="h-4 w-4 text-primary" />
      Upload Proposal
    </CardTitle>
    <CardDescription>
      Attach the proposal document to send to the client
    </CardDescription>
  </CardHeader>
  <CardContent className="px-5 pb-5 space-y-4">

    {/* State A: No file selected */}
    {!selectedFile && (
      <label
        htmlFor="proposal-upload"
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          "rounded-lg border-2 border-dashed border-border/50",
          "bg-muted/20 px-4 py-8 cursor-pointer",
          "hover:border-primary/40 hover:bg-primary/5",
          "transition-colors duration-150",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        )}
      >
        <div className="rounded-full bg-primary/10 p-3">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Drop PDF here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF only · Max 25MB
          </p>
        </div>
        <input
          id="proposal-upload"
          type="file"
          accept=".pdf"
          className="sr-only"
          onChange={handleFileSelect}
        />
      </label>
    )}

    {/* State B: File selected, not yet submitted */}
    {selectedFile && uploadState === "idle" && (
      <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-3">
        <div className="rounded-full bg-success/10 p-2 shrink-0">
          <FileText className="h-4 w-4 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {selectedFile.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={clearFile}
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )}

    {/* State C: Uploading */}
    {uploadState === "uploading" && (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Uploading...</span>
          <span>{uploadProgress}%</span>
        </div>
        <Progress value={uploadProgress} className="h-1.5" />
      </div>
    )}

    {/* State D: Upload complete, awaiting send confirmation */}
    {uploadState === "uploaded" && (
      <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-info shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Proposal uploaded
          </p>
          <p className="text-xs text-muted-foreground">
            Have you sent this to the client?
          </p>
        </div>
      </div>
    )}

    {/* Submit CTA */}
    <Button
      className="w-full"
      disabled={!selectedFile || uploadState === "uploading"}
      onClick={handleSubmit}
    >
      {uploadState === "uploading" ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading...
        </>
      ) : uploadState === "uploaded" ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark as Sent
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4" />
          Submit Proposal
        </>
      )}
    </Button>

    {/* Help text */}
    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
      Submitting will move this stream to the Proposal pipeline and update the CRM.
    </p>

  </CardContent>
</Card>
```

**Why sticky:** The upload panel is the primary action. As users scroll through potentially long insights, the upload panel staying in view prevents the "where do I go after reading this" disorientation.

---

### 4.5 ProposalSentConfirmDialog

**Wireframe:** Shows "Proposal uploaded successful" headline and "Have you sent the proposal?" with No (red) / Yes (green) buttons.

**Production improvement:** Do not use red for "No". In UX, red signals destructive actions (delete, remove). "No, I haven't sent it yet" is not destructive — it is a neutral deferral. Use a ghost/outline button for No, and green/success for Yes.

```tsx
<Dialog open={showSentDialog} onOpenChange={setShowSentDialog}>
  <DialogContent className="sm:max-w-sm" showCloseButton={false}>
    <DialogHeader className="items-center text-center">
      {/* Success icon circle */}
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-6 w-6 text-success" />
      </div>
      <DialogTitle>Proposal uploaded</DialogTitle>
      <DialogDescription>
        Have you sent this proposal to the client?
      </DialogDescription>
    </DialogHeader>

    <DialogFooter className="flex flex-col gap-2 sm:flex-row mt-2">
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => handleSentResponse(false)}
      >
        Not yet
      </Button>
      <Button
        className="flex-1 bg-success text-success-foreground hover:bg-success/90"
        onClick={() => handleSentResponse(true)}
      >
        <Send className="mr-2 h-4 w-4" />
        Yes, sent
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**State transition logic:**
- "Not yet" → `proposalFollowUpState = "uploaded"` (stays in intelligence bucket with uploaded badge, user can send later)
- "Yes, sent" → `proposalFollowUpState = "waiting_to_send"` then immediately `"waiting_response"` → stream moves to Proposal bucket

This matches the existing `PROPOSAL_FOLLOW_UP_TRANSITIONS` state machine in `stream-row.tsx`.

---

## 5. State Machine for the Upload Panel

```
idle (no file)
  ↓ file selected
file_selected
  ↓ submit clicked
uploading (progress 0→100)
  ↓ upload success
uploaded (dialog opens)
  ↓ "Not yet"         ↓ "Yes, sent"
waiting_to_send    waiting_response
```

Local state: `type UploadState = "idle" | "file_selected" | "uploading" | "uploaded"`
Store update: `useDashboardActions().updateProposalFollowUpState(projectId, nextState)`

---

## 6. Loading States

### Tab initial load (skeleton)
```tsx
function IntelligenceSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      {/* Summary card */}
      <div className="rounded-xl border border-border/40 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      {/* Two-column */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="rounded-lg border border-border/30 px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="lg:w-80 rounded-xl border border-border/40 p-5 space-y-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
```

### Empty state (no intelligence report data yet)
```tsx
<EmptyState
  icon={Sparkles}
  title="No intelligence report yet"
  description="Complete the questionnaire and generate a report to see insights here."
  action={{ label: "Go to Questionnaire", onClick: () => handleTabChange("technical") }}
/>
```

---

## 7. Micro-interactions and Transitions

| Interaction | Implementation |
|---|---|
| Tab switch to Intelligence | `animate-in fade-in-0 slide-in-from-bottom-1 duration-200` (matches other tabs) |
| Summary expand/collapse | `data-[state=open]:animate-collapsible-down` from `tw-animate-css` |
| Insight accordion open | Built into `shadcn/ui Accordion` with `data-[state=open]` |
| File drag over dropzone | `border-primary/60 bg-primary/8 scale-[1.01]` via `dragover` class |
| Upload progress bar | `transition-[width] duration-300` on the fill div |
| Submit button feedback | `disabled:opacity-50 disabled:cursor-not-allowed` + `Loader2 animate-spin` |
| Dialog enter | `zoom-in-95 fade-in-0 duration-200` (from existing `dialog.tsx`) |
| "Yes, sent" confirm | `toast.success("Proposal marked as sent", { description: "Stream moved to Proposal pipeline." })` via Sonner |

---

## 8. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| < `lg` (< 1024px) | `InsightsPanel` full-width stacked above `ProposalUploadPanel`. Upload panel loses `sticky`. |
| `lg+` | Side-by-side: insights flex-1, upload `w-80` sticky. |
| < `md` | Summary card shows only 1 line preview. Hazard badges wrap. Accordion labels truncate at 80% width. |
| `sm` | Dialog footer stacks vertically (handled by existing `DialogFooter` `flex-col-reverse` < sm). |

---

## 9. Accessibility Requirements (WCAG 2.1 AA)

### Color contrast
- `text-success-foreground dark:text-success` on `bg-success/10`: contrast ratio ≥ 4.5:1 ✓ (confirmed by OKLCH values)
- `text-muted-foreground` on `bg-card/60`: ≥ 4.5:1 in both light and dark ✓
- `text-warning` on `bg-warning/8`: borderline — add `font-medium` to ensure readability ✓

### Keyboard navigation
- Collapsible trigger: `<button>` natively (via `asChild` on `CollapsibleTrigger`)
- Accordion: full keyboard nav built into `@radix-ui/react-accordion`
- File input: `<label htmlFor="proposal-upload">` + `<input className="sr-only">` pattern
- Dialog: focus trap provided by `@radix-ui/react-dialog` ✓
- Tab order: Header → Summary card → Insights accordion (top-to-bottom) → Upload panel (right column reads last on mobile, simultaneously accessible via skip mechanism on desktop)

### ARIA
- Summary card: `aria-expanded` on CollapsibleTrigger (Radix handles automatically)
- Upload dropzone: `aria-label="Upload proposal PDF"` on `<label>`
- Dialog: `aria-describedby` pointing to `DialogDescription` (Radix handles)
- Progress bar: `role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}`
- Status badge: `role="status"` so screen readers announce readiness state

### Screen reader copy
- File size: `<span className="sr-only">{selectedFile.size} bytes</span>` alongside visual formatted size
- Upload state changes: use `aria-live="polite"` region wrapping the upload state display area

---

## 10. File Paths and Component Locations

### New files to create:
- `/frontend/components/features/projects/intelligence-tab.tsx` — main tab export
- `/frontend/components/features/projects/intelligence-tab/stream-summary-card.tsx`
- `/frontend/components/features/projects/intelligence-tab/insights-panel.tsx`
- `/frontend/components/features/projects/intelligence-tab/proposal-upload-panel.tsx`
- `/frontend/components/features/projects/intelligence-tab/proposal-sent-dialog.tsx`

### Files to modify:
- `/frontend/components/features/projects/project-tabs.tsx` — add `intelligence` tab
- `/frontend/lib/routes.ts` — add `routes.project.intelligence(id)`

### Existing components to import (no new installs needed):
- `Card, CardContent, CardHeader, CardTitle, CardDescription` from `@/components/ui/card`
- `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- `Accordion, AccordionItem, AccordionTrigger, AccordionContent` from `@/components/ui/accordion`
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter` from `@/components/ui/dialog`
- `Badge` from `@/components/ui/badge`
- `Button` from `@/components/ui/button`
- `Progress` from `@/components/ui/progress`
- `Skeleton` from `@/components/ui/skeleton`
- `EmptyState` from `@/components/ui/empty-state`
- Framer Motion (already installed) for staggered reveal of insight sections
- Sonner `toast` for post-submit feedback

---

## 11. UX Improvements Over Wireframes

### Problem 1: Wireframe uses flat bullet list for insights
Bullets have no visual hierarchy and require reading everything. **Fix:** Accordion with labeled sections — users jump directly to Regulations or Logistics without reading everything.

### Problem 2: Wireframe uses red "No" button
Red is universally understood as "danger/delete" in B2B software. A user declining "did you send this?" should not feel like they are doing something wrong. **Fix:** `variant="outline"` for "Not yet", success color for "Yes, sent".

### Problem 3: Upload area has no feedback states
Wireframe shows a static box. **Fix:** 4-state system: empty drop zone → file preview → upload progress → uploaded confirmation. Each state gives clear next-action signals.

### Problem 4: No sticky behavior on upload panel
As insights content grows, users lose the CTA while scrolling. **Fix:** `sticky top-[5.5rem]` (clears the 4.25rem navbar + margin). Matches the sticky behavior in the Intake Panel sidebar.

### Problem 5: Summary always expanded
Forces users to process dense composition data on load. **Fix:** Collapsed by default showing 2-line preview. One click to expand.

### Problem 6: Header duplicates project-header info
The wireframe shows client/location/primary contact in the detail view header, but `project-header.tsx` already shows `{project.client} · {project.location}`. **Fix:** Intelligence tab header shows only intelligence-specific metadata: readiness badge + report generation date.

### Problem 7: No empty/loading states defined
**Fix:** Explicit skeleton and empty states with action CTAs that route users to the questionnaire.

### Problem 8: No route for "back to dashboard" context
After upload and marking as sent, the stream leaves the Intelligence bucket. User needs orientation. **Fix:** The `toast.success` includes an `action` button: `{ label: "View in Pipeline", onClick: () => router.push(routes.dashboard + "?bucket=proposal") }`.

---

## 12. Typography Hierarchy

| Element | Classes |
|---|---|
| Tab label | `text-sm font-medium` (matches ProjectTabs pattern) |
| Card title | `text-sm font-semibold text-foreground` |
| Section heading (accordion) | `text-sm font-medium` |
| Body prose | `text-sm text-foreground/85 leading-relaxed` |
| Supporting text | `text-xs text-muted-foreground` |
| Chemical component names | `text-sm text-foreground/80` |
| Percentages | `text-sm font-medium tabular-nums` |
| Warning labels | `text-xs font-medium` with `border-warning/40` badge |

DM Sans (`--font-display`) should be applied to card titles via `font-display` utility if defined, or rely on the Geist default for body.

---

## 13. Color Usage Map

| Element | Token | Rationale |
|---|---|---|
| "Intelligence Ready" badge | `success` | Consistent with `intelligence_report` left-border in rows |
| Insights panel sparkles icon | `primary` | Primary feature accent |
| Upload CTA button | default (primary) | Primary action |
| Uploaded state icon | `success` | Positive confirmation |
| "Yes, sent" button | `success` | Positive confirmation |
| Hazard classification badges | `warning` | Caution, not error |
| Progress bar fill | `primary/60` | Subtle, not overpowering |
| Accordion open state bg | `accent/20` | Matches existing active nav chip pattern (`aqua-floating-chip`) |
| Drop zone hover | `primary/5` border + `primary/40` | Inviting, not alarming |

---

## 14. Unresolved Questions

1. **Data contract:** What is the backend shape for intelligence report data? The `PersistedStreamRow` type has `intelligenceReady: boolean` but no `insights`, `composition`, `hazards`, or `summaryText` fields. A new API endpoint or a new field on the project detail response is needed. Does the report data live in `project.project_data` JSONB?

2. **Upload endpoint:** Where does the uploaded proposal PDF go? Does it use the existing `ProjectFile` mechanism (same as the Files tab)? Or is there a dedicated `POST /api/v1/projects/{id}/proposals/upload` route?

3. **Proposal follow-up state trigger:** When the user clicks "Yes, sent", should the state transition be `waiting_to_send` → `waiting_response` atomically, or should `waiting_to_send` be an intermediate state visible in the dashboard?

4. **Accordion vs always-open:** If the intelligence report sections are short (1–3 sentences each), the accordion overhead may be overkill. Recommend testing with real data before implementing; alternative is a simple vertical stack of `ReportBulletCard` components (already exists in `stream-row.tsx`).

5. **Tab count badge:** Should the Intelligence tab show a badge count? The existing pattern shows badges for Files (count) and Proposals (count). For Intelligence, a dot indicator (similar to the amber pulse dot on Files) when `intelligenceReady` is true but no proposal has been uploaded could signal "action needed".
