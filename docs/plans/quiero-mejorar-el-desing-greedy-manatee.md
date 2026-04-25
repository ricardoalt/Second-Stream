# Sistema de diseño de PDFs del agente IA

## Context

El agente debe generar 3 PDFs distintos (Ideation Brief, Analytical Read, Playbook). Hoy solo 1 PDF (Executive Discovery) está implementado, con paleta y reglas hardcodeadas en `discovery_executive.css` y sin macros reutilizables. Clonarlo 2 veces más generaría triple deuda. Necesidad: design system compartido (tokens + base layout + macros) + tres pares schema/plantilla, con el agente decidiendo qué tool invocar.

Stack 2026 confirmado: **WeasyPrint + Jinja2** (schema-driven HTML→PDF). Validado contra benchmark abril 2026: WeasyPrint es la elección recomendada para "invoices, reports, print-style documents" frente a Playwright (75x más rápido pero +150MB Chromium en deploy, ventaja solo si necesitás JS/CSS Grid avanzado — no es nuestro caso) y Typst (aún sin integración Python madura). Doc oficial WeasyPrint 68: soporte nativo SVG, `FontConfiguration` para `@font-face`, CSS Paged Media completo (`@page`, `counter(page)`).

Acción colateral: bump `weasyprint` de `>=60.0` (pyproject) a `>=68.0` para alinearse con la versión documentada y mejor soporte SVG.

Decisiones cerradas con el usuario:
- Trilogía: **Ideation · Analytical · Playbook** (modelo `brand.py`, no `discovery-reporting.md`)
- Paleta: **Navy de brand.py** vía CSS variables (`#273B77` / `#2F5FA7` / `#63C1E5`)
- Assets: **logo SVG del sidebar + Helvetica del sistema** (sin @font-face, sin fuentes embebidas)
  - Logo source: `frontend/public/secondstream_logo.svg` (variante full) + `frontend/public/secondstream_icon.svg` (variante icon, opcional para covers compactos). Copiar a `backend/app/prompts/pdf/assets/` — backend no debe depender del bundle de frontend.
  - SVG embebido vectorialmente por WeasyPrint: escalable, archivo final más liviano que PNG, sin pixelado al imprimir.

## Approach

Tres capas, separadas por archivo:

1. **Design system compartido** — `tokens.css` + `base.css` + `components.css` + `_base.html.j2` + `_macros.html.j2`. Lo único que conoce de paleta, tipografía y componentes visuales.
2. **PDF específico** — un schema Pydantic + una plantilla Jinja por documento. Extiende `_base`, consume macros.
3. **Agent integration** — tool decorator + skill prompt por documento. El agente decide cuál invocar; nunca toca HTML/CSS.

Migración: refactorizar Executive Discovery al nuevo sistema antes de crear los 3 nuevos (valida tokens en producción real).

## Estructura final

```
backend/app/prompts/pdf/
├── assets/
│   ├── secondstream_logo.svg     # variante full — copiada desde frontend/public/
│   └── secondstream_icon.svg     # variante icon — opcional, para covers compactos
├── design/
│   ├── tokens.css                # :root { --brand-primary, --type-display, --space-md, ... }
│   ├── base.css                  # @page (letter, 0.75in, footer counters), reset, body
│   └── components.css            # .callout-gate-*, .callout-safety-*, .theme-header, .insight-callout, .why-it-matters, .analytical-table
├── _base.html.j2                 # <head>, links a los 3 CSS, blocks: cover, body, footer
├── _macros.html.j2               # cover_block, gate_callout, safety_callout, theme_header, why_it_matters_box, insight_callout, marker, marker_legend
├── discovery_executive.html.j2   # refactor — extends _base
├── ideation_brief.html.j2        # nuevo
├── analytical_read.html.j2       # nuevo
└── playbook.html.j2              # nuevo

backend/app/agents/
├── ideation_brief_schema.py      # nuevo
├── analytical_read_schema.py     # nuevo
└── playbook_schema.py            # nuevo

backend/app/services/
└── pdf_renderer.py               # generaliza discovery_report_renderer.py — render_pdf(template, payload, css_files)

backend/app/prompts/chat-skills/
├── ideation-brief.md             # nuevo
├── analytical-read.md            # nuevo
└── playbook.md                   # nuevo
```

