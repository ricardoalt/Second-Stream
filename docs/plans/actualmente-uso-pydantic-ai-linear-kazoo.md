# Plan: Integrar 10 skills + tool de PDF en `chat_agent.py`

## Context

PM entregó 10 documentos de skill (formato Anthropic Agent Skills: frontmatter YAML + markdown) porque el cliente aprobó el resultado. Viven en `backend/docs/skills-and-prompt-for-agent/skills/<name>/SKILL.md` sin wiring. El chat agent (`backend/app/agents/chat_agent.py`) es el menos moderno del repo: `system_prompt=` estático, cero tools, `ChatAgentDeps` nunca leído vía `RunContext`.

**Objetivo:** wirear las 10 skills con primitivas nativas de Pydantic AI (no abstracciones paralelas) + registrar la única tool que demandan: generación del PDF Discovery Executive Report.

**Diseño verificado contra doc oficial (2026):**
- `@agent.instructions` > `@agent.system_prompt` (cita: *"we recommend using instructions instead of system_prompt unless you have a specific reason"*).
- NO existe primitiva "skills" en Pydantic AI. Traducción idiomática: 9 skills = prompt → `instructions`; 1 skill (`discovery-reporting`) = tool → `@agent.tool`.
- `ToolReturn(return_value, content, metadata)` — `metadata` es *"accessible to your application but not sent to the LLM"*. Canal nativo para `{attachment_id, filename, download_url}`.
- `event_stream_handler=` + `FunctionToolCallEvent`/`FunctionToolResultEvent` = patrón oficial para observar inicio/fin de tool call durante streaming.
- NO usar `AbstractCapability`: docs dicen *"If the user only needs one tool or one hook, do not introduce a capability"*.

## Decisiones (todas tomadas)

| Decisión | Elegido | Descartado |
|---|---|---|
| Arquitectura | Agente único + instructions composicionales + 1 tool | Multi-agente handoff (over-engineering) |
| PDF engine | WeasyPrint + Jinja2 (stack del repo) | reportlab (heredado del harness Claude, dos stacks) |
| Skill loading | 7 always-on + 2 condicionales (multimodal-intake, sds-interpretation) | 10 always-on (quema ~25K tokens/turno sin prompt caching en Bedrock) |
| Trainee-mode | **Diferido a fase 2** (evita migración en `ChatThread`) | Agregar columna ahora |
| Artifact metadata | `ToolReturn.metadata` + stream event lateral | Engordar `ChatAgentOutput.artifacts` (rompe `stream_text(delta=True)`) |
| Cleanup de orphans | In-memory tracking de IDs producidos + DELETE por ID en except | Agregar `run_id` a `ChatAttachment` (evita migración) |
| Scope | Un solo PR | Dos PRs (skills primero, PDF después) |
| Layout de prompts | Alineado con convención plana nueva del user: `app/prompts/chat-skills/<name>/SKILL.md` | Nested `app/prompts/skills/chat/discovery/...` (inconsistente con `chat-agent-prompt.md` actual) |

## Composición de skills

Base prompt actual: **`backend/app/prompts/chat-agent-prompt.md` se preserva** (identidad del agente). Las skills se anteponen/componen en orden explícito.

**Always-on (7)** — concatenadas en `instructions=` + manifiesto al frente:
1. `safety-flagging` (override, primero)
2. `qualification-gate` (cross-cutter)
3. `sub-discipline-router` (gatekeeper por turno)
4. `specialist-lens-light`
5. `commercial-shaping`
6. `discovery-gap-analysis`
7. `discovery-reporting` (con prosa saneada: reemplaza menciones a reportlab/`/mnt/user-data/outputs/`/`present_files` por referencia al tool `generate_discovery_report_pdf`)

**Condicionales (2)** — inyectadas vía `@chat_agent.instructions` leyendo `RunContext[ChatAgentDeps]`:
- `multimodal-intake` → si alguna `attachment.media_type` no arranca con `text/`
- `sds-interpretation` → si nombre o content-type sugiere SDS

