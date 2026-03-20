# Workspace v1 UX Audit — Waste-Stream Evidence Workflow

## Context

Workspace v1 is the main editing surface for waste stream characterization. Users upload evidence (lab reports, SDS, photos), AI analyzes files and proposes field values, users review proposals before applying. The intended mental model is: **upload → analyze → review → confirm**. This audit identifies where the current UX breaks that model and recommends fixes.

---

## 1. Top UX Problems (by severity)

### P0 — Critical

**1. Evidence-to-field provenance is invisible**
`workspace-canvas.tsx:75-113` — `EvidenceItemRow` shows only processing status (queued/processing/completed/failed). No indicator of whether a completed file was included in the last analysis, is new since last analysis, or was never analyzed. The store tracks `newReadyEvidenceSinceAnalysis` but only surfaces it in the Analysis card readiness message — never on individual files. Users cannot trace "which evidence informed which field value."

**2. Post-apply feedback is a black hole**
`proposal-review-modal.tsx:43-51` — After confirming proposals, the modal closes, `proposalBatch` nulls out, and the canvas re-renders with updated data. Nothing distinguishes freshly-applied values from pre-existing ones. The only feedback is a toast (`"Applied N AI update(s)"`). Users cannot verify the correct fields were updated without manually scanning everything.

**3. "Information Coverage" is opaque**
`workspace-header.tsx:244-254` — The formula `(filled_base + min(evidence, 3) + min(custom, 3)) / 11 * 100` combines orthogonal concepts with hidden caps (evidence maxes at 3, custom maxes at 3). The header shows a bare progress bar + percentage with no breakdown. Users can't understand what the number means, what contributes to it, or what would increase it.

### P1 — High

**4. Analysis button conflates three intents**
`workspace-canvas.tsx:242-250` — Button label switches between "Analyze ready files" (triggers 2-min analysis), "Re-analyze with N new files" (also triggers analysis), and "Review AI updates" (instantly opens a modal). The last is a completely different action type. These should be separate UI elements.

**5. "Needs refresh" provides no actionable context**
`workspace-header.tsx:211-218` — Shows for four different reasons (field edits, context note changes, custom field changes, new evidence). User can't tell why summary is stale or what to do. Badge is in the header, analysis button is in the right column of the canvas — spatial disconnect.

**6. Evidence excerpts exist in data but are never rendered**
`workspace.ts:31` defines `WorkspaceEvidenceRef.excerpt`. It's available on custom fields and proposals, but the UI never renders it. This is the single most important trust signal the system could provide — the exact passage from a source document — and it's completely discarded at the rendering layer.

### P2 — Medium

**7. Two-column layout inverts the natural reading flow**
Fields (output) are left, evidence (input) is right. The mental model is upload→analyze→review, but the eye reads left→right, hitting the result before the input.

**8. No "select all / deselect all" in proposal review**
`proposal-review-modal.tsx:74-131` — With up to 50 proposals in a batch, toggling individually is tedious. No bulk actions.

**9. Custom fields lack delete action**
Once a custom field is confirmed, there's no way to remove it from the workspace. Only label/answer editing is supported.

---

## 2. Recommended Information Architecture

### Current structure
```
Header: [breadcrumb] [title + status] [summary + coverage] [actions]
Canvas:
  LEFT (3/5):  Fields card (base + custom)
  RIGHT (2/5): Upload → Analysis → Evidence list → Context Note
```

### Recommended structure
```
Header: [breadcrumb] [title + status] [actions]
         [summary w/ provenance + staleness reason] [completeness breakdown]
Canvas:
  LEFT (2/5):  Evidence & Input
               - Upload zone
               - Evidence list (with analysis-inclusion indicators)
               - Context Note
  RIGHT (3/5): Fields & AI Results
               - Analysis status bar (always visible, separate from evidence)
               - Base fields (with source badges)
               - AI-added fields (with source badges + excerpts)
               - [Sticky] Proposal review banner (when batch exists)
```

**Rationale**: Input→Output left-to-right matches the mental model. Analysis status becomes a persistent bar between the two columns (or at the top of the right column) rather than buried in a card. Proposal review gets its own persistent banner, not overloaded onto the analysis button.

