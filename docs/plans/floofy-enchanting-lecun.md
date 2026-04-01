# Design System Consolidation Plan

## Context

The app already uses `radix-luma` style and has a comprehensive token system in `globals.css` (oklch colors, dark mode, semantic tokens for success/warning/destructive/info, domain-specific tokens). A well-designed Editorial Design System exists in `components/system/` with `PageTemplate`, `PageHeader`, `PageSection`, `KpiGrid`, `KpiCard`, `StatusChip`, `EditorialDataTable`.

**The problem**: only the dashboard page uses these components. The other 41 pages use ad-hoc components with hardcoded Tailwind colors. Result:
- **180 hardcoded color occurrences** across 45 files (bypassing the token system)
- **3 KPI card implementations** (system/KpiCard, ui/kpi-card, dashboard/AgentDashboardKpiCard)
- **5+ status badge implementations** (system/StatusChip, ui/StatusBadge with hardcoded colors, StreamStatusBadge, OfferStatusBadge, ClientStatusBadge, plus ~13 inline badges)
- **2 page section components** (system/PageSection vs ui/DashboardSection with hardcoded cyan)
- **Duplicated confirm dialogs** (ui/ used by 6 files, system/ has 0 consumers)
- **5 different page header patterns** across pages
- **Layout conflict**: AgentShellLayout applies `max-w-[1400px] p-6`, PageTemplate ALSO applies `max-w-7xl px-4 sm:px-6 lg:px-8` = double padding
- **Dead code**: EditorialCard (0 consumers), GradientButton (0 consumers), EngineeringButton (0 external consumers), system/confirm-dialogs (0 consumers)

## Strategy

NOT a redesign. Enforce what already exists: consolidate around system/ components, purge hardcoded colors, fix layout conflict.

---

## Phase 1: Layout Fix (PR #1) — Low risk

Strip PageTemplate's max-width/padding. AgentShellLayout already owns the container (`max-w-[1400px] p-6 gap-6`).

| File | Change |
|------|--------|
| `components/system/page-template.tsx` | Remove `mx-auto w-full px-4 sm:px-6 lg:px-8`, remove `maxWidth` prop and `widthClasses`. Becomes: `<div className={cn("flex flex-col", gapClasses[gap], className)}>` |
| `app/(agent)/dashboard/page.tsx` | Remove `maxWidth` prop if passed |

## Phase 2: Dead Code Removal (PR #2) — Very low risk

| Delete | Reason |
|--------|--------|
| `components/system/editorial-card.tsx` | 0 consumers |
| `components/system/gradient-button.tsx` | 0 consumers |
| `components/system/confirm-dialogs.tsx` | 0 consumers (ui/ versions are used) |
| `components/ui/engineering-button.tsx` | 0 external consumers, uses `lucide-react` instead of `hugeicons` |
| `components/system/index.ts` | Remove exports for deleted files |

## Phase 3: Confirm Dialog Token Fix (PR #3) — Very low risk

| File | Change |
|------|--------|
| `components/ui/confirm-restore-dialog.tsx` | `bg-green-500` -> `bg-success`, `text-green-500` -> `text-success` |

## Phase 4: KPI Card Consolidation (PR #4) — Medium risk, depends on Phase 1

1. **Enhance system KpiCard** (`components/system/page-template.tsx`):
   - Add trend arrow rendering to `change` display (ArrowUpRight/ArrowDownRight icons from hugeicons)

2. **Migrate consumers**:
   | File | From | To |
   |------|------|----|
   | `components/features/workspace/admin-dashboard-page-content.tsx` | `ui/kpi-card` + `ui/dashboard-section` | `system/KpiCard` + `system/PageSection` + `system/KpiGrid` |

3. **Delete after migration**:
   - `components/ui/kpi-card.tsx`
   - `components/ui/dashboard-section.tsx`
   - `components/features/dashboard/components/agent-dashboard-kpi-card.tsx` (verify 0 consumers first)

## Phase 5: Status Badge Consolidation (PR #5) — Medium risk

1. **Enhance StatusChip** (`components/system/status-chip.tsx`):
   - Add `days` prop (appends "(X days)" like StatusBadge does)
   - Add `pipeline` status variant (maps to `info` styling)

2. **Refactor domain badges to wrap StatusChip**:
   - `components/features/streams/stream-status-badge.tsx` — keep domain mapping, render via StatusChip
   - `components/features/offers/components/offer-status-badge.tsx` — same
   - `components/features/clients/components/client-status-badge.tsx` — same

3. **Migrate direct StatusBadge consumers** (~6 files) to StatusChip

4. **Delete**: `components/ui/status-badge.tsx`

## Phase 6: Hardcoded Color Purge — Components (PR #6) — High risk, depends on Phases 3+5

**Token mapping**:
- `red-*` / `rose-*` -> `destructive`
- `green-*` / `emerald-*` -> `success` (or `primary` for brand-teal actions)
- `amber-*` / `orange-*` / `yellow-*` -> `warning`
- `blue-*` / `cyan-*` / `sky-*` -> `info` or `primary`
- `slate-*` / `gray-*` -> `muted` / `secondary`
- `purple-*` / `violet-*` -> avatar palette tokens (`--avatar-*`)