Frontmatter `description` se conserva SOLO en condicionales (el modelo lo usa como trigger). En always-on se elimina (redundante con la prosa).

Manifiesto (`_manifest.md`, ~5 líneas): orden canónico + regla "gate+safety siempre visibles" + "discovery-reporting no corre hasta que commercial-shaping haya poblado sus 7 bloques".

## File-level changes (por orden de dependencia)

### 1. `backend/pyproject.toml`
- `pydantic-ai-slim[openai]>=1.0.0` → `pydantic-ai-slim[bedrock]>=1.0.0`.
- Quitar `reportlab>=4.2.0` (no usado, se reemplaza por WeasyPrint que ya está pinneado).

### 2. `backend/app/prompts/chat-skills/<name>/SKILL.md` (nuevo directorio, 10 archivos)
- Copiar `backend/docs/skills-and-prompt-for-agent/skills/<name>/SKILL.md` → `backend/app/prompts/chat-skills/<name>/SKILL.md`, preservando frontmatter.
- Nuevo `backend/app/prompts/chat-skills/_manifest.md` (composición canónica).
- Borrar `backend/docs/skills-and-prompt-for-agent/skills/skills-integration.test.ts` (stale, TypeScript de otro proyecto).
- Mantener `backend/docs/skills-and-prompt-for-agent/` como documentación humana (o mover a `docs/skills/` si preferís). No borrar — es el source-of-truth de diseño del PM.

### 3. `backend/app/agents/chat_skill_loader.py` (nuevo, ~80 líneas)
```python
def load_skill(name: str) -> SkillPrompt      # frontmatter + body
def compile_base_instructions() -> str         # chat-agent-prompt.md + manifest + 7 always-on
def build_conditional_instructions_fn()        # retorna función que toma RunContext y compone las 2 condicionales
def _sanitize_discovery_reporting(body) -> str # reemplaza referencias a harness Claude
```
Usa `pyyaml` (transitive dep via boto3/weasyprint; confirmar antes de escribir — alternativa: parseo manual del frontmatter con `str.split("---")`).

### 4. `backend/app/agents/discovery_report_schema.py` (nuevo)
- `DiscoveryReportPayload` Pydantic model: snapshot (str), gate_status (Enum: OPEN/OPEN_CONDITIONAL/CLOSED), gate_blocker (str|None), safety_callouts (list[SafetyFlag]), 8 secciones (cada una: lead/body/close), killer_question (Question), strategic_insight (str).
- Es el input-type de la tool → Pydantic AI fuerza al modelo a poblarlo vía ToolOutput.

### 5. `backend/app/services/discovery_report_renderer.py` (nuevo)
- Template Jinja2: `backend/app/prompts/pdf/discovery_executive.html.j2` (nuevo).
- CSS: `backend/app/prompts/pdf/discovery_executive.css` (nuevo) — US Letter, Helvetica, 14pt section headers, 11pt bold leads, 10pt body, italic closes, callout boxes para safety/killer-question, centrado 13pt italic strategic insight.
- `render_discovery_report(payload: DiscoveryReportPayload) -> BytesIO` usa `FontConfiguration` + `HTML().write_pdf(BytesIO)`. Reutiliza patrón de `app/visualization/pdf_generator.py` sin mezclar (layouts editoriales = familia distinta de proposals).

### 6. `backend/app/agents/chat_agent.py` (rewrite, API pública estable: `stream_chat_response`, `generate_chat_response`, `ChatAgentDeps`, `ChatAgentOutput`, `ChatAgentError`)

