# Workspace v1 UX Audit

## 1. Top UX Problems (ranked by severity)

### P0 -- Critical

#### 1.1 The analysis-to-review flow is invisible and confusing

**Problem:** The workspace has no persistent visual indicator showing _which_ evidence files have been included in the current analysis, which are new since the last analysis, and which have never been analyzed. The user must hold this mental model entirely in their head.

**Evidence from code:** The `EvidenceItemRow` component (workspace-canvas.tsx, lines 75-113) shows only `processingStatus` (queued/processing/completed/failed). There is no `analyzedAt` timestamp, no "included in analysis" badge, and no visual distinction between a file that was completed _and_ analyzed versus one that completed _after_ the last analysis run. The `newReadyEvidenceSinceAnalysis` state (workspace-store.ts, line 41) tracks a count in the store, but this information is shown only in the Analysis card's readiness message -- never on individual evidence items.

**Impact:** In a compliance-adjacent domain, users need to know exactly what data informed the current field values. Without per-file analysis status, the user cannot verify the provenance chain: "this SDS sheet was analyzed, and it produced this material composition value." Trust is fundamentally broken.

**Recommendation:** Add an `analysisStatus` visual indicator to each evidence item: "Not yet analyzed" (neutral), "Included in last analysis" (green/confirmed), "New since last analysis" (amber/attention). This creates a clear provenance trail from evidence to field values.

---

#### 1.2 Post-apply feedback is a black hole

**Problem:** After confirming proposals in the review modal, the user sees a toast ("Applied N AI updates") and the modal closes. There is zero indication of _what changed_ on the fields. The user is dropped back to the canvas with no visual diff, no highlight, no "just updated" state. For a human-in-the-loop compliance workflow, this is a critical gap.

**Evidence from code:** In `confirmProposals` (workspace-store.ts, lines 394-437), after successful confirmation, the store does `applyHydrateData(data.workspace)` and sets `proposalBatch = null`, `proposalModalOpen = false`. The canvas then renders with new data, but nothing distinguishes freshly-applied values from previously-existing ones. The toast at proposal-review-modal.tsx line 46 is the only feedback.

**Impact:** The user cannot verify that the right fields were updated with the right values. They must manually scan all fields to check. In a 5-field + N-custom-field workspace, this is tedious and error-prone. It also breaks the core trust principle: the user confirmed changes but has no confirmation that the right changes landed.

**Recommendation:** After applying proposals, temporarily highlight changed fields (e.g., a 5-second amber/green left-border pulse or background highlight). Optionally, show a summary banner: "Updated: Material Type, Composition. Added: Flash Point, pH Level."

---

#### 1.3 "Information Coverage" is opaque and potentially misleading

**Problem:** The coverage formula `(filled_base_fields + min(completed_evidence, 3) + min(custom_fields, 3)) / 11 * 100` creates a score that users cannot understand, verify, or trust. It combines orthogonal concepts (field completion, evidence quantity, AI-added fields) into a single percentage with hidden caps. A user with 5 filled fields, 10 evidence files, and 8 custom fields sees 100% -- identical to someone with 5 fields, 3 files, and 3 custom fields.

**Evidence from code:** The formula is documented in the task description and the `informationCoverage` value comes from the backend (`WorkspaceDerivedInsights.informationCoverage`). The header (workspace-header.tsx, lines 244-254) renders this as a simple progress bar with no breakdown or explanation. There is no tooltip, no "what makes up this score" disclosure.

**Impact:** Users in compliance-adjacent domains will ask "what does 73% mean?" and "what do I need to do to reach 100%?" The current UI answers neither question. Worse, the capped formula means additional evidence beyond 3 files provides zero progress -- users may upload more evidence expecting the bar to move and lose trust when it does not.

**Recommendation:** Either (a) replace with a segmented breakdown showing separate completion for base fields, evidence, and AI-added fields; or (b) add a tooltip/expandable detail that explains what contributes to the score and what is missing. Label it "Completeness" or "Discovery Progress" rather than "Information Coverage" which sounds like a data-coverage metric.

---

### P1 -- High