## Tareas

### 1. Design system base (no cambia nada visible aún)
- Crear `pdf/design/tokens.css` portando `PALETTE`, `TYPE_SCALE`, `SPACING`, `MARKERS` de `docs/plans/brand.py:44-134` a CSS variables.
- Crear `pdf/design/base.css` con `@page` (size letter, margin 0.75in, `@bottom-center` + `@bottom-right` con `counter(page)`), reset, body defaults consumiendo tokens.
- Crear `pdf/design/components.css` con `.callout-gate-{open,amber,closed}`, `.callout-safety-{red,amber,yellow,none}`, `.theme-header`, `.insight-callout`, `.why-it-matters`, `.analytical-table` (zebra del `analytical_table_style` portado).
- Crear `pdf/_base.html.j2` con `<head>` que linkea los 3 CSS y `{% block cover %}{% block body %}{% block footer %}`.
- Crear `pdf/_macros.html.j2` con: `cover_block(customer, stream, date, gate=None, handover_tag=None)` que renderiza `<img src="assets/secondstream_logo.svg">`, `gate_callout(status, message)`, `safety_callout(level, message)`, `theme_header(number, title)`, `why_it_matters_box(items)`, `insight_callout(text)`, `marker(key)`, `marker_legend(which=None)`.
- Copiar `frontend/public/secondstream_logo.svg` → `backend/app/prompts/pdf/assets/secondstream_logo.svg`. Idem `secondstream_icon.svg` si querés variante compacta.
- Bump dependency: `pyproject.toml` `weasyprint>=68.0` (estaba `>=60.0`).

### 2. Generalizar renderer
- Renombrar `backend/app/services/discovery_report_renderer.py` → `pdf_renderer.py`.
- Exponer `render_pdf(template_name: str, payload: BaseModel, css_files: list[str]) -> BytesIO`.
- Mantener wrapper temporal `render_discovery_report(payload)` mientras se migra Executive.

### 3. Migrar Executive Discovery al nuevo sistema
- Refactor `discovery_executive.html.j2` → `{% extends '_base.html.j2' %}` + macros + tokens.
- Borrar `discovery_executive.css` — todos sus estilos viven en `components.css` con tokens.
- Test de regresión: comparar PDF generado antes/después.

### 4. Tres PDFs nuevos (uno completo a la vez)

**4a. Ideation Brief**
- `agents/ideation_brief_schema.py`: customer, stream, date, gate_status, gate_blocker, sections[], strategic_insight, optional marker tags.
- `pdf/ideation_brief.html.j2`: `cover_block` + `gate_callout` + sections con `marker()` inline + `insight_callout` + `marker_legend`.
- `chat-skills/ideation-brief.md`: cuándo invocar.
- `agents/chat_agent.py:_register_tools`: `@agent.tool(name="generateIdeationBrief")` clonando patrón.
- `agents/chat_skill_loader.py`: registrar skill (decisión always-on vs conditional — ver preguntas).
- Test `tests/services/test_pdf_renderer_ideation.py`.

**4b. Analytical Read**
- `agents/analytical_read_schema.py`: añade `tables: list[AnalyticalTable]` con `headers` + `rows`.
- `pdf/analytical_read.html.j2`: `cover_block` + `safety_callout` + `<table class="analytical-table">` por cada AnalyticalTable.
- Skill + tool `generateAnalyticalRead` + test.