Cambios:
- `system_prompt=load_chat_system_prompt()` → `instructions=compile_base_instructions()`.
- Agregar `@chat_agent.instructions` decorator llamando `build_conditional_instructions_fn()`.
- Crecer `ChatAgentDeps` (3 campos nuevos, no 5):
  ```python
  @dataclass(slots=True, frozen=True)
  class ChatAgentDeps:
      organization_id: str
      user_id: str
      thread_id: str
      run_id: str
      attachments: tuple[ChatAgentAttachmentInput, ...]          # nuevo — derivar flags en @instructions
      persist_attachment: Callable[[AttachmentDraft], Awaitable[ChatAttachmentRef]]  # nuevo
      upload_bytes: Callable[[str, BytesIO, str], Awaitable[str]]                    # nuevo
  ```
  `tuple` en lugar de `list` para cumplir con `frozen=True` + slots. `attachments` sale del parámetro actual de `stream_chat_response` hacia el dep → unifica el passing model.
- Registrar la única tool:
  ```python
  @chat_agent.tool
  async def generate_discovery_report_pdf(
      ctx: RunContext[ChatAgentDeps],
      payload: DiscoveryReportPayload,
  ) -> ToolReturn:
      pdf_bytes = render_discovery_report(payload)
      storage_key = f"chat/{ctx.deps.organization_id}/{ctx.deps.user_id}/{uuid4().hex}.pdf"
      filename = f"discovery-exec-{slug(payload.customer)}-{date.today():%Y-%m-%d}.pdf"
      await ctx.deps.upload_bytes(storage_key, pdf_bytes, "application/pdf")
      attachment_ref = await ctx.deps.persist_attachment(
          AttachmentDraft(storage_key=storage_key, filename=filename, content_type="application/pdf")
      )
      return ToolReturn(
          return_value=f"Generated discovery report: {filename}",
          metadata={
              "attachment_id": str(attachment_ref.id),
              "filename": filename,
              "download_url": attachment_ref.signed_url,
          },
      )
  ```
- `stream_chat_response`: pasar `event_stream_handler=` a `chat_agent.run_stream(...)`. El handler escucha `FunctionToolCallEvent` → yield `{"event": "status", "message": "Generating discovery report…"}`. Escucha `FunctionToolResultEvent` → lee `event.tool_return.metadata` (o equivalente según la API 2026) → yield `{"event": "artifact", ...metadata}`.
- Borrar `_build_attachment_context` y `_build_runtime_prompt`: los attachments ahora viven en deps y las condicionales los inyectan como bloques de instructions, no como concatenación al prompt del usuario. Fase 2 los sube a `BinaryContent` real.

### 7. `backend/app/services/chat_service.py`
- `stream_chat_turn`: construir `persist_attachment` y `upload_bytes` como closures sobre la `AsyncSession` viva y `s3_service.upload_file_to_s3` (firma compatible: `(file_obj: IO[bytes] | BytesIO, filename, content_type) -> str`).
- Colectar IDs de artefactos producidos: lista local `produced_attachment_ids: list[UUID]` que consume del stream interno (evento `{"event": "artifact"}`).
- `_persist_assistant_terminal_message`: aceptar `produced_attachment_ids`, hacer `UPDATE chat_attachments SET message_id = :assistant_id WHERE id = ANY(:ids) AND message_id IS NULL` antes del commit.
- Exception path: `DELETE FROM chat_attachments WHERE id = ANY(:produced_attachment_ids)` + borrar bytes de S3/local. Sin migración — tracking en memoria durante la run.

### 8. `backend/app/services/chat_stream_protocol.py`
- Nueva frame `data-discovery-report-ready` con shape `{attachment_id, filename, download_url, expires_at}`. Emular `data-new-thread-created` (chat_stream_protocol.py:131).
- Adaptador captura `{"event": "artifact"}` del stream interno y mapea al frame AI SDK.
- También mapear `{"event": "status"}` a una frame de progreso (puede reusar `data-*` custom o aprovechar si ya existe algo tipo shimmer/working-memory-update; si no, nueva `data-agent-status`).