#### 1.4 The Analysis card conflates three distinct concepts into one button

**Problem:** The "Analyze ready files" button serves three entirely different purposes depending on state: (1) trigger initial analysis, (2) re-analyze with new files, (3) open the proposal review modal. These are fundamentally different user intents merged into one interaction point.

**Evidence from code:** In workspace-canvas.tsx lines 242-250, `analysisLabel` switches between "Analyze ready files", "Re-analyze with N new file(s)", and "Review AI updates". The `handleRunAnalysis` callback (lines 288-310) either calls `reopenProposalBatchModal()` (if proposals exist) or `runAnalysis()` (if not). This means the same button can either trigger a potentially long-running analysis operation or instantly open a modal -- radically different behaviors.

**Impact:** The user cannot predict what clicking the button will do. "Review AI updates" looks like it might re-run analysis. "Analyze ready files" gives no indication it could take 2 minutes (the API timeout is 120 seconds per workspace.ts line 52). The button also provides no loading-time expectation.

**Recommendation:** Separate the "Review AI updates" action from the analysis trigger. When proposals are waiting, show a distinct, visually prominent "Review N pending updates" element (potentially inline or as a banner) rather than overloading the analysis button. The analysis button should always mean "run analysis."

---

#### 1.5 "Needs refresh" badge provides no actionable context

**Problem:** The amber "Needs refresh" badge on the summary (workspace-header.tsx, lines 211-218) tells the user something is stale but not _why_ or _what to do_. The `summaryStale` flag is set when: (a) base fields change, (b) context note changes, (c) custom fields change, or (d) new completed evidence arrives (workspace-store.ts, lines 207, 259, 279, 181). The user cannot distinguish between "stale because you edited a field" and "stale because new evidence arrived."

**Impact:** The user sees "Needs refresh" but may not realize they need to click "Analyze ready files" to clear it. The connection between the header badge and the analysis card button buried in the right column is not obvious. The badge also says "Needs refresh" for the summary, but the analysis button says "Analyze ready files" -- these do not sound like the same action.

**Recommendation:** Change to a contextual message: "Summary outdated -- fields changed since last analysis" or "Summary outdated -- 2 new files since last analysis." Add a direct action link ("Run analysis" or "Re-analyze") right next to the badge so the user does not have to hunt for the button.

---

#### 1.6 No visual connection between evidence files and the fields they populate

**Problem:** Custom fields show evidence reference badges (filename + page), and the evidence list shows per-file summaries, but there is no bidirectional navigation. Clicking an evidence badge on a field does nothing. There is no way to go from a field to its source evidence, or from evidence to the fields it informed.

**Evidence from code:** Evidence refs in workspace-canvas.tsx lines 462-476 render `Badge` components with `FileText` icon and filename/page, but these badges have no `onClick`, no link, no tooltip with excerpt. The `WorkspaceEvidenceRef` type (workspace.ts, lines 27-32) includes an `excerpt` field that is never rendered.

**Impact:** The `excerpt` field exists in the data model but is completely invisible to users. This is a significant trust and explainability gap -- the system has the data to show _exactly_ which passage in which document led to a field value, but throws it away at the UI layer.

**Recommendation:** Make evidence reference badges interactive: clicking should scroll to / highlight the evidence item in the list, and show a popover with the excerpt text. This creates the provenance chain users need for compliance trust.

---

### P2 -- Medium

#### 1.7 The two-column layout creates a disconnected workflow

**Problem:** Fields live in the left column while evidence, upload, and analysis live in the right column. The intended flow (upload -> analyze -> review -> confirm fields) zigzags: the user starts on the right (upload), stays on the right (analyze), gets a modal overlay (review), then needs to look left (verify fields). There is no visual flow connecting these areas.

**Evidence from code:** workspace-canvas.tsx line 368 uses a `grid-cols-1 lg:grid-cols-5` layout with 3:2 split. The fields card takes priority (left/top on mobile) but the user's first action (upload) is in the secondary column. On mobile (single column), the upload zone is below all fields, requiring significant scrolling.

**Impact:** First-time users may not realize they need to scroll past empty fields to find the upload zone. The spatial relationship between evidence and fields does not communicate the causal relationship between them.

