# Plan — Workspace demo UI final real

## Context

La demo `/streams/demo` todavía se siente mockup, no producto. El "sabor a demo" proviene de chrome bespoke (readiness ring + loop-stat pills + amber flag + mono meta), header duplicado del brief (3 version Badges **más** strip "Version trail and review state"), composer narrado ("Global composer" + explainer + 3 ghost contextual actions), rail con Card title propio ("Context rail / High-signal review context") y tipografía fractional 7.5–12.5px.

La app real (ver `offer-detail-primary-surface.tsx`) usa `font-display text-xl` + `text-sm` + overline `text-xs uppercase tracking-[0.08em] text-secondary`, surfaces `bg-surface-container-lowest shadow-sm`, grid `xl:grid-cols-[1.6fr_1fr]`. Esta es la gramática visual a replicar.

Objetivo: dossier-first, un solo artefacto dominante, rail silencioso, composer mínimo, tipografía nativa. Premium, clean, intuitivo.

## Closed direction (no reabrir)

- Versiones = unidad de cambio
- Diff por punto, detalle bajo demanda
- Pending Review solo high-salience
- Provenance mínima por punto
- Composer global persistente + acciones contextuales ligeras
- Answer-first → propose-change después
- Sin mutación silenciosa, sin chat-first, sin dashboard overload, sin multi-agent theater
- Un solo agente visible

## Architecture — ruta deseada

```
WorkspaceDemo
├─ WorkspaceHeader          (reducido)
├─ Tabs (4)
│  ├─ OverviewTab           (solo DiscoveryBrief + ContextRail)
│  ├─ StructuredCaptureTab  (header normalizado)
│  ├─ EvidenceTab           (sin intro chrome)
│  └─ HistoryTab            (sin intro chrome)
└─ CaptureBar               (minimal dock)
```

Elimina `FlowStateHeader`. El brief es el narrador — no necesita un widget arriba.

## Changes por archivo

### `frontend/components/features/workspace-demo/workspace-header.tsx`  [rewrite]

- Breadcrumb igual (minor: `text-xs uppercase tracking-[0.08em] text-secondary`)
- Title `font-display text-2xl font-semibold tracking-tight` — baja de 1.65rem
- Meta line = una sola línea: `{company} · {owner} · {DEMO_STREAM.status}` en `text-sm text-muted-foreground`. Quita stacked Badges (agent/company/status) y el mono "Evidence-first · Last run".
- Un solo chip de urgencia via `StatusChip` (`patterns/feedback/status-chip.tsx`) **solo** si `status === "Pending review"` (variant `subtle`).
- Primary CTA igual pero sin override warning inline — reusa `Button` variant `default`/`outline`.
- DropdownMenu overflow: 3 ítems (Refresh / Add evidence / Open review queue). Quita duplicados.

### `frontend/components/features/workspace-demo/flow-state-header.tsx`  [DELETE]

Reemplazado por:
- La línea-lead se mueve **dentro** del brief card como `CardDescription`
- Review count ya está en el CTA del WorkspaceHeader y en la Pending Review del rail
- Changed count ya está en el hover-diff por punto y en el chip `v3` del brief
- El "flag" (warning line) pasa a ser un `Alert variant="warning"` **dentro** del brief card, solo cuando hay blockers reales — no flota suelto

### `frontend/components/features/workspace-demo/discovery-brief.tsx`  [rewrite]

Convertir en dossier real:

- `Card` con `bg-surface-container-lowest shadow-sm` (match offers).
- `CardHeader`:
  - `CardTitle`: `font-display text-xl font-semibold` = "Discovery Brief"
  - `CardDescription`: `DEMO_EXEC_SUMMARY.lead` (la descripción viva del stream)
  - Trailing control: `VersionTrigger` — ghost button `v3 · 11:42 AM` que abre `Popover` con la lista v1/v2/v3 (label + time + summary, status chip per row). Sustituye los 3 Badges sueltos **y** la strip "Version trail".