### 9. Frontend — 3 cambios menores
- `frontend/types/ui-message.ts`: agregar entradas `"discovery-report-ready": { attachment_id, filename, download_url, expires_at }` y `"agent-status": { message }`. Exportar `DATA_DISCOVERY_REPORT_READY_PART`, `DATA_AGENT_STATUS_PART`.
- `frontend/components/chat-ui/chat-interface.tsx`: en el `switch (part.type)` de `message.parts.map` (línea ~194), agregar `case "data-discovery-report-ready"` → renderiza `<DiscoveryReportChip href={download_url} filename={filename} />`. `case "data-agent-status"` → renderiza shimmer con el mensaje.
- `frontend/components/chat-ui/ai-elements/discovery-report-chip.tsx` (nuevo): `<a href={href} download={filename}>` con el estilo del chip de attachment existente (chat-interface.tsx:211–219).

### 10. `backend/app/agents/__init__.py`
- Exportar `chat_agent`, `ChatAgentDeps`, `ChatAgentOutput`, `ChatAgentError`, `generate_discovery_report_pdf` (hoy solo expone cosas de image/proposal).

## Tests (Strict TDD activo — rojo → verde → refactor)

- `backend/tests/agents/test_chat_skill_loader.py`:
  - `test_loads_all_ten_skills_from_disk`
  - `test_sanitizes_claude_harness_directives_in_discovery_reporting`
  - `test_manifest_prepended_to_always_on_block`
  - `test_conditional_skill_excluded_when_attachments_are_text_only`
  - `test_multimodal_intake_included_when_image_attached`
  - `test_sds_interpretation_included_when_filename_matches_heuristic`
- `backend/tests/agents/test_chat_agent_with_testmodel.py`:
  - `test_base_instructions_include_seven_always_on_skills_after_chat_agent_prompt`
  - `test_generate_discovery_report_pdf_tool_registered_on_agent`
  - `test_tool_returns_toolreturn_with_attachment_metadata`
  - `test_tool_calls_persist_attachment_with_correct_storage_key`
- `backend/tests/services/test_discovery_report_renderer.py`:
  - `test_renders_eight_section_pdf_bytes`
  - `test_chemical_subscripts_use_html_entities_not_unicode`
  - `test_killer_question_rendered_as_callout_box`
  - `test_safety_callout_color_coded_by_severity`
- `backend/tests/services/test_chat_service_artifact_persistence.py`:
  - `test_stream_links_produced_attachment_to_assistant_message`
  - `test_exception_path_deletes_orphan_attachments_and_s3_bytes`
- `backend/tests/services/test_chat_stream_protocol_artifact_frame.py`:
  - `test_discovery_report_ready_frame_shape`
  - `test_agent_status_frame_shape`

`TestModel`/`FunctionModel` de `pydantic_ai.models.test` — sin Bedrock calls.

## Archivos críticos

Editar:
- `backend/app/agents/chat_agent.py` (rewrite, API estable)
- `backend/app/services/chat_service.py` (closures para deps, tracking in-memory de artefactos, cleanup)
- `backend/app/services/chat_stream_protocol.py` (frames nuevas)
- `backend/app/agents/__init__.py` (exports)
- `backend/pyproject.toml` (extras)
- `frontend/types/ui-message.ts`
- `frontend/components/chat-ui/chat-interface.tsx`

Nuevos:
- `backend/app/prompts/chat-skills/<10 SKILL.md>` + `_manifest.md`
- `backend/app/prompts/pdf/discovery_executive.html.j2`
- `backend/app/prompts/pdf/discovery_executive.css`
- `backend/app/agents/chat_skill_loader.py`
- `backend/app/agents/discovery_report_schema.py`
- `backend/app/services/discovery_report_renderer.py`
- `frontend/components/chat-ui/ai-elements/discovery-report-chip.tsx`

Borrar:
- `backend/docs/skills-and-prompt-for-agent/skills/skills-integration.test.ts`

