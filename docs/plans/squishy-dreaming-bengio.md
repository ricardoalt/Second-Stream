# UX Audit: AI Discovery Draft Confirmation Modal

## Context

The confirmation modal is the final gate between AI-extracted waste streams and system ingestion. Non-technical users (sales reps, account managers) must review AI suggestions, resolve client/location mappings, and confirm or discard each stream. The modal works correctly — this audit is UX-only: clarity, copy, hierarchy, affordances, and intuitiveness.

**Files in scope:**
- `frontend/components/features/discovery/draft-confirmation-modal.tsx`
- `frontend/components/features/shared/company-combobox.tsx`
- `frontend/components/features/shared/location-combobox.tsx`

---

## Top UX Issues (ranked by user impact)

### 1. "Leave Review" vs "Finish Review" — confusing exit paths
**Problem:** Two buttons at the bottom with unclear distinction. "Leave Review" tooltip says "Choose what to do with remaining items" but actually just closes the modal (`onOpenChange(false)`). User can't predict what happens to unconfirmed items.
**Severity:** High — users may lose work or hesitate to exit.

### 2. Disabled Confirm button with no inline explanation
**Problem:** When client/location is unresolved, the Confirm button is disabled. The only hint is a small amber badge ("Needs client/location resolution") on the row — easy to miss, especially if the edit panel is closed. No tooltip on the disabled button itself.
**Severity:** High — users see a disabled button and don't know why.

### 3. "Auto-create" badge lacks context
**Problem:** The "Auto-create" badge on combobox triggers doesn't explain WHAT will be created or WHEN. The dropdown shows "Auto-create on confirm" but the trigger badge is just "Auto-create" — opaque for first-time users.
**Severity:** Medium — causes hesitation and uncertainty.

### 4. Location combobox disabled without explanation
**Problem:** When no client is selected, the location dropdown is disabled with no helper text. Users don't know they need to select a client first.
**Severity:** Medium — blocks progress without guidance.

### 5. Silent client-change → location reset
**Problem:** Changing the client silently clears the location. If a user already resolved the location, this is surprising and frustrating — no warning, no confirmation.
**Severity:** Medium — unexpected data loss within the form.

### 6. "Needs city/state" on AI location suggestion — no escape hatch
**Problem:** When an AI-suggested location lacks city/state, the suggestion appears as a disabled item saying "Needs city/state." The user has no way to ADD the missing data in-place — they must use "Add New Location" instead, which is a disconnected flow.
**Severity:** Medium — dead end with no guidance.

### 7. Header copy is jargon-heavy
**Problem:** "Review AI-extracted chemical waste manifests before system ingestion" — "manifests," "system ingestion" are internal/technical terms. Non-technical users won't relate to this.
**Severity:** Low-Medium — doesn't block but creates distance.

### 8. Progress bar counts rejected items in total
**Problem:** Progress = `confirmedCount / totalCount`. If user rejects 5 of 10, they can only reach 50% by confirming the rest. This feels like "falling behind."
**Severity:** Low — confusing but not blocking.

### 9. No undo for confirmed items
**Problem:** Once confirmed, a row shows green "Confirmed" with no way to revert. Users who confirm by mistake are stuck.
**Severity:** Low — rare but anxiety-inducing.

### 10. Icon-only reject button (trash)
**Problem:** Edit and Confirm have text labels; Reject is icon-only. Asymmetric affordance makes it easy to overlook or misidentify.
**Severity:** Low — tooltip exists, but discoverability is weaker.

---

## Recommended UX Changes

### A. UX-Only Changes (no logic/state changes needed)

#### A1. Clarify exit buttons (copy + tooltip only)
- Rename "Leave Review" → "Save & Close" with tooltip: "Save remaining items as drafts and close"
- Rename "Finish Review" → "Confirm All & Finish" with tooltip: "Confirm all remaining streams and finish review"
- OR: merge into a single "Done" button with a summary of what happens

#### A2. Add tooltip to disabled Confirm button
- When `requiresResolution` is true, show tooltip: "Select a client and location to confirm this stream"
- The button already has a tooltip wrapper — just swap the content conditionally

#### A3. Improve "Auto-create" badge copy
- Change badge text from "Auto-create" → "New — will be created"
- Or keep "Auto-create" but add a subtle tooltip: "A new client/location will be created when you confirm this stream"

#### A4. Add helper text to disabled location combobox
- When disabled because no client is selected, show muted text below: "Select a client first"