**Recommendation:** On mobile, move the upload/evidence section above fields, since the intended flow starts with evidence. On desktop, consider adding visual connectors (a step indicator, or an inline prompt in the fields card: "Upload evidence to auto-fill these fields"). Alternatively, reverse the column order so evidence is left (primary reading position) and fields are right.

---

#### 1.8 "AI-added" vs "AI-confirmed" labeling is confusing

**Problem:** Custom fields show "AI-added" badge (workspace-canvas.tsx line 419) and "AI-confirmed" text (line 454), but the data model shows `createdBy: "ai_confirmed"` (workspace.ts line 40). These three terms describe the same thing differently. Does "AI-added" mean the AI created the field? Does "AI-confirmed" mean the user confirmed it? Or the AI confirmed its own finding?

**Evidence from code:** The `WorkspaceCustomField` type has `createdBy: "ai_confirmed"` as a string literal -- suggesting these fields were confirmed by the user through the proposal review flow. But the UI shows "AI-added" (suggesting AI origin) and "AI-confirmed" (ambiguous -- who confirmed?).

**Impact:** Users in compliance contexts need to know: was this field value proposed by AI and confirmed by a human, or was it set by AI without review? The current labels fail to communicate the human-in-the-loop provenance.

**Recommendation:** Use consistent, clear terminology: "AI-proposed, user-confirmed" or simply "Verified" with a tooltip explaining "This field was proposed by AI analysis of [evidence file] and confirmed by [user] on [date]." The badge should communicate the human review step, not just the AI origin.

---

#### 1.9 The proposal review modal lacks sufficient decision-support context

**Problem:** Each proposal in the review modal shows: checkbox, label, answer textarea, confidence %, and evidence file badges. But it does not show: (a) the _current_ value being replaced (for updates to existing fields), (b) the excerpt from the source document, (c) why the AI chose this value, (d) what other values were considered.

**Evidence from code:** In proposal-review-modal.tsx, `renderProposal` (lines 74-131) renders the proposed label and answer, but for `suggestedUpdates` (existing field updates), there is no display of the current field value. The user must remember what "Material Type" currently says while reviewing the proposed replacement. The `evidenceRefs` show filename and page but not the `excerpt` (which exists in the type but is unused, same issue as 1.6).

**Impact:** The user is making accept/reject decisions on field values without seeing the current value or the source text. This is like a code review without a diff view. For compliance decisions, this is inadequate.

**Recommendation:** For update proposals, show a "current -> proposed" diff format. Display the evidence excerpt inline below each proposal. Consider adding an "AI reasoning" or "source passage" expandable section that shows the extracted text that led to the proposal.

---

#### 1.10 No empty state guidance for first-time users

**Problem:** When a user opens a new workspace, they see: 5 empty base fields (left), an upload dropzone, an Analysis card saying "Upload files to start building this waste stream," an empty Context Note, and a 0% coverage bar. There is no onboarding flow, no step-by-step guidance, no suggested first action.

**Evidence from code:** The workspace-canvas.tsx renders all cards unconditionally. The only empty state is the `evidenceReadinessMessage` which says "Upload files to start building this waste stream" (line 253). The header shows "No summary yet -- click Start analysis to generate" (workspace-header.tsx line 238), which references a "Start analysis" button that does not exist (the button says "Analyze ready files").

**Impact:** First-time users face a wall of empty fields with no clear starting point. The header copy mentions "Start analysis" but the actual button is labeled differently, creating a broken signpost.

**Recommendation:** For empty workspaces (no evidence, no filled fields), show a focused onboarding state: collapse the fields card to a minimal view, make the upload zone visually prominent with clear instructions ("Start by uploading lab reports, SDS sheets, or photos of your waste stream"), and show a 3-step visual: (1) Upload evidence, (2) Run analysis, (3) Review and confirm. Fix the header copy to match the actual button label.

---

#### 1.11 Analysis can take up to 2 minutes with no progress indication

