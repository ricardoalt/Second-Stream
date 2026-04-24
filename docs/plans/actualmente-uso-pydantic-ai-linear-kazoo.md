# Plan: Integrar 10 skills + tool `generateDiscoveryReport` en `chat_agent.py`

## Context

PM entregó 10 documentos de skill (formato Anthropic Agent Skills: frontmatter YAML + markdown) en `backend/docs/skills-and-prompt-for-agent/skills/<name>/SKILL.md` sin wiring. El chat agent (`backend/app/agents/chat_agent.py`) es el menos moderno del repo: `system_prompt=` estático, cero tools, `ChatAgentDeps` nunca leído vía `RunContext`. El client aprobó el resultado de las skills → necesitamos conectarlas como primitivas nativas de Pydantic AI y de AI SDK v5 (los dos frameworks ya instalados), sin inventar abstracciones paralelas.

## Principio rector

**Usar primitivas nativas del stack ya instalado, no inventar frames ni componentes custom.** Pydantic AI + AI SDK v5 + AI Elements cubren el 100% del caso de uso si mapeamos correctamente:

| Necesidad | Primitiva nativa | Precedente en tu repo |
|---|---|---|
| 9 skills prompt-only | `instructions=` + `@agent.instructions` (Pydantic AI) | — (caso nuevo, pero decorator oficial) |
| Skill que genera PDF | `@agent.tool` con output tipado (Pydantic AI) | `bulk_import_extraction_agent.py` usa tools similares |
| Propagar tool-call al frontend | Tool frames AI SDK v5: `tool-input-start` → `tool-input-available` → `tool-output-available` (estados `input-streaming`/`input-available`/`output-available`/`output-error`) | `tool-webSearch` en `chat-interface.tsx:302–330`, `tool-updateWorkingMemory` |
| UI de progreso durante el tool | Estado `input-available` del mismo tool part → `<Shimmer>` | `WorkingMemoryUpdate` en `working-memory-update.tsx:22–67` |
| UI de resultado (download chip) | Estado `output-available` del mismo tool part → `<a href download>` | Mismo pattern que sources en `tool-webSearch` |
| Tool output tipado end-to-end | `{ input, output }` en tool map de `ui-message.ts` | `webSearch`, `updateWorkingMemory` en `ui-message.ts:22–34` |

**Conclusión:** NO necesitamos `data-discovery-report-ready` custom, NO necesitamos `data-agent-status` custom, NO necesitamos `ToolReturn.metadata`, NO necesitamos un componente chip nuevo separado. **Un solo tool part con tres estados** — el mismo patrón que usa `WorkingMemoryUpdate` y `tool-webSearch`.

## Decisiones tomadas

| Decisión | Elegido | Descartado |
|---|---|---|
| Arquitectura backend | Agente único + instructions composicionales + 1 tool | Multi-agente (over-engineering) |
| PDF engine | WeasyPrint + Jinja2 (stack del repo) | reportlab (heredado del harness Claude) |
| Skill loading | 7 always-on + 2 condicionales (`multimodal-intake`, `sds-interpretation`) | 10 always-on (~25K tokens/turno sin caching Bedrock), 3 condicionales (`trainee_mode` requeriría migración → fase 2) |
| Wire format del tool | Frames nativas AI SDK v5 `tool-*` con estados | `data-*` custom (duplica lo que SDK provee) |
| Tool return shape | Pydantic model plano `DiscoveryReportOutput` | `ToolReturn(metadata=...)` (innecesario — AI SDK entrega `output` completo al frontend tipado) |
| UI del tool | Case inline en `chat-interface.tsx` switch (5–10 líneas) | Nuevo componente separado `DiscoveryReportChip` |
| Cleanup de orphans | Tracking in-memory de `attachment_id` producidos durante la run | Columna `run_id` en `ChatAttachment` (evita migración) |
| Layout de prompts | `app/prompts/chat-skills/<name>/SKILL.md` (alineado con tu nuevo `chat-agent-prompt.md` plano) | `app/prompts/skills/chat/discovery/...` nested (inconsistente) |
| Scope | Un solo PR | Dos PRs |

