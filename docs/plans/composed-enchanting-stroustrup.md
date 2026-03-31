# Discovery Wizard — UI/UX Polish Plan

## Context
The AI Discovery tab feels cramped: sections lack breathing room, headers are plain text-only labels (unlike Quick Entry which has icons), and spacing is tight throughout. Goal: match the polish level of the Quick Entry tab and the reference design.

## File
`frontend/components/features/discovery-wizard/views/idle-view.tsx` — single file, CSS/Tailwind-only changes + 2 icon imports. No logic changes.

## Changes

### 1. Add icon imports
Add `MapPin`, `Upload` to the existing `lucide-react` import block.

### 2. Header bottom padding (line 489)
`pb-2` → `pb-4` — more room between tab bar and first section.

### 3. Content area padding (line 739)
`py-5` → `py-6` — more vertical breathing room in scrollable area.

### 4. Section gap (line 740)
`space-y-5` → `space-y-6` — better visual separation between section cards.

### 5. All 4 AI sections: padding + header upgrade
For each section (`Client Information`, `Assign Default Location`, `Upload Client Files`, `Dictate Discovery Notes`):
- **Padding**: `p-5` → `p-6`
- **Header**: Replace plain `<span>` text label with icon+title flex row matching Quick Entry pattern:
  ```
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2.5 bg-primary/10 rounded-lg">
      <Icon className="size-5 text-primary" />
    </div>
    <h3 className="text-base font-semibold text-foreground">Section Title</h3>
  </div>
  ```
- Icons: `Building2` (Client), `MapPin` (Location), `Upload` (Files), `Mic` (Voice)
- Header margin: `mb-2`/`mb-3` → `mb-4`

### 6. Footer padding (line 1001)
`py-4` → `py-5` — slightly more room for footer controls.

## Summary table

| Area | Before | After |
|------|--------|-------|
| Header bottom | `pb-2` | `pb-4` |
| Content padding | `py-5` | `py-6` |
| Section gap | `space-y-5` | `space-y-6` |
| Section padding | `p-5` | `p-6` |
| Section headers | text label | icon + h3 title |
| Header-to-content | `mb-2`/`mb-3` | `mb-4` |
| Footer | `py-4` | `py-5` |

## Verification
1. Open the Discovery Wizard modal
2. Check AI Discovery tab: sections have icons, spacing feels open
3. Check Quick Entry tab: unaffected (shares only the header padding change, which is an improvement)
4. Scroll works correctly, dialog fits on screen
5. Run `cd frontend && bun run check:ci`

## Unresolved questions
- The Location section title is currently "Assign Default Location to All Streams" — shorten to "Assign Default Location" for cleanliness, or keep full text?