**Problem:** The analysis API has a 120-second timeout (workspace.ts line 52). During this time, the button shows "Analyzing..." with a spinner, but there is no progress bar, no step indicator, and no way to cancel. The user has no idea if the operation is 10% done or 90% done.

**Evidence from code:** workspace-canvas.tsx lines 526-533 show the loading state: a Loader2 spinner with "Analyzing..." text. There is no progress callback, no intermediate state, no cancel mechanism.

**Impact:** A 2-minute wait with only a spinner is a significant anxiety-inducing experience, especially when the user is uncertain if the operation is working. Users may navigate away, refresh the page, or click the button again.

**Recommendation:** Show a multi-step progress indicator: "Analyzing evidence... (step 1 of 3)", "Extracting field values...", "Generating proposals...". If the backend cannot provide granular progress, at least show an estimated time remaining or a pulsing progress bar. Add a clear note: "This may take up to 2 minutes for large evidence sets."

---

#### 1.12 "Discard batch" in the proposal modal is a destructive action without adequate protection

**Problem:** The "Discard batch" button in the proposal review modal (proposal-review-modal.tsx, line 167) permanently dismisses all AI proposals with no confirmation dialog. It uses `variant="ghost"` styling, making it visually lighter than "Cancel," but it is actually far more destructive -- Cancel preserves the batch in cache while Discard permanently removes it.

**Evidence from code:** `dismissProposalBatch` (workspace-store.ts, lines 452-456) sets `proposalBatch = null` and `proposalModalOpen = false`. Once dismissed, the only way to recover proposals is to re-run the full analysis. The button sits between Cancel and Apply with ghost styling, making it easy to click accidentally.

**Impact:** A user who meant to click "Cancel" (close modal, come back later) could easily click "Discard batch" (permanently lose all proposals). The visual hierarchy suggests Discard is less important than Cancel, when it is actually more dangerous.

**Recommendation:** Either (a) add a confirmation step to Discard ("Are you sure? You will need to re-run analysis to generate new proposals."), or (b) move it to a less prominent position (dropdown menu or the end of the footer), or (c) restyle it with destructive visual treatment (red text) to signal danger.

---


## 2. Recommended Information Architecture

### Current Structure (flat, disconnected)

```
Header
  - Breadcrumb
  - Title + Status
  - Summary (collapsible, stale badge)
  - Coverage bar
  - Actions (Contacts, Files, Discovery Complete)

Canvas (2 columns)
  Left:
    - Fields card (base + custom, flat list)
    - (Context Note was meant to be here but is actually in right column)
  Right:
    - Upload Evidence card
    - Analysis card (readiness + button)
    - Evidence list card
    - Context Note card
```

### Proposed Structure (flow-oriented, connected)

```
Header
  - Breadcrumb
  - Title + Status
  - Workspace Status Bar (replaces coverage):
    - Evidence: "5 files (3 analyzed, 2 new)"
    - Fields: "4 of 5 core fields filled"
    - Analysis: "Last run 2h ago -- 2 new files since"
    - [Run Analysis] button (promoted to header when actionable)

Canvas (2 columns, reordered)
  Left (Evidence & Analysis -- the INPUT side):
    - Upload Evidence (always visible, prominent)
    - Evidence Timeline (replaces flat list):
      - Each file: status + analysis status + summary
      - Visual grouping: "Analyzed" vs "Pending analysis"
      - Failed files clearly separated with retry
    - Analysis Controls:
      - Clear state communication
      - Button is always "Run Analysis" (never overloaded)
    - Context Note (contextual input, belongs with evidence)

  Right (Fields & Results -- the OUTPUT side):
    - Pending Updates Banner (when proposals exist):
      - "AI found 4 updates from recent analysis. Review now."
      - [Review Updates] button (distinct from analysis)
    - Core Fields card:
      - 5 base fields with fill status
      - Provenance indicator per field (manual vs AI-confirmed)
    - AI-Discovered Fields card:
      - Custom fields with source attribution
      - Clear "confirmed by you on [date]" provenance
```

### Rationale

This restructuring achieves three things:

1. **Left-to-right flow matches the mental model.** Evidence (input) is on the left, fields (output) are on the right. The user's eye naturally flows from source to result.