---

## 3. Concrete Improvements

### Header

| Current | Problem | Recommendation |
|---------|---------|----------------|
| Collapsible summary, 2-line clamp | Summary text is generic, no provenance | Show "Based on N files, last updated [date]" subtitle. List the source file names in a tooltip. |
| "Needs refresh" amber badge | No reason given | Replace with specific reason: "Summary outdated — 2 new files since last analysis" or "Summary outdated — fields were edited" |
| "Information Coverage" bare progress bar | Opaque formula, hidden caps | Rename to "Completeness". Show segmented bar: `[base fields 3/5] [evidence 2/3+] [AI fields 1/3+]` with tooltips per segment. Or at minimum show "3 of 5 core fields filled • 2 files analyzed • 1 AI field confirmed" as text below. |
| "No summary yet — click Start analysis" | Button label is "Analyze ready files", not "Start analysis" | Fix copy to match: "No summary yet — analyze evidence to generate" |
| "Discovery Complete" disabled button | Confusing placeholder | Move to dropdown or remove entirely until v2 |

### Analysis State

| Current | Recommendation |
|---------|----------------|
| Single button with 3 label variants | Split into two elements: (1) "Analyze" button for running analysis, (2) "Review N AI suggestions" banner/button that appears only when proposals exist |
| Readiness + passive hint as two text lines | Merge into a single, structured status: icon + primary message. Use a colored left border or background to signal state (green=up-to-date, amber=new-evidence, blue=proposals-ready) |
| "Analyzing..." spinner on button | Show a progress card: "Analyzing 3 files... This may take up to 2 minutes." with a cancel option |
| No indication of what was analyzed | After analysis, show "Last analyzed: [timestamp] • [N] files included" |

### Evidence List

| Current | Recommendation |
|---------|----------------|
| Green check = "completed" (processing done) | Add a second indicator: "included in analysis" vs "new since last analysis". Use a small dot or tag. |
| File summary shown inline | Add expandable detail: show the AI-extracted summary + "N proposals from this file" |
| No sorting/filtering | Sort by: newest first. Group by: status (processing → ready → analyzed). Show "new" badge on files uploaded since last analysis. |
| Failed files show error text | Add retry action per file |

### Proposal Review Modal

| Current | Recommendation |
|---------|----------------|
| Title: "Review AI Proposals" | → "Review AI Suggestions" (less technical) |
| No excerpts shown | Show evidence excerpt (`ref.excerpt`) inline under each proposal, styled as a blockquote. This is the #1 trust improvement. |
| Confidence as bare percentage badge | Add semantic label: "High confidence (92%)" or color-code (green >80, amber 50-80, red <50). Tooltip: "Based on [filename] p.3" |
| No select all / deselect all | Add "Select all" / "Deselect all" controls per section |
| "Discard batch" | → "Dismiss all suggestions" (less jargony) |
| No diff for updates to existing fields | For "Suggested updates", show current value vs proposed value side-by-side or as a diff |
| Post-confirm: only a toast | After applying: (1) highlight freshly-updated fields with a temporary "just updated" badge that fades after 5s, (2) show a summary banner: "Applied 3 updates: Material Type, Composition, + 1 new field" |

### Post-Apply Feedback

Currently: toast message only. Recommended:
1. **Immediate**: Toast with details ("Applied 3 updates to Material Type, Composition, Moisture Content")
2. **Persistent (5-10s)**: Highlight changed fields with a subtle animation or colored left-border + "Updated just now" micro-label
3. **Audit trail**: Show "Last updated by AI analysis on [date]" on each field (data already exists in `created_at` + `created_by`)

---

## 4. Copy Recommendations

