# Discovery Overhaul — Implementation Plan

## Context

Restructure the flat questionnaire (2 sections, 16 fields) into a 6-dimension Discovery Dashboard (47 fields) that matches real broker discovery workflow. No new DB entities — reuse existing `project_data` JSONB with `DynamicSection[]`. UX design doc: `docs/plans/discovery-ux-design.md`.

**Hierarchy stays**: Company → Location → Project (= one waste stream / material investigation).

---

## Changes

### Backend

1. **Rewrite assessment template**: `backend/app/templates/assessment_questionnaire.py`
   - Replace 2 sections / 16 fields with 6 sections / 47 fields
   - Sections: Material Identity, Evidence & Docs, Volume & Logistics, Regulatory & Compliance, Cost & Economics, Client Priorities
   - Same `DynamicSection` / `DynamicField` format — no schema change

2. **Update AI extraction prompts**: intake ingestion service
   - Map extracted data to new field IDs (e.g., `waste-types` → `material_family`)
   - Update section IDs in extraction logic

3. **Adjust threshold**: `PROPOSAL_READINESS_THRESHOLD` may need lowering (70% of 47 = 33 fields vs 70% of 16 = 11)

4. **Data migration** (if existing projects): map old field IDs → new field IDs in `project_data` JSONB

### Frontend

5. **New component**: `frontend/components/features/projects/discovery-progress-cards.tsx`
   - 6 cards with per-dimension completion %, color coding, clickable → scroll to section
   - Responsive: horizontal scroll mobile, grid desktop

6. **Modify**: `frontend/components/features/projects/technical-data-sheet.tsx`
   - Add `DiscoveryProgressCards` above the accordion
   - No other structural changes — accordion renders whatever sections are in the template

7. **Modify**: `frontend/components/features/projects/project-tabs.tsx`
   - Rename tab `"technical"` → `"discovery"`, label → "Discovery", icon → Search/Compass
   - Update `TAB_VALUES`

8. **Modify**: `frontend/components/features/projects/project-header.tsx`
   - "Discovery Progress" label instead of "Questionnaire Progress"

9. **Modify**: `frontend/components/features/projects/project-overview.tsx`
   - Show per-dimension progress bars instead of single %
   - "Continue Discovery →" CTA

10. **Modify**: Alert banner in technical-data-sheet
    - Show top gaps by dimension with "Go to [Section]" buttons

### Files Summary

| Action | File |
|--------|------|
| Rewrite | `backend/app/templates/assessment_questionnaire.py` |
| Modify | Backend intake AI prompts (field mapping) |
| New | `frontend/components/features/projects/discovery-progress-cards.tsx` |
| Modify | `frontend/components/features/projects/technical-data-sheet.tsx` |
| Modify | `frontend/components/features/projects/project-tabs.tsx` |
| Modify | `frontend/components/features/projects/project-header.tsx` |
| Modify | `frontend/components/features/projects/project-overview.tsx` |
| Maybe | Data migration for existing projects |

## Sequencing

1. Backend: rewrite assessment_questionnaire.py (6 sections, 47 fields)
2. Backend: update intake AI field mappings
3. Frontend: discovery-progress-cards.tsx
4. Frontend: integrate cards into technical-data-sheet.tsx
5. Frontend: rename tab + header label
6. Frontend: overview with dimension progress
7. Test: `make check` + `bun run check:ci` + manual flow

## Verification

1. `cd backend && make check`
2. `cd frontend && bun run check:ci`
3. Manual: create project → see 6 sections → fill fields → progress cards update → upload doc → AI maps to new fields → threshold → generate proposal