2. **Analysis status is promoted to the header** where it is always visible, reducing the disconnect between the summary staleness badge and the analysis button.

3. **Proposals get their own distinct UI element** rather than overloading the analysis button, which solves the conflation problem (1.4).


## 3. Concrete Improvements

### 3.1 Header

**Current:** Summary text (collapsible), "Needs refresh" badge, "Information Coverage" progress bar.

**Recommended changes:**

- **Replace "Information Coverage" with a segmented status bar.** Three inline chips: "Core Fields: 3/5", "Evidence: 5 files", "Last Analysis: 2h ago". Each chip is self-explanatory and actionable (clicking "Core Fields: 3/5" scrolls to the fields section).

- **Replace "Needs refresh" badge with contextual staleness.** Instead of a generic badge, show the specific reason: "2 new files since last analysis" or "Fields edited since last analysis." Make it a link/button that triggers analysis directly.

- **Fix the empty-state copy.** Change "No summary yet -- click Start analysis to generate" to "No summary yet -- upload evidence and run analysis to generate." This matches the actual flow and button labels.

- **Move the primary analysis action to the header** when it requires attention (new files ready, proposals waiting). The current placement in the right column of the canvas means users may not see it without scrolling.

### 3.2 Analysis State Communication

**Current:** A single card in the right column with a readiness message, a hint, and a multi-purpose button.

**Recommended changes:**

- **Split into "Analysis Status" and "Analysis Action."** The status should be always-visible metadata (when was analysis last run, how many files were included, how many are new). The action should be a clear, single-purpose button.

- **Add a timeline/history concept.** Show "Last analyzed: March 19 at 2:15 PM -- included 3 files." This gives users a concrete anchor point.

- **Never use the analysis button for proposal review.** When proposals exist, show a separate inline banner or notification badge: "4 AI updates ready for review" with its own button.

- **Add time expectation to the analysis button.** When hovering or before clicking: "This will analyze 5 ready files. Estimated time: ~30 seconds."

### 3.3 Evidence List

**Current:** Flat list of files with processing status icon, filename, category, and optional summary.

**Recommended changes:**

- **Add analysis status per file.** Three states: (a) "Pending analysis" -- file is completed but has never been analyzed, (b) "Analyzed" -- file was included in the most recent analysis run, (c) "New since last analysis" -- file completed after the last analysis. Use visual indicators: a small badge or icon overlay.

- **Group evidence by analysis status.** Show "New (2)" and "Analyzed (3)" sections, or use a subtle background color difference. This immediately answers "what is stale?"

- **Make summaries more useful.** Currently summaries are shown as `text-xs text-muted-foreground` (very small, low-contrast). For evidence files, the summary is often the most valuable piece of information. Give it more visual weight.

- **Show failed files with actionable recovery.** Currently, failed files show a red icon and error text but no retry button. Add a "Retry" action.

- **Show upload timestamp.** The `uploadedAt` field exists in the type but is not rendered. Show "Uploaded 2h ago" to help users orient in time.

### 3.4 Proposal Review Modal

**Current:** Modal with two sections (updates, new fields), each proposal has checkbox + label + answer + confidence + evidence badges.

**Recommended changes:**

- **Show current values for updates.** For `suggestedUpdates`, display the current field value alongside the proposed value in a diff-style format: "Current: Polyethylene -> Proposed: High-density polyethylene (HDPE)". This is essential for informed decision-making.

- **Show evidence excerpts.** The `excerpt` field exists in `WorkspaceEvidenceRef` but is never rendered. Show it as a quoted block below each proposal: '"The material is classified as HDPE per ASTM D4976-04" -- SDS_Report.pdf, p.3'. This is the single most important trust signal.

- **Add a "Select all" / "Deselect all" toggle.** For batches with many proposals, individual checkbox management is tedious.

- **Improve confidence display.** A bare "87%" badge is not actionable. Use semantic labels: "High confidence (87%)" with green, "Medium confidence (62%)" with amber, "Low confidence (34%)" with red. Add a tooltip explaining what confidence means.