- `CardContent`:
  - Si hay blockers: `Alert variant="warning"` con `DEMO_EXEC_SUMMARY.flag`. Una sola aparición.
  - Para cada `BriefSection`:
    - Overline `text-xs uppercase tracking-[0.08em] text-secondary` — patrón app real. Sustituye `SectionLabel` bespoke.
    - `SectionStat` → usa `status-chip` pattern (variant `subtle`, size `sm`) cuando `reviewCount > 0`
    - Separator sutil entre secciones (`Separator` default, sin `opacity-30`)
    - Points via `BriefPointRow`
  - Al final, `Separator` + `RecommendedActions` (sin cambio de lógica, solo spacing)
- **Elimina**: el callout "Selected point provenance" con su "Propose revision" button. El rail ya muestra evidencia del punto seleccionado; duplicar lo ensucia.

### `frontend/components/features/workspace-demo/brief-point-row.tsx`  [edit]

- Sizing: `text-sm text-foreground` para el texto principal (de `text-sm` ya está bien); sub-text a `text-xs text-muted-foreground`. Elimina `text-[11.5px]`.
- **Provenance inline por defecto**: debajo del texto, cuando el punto tiene refs o está en `DEMO_PROVENANCE_SUMMARY`, mostrar una línea muted `text-xs text-muted-foreground/80` — "LR-884 p3 · TM-220 line 12". Match con PRD §7 "provenance mínima por punto". Esto elimina la necesidad del callout de provenance en el brief.
- CitationRef: subir de 7px a `text-[10px]` y refs `size-4` — legible, no microscópico.
- UpdatedBadge: usa `Badge variant="primary-subtle" size="sm"` cuando no hay change payload; con change, el HoverCard permanece. Simplifica.
- Left stripe: mantén; sube el contraste a `opacity-70` en confirmed (no `opacity-55`).
- InlineReviewCluster: Button sizes `h-7 text-xs` (un tick más aire). No usar colors inline custom — usa `variant="success"`/`variant="destructive"` del sistema real.

### `frontend/components/features/workspace-demo/evidence-context-rail.tsx`  [rewrite]

- Contenedor: `div sticky top-6 flex flex-col gap-5` — **sin Card wrapper**. El rail no necesita su propio título "Context rail". Lo que importa es el contenido.
- Bloque 1 — **Pending Review**:
  - Overline `text-xs uppercase tracking-[0.08em] text-secondary` = "Pending review"
  - Usa `decision-investigate-*` tokens OK pero padding más ligero
  - Items como botones ghost con dot + label `text-sm`
- Bloque 2 — **Contextual**:
  - Si hay `selectedPointId` con ContextPanel → muestra evidencia del punto (`ContextPanelView` simplificado, sin bordes internos múltiples)
  - Si no → Recent activity (3 últimos `DEMO_RECENT_UPDATES`)
  - Overline cambia dinámicamente: "Evidence" cuando hay selección, "Recent activity" por defecto
- **Elimina**: header Card con agent Badge, ScrollArea fijo h-360px, footer "Need a change? create explicit proposal first." + Propose change button (redundante con composer global y con el InlineReviewCluster del punto).

### `frontend/components/features/workspace-demo/capture-bar.tsx`  [rewrite]

Composer mínimo:

- Container: `fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-card/90 backdrop-blur-md` — más limpio, menos ruido.
- Inner: `mx-auto max-w-[1400px] px-6 py-3`.
- **Elimina**: "Global composer" Badge, explainer "Response-first. Proposed changes require review.", tres ghost contextual actions ("Request source check" / "Flag inconsistency" / "Create correction note"), Separator interno, `bg-surface-container-low` inner card.
- Quedan: un `Input` grande + icon-button `Paperclip` (Attach) + primary `Button` "Send" (no "Propose", no "Voice").
- Placeholder único: `"Ask a question or propose a change — SecondStream Analyst will respond and propose edits."` — ancla el modelo "answer first, propose after".
- MappedStrip: queda pero un tick más pequeño (h-8), posicionado **encima** del input, no dentro del box antiguo.
- Mantén state machine `idle | processing | mapped` y `onPointSelect` navigation.