**Cero migraciones alembic. Cero componentes UI nuevos. Cero frames custom.**

## Composición de skills

Base prompt actual `backend/app/prompts/chat-agent-prompt.md` **se preserva** (identidad del agente). Las skills componen encima.

**Always-on (7)** — concatenadas en `instructions=` + manifiesto corto al frente:
1. `safety-flagging` (override)
2. `qualification-gate`
3. `sub-discipline-router`
4. `specialist-lens-light`
5. `commercial-shaping`
6. `discovery-gap-analysis`
7. `discovery-reporting` (prosa saneada: reemplaza referencias a reportlab/`/mnt/user-data/outputs/`/`present_files` por "use tool `generateDiscoveryReport`")

**Condicionales (2)** — vía `@chat_agent.instructions` leyendo `RunContext[ChatAgentDeps]`:
- `multimodal-intake` → si alguna `attachment.media_type` no arranca con `text/`
- `sds-interpretation` → si filename o content-type sugiere SDS

Frontmatter `description` se preserva SOLO en condicionales (sirve al modelo como trigger); se elimina en always-on (redundante con la prosa).

## Backend — cambios

### 1. `backend/pyproject.toml`
- `pydantic-ai-slim[openai]>=1.0.0` → `pydantic-ai-slim[bedrock]>=1.0.0`.
- Quitar `reportlab>=4.2.0` (no usado).

### 2. `backend/app/prompts/chat-skills/` (nuevo directorio plano)
- 10 `SKILL.md` copiados desde `backend/docs/skills-and-prompt-for-agent/skills/<name>/SKILL.md`.
- `_manifest.md` (~5 líneas) con orden canónico.
- Borrar `backend/docs/skills-and-prompt-for-agent/skills/skills-integration.test.ts` (stale, TS de otro proyecto).

### 3. `backend/app/agents/chat_skill_loader.py` (nuevo, ~80 líneas)
- `load_skill(name) -> SkillPrompt` (parsea frontmatter + body).
- `compile_base_instructions() -> str` (chat-agent-prompt.md + manifiesto + 7 always-on).
- `build_conditional_instructions_fn()` retorna función de `RunContext → str` que inyecta las 2 condicionales cuando aplican.
- `_sanitize_discovery_reporting(body) -> str` (reemplaza referencias al harness Claude).

### 4. `backend/app/agents/discovery_report_schema.py` (nuevo)
```python
class DiscoveryReportPayload(BaseModel):
    """Tool input: 8-section briefing. LLM lo puebla vía ToolOutput."""
    snapshot: str
    gate_status: Literal["OPEN", "OPEN_CONDITIONAL", "CLOSED"]
    gate_blocker: str | None = None
    safety_callouts: list[SafetyFlag]
    sections: list[ReportSection]  # 8 en orden
    killer_question: Question
    strategic_insight: str

class DiscoveryReportOutput(BaseModel):
    """Tool output: lo que el AI SDK client recibe como part.output tipado."""
    attachment_id: str
    filename: str
    download_url: str
    expires_at: str       # ISO 8601
    size_bytes: int
```

### 5. `backend/app/services/discovery_report_renderer.py` (nuevo)
- Template Jinja2 en `backend/app/prompts/pdf/discovery_executive.html.j2`.
- CSS en `backend/app/prompts/pdf/discovery_executive.css`: US Letter, Helvetica, 14pt section headers, 11pt bold leads, 10pt body, italic closes, callout boxes (safety + killer-question), 13pt italic centrado (strategic insight).
- `render_discovery_report(payload) -> BytesIO` (WeasyPrint + FontConfiguration).

### 6. `backend/app/agents/chat_agent.py` (rewrite, API pública estable)

Cambios puntuales:
- `system_prompt=load_chat_system_prompt()` → `instructions=compile_base_instructions()`.
- Registrar `@chat_agent.instructions` para condicionales.
- Crecer `ChatAgentDeps` (3 campos nuevos):
  ```python
  @dataclass(slots=True, frozen=True)
  class ChatAgentDeps:
      organization_id: str
      user_id: str
      thread_id: str
      run_id: str
      attachments: tuple[ChatAgentAttachmentInput, ...]  # nuevo
      persist_attachment: Callable[[AttachmentDraft], Awaitable[ChatAttachmentRef]]  # nuevo
      upload_bytes: Callable[[str, BytesIO, str], Awaitable[str]]  # nuevo
  ```