- **Fix footer button order.** Currently: Cancel | Discard batch | Apply. The destructive "Discard batch" sits between two non-destructive actions. Move it to the left edge, separated by space, and give it destructive styling.

- **Add keyboard shortcuts.** Allow Enter to apply, Escape to cancel (Escape already works via Dialog).

### 3.5 Post-Apply Feedback

**Current:** Toast notification only.

**Recommended changes:**

- **Highlight recently-applied fields.** After confirming proposals, add a temporary visual treatment (pulsing left border, background tint) to fields that were just updated or created. Clear after 10 seconds or on next user interaction.

- **Show a summary banner.** At the top of the fields card: "Applied 3 updates from AI analysis. Updated: Material Type, Composition. Added: Flash Point." Dismissible.

- **Update the summary staleness immediately.** After applying proposals, the summary should be marked stale (which it is -- workspace-store.ts line 428 sets `summaryStale = true`), and the header should show "Summary outdated -- re-run analysis to update."


## 4. Copy Recommendations

### 4.1 "Information Coverage"

**Current:** "Information Coverage" with a percentage.

**Problem:** "Coverage" implies data coverage (how much of the waste stream is described), not UI completion (how many fields are filled). Users may interpret 80% as "we have 80% of the information needed" when it really means "8 of 11 arbitrary slots are filled."

**Recommended:** "Workspace Completeness" or "Discovery Progress" -- with a breakdown tooltip:
- "Core fields: 3 of 5 filled"
- "Evidence: 5 files uploaded (3 analyzed)"
- "AI-discovered fields: 4"

### 4.2 Analysis Button Labels

**Current:** Three states: "Analyze ready files" / "Re-analyze with N new files" / "Review AI updates"

**Problem:** Three different labels on one button is cognitively expensive. "Analyze ready files" is passive and unclear (ready for what?). "Re-analyze" implies the previous analysis was wrong. "Review AI updates" is a completely different action type.

**Recommended:** Simplify to two elements:
- **Analysis button (always same label):** "Run Analysis" (first time) or "Run Analysis (2 new files)" (when new files exist). Never overload for proposal review.
- **Proposal banner (separate element):** "AI found 4 updates -- Review before applying" with a distinct "Review Updates" button.

### 4.3 "AI-added" / "AI-confirmed"

**Current:** Badge says "AI-added", subtitle says "AI-confirmed". The data model uses `createdBy: "ai_confirmed"`.

**Problem:** "AI-added" sounds like the AI acted unilaterally. "AI-confirmed" sounds like the AI validated something the user wrote. Neither communicates the actual flow: AI proposed, user reviewed and confirmed.

**Recommended:**
- Badge: "AI-discovered" (emphasizes the AI found this in evidence)
- Subtitle: "Confirmed by you" or "Reviewed [date]" (emphasizes human approval)
- Tooltip: "This field was extracted from [evidence file] by AI analysis and confirmed by you on [date]."

### 4.4 "Needs refresh"

**Current:** Amber badge on summary.

**Problem:** Refresh what? How? The badge does not explain the cause or the remedy.

**Recommended:** Context-dependent messages:
- After field edits: "Summary outdated -- run analysis to update"
- After new evidence: "2 new files -- run analysis to include"
- After applying proposals: "Summary outdated -- run analysis to reflect changes"
- All with a clickable "Run analysis" link directly on the badge.

### 4.5 Evidence Processing Messages

**Current readiness messages are functional but could be improved:**

| Current | Recommended |
|---------|-------------|
| "Upload files to start building this waste stream" | "Upload lab reports, SDS sheets, or photos to get started" |
| "N file(s) processing" | "Processing N file(s) -- this usually takes under a minute" |
| "N file(s) ready for analysis" | "N file(s) ready -- run analysis to extract field values" |
| "N new file(s) ready for analysis" | "N new file(s) since last analysis -- re-run to include them" |
| "Analysis up to date" | "All evidence analyzed -- last run [time ago]" |

**Current passive hints need tightening:**