**Tier 1 — Worst offenders** (~8 files, ~90 occurrences):
- `features/admin/users-table.tsx` (18) — role colors -> avatar palette tokens
- `features/streams/streams-drafts-table.tsx` (15) — input states -> semantic tokens
- `features/proposals/overview/safety-alert.tsx` (15)
- `features/proposals/overview/top-resources.tsx` (12)
- `features/proposals/overview/action-playbook.tsx` (10)
- `features/proposals/overview/pathway-cards.tsx` (9)
- `features/discovery/draft-confirmation-modal.tsx` (9)
- `features/discovery-wizard/views/review-view.tsx` (10)

**Tier 2 — Moderate** (~7 files, ~30 occurrences):
- `features/admin/add-user-modal.tsx` (5) — password strength -> `--strength-*` tokens (already exist!)
- `features/admin/org-switcher.tsx` (5)
- `features/proposals/proposal-ai-section.tsx` (5)
- `features/proposals/proposal-technical/ai-insights-card.tsx` (5)
- `features/shared/orphan-stream-picker.tsx` (5)
- `features/workspace/team-members-page-content.tsx` (3)
- `features/streams/stream-quick-capture-card.tsx` (5)

## Phase 7: Hardcoded Color Purge — Pages (PR #7) — Low-medium risk

5 page files under `app/`:
- `app/(agent)/clients/[id]/page.tsx` (8)
- `app/(agent)/clients/[id]/locations/page.tsx` (2)
- `app/admin/organizations/[id]/page.tsx` (1)
- `app/admin/users/components/columns.tsx` (1)
- `app/admin/feedback/page.tsx` (1)

## Phase 8: Page Header Consolidation (PR #8) — Medium-high risk, depends on Phase 1

1. **Enhance system PageHeader** (`components/system/page-template.tsx`):
   - Standardize on `font-display text-3xl font-semibold tracking-tight` (most pages already use `font-display`)
   - Add optional `stats` slot for inline metrics

2. **Migrate ~12 pages** to use `<PageHeader>` instead of inline h1/h2 patterns

3. **Delete**: `features/streams/streams-family-header.tsx` (1 consumer, migrate first)

## Phase 9: Remaining Component Cleanup (PR #9) — Low risk

- `components/ui/metric-card.tsx` — migrate 2 consumers to system KpiCard, delete
- `components/ui/team-avatar.tsx` — replace 8 hardcoded bg colors with `--avatar-*` tokens
- `components/ui/progress-card.tsx` — fix hardcoded `bg-teal-500` -> `bg-primary`

## Phase 10: Shadcn Component Token Audit (PR #10) — Low risk

Audit all 33 installed shadcn ui/ components for post-install hardcoded color customizations. Key suspects:
- `components/ui/alert.tsx` — check for hardcoded warning colors
- `components/ui/loading-states.tsx` — `from-blue-500 to-blue-600` -> `from-primary to-primary/80`

Also fix globals.css internal hardcoded values:
- Sector backgrounds (`.contextual-bg-municipal` etc.) — `rgba()` -> token-based `color-mix()`
- `.gradient-water-teal` — hardcoded hex -> token-based
- Top bar gradient in `features/agent-shell/top-bar.tsx` — `from-[#006565] to-[#008080]` -> `from-primary to-primary/80`

---

## Parallelization

```
Phase 1 ──┬── Phase 4 ── Phase 9
           │
Phase 2    │
           │
Phase 3 ──┼── Phase 6 ── Phase 7 ── Phase 10
           │
Phase 5 ──┘
           
Phase 8 (depends on Phase 1 only)
```

Phases 1, 2, 3, 5 can start in parallel. Phase 8 can start after Phase 1.

## Verification

After each PR:
- `cd frontend && bun run check:ci` — lint + type check
- Visual QA on affected pages (dashboard, admin dashboard, streams, proposals, clients)
- Verify dark mode still works (token-based colors auto-adapt)
- Check no hardcoded colors remain: `rg "bg-(red|green|emerald|blue|cyan|sky|amber|orange|yellow|teal|slate|gray|purple|violet|pink|indigo)-" --type tsx`

## Key Files

| File | Role |
|------|------|
| `components/system/page-template.tsx` | PageTemplate, PageHeader, PageSection, KpiGrid, KpiCard — THE core design system |
| `components/system/status-chip.tsx` | Canonical status badge (CVA, semantic tokens) |
| `components/system/index.ts` | Barrel export for all system components |
| `components/features/agent-shell/agent-shell-layout.tsx` | Shell layout — owns content container |
| `app/globals.css` | Token system (oklch, semantic, domain, dark mode) |
| `components/features/workspace/admin-dashboard-page-content.tsx` | Largest migration target (uses 4 duplicated components) |

## Open Questions

1. **`add-user-modal.tsx` password strength** uses `bg-red-500/bg-yellow-500/bg-blue-500/bg-green-500` — tokens `--strength-weak/fair/good/strong` already exist in globals.css. Should we map to those, or is the current visual (red/yellow/blue/green gradient) intentional?
2. **`users-table.tsx` role colors** (8 colors for different roles) — use avatar palette tokens (`--avatar-1` through `--avatar-8`) or create dedicated `--role-*` tokens?