- Registrar la única tool:
  ```python
  @chat_agent.tool
  async def generate_discovery_report(
      ctx: RunContext[ChatAgentDeps],
      payload: DiscoveryReportPayload,
  ) -> DiscoveryReportOutput:
      pdf_bytes = render_discovery_report(payload)
      storage_key = f"chat/{ctx.deps.organization_id}/{ctx.deps.user_id}/{uuid4().hex}.pdf"
      filename = f"discovery-exec-{slug(payload.customer)}-{date.today():%Y-%m-%d}.pdf"
      await ctx.deps.upload_bytes(storage_key, pdf_bytes, "application/pdf")
      ref = await ctx.deps.persist_attachment(
          AttachmentDraft(storage_key=storage_key, filename=filename, content_type="application/pdf")
      )
      return DiscoveryReportOutput(
          attachment_id=str(ref.id),
          filename=filename,
          download_url=ref.signed_url,
          expires_at=ref.signed_url_expires_at.isoformat(),
          size_bytes=len(pdf_bytes.getvalue()),
      )
  ```
- `stream_chat_response`: pasar `event_stream_handler=` a `run_stream(...)`. El handler consume `FunctionToolCallEvent` / `FunctionToolResultEvent` y los traduce a eventos internos que `chat_service` propaga:
  ```python
  # dentro del handler:
  if isinstance(event, FunctionToolCallEvent):
      yield {"event": "tool-input-start", "toolCallId": event.part.tool_call_id, "toolName": event.part.tool_name}
      yield {"event": "tool-input-available", "toolCallId": ..., "toolName": ..., "input": event.part.args_as_dict()}
  if isinstance(event, FunctionToolResultEvent):
      # Discriminar error vs éxito por tipo del result (NO hay .is_error)
      from pydantic_ai.messages import RetryPromptPart
      if isinstance(event.result, RetryPromptPart):
          yield {"event": "tool-output-error", "toolCallId": event.result.tool_call_id, "errorText": event.result.model_response()}
      else:
          # event.result es ToolReturnPart; .content trae el retorno tipado
          yield {"event": "tool-output-available", "toolCallId": event.result.tool_call_id, "toolName": event.result.tool_name, "output": event.result.model_response_object()}
  ```
- Borrar `_build_attachment_context` y `_build_runtime_prompt`: texto redundante al final del prompt; attachments ahora viven en deps y las condicionales los inspeccionan.
- **MANTENER `_build_runtime_user_content`** (chat_agent.py:123-158): es el único camino que inyecta `BinaryContent(data=..., media_type=...)` / `DocumentUrl(...)` al `user_prompt` first-class. Sin este helper, Bedrock deja de ver PDFs/imágenes. El plan original lo dejaba ambiguo — explícito aquí.

### 7. `backend/app/services/chat_stream_protocol.py`

Wire format confirmado contra `node_modules/ai/docs/04-ai-sdk-ui/50-stream-protocol.mdx` (AI SDK v6.0.168):

```python
elif event_type == "tool-input-start":
    yield encode_official_sse("tool-input-start", {
        "toolCallId": event["toolCallId"],
        "toolName": event["toolName"],
    })
elif event_type == "tool-input-available":
    yield encode_official_sse("tool-input-available", {
        "toolCallId": event["toolCallId"],
        "toolName": event["toolName"],
        "input": event["input"],
    })
elif event_type == "tool-output-available":
    # ¡OJO! tool-output-available NO incluye toolName — el cliente lo tiene del frame anterior
    yield encode_official_sse("tool-output-available", {
        "toolCallId": event["toolCallId"],
        "output": event["output"],
    })
elif event_type == "tool-output-error":
    yield encode_official_sse("tool-output-error", {
        "toolCallId": event["toolCallId"],
        "errorText": event["errorText"],
    })
```