| Current | Recommended |
|---------|-------------|
| "Some files are still processing. Analyze ready files now, then re-run when remaining files complete." | "You can analyze ready files now. Re-run later when processing completes." |
| "Files are processing. Analysis unlocks as soon as files become ready." | "Processing... Analysis will be available once files are ready." |
| "Upload evidence, then analyze ready files in one batch." | "Upload evidence files, then click Run Analysis." |

### 4.6 Proposal Review Modal Copy

**Current title:** "Review AI Proposals"
**Recommended:** "Review Suggested Updates" -- less jargon, focuses on the user's task.

**Current description:** "Review suggested updates and new fields before confirming. Uncheck any item you want to skip."
**Recommended:** "AI extracted these values from your evidence files. Review each suggestion and uncheck any you want to skip. You can edit values before confirming."

**Current section headers:** "Suggested updates" / "New fields"
**Recommended:** "Updates to existing fields" / "New fields discovered" -- clearer distinction.

**Current discard button:** "Discard batch"
**Recommended:** "Discard all suggestions" -- the word "batch" is an implementation detail.

**Current apply button:** "Apply N AI update(s)"
**Recommended:** "Confirm N selected" -- shorter, focuses on user action, not AI.

### 4.7 Header Empty Summary

**Current:** "No summary yet -- click Start analysis to generate"
**Recommended:** "No summary yet -- upload evidence and run analysis to generate"

The current copy references "Start analysis" which is not the label of any button. The analysis button says "Analyze ready files." This is a broken signpost.


## 5. Proposed User Flows

### 5.1 First-Time User (new project, no files)

**Step 1: User opens workspace**
- **Sees:** Header with project name, status badge, "No summary yet" italic text, 0% coverage bar. Canvas with empty base fields (left), upload dropzone (right), Analysis card saying "Upload files to start building this waste stream", empty Context Note.
- **Problem:** Wall of empty content. No clear starting point. User may try to type in fields first (wrong order for the intended flow).
- **Recommended:** Show a focused empty state with a hero prompt: "Start by uploading evidence files for this waste stream. AI will analyze them and suggest field values." Collapse base fields to a minimal preview ("5 core fields -- will be populated from evidence"). Make the upload zone larger and more prominent.

**Step 2: User uploads 3 files (SDS sheet, lab report, photo)**
- **Sees:** Upload progress indicators, then files appear in Evidence list with spinner icons (queued/processing). Analysis card updates to "3 files processing" with passive hint "Files are processing. Analysis unlocks as soon as files become ready."
- **Feedback is good here.** Toast confirmations per file, clear processing indicators.
- **Problem:** No indication of what "processing" means or how long it takes. User may expect instant results.
- **Recommended:** Add "Processing usually takes under a minute" text. Show estimated completion.

**Step 3: Files finish processing (via 5s polling)**
- **Sees:** Green checkmarks replace spinners. Per-file summaries appear. Analysis card updates to "3 files ready for analysis" with button "Analyze ready files" now enabled.
- **Problem:** The transition from processing to ready happens silently during a poll cycle. The user may not notice unless they are watching.
- **Recommended:** Show a toast or subtle animation when files finish processing. The Analysis card should draw attention (e.g., a subtle pulse or badge count).

**Step 4: User clicks "Analyze ready files"**
- **Sees:** Button changes to "Analyzing..." with spinner. Potentially waits 30-120 seconds.
- **Problem:** No progress, no time estimate, no cancel, as discussed in 1.11.
- **Recommended:** Show stepped progress: "Reading evidence files...", "Extracting field values...", "Generating proposals...". Add time estimate.

**Step 5: Analysis completes with proposals**
- **Sees:** Proposal review modal opens automatically. Shows suggested updates to base fields and new custom fields. Each has checkbox, label, answer, confidence %, evidence file badges.
- **Problem:** User may not understand what they are reviewing. No current values shown for updates. No source excerpts. As discussed in 1.9.
- **Recommended:** Show diff view for updates. Show excerpts. Add onboarding tooltip: "AI extracted these from your evidence. Review each and confirm the ones that look correct."

**Step 6: User reviews, edits some values, unchecks one, clicks "Apply 5 AI updates"**
- **Sees:** Loading state, then modal closes. Toast: "Applied 5 AI updates". Workspace refreshes with new field values.
- **Problem:** No visual indication of what changed, as discussed in 1.2.
- **Recommended:** Highlight updated fields. Show summary banner.

