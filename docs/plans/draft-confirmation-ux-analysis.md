# Draft Confirmation — UI/UX Analysis

## What This Component Does

The [DraftConfirmationSheet](file:///Users/ricardoaltamirano/Developer/waste-platform/frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx#141-801) is the **final human gate** before an AI-detected waste stream becomes a persisted record. The user reviews 8 fields (grouped into Context, Material, Operations), decides to confirm or reject each AI-detected value, optionally edits them, and clicks "Confirm Draft" to finalize.

**Core user task**: *"Look at what the AI found, verify it's correct, fix anything wrong, submit."*

---

## Current Pattern: Right-Side Sheet

The component currently uses a [Sheet](file:///Users/ricardoaltamirano/Developer/waste-platform/frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx#141-801) (Radix slide-in panel) anchored to the **right edge** of the viewport, `max-w-lg` (~32rem).

### Problems with the Sheet Pattern Here

| Issue | Why It Hurts |
|-------|-------------|
| **Peripheral position** | Sheets are great for *detail panes* (browsing while keeping context visible). But this is a **decision + action** flow — it deserves the user's full attention at center-screen |
| **Narrow width** | Field rows are cramped; the confirm/reject buttons + source badge + label + input compete for ~480px of horizontal space |
| **Dashboard still visible** | The semi-transparent backdrop invites the user to glance at the table behind it, splitting attention during a task that needs focus |
| **No visual "moment"** | Opening a sheet feels like opening a detail pane, not like "you're about to finalize a record." There's no psychological weight to the action |
| **Scroll-heavy** | 8 fields + context card + validation banner + footer = lots of vertical content in a narrow strip. Users must scroll to see everything → risk of missing fields |
| **Mobile awkward** | A right-side sheet on mobile is effectively full-screen anyway, but without the centered affordances users expect from a focused task |

---

## Recommendation: Centered Modal (Dialog)

> [!IMPORTANT]
> A **centered modal** is the right pattern here. This is a focused, finite, high-stakes task (confirm → creates real data). The modal pattern signals: *"Stop and pay attention. Complete this task before continuing."*

### Why Modal Wins for This Use Case

1. **Attention centering** — Centered position + overlay = clear signal that this is a focused task, not a side-panel browse
2. **More horizontal space** — A `max-w-2xl` (~42rem) or even `max-w-3xl` modal gives 30-50% more room for field layouts
3. **Reduced scroll** — With more width, fields can use 2-column grids, fitting everything in ~1 viewport
4. **Psychological weight** — Modals feel like "a thing is happening." Sheets feel like "I opened a drawer." For a finalization flow, the modal gravitas is appropriate
5. **Industry precedent** — Salesforce, HubSpot, and most CRMs use centered modals for record creation/confirmation. Users expect this pattern for data entry + submit

### When Sheets *Are* Better (Not This Case)

- Browsing a detail while keeping the list visible (e.g., email preview)
- Non-blocking secondary info (e.g., activity log)
- Quick edits that don't need full focus

---

## Specific UX Issues to Fix (Regardless of Sheet vs Modal)

### 1. Cognitive Load: Too Many Micro-Decisions

**Problem**: Every field row has confirm ✓ / reject ✗ buttons. For 6+ editable fields, that's 12+ decisions before the user can even think about the values themselves.

**Fix**: Flip the mental model. Default all AI-detected fields to "confirmed" (pre-checked). The user only acts on fields they *disagree* with. This reduces decisions from N to ~0-2 in the common case.

- Remove individual confirm/reject button pairs
- Show a subtle "AI detected" badge on pre-filled fields
- Let users *edit* to override (editing = implicit confirmation of the new value)
- Add a "clear" action only for fields the user wants to blank out

### 2. Visual Hierarchy: All Fields Look Equal

**Problem**: Company, Location, Material Type, Composition — they all get the same row treatment. But Company is locked (just display), Location is complex (combobox + create-new), and the rest are simple inputs.

**Fix**:
- **Context section** (Company + Location): Pull out into a distinct header area with larger typography, no card nesting
- **Editable fields**: Use a clean 2-column grid (label-left, input-right) or a compact stacked layout without the heavy bordered cards per field
- **Group labels** ("Material", "Operations"): Make them actual section dividers, not just tiny uppercase labels floating above

### 3. Field Row Density

**Problem**: Each [ConfirmationFieldRow](file:///Users/ricardoaltamirano/Developer/waste-platform/frontend/components/features/dashboard/components/draft-confirmation-sheet.tsx#990-1086) has: resolved indicator dot → label → required asterisk → source badge → confirm button → reject button → input, all in a bordered card with left-border color coding. It's a lot of visual noise per field.

**Fix**: Simplify to: **label** | **input** | optional **AI sparkle icon**. Remove:
- The resolved/unresolved indicator dots (redundant with the input being filled/empty)
- The per-field bordered cards (use spacing and a shared container instead)
- The per-field confirm/reject buttons (see point 1)

### 4. Validation Banner Position

**Problem**: The validation banner sits *below* all fields. Users must scroll past everything to see if they're ready or not.

**Fix**: Move validation state to the **footer** (which is already sticky). The current footer shows `"X fields still pending"` — enhance this to be the primary readiness indicator. No separate banner needed.

### 5. Location Selector Complexity

**Problem**: The location field has 3 modes (locked, existing-combobox, create-new-form) crammed inside a nested card. The "Create new location" expansion with 4 inline inputs is jarring.

**Fix**: If the user needs to create a new location, open it as a **sub-step** or nested section that replaces the combobox cleanly, rather than expanding inline in the same tight space.

---

## Proposed Modal Layout (High-Level Wireframe)

```
┌─────────────────────────────────────────────────────────┐
│  ✨ Confirm Waste Stream                            ✕   │
│  Review AI-detected data before creating this record    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ACME Corp  ›  Chicago Warehouse                        │
│  (Company)     (Location — editable combobox)           │
│                                                         │
│  ── Material ─────────────────────────────────────────  │
│                                                         │
│  Material type     [ Cardboard OCC          ] ✨        │
│  Material name     [ Used cardboard boxes   ] ✨        │
│  Composition       [ Mixed corrugated ...   ] ✨        │
│                                                         │
│  ── Operations ───────────────────────────────────────  │
│                                                         │
│  Volume            [ ~500 lbs              ] ✨         │
│  Frequency         [ Weekly                ] ✨         │
│  Primary contact   [ John Smith            ]            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ✓ All fields resolved              Cancel │ Confirm ▸ │
└─────────────────────────────────────────────────────────┘
```

**Key changes**:
- **Wider** (`max-w-2xl`) → fields breathe
- **Company + Location as breadcrumb-style header** → context, not a form field
- **Clean label-input pairs** → no cards-per-field, no micro-buttons
- **AI sparkle** inline on pre-filled values → minimal, not noisy
- **Sticky footer** with readiness state + actions
- **Less nesting** → flatter visual hierarchy

---

## Technical Feasibility

- ✅ [Dialog](file:///Users/ricardoaltamirano/Developer/waste-platform/frontend/components/ui/dialog.tsx#8-13) component already exists in the project ([components/ui/dialog.tsx](file:///Users/ricardoaltamirano/Developer/waste-platform/frontend/components/ui/dialog.tsx)) — ready to use
- ✅ All business logic (contract building, validation, field updates, location resolution) is decoupled from the Sheet UI — can be reused 1:1
- ✅ The `framer-motion` library is already in the project for transitions
- ✅ `max-w-2xl` Dialog with scrollable body + sticky footer is a well-supported pattern with Radix

---

## Summary of Recommendations

| Area | Current | Proposed |
|------|---------|----------|
| **Container** | Right-side Sheet (`max-w-lg`) | Centered Dialog (`max-w-2xl`) |
| **Field decisions** | Per-field confirm/reject buttons | AI values pre-confirmed; edit to override |
| **Field layout** | Individual bordered cards per field | Clean label-input grid, shared section containers |
| **Context display** | Company + Location in a card with nested card | Breadcrumb-style header, Location combobox inline |
| **Validation** | Separate banner below fields + footer text | Consolidated in sticky footer only |
| **Visual noise** | Dots + badges + buttons + borders per row | Minimal: label, input, optional AI sparkle |

> [!TIP]
> The biggest UX win isn't the Sheet→Modal change (though that helps). It's **removing the per-field confirm/reject pattern**. That single change cuts cognitive load by ~80% in the happy path and makes the component feel like a quick review instead of an interrogation.