## Verificación pre-implementación (cerrar antes de escribir código)

1. **`ToolReturn.metadata` accesible desde streaming events.** Doc oficial dice *"accessible to your application but not sent to the LLM"* pero no muestra la API exacta. Verificar: ¿`FunctionToolResultEvent.tool_return.metadata` existe? ¿O es vía `.result.metadata`? 10 min: leer `pydantic_ai.events` del source instalado (`.venv/lib/.../pydantic_ai/events.py`). Si la API es distinta, el fallback cero-riesgo es que el tool mismo devuelva la metadata en `return_value` como JSON string y `chat_service` haga `json.loads` del último `ToolReturnPart`.
2. **`s3_service.upload_file_to_s3` acepta `BytesIO`** (ya verificado: firma `IO[bytes] | BytesIO` en línea 118–119).
3. **`pyyaml`** está disponible (transitive via boto3/weasyprint) — `python -c "import yaml"` dentro del venv; fallback: parseo manual trivial del frontmatter.

## Riesgos

1. Modelo emite reportlab syntax por mímica de la SKILL.md → mitigado por sanitización del loader + test explícito.
2. Silencio durante render PDF → `event_stream_handler` + `FunctionToolCallEvent` emite `{event: status}`.
3. Token count always-on: loggear `result.usage()` en completion log para validar los ahorros del 7/2 split en producción.
4. Frontmatter `description` + prosa duplican triggers → strip `description` en always-on, conservar en condicionales.
5. `attachments: tuple` en `ChatAgentDeps` (frozen dataclass requiere hashable): tupla de `ChatAgentAttachmentInput` — si ese tipo no es hashable, convertir a `tuple[dict, ...]` o agregar `frozen=True` al input type.

## Fase 2 (out of scope, anotar)

- Multimodal real via `BinaryContent` (otros agentes del repo ya lo usan: `bulk_import_extraction_agent`, `image_analysis_agent`). Cuando aterrice, `multimodal-intake` y `sds-interpretation` pasan de prompts condicionales a tools (`ingest_multimodal_attachment`, `extract_sds_fields`).
- `trainee_mode` como columna `ChatThread.mode` (enum) + UI toggle; por ahora la skill existe pero no se inyecta.
- Router classifier turn que seleccione dinámicamente qué always-on cargar (si los tokens siguen siendo un problema).

## Verificación end-to-end

1. `cd backend && make check` — ruff + mypy + pytest verde.
2. `cd frontend && bun run check:ci` — verde.
3. Arrancar stack. Nuevo thread con: *"Tengo spent sulfidic caustic de ExxonMobil Gulf Coast, 4 sitios con 25× rango de sulfuro y 10× rango de cloruro"*. Verificar en los deltas:
   - Decomposición del router (tabla de sub-streams visible).
   - Lenses por sub-stream.
   - Safety callout H₂S.
   - Gate status OPEN/CLOSED con blocker concreto.
4. Pedir *"send me the executive report"*. Verificar:
   - Frame `data-agent-status` llega (chip "Generating discovery report…").
   - Tool `generate_discovery_report_pdf` invocada (log).
   - Frame `data-discovery-report-ready` llega con `download_url`.
   - `<DiscoveryReportChip>` se renderiza inline en el mensaje.
   - PDF abre: 8 secciones, voice pattern, killer-question en callout, H₂S subíndice renderiza (no cuadro negro), versión en header/footer coincide.
5. Test de cleanup: inyectar `raise` post-tool en `_persist_assistant_terminal_message` → verificar que `ChatAttachment` row y bytes en S3/local se borran.
6. Test de condicional: mandar mensaje con PDF SDS adjunto → verificar que el loader inyecta el bloque `sds-interpretation` en las instructions del turno (log).

## Preguntas abiertas

Ninguna bloqueante. Todo resuelto en decisiones arriba.