**Step 7: User verifies fields and manually fills remaining empty base fields**
- **Sees:** Fields auto-save with debounce. "Saving..." then "Saved" badges. Coverage bar updates.
- **This works well.** The auto-save with status indicators is a good pattern.

**Step 8: User returns to dashboard**
- **Problem:** No indication of what is still needed to complete discovery. The "Discovery Complete" button is disabled with only a "Coming soon in v2" tooltip.
- **Recommended:** Show a completion checklist or next-steps prompt.

### 5.2 Repeat User (returning to add more evidence)

**Step 1: User returns to workspace with existing data**
- **Sees:** Filled fields (left), processed evidence (right), summary with or without "Needs refresh" badge, coverage bar at some percentage.
- **Problem:** If summary is stale, the user sees "Needs refresh" but may not understand why or what to do about it.
- **Recommended:** Show specific staleness reason and direct action link.

**Step 2: User uploads 2 new files**
- **Sees:** New files appear in evidence list with processing status. Analysis card updates to reflect processing count.
- **This transition works reasonably well** thanks to the polling mechanism and dirty-state handling.

**Step 3: Files complete processing**
- **Sees:** Evidence items show green checkmarks with summaries. Analysis card shows "2 new files ready for analysis" with "Re-analyze with 2 new files" button. Header summary shows "Needs refresh" badge.
- **Problem:** User may wonder: will re-analyzing change my existing field values? Are only the new files analyzed, or all files? The label "Re-analyze with 2 new files" is ambiguous -- does "with" mean "using" or "including"?
- **Recommended:** Clarify: "Run analysis on all 5 files (2 new)" or "Analyze 2 new files". Explain in the hint: "Analysis considers all evidence files. New proposals may update existing fields."

**Step 4: User clicks "Re-analyze with 2 new files"**
- **Sees:** Analysis runs, proposals generated. If proposals overlap with existing values, they show in "Suggested updates."
- **Problem:** User may see proposals to update fields they manually edited. Should the AI override manual edits? The system does not distinguish manual entries from AI-confirmed entries in the proposal flow.
- **Recommended:** For fields the user manually edited, show a warning: "This value was manually set by you. AI suggests a different value from new evidence." Give manual edits visual priority.

**Step 5: User reviews proposals, accepts some, rejects others**
- **Sees:** Same modal flow as first-time user.
- **Additional need:** For repeat users, the distinction between "this updates a value AI previously set" and "this updates a value you manually typed" matters enormously. Currently there is no differentiation.

**Step 6: After confirming, user checks that workspace is complete**
- **Sees:** Updated fields, updated coverage bar, stale summary.
- **Problem:** The user has no way to know if they are "done" with discovery. The "Discovery Complete" button is disabled.
- **Recommended:** Show a clear completion state: "All core fields filled. 5 evidence files analyzed. 7 AI-discovered fields confirmed. Ready for discovery completion." (Even if the button is disabled for v2, the status should be communicative.)


## Summary of Priority Actions

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Add per-file analysis status to evidence list | Medium | High -- trust |
| P0 | Add post-apply field highlighting | Low | High -- confirmation |
| P0 | Make coverage bar explainable | Medium | High -- trust |
| P1 | Separate proposal review from analysis button | Medium | High -- clarity |
| P1 | Make "Needs refresh" actionable and contextual | Low | Medium -- flow |
| P1 | Show evidence excerpts in proposals and fields | Medium | High -- trust |
| P2 | Improve empty state for first-time users | Medium | Medium -- onboarding |
| P2 | Add progress indication to analysis | Medium | Medium -- anxiety |
| P2 | Fix "AI-added"/"AI-confirmed" terminology | Low | Medium -- trust |
| P2 | Add confirmation to "Discard batch" | Low | Medium -- safety |
| P2 | Show current values in proposal update diff | Medium | High -- decisions |
| P2 | Fix "Start analysis" copy mismatch | Trivial | Low -- consistency |
