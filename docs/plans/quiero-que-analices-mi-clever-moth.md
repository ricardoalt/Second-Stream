# Plan — Calibrar PDFs del agente al formato de referencia del cliente

## Context

El cliente reporta que los 3 PDFs que genera el agente (analytical, ideation, playbook) "se parecen pero no son tan profesionales" como los suyos. Compartió 3 PDFs de referencia (`exxonmobil-gulfcoast-spentcaustic_2026-04-29-r2_*.pdf`) y un script `brand.py` (reportlab) como pista del sistema de diseño.

**Diagnóstico tras analizar el código y rasterizar los PDFs del cliente:**

- Tu agente usa **WeasyPrint + Jinja2 + CSS** (NO reportlab). El `brand.py` que pasó el cliente es la versión reportlab del MISMO sistema. Tu CSS (`tokens.css`, `base.css`, `components.css`) ya implementa fielmente los tokens y componentes de `brand.py`. **No hay que migrar de stack ni reescribir el sistema de diseño.**
- La paleta, type scale, spacing, callouts, theme_header y why_it_matters_box están al 100% alineados con la referencia.
- El gap es **calibración visual de la portada y el chrome de página** — composición de cabecera, título display, subtítulo italic, sección H1 sin underline, footer con versión, bullets tipográficos. Cambios contenidos a 3 archivos: `_macros.html.j2`, `_base.html.j2`, `base.css` + ajuste en los 3 templates para usar la nueva firma de `cover_block`.

## Gap analysis (diff visual contra los 3 PDFs del cliente)

### 1. Portada — el gap más grande
| Hoy | Referencia cliente |
|---|---|
| Logo + `doc_type` (uppercase grey) → hr → tabla `Customer / Stream / Date / Gate` | Logo + bloque cabecera de 2 líneas (contexto + revisión/version) → hr → **título display "Analytical Read" (~28pt navy bold)** → **subtítulo italic muted** → línea handover (caption muted) |
| Sin título display | Título grande tipo poster |
| Sin subtítulo | Subtítulo italic ("The evidenced case behind the ideation" / "A consultant's first read…" / "Open during the producer call. Flip to any theme.") |
| Customer/Stream/Date como tabla key/value | Customer/Stream/Date COMPUESTOS en una sola línea: "ExxonMobil — Gulf Coast Spent Caustic Portfolio · Beaumont (2 barges/mo) + GCGV (1 barge/mo) in offer · 2026-04-29" |

### 2. Header band en TODAS las páginas
El cliente repite el bloque de 2 líneas de contexto (customer line + revision/agent/handover line) **arriba de cada página**, no solo la portada. Hoy `_base.html.j2` solo tiene `@bottom-*` boxes — falta `@top-right` con `string()` substitution para repetir el contexto.

### 3. Sección H1 sin underline
Hoy: `.section-h1` tiene `border-bottom: 0.75pt solid var(--ink-soft)`. Cliente: solo bold navy ~16pt sin línea (look más limpio, menos "manual técnico"). Sub-headers (A./B./C.) ligeramente más grandes (~12pt).

### 4. Footer composition
Hoy: `SecondStream` | `Confidential — internal use` | `Page N`. Cliente: `SecondStream · Discovery Agent v3 · r2` | `Internal handover · Discovery` | `Page N`. Falta version + revision en el footer-left, y reformular el footer-center.

### 5. Bullets tipográficos
Hoy: bullets HTML default. Cliente: `•` para nivel 1, `–` (en-dash) para nivel 2, indentación clara, line-height consistente. Requiere CSS `list-style: none` + pseudo-elements `::marker` o explicit content.

### 6. Display title size
Hoy: `--type-display: 22pt`. Cliente: ~28-30pt para los títulos de portada. Subir a 28pt.