### 8. `backend/app/services/chat_service.py`
- `stream_chat_turn`: construir `persist_attachment` y `upload_bytes` como closures sobre la `AsyncSession` viva y `s3_service.upload_file_to_s3`.
- Colectar `produced_attachment_ids: list[UUID]` escuchando el evento interno `tool-output-available` (cuando `toolName == "generate_discovery_report"`) → extraer `output["attachment_id"]`.
- `_persist_assistant_terminal_message`: aceptar `produced_attachment_ids`, hacer `UPDATE chat_attachments SET message_id = :assistant_id WHERE id = ANY(:ids) AND message_id IS NULL` antes del commit.
- Exception path: `DELETE FROM chat_attachments WHERE id = ANY(:produced_attachment_ids)` + borrar bytes.

### 9. `backend/app/agents/__init__.py`
- Exportar `chat_agent`, `ChatAgentDeps`, `ChatAgentOutput`, `ChatAgentError`, `DiscoveryReportPayload`, `DiscoveryReportOutput`.

## Frontend — cambios (2 archivos, ~20 líneas totales)

### 1. `frontend/types/ui-message.ts`
Agregar al tool map junto a `webSearch` y `updateWorkingMemory`:
```ts
generateDiscoveryReport: {
  input: {
    snapshot: string;
    gate_status: "OPEN" | "OPEN_CONDITIONAL" | "CLOSED";
    // ... resto del payload (mirror de DiscoveryReportPayload Python)
  };
  output: {
    attachmentId: string;
    filename: string;
    downloadUrl: string;
    expiresAt: string;
    sizeBytes: number;
  };
};
```

### 2. `frontend/components/chat-ui/chat-interface.tsx`
Un nuevo `case` en el switch existente (línea ~249), modelado exactamente sobre el patrón de `tool-webSearch` y `WorkingMemoryUpdate`:
```tsx
case "tool-generateDiscoveryReport": {
  if (part.state === "output-available") {
    return (
      <a
        key={part.toolCallId}
        href={part.output.downloadUrl}
        download={part.output.filename}
        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
      >
        <FileTextIcon className="size-3.5" />
        <span>{part.output.filename}</span>
        <span className="text-muted-foreground">
          ({formatBytes(part.output.sizeBytes)})
        </span>
      </a>
    );
  }
  if (part.state === "output-error") {
    return <span key={part.toolCallId} className="text-destructive text-xs">Failed to generate report</span>;
  }
  return <Shimmer key={part.toolCallId} as="p" className="text-xs">Generating discovery report...</Shimmer>;
}
```
Si crece, extraer a `DiscoveryReportToolPart` (hermano de `WorkingMemoryUpdate`). En fase 1 queda inline.

## Tests (Strict TDD — rojo → verde)

- `backend/tests/agents/test_chat_skill_loader.py`:
  - `test_loads_all_ten_skills_from_disk`
  - `test_sanitizes_claude_harness_directives_in_discovery_reporting`
  - `test_manifest_prepended_to_always_on_block`
  - `test_multimodal_intake_included_when_image_attached`
  - `test_sds_interpretation_included_when_filename_matches_heuristic`
  - `test_conditional_excluded_when_attachments_are_text_only`
- `backend/tests/agents/test_chat_agent_with_testmodel.py`:
  - `test_base_instructions_include_seven_always_on_after_chat_agent_prompt`
  - `test_generate_discovery_report_tool_registered_on_agent`
  - `test_tool_returns_discovery_report_output_with_signed_url`
- `backend/tests/services/test_discovery_report_renderer.py`:
  - `test_renders_eight_section_pdf_bytes`
  - `test_chemical_subscripts_use_html_entities_not_unicode`
  - `test_killer_question_rendered_as_callout_box`
  - `test_safety_callout_color_coded_by_severity`
- `backend/tests/services/test_chat_stream_protocol_tool_frames.py`:
  - `test_tool_input_start_frame_shape`
  - `test_tool_input_available_frame_shape`
  - `test_tool_output_available_frame_shape`
  - `test_tool_output_error_frame_shape`