**4c. Playbook**
- `agents/playbook_schema.py`: `themes: list[PlaybookTheme]` (`number`, `title`, `body`, `why_it_matters: list[str]`). Sin gate (`brand.py:407`).
- `pdf/playbook.html.j2`: `cover_block` (sin gate) + por theme: `theme_header(n, title)` + body + `why_it_matters_box(items)`.
- Skill + tool `generatePlaybook` + test.

### 5. Limpieza
- Eliminar wrapper `render_discovery_report` cuando los 3 nuevos pasen tests.
- Decisión sobre legacy `app/visualization/pdf_generator.py` queda fuera de este plan (no lo usa el agente).

## Critical files

- `backend/app/services/discovery_report_renderer.py` — generalizar.
- `backend/app/agents/chat_agent.py:95-143` — registrar 3 tools nuevas.
- `backend/app/agents/chat_skill_loader.py:20-28` — registrar 3 skills nuevas.
- `backend/app/prompts/pdf/discovery_executive.html.j2` + `.css` — refactor a base+macros+tokens.
- `backend/app/agents/discovery_report_schema.py` — referencia de patrón Pydantic.
- `docs/plans/brand.py:44-661` — fuente de verdad de tokens y componentes (portar a CSS, no copiar).

## Reusable patterns

- `discovery_report_renderer.py:15-34` — receta canónica `Environment(FileSystemLoader)` → `template.render(payload)` → `HTML(...).write_pdf(stylesheets=[CSS(...)], font_config=FontConfiguration())`. Generalizar a 1 función para los 4 renderers.
- `chat_agent.py:98-143` — patrón tool: `@agent.tool` → render → `upload_bytes` → `persist_attachment` → return signed URL. Clonar verbatim para los 3 nuevos.
- `chat_skill_loader.py:51-69` — `_sanitize_*` para limpiar directivas de Claude harness en skill prompts. Replicar para los 3 skills nuevos si traen ese ruido.

## Verification

- `cd backend && uv run pytest tests/services/test_pdf_renderer*.py -v` — los 4 renderers (executive + 3 nuevos) verdes.
- `cd backend && make check` — lint, types, tests del proyecto.
- Smoke por PDF: script que invoca cada renderer con payload mínimo y abre el PDF; verificar cover + callouts + footer + page counter.
- Diff visual Executive antes/después del refactor (regresión cero).
- Conversación end-to-end en chat: pedir cada uno de los 3 PDFs y verificar que el agente invoca la tool correcta.

## Unresolved questions

- **Skills always-on vs conditional**: `discovery-reporting` es `_ALWAYS_ON`. Para los 3 nuevos, ¿siempre cargados (más tokens) o cargados según señales del prompt como `multimodal-intake`? Recomendación: conditional, con heurística `_resolve_conditional_skills` (palabras clave por documento).
- **Analytical Read landscape vs portrait**: `brand.py` asume portrait con `analytical_table_style`. Tablas muy anchas en portrait obligan a auto-shrink CSS. ¿Acepto portrait con `font-size: 8.5pt` en tablas, o mejor `@page :nth(...) { size: letter landscape }`?
- **Eliminación de wrapper temporal**: ¿OK borrar `render_discovery_report` apenas pase la migración del Executive, o lo dejas como alias indefinido?

## Sources

- [WeasyPrint official docs — first steps (v68.1, 2026)](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html) — `FontConfiguration` + Python long-lived process recommendation
- [HTML to PDF benchmark 2026 (Playwright vs Puppeteer vs WeasyPrint)](https://pdf4.dev/blog/html-to-pdf-benchmark-2026) — recomienda WeasyPrint para invoices/reports/print-style
- [Top 10 Python PDF generator libraries 2026 — Nutrient](https://www.nutrient.io/blog/top-10-ways-to-generate-pdfs-in-python/)
- [Generate PDFs with Python: 8 Best Libraries in 2026 — DocuPotion](https://docupotion.com/blog/generate-pdf-python)
