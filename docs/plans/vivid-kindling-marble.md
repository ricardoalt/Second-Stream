# Stream Workspace UI/UX Premium Redesign

## Context
The stream workspace is the core data-gathering interface where field agents fill out a 4-phase questionnaire (31 questions). Currently it renders as a **flat, single-column form** with no visual grouping — it feels like an endless survey rather than a dynamic, premium workspace. The Quick Capture modal is also utilitarian (plain file inputs, no drag-and-drop). The goal is to make everything feel **premium, clean, and dynamic** using card-based sections, smart 2-column grids, and a polished drag-and-drop Quick Capture — **without changing any logic**.

## Files to Modify

| File | Purpose |
|------|---------|
| `frontend/components/features/streams/stream-workspace-form.tsx` | Main form → card-based sections with 2-col grids |
| `frontend/components/features/streams/stream-detail-page-content.tsx` | Page layout → tighter integration, refined spacing |
| `frontend/components/features/streams/stream-quick-capture-modal.tsx` | Modal → tabbed interface with drag-and-drop zones |
| `frontend/components/features/streams/stream-quick-capture-card.tsx` | Sidebar → add inline drop zone for quick file drops |
| `frontend/components/features/streams/stream-phase-stepper.tsx` | Minor polish — progress indicator per phase |

## Approach

### 1. stream-workspace-form.tsx — Card-Based Dynamic Layout

**Current**: flat `flex flex-col gap-7` with every field stacked vertically, `<Separator>` between sections.

**New**: Each section becomes a **tonal card** (`rounded-xl bg-surface-container-lowest/60 p-6 shadow-xs`) with:
- Section header: icon + section name + question count badge
- Smart grid: **2-column grid** for short fields (`short_text`, `single_select`, `number`, `boolean`, `date`), **full-width** for long fields (`long_text`, `open_question`)
- Use `grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5` inside each card
- Long fields get `md:col-span-2` to break out of the grid

**Per-phase card groupings**:
- Phase 1 "Stream Snapshot" (9 short fields) → 1 card, all fields in 2-col grid. Fields like "Secondary stream name" + "What process generates this stream?" side by side, "How much?" + "Unit of measure" side by side, etc.
- Phase 2 "Current Handling" (5 fields) → 1 card, 2-col grid (number+select pairs)
- Phase 3 "Technical Confidence" (6 fields, mixed) → 1 card, 2-col for selects/booleans, full-width for long_text
- Phase 4 "Project Driver" (2 sections) → 2 cards: "Project Driver" card (5 fields, mixed) + "Later-stage commercial fields" card (6 fields, mixed)

**AI Suggestions banner**: Move inside each card as an inline accent bar (teal left-border strip) rather than a floating banner, for suggestions that belong to that section.

**Phase header**: Remove the ClipboardList icon + "Phase N:" prefix. Instead, show just the phase label as a `font-display text-lg font-semibold` heading with the description below in muted text. Cleaner, less bureaucratic.

**QuestionField refinements**:
- Tighter label styling, remove the Info tooltip icon (adds clutter without value since tooltip just repeats the label)
- AI suggested badge → small teal dot indicator instead of text+icon
- Suggestion review panel → more compact, inline with the field rather than a separate bordered box

### 2. stream-detail-page-content.tsx — Layout Refinements

**Changes**:
- Reduce outer gap from `gap-8` to `gap-6` for tighter composition
- Form container: remove the extra `rounded-2xl bg-surface-container-lowest px-8 py-8 shadow-xs` wrapper (the section cards inside now provide their own surfaces — no need for a wrapper-on-wrapper)
- Phase navigation buttons: style as a sticky bottom bar or a cleaner inline row with `justify-between`, keeping Previous as ghost and Next as primary gradient
- Save status: integrate into the phase navigation row instead of a separate centered line

### 3. stream-quick-capture-modal.tsx — Tabbed Drag-and-Drop

**Current**: 3 stacked sections with plain `<Input type="file">` each.

**New**: Shadcn `Tabs` component with 3 tabs: **Documents** | **Audio** | **Notes**

Each tab content:
- **Documents tab**: `react-dropzone` powered drop zone (`border-2 border-dashed rounded-xl` area with upload icon, "Drag files here or click to browse" text). File chips below showing selected files with name, size, remove button. Process button at bottom.
- **Audio tab**: Same dropzone pattern but filtered to `audio/*`. Show audio file chips with waveform-style icon.
- **Notes tab**: `Textarea` with generous height (rows=8), placeholder "Paste meeting notes, field observations, or copied snippets...", process button below.

Modal container: `glass-popover w-[min(94vw,720px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden` for premium feel. Header with gradient accent.

### 4. stream-quick-capture-card.tsx — Sidebar with Drop Zone

**Add** a compact drag-and-drop zone at the top of the sidebar card:
- Small `border-2 border-dashed rounded-xl` area (~80px height)
- "Drop files here" with upload icon
- Uses `react-dropzone` with `noClick` (the existing action buttons handle click-to-upload)
- On drop → open the Quick Capture modal with files pre-loaded

**Keep** the existing 3 action buttons below the drop zone. They already look good.

### 5. stream-phase-stepper.tsx — Minor Polish

- Add a subtle completion fraction below each phase label: "3/9" answered (derived from answer count). This requires passing `answers` as a prop — but since we're UI-only, we can add an optional `answeredCounts?: Record<StreamPhase, { answered: number; total: number }>` prop. The parent already has this data.
- Widen connector lines slightly and add a subtle pulse animation on the active phase node.

## What NOT to Change
- All exported function signatures (`buildPendingSuggestionMap`, `resolveDisplayedAnswerValue`, `groupQuestionsBySection`, `buildOfferDetailHref`, `buildPhaseCompletion`, etc.)
- Component prop types (StreamWorkspaceFormProps, StreamQuickCaptureModalProps, etc.)
- State management logic, API calls, autosave behavior
- The Complete Discovery modal dialog
- The questionnaire config (stream-questionnaire.ts)

## Verification
1. `cd frontend && bun run check:ci` — lint + type check passes
2. Manual: navigate to a stream workspace → verify card-based layout renders, 2-col grid works on desktop, single-col on mobile
3. Manual: open Quick Capture modal → verify tabs work, drag-and-drop accepts files, process buttons still function
4. Manual: sidebar drop zone accepts file drops
5. Existing tests in `streams-runtime.test.ts` still pass (they test pure functions, not UI)
6. AI suggestion accept/reject still works within the new card layout

## Unresolved Questions
- The user shared 4 reference screenshots that I should look at more carefully. The plan above is based on the described intent ("premium, dynamic, not an extensive form"). If the reference images show specific patterns (e.g., particular card styles, specific icon treatments, specific color accents), we may need to adjust during implementation.
- The stepper enhancement (answer counts) adds an optional prop — should we do this or keep the stepper as-is? It's a very minor addition but adds useful context.