#### A5. Rewrite header copy for non-technical users
- Title: "Confirm Identified Streams" → "Review AI Suggestions" (or keep title, it's decent)
- Description: "Review AI-extracted chemical waste manifests before system ingestion" → "Review the waste streams AI found. Confirm the ones you want to keep."

#### A6. Make reject button more visible
- Add text label: trash icon + "Discard" (or at minimum, use destructive ghost variant for color contrast)

#### A7. Add "AI suggested:" visual distinction in row
- The current inline badges work but are dense. Consider a subtle left-aligned icon (sparkle/wand) next to AI-suggested values in the row to instantly signal "this came from AI"

#### A8. Improve "Needs city/state" guidance
- Change disabled item text from "Needs city/state" → "Missing city/state — use 'Add New Location' below"
- Arrow or visual cue pointing to the create action

#### A9. Footer status copy simplification
- Currently 4 different sentence patterns that shift as user progresses. Consolidate to: `"X of Y confirmed"` (always visible) + optional secondary line for unresolved items

#### A10. Improve progress bar semantics
- Show `confirmedCount / (totalCount - rejectedCount)` or show two segments: confirmed (green) + rejected (gray strikethrough)
- Alternative: show "5 confirmed, 2 discarded, 3 remaining" as text instead of percentage

---

### B. Changes That Would Require Logic/State Changes

#### B1. Undo confirmation
- Would need a new callback like `onUnconfirmCandidate` and state transition from `confirmed` back to `pending`
- Also needs backend support if confirmation triggers immediate creation

#### B2. Warning before location reset on client change
- Would need a confirmation dialog or at minimum a state check: "Changing client will clear your location selection. Continue?"
- Requires adding conditional logic before `setDraftField(id, "locationId", "")`

#### B3. Inline city/state fields on disabled AI location suggestion
- Instead of a dead-end disabled item, let users type city/state inline to "complete" the AI suggestion
- Would require new state fields and mutation logic for the suggestion object

#### B4. Multi-row editing
- Currently single `editingCandidateId`. Supporting multiple open panels would need an array/set
- Low priority — single edit is acceptable with good row-level summary

#### B5. Progress bar excluding rejected items
- If using `totalCount - rejectedCount` as denominator, need to track rejected count separately
- Currently rejected items are removed from candidates entirely (no count is kept)

#### B6. Batch resolution UI
- When multiple drafts share the same suggested client, show a grouped prompt: "5 streams suggest 'EXXON' — resolve once for all?"
- The logic for `applyClientResolutionBySuggestedClient` already exists (line 206), but there's no UI surfacing this batch capability. Users resolve one, and the rest silently update — which is good, but they don't know it will happen

---

## Implementation Plan

### Batch 1 — Apply now (UX-only, safe)
Focus: disabled states, AI suggestion clarity, state communication

| # | Change | What to do |
|---|--------|------------|
| A2 | Disabled Confirm tooltip | Swap tooltip when `requiresResolution`: "Select a client and location to confirm" |
| A4 | Location helper text | Show muted "Select a client first" below disabled location combobox |
| A5 | Header copy | Description → "Review the waste streams AI found. Confirm the ones you want to keep." |
| A6 | Reject button visibility | Add "Discard" text label next to trash icon (or use `variant="destructive"` ghost) |
| A7 | AI suggestion visual cue | Add sparkle icon next to AI-suggested values in row to signal provenance |
| A9 | Footer status simplification | Consolidate to `"X of Y confirmed"` + optional unresolved line |

### Batch 2 — Review carefully before applying (UX-only but verify semantics)
These touch exit-path copy or progress semantics. Verify exact finalize/leave logic before changing labels.

| # | Change | Risk |
|---|--------|------|
| A1 | Exit button copy | Must verify what "Leave Review" actually does to unconfirmed items before renaming |
| A8 | "Needs city/state" guidance | Verify that "Add New Location" is always visible/reachable from that state |
| A10 | Progress bar semantics | Must verify rejected item counting logic before changing denominator |

### Deferred — later
- B1 (undo confirmation) — needs backend support
- B4 (multi-row editing) — low priority, single edit works
- B5 (progress bar excluding rejected) — needs rejected count tracking

### Consider soon (requires logic changes)
- B2 (location reset warning on client change) — small logic addition, high UX value
- B6 (surface batch resolution) — the logic already exists, just needs UI hint

---

## Guiding principle

Conservative approach: focus on **disabled state communication** and **AI suggestion clarity** first. Don't touch finalize/progress semantics until exact logic is verified. No structural redesign — the interaction pattern is sound, the gap is state communication.

---

## Verification

After implementing Batch 1:
1. Open modal with mixed candidates (resolved, unresolved, AI suggestions)
2. Verify disabled Confirm button shows tooltip explaining why
3. Verify location combobox shows "Select a client first" when disabled
4. Verify header description is plain-language
5. Verify reject button has visible label or color contrast
6. Verify footer shows consistent "X of Y confirmed" format
7. Run existing tests: `cd frontend && bun run check:ci`
8. Visually review with 1, 5, and 15+ candidates