- `backend/tests/services/test_chat_service_artifact_persistence.py`:
  - `test_stream_links_produced_attachment_to_assistant_message`
  - `test_exception_path_deletes_orphan_attachments_and_s3_bytes`
- `frontend/components/chat-ui/chat-interface.tool-discovery-report.test.tsx` (nuevo):
  - `renders_shimmer_on_input_available`
  - `renders_download_link_on_output_available`
  - `renders_error_message_on_output_error`

## Archivos críticos

Editar:
- `backend/app/agents/chat_agent.py` (rewrite, API estable)
- `backend/app/services/chat_service.py` (closures, tracking in-memory, cleanup)
- `backend/app/services/chat_stream_protocol.py` (4 branches `tool-*`)
- `backend/app/agents/__init__.py`
- `backend/pyproject.toml`
- `frontend/types/ui-message.ts` (+1 entrada en tool map)
- `frontend/components/chat-ui/chat-interface.tsx` (+1 case)

Nuevos:
- `backend/app/prompts/chat-skills/<10 SKILL.md>` + `_manifest.md`
- `backend/app/prompts/pdf/discovery_executive.html.j2`
- `backend/app/prompts/pdf/discovery_executive.css`
- `backend/app/agents/chat_skill_loader.py`
- `backend/app/agents/discovery_report_schema.py`
- `backend/app/services/discovery_report_renderer.py`

Borrar:
- `backend/docs/skills-and-prompt-for-agent/skills/skills-integration.test.ts`

## Análisis de integración — el plan NO rompe el stack actual

Verificado contra archivos reales (chat_agent.py, chat_service.py, chat_stream_protocol.py, chat.py, chat-interface.tsx, ui-message.ts) y librerías instaladas (pydantic_ai 1.x, ai@6.0.168). Los 4 puntos de contacto:

### a) `chat_agent.py` — API pública estable
- Call sites externos: `chat_service.py:635-640` construye `ChatAgentDeps(organization_id=..., user_id=..., thread_id=..., run_id=...)` y luego `chat_service.py:674-678` llama `stream_chat_response(prompt=..., deps=..., attachments=...)`. Ambas firmas permanecen — sólo crecen los kwargs de `ChatAgentDeps` (aditivo). ✅
- `_build_runtime_user_content` **se mantiene**: sigue siendo la ruta que convierte attachments a `BinaryContent`/`DocumentUrl` para que Bedrock los vea first-class. El prompt ya no duplica la lista textual (se borra `_build_attachment_context`), pero el contenido binario sigue pasando. ✅
- Current `system_prompt=` → `instructions=`: ambos son válidos en Pydantic AI 1.x. Las pruebas existentes que inspeccionan `chat_agent` por nombre/firma siguen pasando. ✅

### b) `chat_service.py:670-714` — loop de eventos
- El loop actual sólo reconoce `delta` y `completed`. Nuevos eventos `tool-*` añaden branches — **los eventos desconocidos se ignoran silenciosamente hoy** (no hay `else: raise`), así que incluso en rollback parcial nada explota. ✅
- `_persist_assistant_terminal_message`: la firma crece con `produced_attachment_ids: list[UUID] | None = None` (kwarg opcional) — callers existentes no cambian. ✅
- Cleanup de orphans: `s3_service.delete_file_from_s3` ya existe (línea 300). Plan viable. ✅

### c) `chat_stream_protocol.py:88-159` — adapter oficial
- Agregar 4 `elif` branches es pura extensión. Los eventos actuales (`start`, `delta`, `completed`, `error`, `data-new-thread-created`, `data-conversation-title`) intactos. ✅
- Adapter legacy (`chat_stream_protocol.py:162-172`) es pass-through `encode_legacy_sse(event_type, event)`. Los nuevos eventos tool pasan como `event: tool-input-start\ndata: {...}` y el frontend legacy los ignora si no los reconoce. **No breakage** aunque un cliente legacy reciba tool frames. ✅
- Endpoint `chat.py:424-500` negocia official/legacy por body > header > default. Sin cambios. ✅