| Current Copy | Problem | Recommended Copy |
|---|---|---|
| "Information Coverage" | Sounds like data-coverage metric, not completion | "Workspace Completeness" or "Stream Profile" |
| "Analyze ready files" | "Ready" is ambiguous (ready for what?) | "Run AI Analysis" |
| "Re-analyze with N new file(s)" | Too wordy, unclear if it re-does old files | "Analyze N new files" |
| "Review AI updates" | Conflated with analysis button | Separate element: "N AI suggestions ready — Review" |
| "AI-added" badge | Unclear: added by AI, or added for AI? | "AI-sourced" |
| "AI-confirmed" subtitle | Contradicts mental model — user confirms, not AI | "Reviewed & confirmed" or "Human-confirmed" |
| "Needs refresh" | Refresh what? How? | "Outdated — [reason]" e.g. "Outdated — 2 new files" |
| "Core" badge on base fields | "Core" means nothing to a waste-industry user | "Required" (matches the `required: true` flag) |
| "Discard batch" | Implementation jargon | "Dismiss all suggestions" |
| "No summary yet — click Start analysis to generate" | No "Start analysis" button exists | "No summary yet — run AI analysis on uploaded evidence to generate" |
| "Upload files to start building this waste stream" | "Building" is vague | "Upload lab reports, SDS, or photos to characterize this waste stream" |
| "Analysis up to date" | Doesn't say what was analyzed | "All evidence analyzed • [N] files • last run [date]" |
| "Fields" card title | Generic | "Waste Stream Profile" or "Stream Characterization" |

---

## 5. Proposed User Flows

### First-Time User (new project, no files)

| Step | User Sees | User Does | System Feedback |
|---|---|---|---|
| 1. Land on workspace | Empty state: 5 blank required fields, empty evidence panel, "Upload lab reports, SDS, or photos to characterize this waste stream" | Optionally fills some fields manually | Auto-save "Saved" badge per section |
| 2. Upload evidence | Drag-drop zone accepts files | Drops 2 PDFs + 1 photo | Each file appears in evidence list with spinner + "Processing..." |
| 3. Wait for processing | Evidence list polls every 5s, spinners → green checks | Watches or continues editing fields | Each file shows summary when done. Analysis card shows "3 files ready — Run AI Analysis" |
| 4. Trigger analysis | "Run AI Analysis" button is enabled (primary variant, not outline) | Clicks button | Progress card: "Analyzing 3 files... ~1-2 min." Button disabled. |
| 5. Review proposals | Modal opens: "Review AI Suggestions" with excerpts, confidence, diffs | Reviews, edits 1 answer, unchecks 1 suggestion, clicks "Apply 4 AI suggestions" | Toast: "Applied 4 updates: Material Type, Composition, Volume, + 1 new field". Fields highlight briefly. |
| 6. See result | Fields populated, summary generated in header, completeness bar shows progress | Scans fields, sees "just updated" indicators fade | Completeness: "4/5 required fields • 3 files analyzed • 2 AI fields" |

### Returning User (adding more evidence)

| Step | User Sees | User Does | System Feedback |
|---|---|---|---|
| 1. Return to workspace | Summary shows with "Outdated — last analyzed 3 days ago". Fields filled. Evidence list shows 3 files (all marked "included in analysis"). | Reviews current state | — |
| 2. Upload new evidence | Drops 1 new PDF | File appears with "new" badge + processing spinner | — |
| 3. Processing completes | New file shows green check + "new" badge. Analysis card: "1 new file — Analyze 1 new file" | Clicks analyze | Progress indicator |
| 4. Review proposals | Modal shows only new/changed proposals. "Suggested updates" section shows current→proposed diff for existing fields. | Approves 2, skips 1 | Applied. Changed fields flash. Summary refreshes. "Outdated" badge clears. |

---

## Unresolved Questions

1. **Column swap**: Swapping left/right columns (evidence left, fields right) is a layout-level change. Worth doing in v1.1 or defer to v2?
2. **Evidence excerpts**: The `excerpt` field exists in `WorkspaceEvidenceRef` types. Is it reliably populated by the backend AI agents, or would we need backend work to ensure excerpts are always present?
3. **Completeness formula**: The current formula caps evidence at 3 and custom fields at 3. Should we revisit these caps, or just make the existing formula more transparent?
4. **Field deletion**: Should users be able to delete AI-added custom fields? This has data-model implications (soft delete vs hard delete in the JSONB).
5. **Analysis history**: Should the workspace show a log of past analyses (when, how many files, how many proposals), or is the current "latest only" model sufficient for v1?