### `frontend/components/features/workspace-demo/overview-tab.tsx`  [edit]

- Grid: `grid gap-8 xl:grid-cols-[1.6fr_1fr]` — match `offer-detail-primary-surface.tsx:63`. Sustituye el `1fr 260px` bespoke. El rail se ensancha un poco, pero queda secundario y gana legibilidad.
- Quita el `<FlowStateHeader />` (ya deletado).
- `<main>` solo contiene `<DiscoveryBrief />`.
- `<aside>` contiene `<EvidenceContextRail />` con `sticky top-6`.

### `frontend/components/features/workspace-demo/structured-capture-tab.tsx`  [edit]

- Quita el intro card con bordes + explainer (demo narration).
- Header: `<SectionHeader>` pattern de `patterns/layout/section-header.tsx` si existe, sino título `font-display text-xl font-semibold` = "Structured capture" + `text-sm text-muted-foreground` = "Operational fields linked to the brief. Edits require review." — una línea.
- `max-w-3xl` → `max-w-4xl` para aligne con densidad de offers.

### `frontend/components/features/workspace-demo/field-group.tsx`  [edit]

- Chevron custom SVG → usa el chevron default de `AccordionTrigger` (ya es correcto en el sistema). Quita `[&>svg]:hidden`.
- Title: `text-sm font-semibold` (sube de 12.5px).
- Status chip: usa `StatusChip` pattern con size `xs` en lugar de bespoke StatusDot + text.

### `frontend/components/features/workspace-demo/field-row.tsx`  [edit]

- Label `text-sm font-medium text-muted-foreground` (sube de 11.5px).
- Value `text-sm text-foreground` / empty `italic text-muted-foreground`.
- Source line: `text-xs text-muted-foreground` + SourceTag h-4.
- **"En conflicto" → "Conflict"** (UI es inglés).
- Action button: `Button size="sm" variant="ghost"` normal, no `h-6 px-2 text-[10px]`.

### `frontend/components/features/workspace-demo/evidence-tab.tsx`  [edit]

- Quita el párrafo explainer top (`"Evidence stays subordinate to the brief..."`).
- Header row: h2 `font-display text-xl font-semibold` "Evidence" + `Badge neutral-subtle` count.
- Consume `EVIDENCE_DOCS` como está. Filas con `text-sm`/`text-xs`.
- Elimina linked-points pills custom — usa `Badge neutral-subtle` consistente con el resto del app.

### `frontend/components/features/workspace-demo/history-tab.tsx`  [edit]

- Quita el párrafo explainer top.
- Header: h2 `font-display text-xl font-semibold` "Activity history" + count badge.
- Iconos SVG inline OK, pero `actorType` badge usa `StatusChip` o simple `Badge neutral-subtle`.

### `frontend/components/features/workspace-demo/recommended-actions.tsx`  [edit]

- Overline usa la variante real (`text-xs uppercase tracking-[0.08em] text-secondary`) sustituyendo la bespoke.
- Numerals: font-mono OK pero tamaño `text-xs`.
- Action label `text-sm font-semibold`, why `text-xs text-muted-foreground`.
- Buttons via `Button size="sm"` estándar. Nada custom.

### `frontend/components/features/workspace-demo/workspace-demo.tsx`  [edit]

- Tabs trigger padding sube un poco (`px-4 py-2.5`), sizing `text-sm font-medium` (quita el `text-[13px]`).
- `pb-28` → `pb-24` (composer más compacto ahora).
- Sin otros cambios estructurales.

### `frontend/app/(agent)/streams/demo/page.tsx`  [sin cambios]

## Nuevos archivos

Solo si emerge un `version-popover.tsx` aislable dentro de `workspace-demo/` — de otra forma, vive inline en `discovery-brief.tsx`. Default: inline, no fragmentar.

