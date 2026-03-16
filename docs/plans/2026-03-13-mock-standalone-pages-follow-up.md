# Mock Standalone Pages Follow-up

Date: 2026-03-13
Scope: `/project/[id]/intelligence-report`, `/project/[id]/proposal`

## Current state

- both routes are standalone UI surfaces built for demo quality
- both use mock data only
- neither route is source of truth for report/proposal logic
- neither route is connected to real discovery outputs, workspace outputs, or backend contracts yet

## Routes in scope

- `frontend/app/project/[id]/intelligence-report/page.tsx`
- `frontend/app/project/[id]/proposal/page.tsx`

## What is intentionally missing

- real report generation trigger/result wiring
- real proposal/file/note persistence
- loading/error/empty states from backend
- cross-screen state sync with dashboard/workspace
- real per-project data hydration

## Future source of truth

These pages must eventually read from:

1. persisted project metadata
2. discovery/workspace outputs
3. real intelligence snapshot/report contract
4. latest proposal + proposal follow-up state + files/notes contract

## Guardrails

- do not add business logic here as if these pages were already real features
- UI polish is ok; product logic duplication is not
- discovery wizard / workspace redesign should define the real data contract first
- replacing mocks should happen after discovery outputs are stable enough to map into these pages

## Revisit triggers

- when discovery wizard output/schema is defined
- when workspace redesign starts
- when backend/API for intelligence report or proposal detail is introduced
- before treating either route as production-ready

## Minimal replacement checklist

- define typed real data inputs for both pages
- map discovery/workspace outputs into those inputs
- replace mock getters with real loader layer
- add real loading/error/empty states
- verify dashboard navigation still lands in coherent detail pages
- remove leftover mock-only assumptions/comments