### 7. Tablas analíticas (incluido en este PR)
- `font-variant-numeric: tabular-nums` en `.analytical-table` para que las cifras alineen verticalmente
- Padding más compacto: `3pt 6pt` en body cells (vs 4pt actual)
- Tinte amarillo suave (`#FDFAE6` = `--safety-yellow-bg`) en celdas con cambio significativo: agregar clase opcional `.cell-flagged` que el agente puede aplicar via un campo adicional en el schema de la tabla. Cambiar `tables[]` para que cada `row` sea `{ values: [...], flags: [bool, ...] }` en lugar de solo `[...]`. El template renderiza `<td class="cell-flagged">` cuando `flags[i]` es true.

## Cambios concretos

### Archivos a modificar (todos en `backend/app/prompts/pdf/`)

1. **`_macros.html.j2`** — Refactor `cover_block` macro:
   - Nueva firma: `cover_block(header_line_1, header_line_2, title, subtitle, handover_tag, gate=none, gate_blocker=none)`
   - Eliminar la tabla key/value
   - Render: logo (1.6") + header_line_1 (bold) / header_line_2 (caption muted) en col derecha → hr → `<h1 class="cover-title">` → `<p class="cover-subtitle">` → `<p class="cover-handover-tag">` → opcional gate callout debajo
   - Mantener compatibilidad: aceptar `customer/stream/date` y componer `header_line_1` automáticamente si no se pasa explícito

2. **`design/base.css`** — Añadir/ajustar:
   - `.cover-title` — 28pt, bold, navy, line-height 1.1, margin-top 8pt, margin-bottom 4pt
   - `.cover-subtitle` — 14pt, italic, ink-muted, margin 0 0 6pt 0
   - `.cover-header-line-1` — 10pt bold ink
   - `.cover-header-line-2` — 8.5pt regular ink-muted
   - **Quitar** `border-bottom` de `.section-h1` (deja solo bold navy + spacing)
   - Subir `.section-h2` a 12pt
   - Bullets explícitos: `body ul { list-style: none; padding-left: 14pt; } body ul > li::before { content: "•  "; color: var(--ink); margin-left: -10pt; }` y nivel 2 con `–`

3. **`design/tokens.css`** — Subir `--type-display: 28pt` (de 22pt)

4. **`_base.html.j2`** — Agregar `@page` top boxes:
   - `@top-left` con `content: string(header-line-1)` (texto seteado vía `string-set` en el primer elemento del body)
   - `@top-right` con `content: string(header-line-2)`
   - Footer: `@bottom-left: "SecondStream · Discovery Agent v3 · r2"`, `@bottom-center: "Internal handover · Discovery"`, mantener `@bottom-right: Page N`
   - Hacer version y revision parametrizables vía Jinja blocks (`{% block app_version %}v3{% endblock %}` etc.) — el revision label viene del payload

5. **Los 3 templates** (`ideation_brief.html.j2`, `analytical_read.html.j2`, `playbook.html.j2`):
   - Llamar `cover_block` con la nueva firma, pasando título y subtítulo:
     - Ideation: `title="Ideation Brief"`, `subtitle="A consultant's first read — help you see the opportunity"`
     - Analytical: `title="Analytical Read"`, `subtitle="The evidenced case behind the ideation"`
     - Playbook: `title="Call Playbook"`, `subtitle="Open during the producer call. Flip to any theme."`
   - Agregar `string-set: header-line-1 ...` y `string-set: header-line-2 ...` en el wrapper del body para que se propaguen al header de página

### Schemas (Pydantic) — decisiones confirmadas
Agregar a cada `*Payload` (`app/agents/{ideation_brief,analytical_read,playbook}_schema.py`):
- **`header_line: str`** (REQUIRED) — el LLM redacta la línea rica de contexto (ej: "ExxonMobil — Gulf Coast Spent Caustic Portfolio · Beaumont (2 barges/mo) + GCGV (1 barge/mo) in offer"). El SKILL.md correspondiente da ejemplos y guía de estilo.
- **`revision_label: str`** (REQUIRED) — viene del payload, lo pasa el agente/usuario al invocar el tool. Formato canónico: `"Revision 2 (post-offer)"` para la cabecera larga, y un derivado corto `r2` para el footer (extraer con regex en el template, o pedirle al agente ambos campos: `revision_long` + `revision_short`). **Recomendado**: dos campos separados (`revision_label` largo + `revision_short` corto) para evitar regex en el template.
- **`handover_tag: str | None`** (opcional) — "Updated SDS in evidence (June 2024) · Second Beaumont sample in evidence …". Si es None, omitir.

Documentar en los SKILL.md (`backend/app/prompts/chat-skills/{ideation-brief,analytical-read,playbook}/SKILL.md`) cómo generar estos campos con ejemplos basados en los 3 PDFs de referencia del cliente.

### Critical files
- `backend/app/prompts/pdf/_macros.html.j2` — refactor `cover_block`
- `backend/app/prompts/pdf/_base.html.j2` — `@page` top boxes + footer
- `backend/app/prompts/pdf/design/base.css` — cover styles, section-h1 sin border, bullets, h2 size
- `backend/app/prompts/pdf/design/tokens.css` — `--type-display: 28pt`
- `backend/app/prompts/pdf/{ideation_brief,analytical_read,playbook}.html.j2` — nueva llamada a `cover_block` + `string-set`
- `backend/app/agents/{ideation_brief,analytical_read,playbook}_schema.py` — nuevos campos opcionales
- `backend/app/prompts/chat-skills/{ideation-brief,analytical-read,playbook}/SKILL.md` — instrucciones al agente para generar los nuevos campos

### Reuse — NO reinventar
- Tokens, paleta, spacing, type scale: ya existen en `tokens.css` — solo cambiar `--type-display`
- Componentes (`gate_callout`, `safety_callout`, `theme_header`, `why_it_matters_box`, `insight_callout`, `marker`, `marker_legend`): ya implementados, calzan 1:1 con la referencia, **no tocar**
- `pdf_renderer.py`: la pipeline de render (Jinja → WeasyPrint → bytes → S3) sigue igual, no necesita cambios
- Tools del chat agent (`generateIdeationBrief`, etc.): no cambian — solo el payload se enriquece

## Verificación end-to-end

1. **Render local de los 3 PDFs con datos sintéticos** que repliquen el caso ExxonMobil del cliente:
   ```bash
   cd backend && uv run python -c "
   from app.services.pdf_renderer import render_ideation_brief, render_analytical_read, render_playbook
   from app.agents.ideation_brief_schema import IdeationBriefPayload
   # ...build payloads, write outputs to /tmp/regen/
   "
   ```
2. **Comparar visualmente lado a lado** vs los 3 PDFs de referencia: rasterizar con `sips -s format png` y abrir en Preview en modo split.
3. **Checklist visual**:
   - [ ] Portada tiene título display grande navy + subtítulo italic + handover tag
   - [ ] Header de página repite las 2 líneas de contexto en cada página (no solo cover)
   - [ ] Section H1 sin underline
   - [ ] Footer izquierdo dice "SecondStream · Discovery Agent v3 · r{N}"
   - [ ] Bullets nivel 1 con `•`, nivel 2 con `–`
   - [ ] Tipografía: display 28pt, h1 14pt, h2 12pt, body 10pt, caption 8.5pt
4. **Tests**: ejecutar `cd backend && make check` para asegurar que los schemas con campos nuevos opcionales no rompen nada existente.
5. **Smoke test del agente**: pedirle al chat agent que regenere los 3 reports para un dummy y validar que el LLM rellena los nuevos campos opcionales con buena prosa.

## Decisiones cerradas

1. **Header line** → LLM la redacta como campo `header_line: str` requerido en el payload.
2. **Revision label** → campo del payload, dos variantes: `revision_label` ("Revision 2 (post-offer)") + `revision_short` ("r2").
3. **Tables polish** → incluido en este PR (tabular-nums + cell-flagged + padding compacto).