## Reuse del repo

- `@/components/ui/card` — Card/CardHeader/CardTitle/CardDescription/CardContent
- `@/components/ui/alert` — Alert variant warning para el brief flag
- `@/components/ui/popover` — version trigger
- `@/components/ui/separator`, `badge`, `button`, `input`, `dropdown-menu`, `accordion`, `hover-card`, `tabs`
- `@/components/patterns/feedback/status-chip.tsx` — reemplaza todas las bespoke count/status pills
- `@/components/patterns/layout/section-header.tsx` (si existe) — headers de tabs secundarios
- `lucide-react` iconos (Paperclip, ChevronRight, AlertTriangle) — quita los SVG inline bespoke donde se pueda

Tipografía app-real a usar:
- Title dossier: `font-display text-xl font-semibold tracking-tight text-foreground`
- Page H1: `font-display text-2xl font-semibold tracking-tight`
- Overline: `text-xs uppercase tracking-[0.08em] text-secondary`
- Body: `text-sm text-foreground`
- Sub: `text-xs text-muted-foreground`
- Surface dossier: `bg-surface-container-lowest shadow-sm rounded-xl border-outline-variant/70`

## UI/UX decisions propias (criterio)

1. **Mata `FlowStateHeader`.** Tres caminos comunican lo mismo (CTA del header, version chip del brief, pending queue del rail). Un widget más = dashboard overload.
2. **Provenance inline en cada punto.** PRD §7 pide "minimal per point". Hacerlo inline (bajo el texto) en vez de en callout separado mantiene promesa y gana densidad informativa sin ruido.
3. **Flag del brief → `Alert` dentro del dossier.** El warning es parte del artefacto ("hay un blocker"), no un banner flotante suelto. Ancla contexto en el lugar correcto.
4. **Version trigger compacto, no strip.** La strip "Version trail and review state" + 3 Badges sueltos era doble display. Un solo `Popover` trigger `v3 · 11:42 AM` → lista de versiones. Detail on demand (PRD §12).
5. **Rail sin Card wrapper.** Un rail que lleva su propio título "Context rail / High-signal review context" se auto-inmortaliza como widget. Quitar el wrapper lo vuelve asistente silencioso.
6. **Composer minimal.** Los 3 ghost buttons ("Request source check" / "Flag inconsistency" / "Create correction note") son demo-narration — en producto real, esas acciones emergen del contexto del punto (InlineReviewCluster) o se derivan del prompt. Quedan en el brief, no en la barra global.
7. **"En conflicto" → "Conflict".** Consistencia de idioma (UI inglesa).
8. **Tipografía nativa a la app.** Abandonar la cascada de 7.5/8.5/9.5/10.5/11.5/12.5px. Mantener `text-sm` + `text-xs` + `font-display` + overlines. Todo gana claridad y match con el resto del producto.

## Fuera de scope

- `/streams/[id]` productivo — intocado
- Backend (`backend/**`) — intocado
- Offers area — solo consulta como referencia
- Otras rutas `(agent)/**`

## Validación

- `cd frontend && bun run check:ci` (lint + typecheck + tests ligeros)
- Validación visual: abrir `/streams/demo`, verificar:
  - Brief se lee como dossier (un solo artefacto dominante)
  - Rail queda secundario, sin título propio
  - Composer es una línea limpia sin narración
  - Click en un punto → provenance/evidence en rail (sin callout dentro del brief)
  - Tabs Evidence/History/Capture sin intro explainer

No correr build. No modificar CI.

## Dependencias confirmadas

- `patterns/layout/section-header.tsx` existe — usar para tabs secundarios.
- `Alert` soporta `variant="warning"` — usar en brief flag.
- `StatusChip` mapea nuestros estados así: `investigate` (needs-review/conflict), `pending` (missing), `success`/`go` (confirmed). Variante `subtle` para chrome, `filled` solo para Pending Review.

## Unresolved

Ninguno — dirección cerrada, primitivos verificados.