### d) Frontend — `chat-interface.tsx:326-430`
- Switch existente en línea 326 con cases `case "tool-webSearch":` (línea 380) y `case "tool-updateWorkingMemory":` (línea 409) — patrón confirmado. Nuevo `case "tool-generateDiscoveryReport":` es aditivo.
- `ui-message.ts:22-34` — tool map actual con `webSearch` y `updateWorkingMemory`. Añadir una entrada más NO rompe el tipo genérico `MyUIMessage`. `useChat<MyUIMessage>` sigue tipado. ✅
- `<Shimmer>` ya existe y se usa en `WorkingMemoryUpdate`. Sin nuevas dependencias. ✅

### e) Hallazgos durante la verificación
- **`pydantic_ai/ui/vercel_ai/_event_stream.py` existe** — adapter oficial que emite `ToolInputStartChunk`/`ToolInputAvailableChunk`/`ToolOutputAvailableChunk`/`ToolOutputErrorChunk` con el wire format correcto (output-available sin `toolName`, coincide con nuestra verificación). **No lo adoptamos en fase 1** porque nuestro adapter mantiene los data-parts custom `data-new-thread-created` / `data-conversation-title` que no están en `VercelAIEventStream`. Migración → fase 2.
- **`Agent.run_stream(event_stream_handler=...)` confirmado** en `pydantic_ai/agent/abstract.py:448` — el handler recibe `FunctionToolCallEvent` / `FunctionToolResultEvent` en `line 604` (`is_call_tools_node(node) and event_stream_handler is not None`).
- **`FunctionToolCallEvent.part.tool_call_id` + `.tool_name` + `.args_as_dict()`** confirmado en `pydantic_ai/messages.py:1876-1898`. `FunctionToolResultEvent.result: ToolReturnPart | RetryPromptPart` — `isinstance(part, RetryPromptPart)` discrimina el error path (NO `.is_error`). **Corregir** el snippet del plan: usar `isinstance` en lugar de `.is_error`.

## Verificación pre-implementación (cerrar antes de escribir código)

1. **Wire format AI SDK v6 — CONFIRMADO** en `node_modules/ai/docs/04-ai-sdk-ui/50-stream-protocol.mdx`:
   - `tool-input-start`: `{toolCallId, toolName}` (sin input)
   - `tool-input-available`: `{toolCallId, toolName, input}`
   - `tool-output-available`: `{toolCallId, output}` **(NO incluye `toolName`)**
   - `tool-output-error`: `{toolCallId, errorText}`
2. **`ToolUIPart` type — CONFIRMADO** en `node_modules/ai/docs/07-reference/01-ai-sdk-core/31-ui-message.mdx`: states `input-streaming | input-available | output-available | output-error` con narrowing por discriminante; el tool map `{input, output}` en `ui-message.ts` genera el part tipado automáticamente.
3. **Stack version — CONFIRMADO**: `ai@^6.0.168`, `@ai-sdk/react@^3.0.170`, `@ai-sdk/amazon-bedrock@^4.0.96`. Stream protocol v6.
4. **`FunctionToolCallEvent` / `FunctionToolResultEvent` — CONFIRMADO** (messages.py:1876-1921): `event.part.tool_call_id`, `event.part.tool_name`, `event.part.args_as_dict()` para call; `event.result` con `isinstance(..., RetryPromptPart)` para error path.
5. **`run_stream(event_stream_handler=...)` — CONFIRMADO** en `pydantic_ai/agent/abstract.py:448` — tool events se rutean al handler.
6. **`s3_service.upload_file_to_s3` acepta `BytesIO`** — confirmado línea 118-119; **`s3_service.delete_file_from_s3`** existe línea 300.
7. **`pyyaml`** disponible — verificar con `python -c "import yaml"`; fallback: parseo manual `split("---", 2)`.

## Riesgos

1. **Modelo emite reportlab syntax por mímica de la SKILL.md** → sanitización del loader + test explícito.
2. **Frontmatter `description` puede inflar prompt** → strip en always-on, preserve en condicionales.
3. **Token count always-on** → loggear `result.usage()` en completion log, validar ahorros del split 7/2 en producción.
4. **Nombre del tool: `generate_discovery_report` (snake_case Python) vs `generateDiscoveryReport` (camelCase AI SDK)**. Pydantic AI exporta el nombre tal cual es la función. Si la frame llega con `tool-generate_discovery_report` el frontend espera otro nombre. Mitigación: registrar el tool con nombre explícito `@chat_agent.tool(name="generateDiscoveryReport")` — API estándar de Pydantic AI — para unificar convenciones.
5. **`attachments: tuple` en `ChatAgentDeps` frozen** requiere que `ChatAgentAttachmentInput` sea hashable. Ya es `@dataclass(frozen=True, slots=True)` (chat_stream_protocol.py:38) → hashable por default. OK.
6. **Doble árbol ai-elements** (`frontend/components/ai-elements/` vs `frontend/components/chat-ui/ai-elements/`): `chat-interface.tsx` importa del top-level. Cualquier componente nuevo va ahí. No tocar el árbol product-specific por error.

## Fase 2 (out of scope)

- **Migrar a `VercelAIEventStream` oficial** (`pydantic_ai/ui/vercel_ai/_event_stream.py`): reemplaza `chat_stream_protocol.py` hand-rolled + el `event_stream_handler` manual. Elimina ~60 líneas de adapter. Bloqueante: los data-parts custom (`data-new-thread-created`, `data-conversation-title`) hay que extenderlos sobre el stream — viable pero mayor superficie de cambio que los 4 `elif` de fase 1.
- Multimodal real: `multimodal-intake` y `sds-interpretation` migran de prompts a tools (`ingest_multimodal_attachment`, `extract_sds_fields`).
- `trainee_mode` como columna `ChatThread.mode` + UI toggle.
- **Migrar los 3 tool UIs a AI Elements canónicos** (disponibles en la librería pero NO instalados hoy):
  - `bunx ai-elements@latest add tool` → unificar `tool-webSearch`, `tool-updateWorkingMemory` y `tool-generateDiscoveryReport` sobre `<Tool>/<ToolHeader>/<ToolInput>/<ToolOutput>` (collapsible, `getStatusBadge`, a11y).
  - `bunx ai-elements@latest add artifact` → usar `<Artifact>/<ArtifactHeader>/<ArtifactActions>/<ArtifactAction icon={DownloadIcon}>` en la rama `output-available` del tool de PDF (semánticamente "generated document" oficial de AI Elements).
  - Elimina `WorkingMemoryUpdate` custom y consolida los 3 tool UIs con una sola abstracción estándar.
- Si tokens always-on siguen altos: router classifier turn que selecciona dinámicamente qué always-on cargar.

## Verificación end-to-end

1. `cd backend && make check` — ruff + mypy + pytest verde.
2. `cd frontend && bun run check:ci` — verde.
3. Stack arriba. Prompt: *"Spent sulfidic caustic de ExxonMobil Gulf Coast, 4 sitios con 25× rango de sulfuro y 10× rango de cloruro"*. Verificar en deltas: router decompone, lenses por sub-stream, safety callout H₂S, gate status.
4. Pedir *"send me the executive report"*. Verificar:
   - Frame `tool-input-start` llega (Network tab) con `toolName: "generateDiscoveryReport"`.
   - Frame `tool-input-available` con el payload tipado.
   - UI muestra `<Shimmer>Generating discovery report...</Shimmer>` inline en el mensaje del asistente.
   - Frame `tool-output-available` con `downloadUrl`.
   - `<a href download>` se renderiza en el mismo spot donde estaba el shimmer.
   - PDF abre: 8 secciones, voice pattern, killer-question en callout, H₂S subíndice renderiza.
5. Cleanup: `raise` inyectado post-tool → `ChatAttachment` row y bytes S3/local borrados.
6. Conditional: mandar PDF SDS adjunto → loader inyecta `sds-interpretation` (log confirma).

## Preguntas abiertas

Ninguna bloqueante. Las 4 verificaciones pre-implementación son lecturas de source (~40 min total) antes de empezar a escribir código; no afectan la arquitectura, solo ajustan nombres exactos de campos.
