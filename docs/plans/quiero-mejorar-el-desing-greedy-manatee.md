# Sprint 2 — Capa 2 de mejoras de calidad

## Context

Segunda iteración de mejoras post-audit. Se identificaron: dead code paths que confunden, UX granular (iconos, mobile, a11y), backend schema duplication, observabilidad cero en PDF generation, y `chat-interface.tsx` que superó el límite saludable de líneas. Este sprint cubre todo lo del tier "hacer ya" + Sprint 1 + VercelAIAdapter Phase A.

Fuera de scope explícito:
- VercelAIAdapter fases B/C (protocol streaming — demasiado impacto para un sprint)
- error part standard (protocol change bidireccional)
- HitL full implementation (necesita diseño de UI)

## Tareas

### A. Quick wins — frontend (orden de impacto visual)

**A1. Iconos diferenciados por PDF type**
File: `frontend/components/chat-ui/chat-interface.tsx:PDF_DOC_CONFIGS`
- Importar `BarChart3, BookOpen, FileText, Lightbulb` de lucide-react
- Agregar `icon: ReactNode` a `PDF_DOC_CONFIGS` y a `PdfDocCardProps`
- `generateDiscoveryReport` → `FileText`
- `generateIdeationBrief` → `Lightbulb`
- `generateAnalyticalRead` → `BarChart3`
- `generatePlaybook` → `BookOpen`
- En `PdfDocumentCard`: reemplazar `<FileText>` hardcodeado por `icon` del config

**A2. PDF card mobile responsive**
File: `frontend/components/chat-ui/chat-interface.tsx:130`
- `max-w-sm` → `w-full sm:max-w-sm`

**A3. Focus-visible en PDF card**
File: `frontend/components/chat-ui/chat-interface.tsx:130`
- Agregar `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` al `<a>`

**A4. Remove aria-live del typewriter**
File: `frontend/components/chat-ui/chat-empty-greeting.tsx:109-111`
- Quitar `aria-live="polite"` y `aria-label="Example prompts"` del motion.div typewriter
- El typewriter cambia texto 1 char cada 38ms — spamea screen readers. Los chips ya son el canal accesible de acción.

**A5. Dead code — webSearch y updateWorkingMemory**
- Render branches en `frontend/components/chat-ui/chat-interface.tsx`: eliminar `case "tool-webSearch"` y `case "tool-updateWorkingMemory"` del switch
- Mantener los tipos en `frontend/types/ui-message.ts` con un `// TODO: implement when backend registers tool` comment — si se borran los tipos, TypeScript perderá la historia de qué se pensó
- Dejar el `WorkingMemoryUpdate` import en `chat-interface.tsx` si hay otro uso; si no, borrarlo también

### B. Quick wins — backend

**B1. Eliminar shim `discovery_report_renderer.py`**
- Actualizar import en `backend/tests/services/test_discovery_report_renderer.py:22`:
  `from app.services.discovery_report_renderer import render_discovery_report`
  → `from app.services.pdf_renderer import render_discovery_report`
- Borrar `backend/app/services/discovery_report_renderer.py`

**B2. Fix `analytical_read_schema.py` doble import**
Ruff auto-split en 2 `from discovery_report_schema import` — consolidar en uno:
```python
from app.agents.discovery_report_schema import (
    DiscoveryReportOutput as PDFOutput,  # noqa: F401
    SafetyFlag,
)
```

### C. Backend refactor — schemas

**C1. BasePdfPayload**
File nuevo: `backend/app/agents/base_pdf_schema.py`
```python
class BasePdfPayload(BaseModel):
    customer: str
    stream: str
    date: str
```

Archivos a actualizar:
- `ideation_brief_schema.py` → `class IdeationBriefPayload(BasePdfPayload)`
- `analytical_read_schema.py` → `class AnalyticalReadPayload(BasePdfPayload)`
- `playbook_schema.py` → `class PlaybookPayload(BasePdfPayload)`
- `DiscoveryReportPayload` NO hereda — usa `snapshot: str` (diferente contrato)

### D. Backend refactor — _upload_pdf helper más limpio

File: `backend/app/agents/chat_agent.py`

Cambiar firma de `_upload_pdf`:
```python
async def _upload_pdf(
    ctx: RunContext[ChatAgentDeps],
    *,
    payload: BasePdfPayload,    # extrae customer/stream para filename
    renderer: Callable[[BaseModel], BytesIO],
    filename_suffix: str,
) -> DiscoveryReportOutput:
    filename = f"{_slug(payload.customer)}-{_slug(payload.stream)}_{date.today():%Y-%m-%d}_{filename_suffix}.pdf"
    pdf_bytes = renderer(payload)
    ...  # resto igual
```

Importar `BasePdfPayload` + `Callable` (ya está).

Cada tool queda:
```python
@agent.tool(name="generateIdeationBrief")
async def generate_ideation_brief(ctx, payload: IdeationBriefPayload) -> DiscoveryReportOutput:
    from app.services.pdf_renderer import render_ideation_brief
    return await _upload_pdf(ctx, payload=payload, renderer=render_ideation_brief, filename_suffix="ideation-brief")
```

**Nota**: `DiscoveryReportPayload` no hereda de `BasePdfPayload` pero tiene `customer` y `stream` igualmente — `_slug(payload.customer)` sigue funcionando via duck typing. Anotación: `payload: BasePdfPayload | DiscoveryReportPayload` o simplemente cambiar anotación a `HasCustomerStream = Protocol` si hay aversión a duck typing.

Alternativamente: tipar `payload` como `BaseModel` con `cast` interno. Más simple, menos correcto.

### E. Backend — telemetría de PDF generation

File: `backend/app/services/pdf_renderer.py`

En `render_pdf()`, wrappear con structlog:
```python
import time
log = structlog.get_logger(__name__)

def render_pdf(template_name: str, payload: BaseModel) -> BytesIO:
    from weasyprint import HTML
    t0 = time.monotonic()
    # ... render ...
    duration_ms = round((time.monotonic() - t0) * 1000)
    log.info("pdf_rendered", template=template_name, duration_ms=duration_ms, size_bytes=len(buf.getvalue()))
    return buf
```

En `chat_agent.py:_upload_pdf`, loggear upload:
```python
log.info("pdf_uploaded", template=template_name, customer_slug=customer_slug, size_bytes=size_bytes)
```

### F. Frontend — no animar mensajes históricos

File: `frontend/components/chat-ui/chat-interface.tsx`

Agregar `const isNewSession = useRef(false)`:
```tsx
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);

// En el stagger delay:
delay: mountedRef.current ? Math.min(index * 0.04, 0.2) : 0,
```

Alternativa más limpia: `const existingCount = useRef(initialMessages.length)` y `delay: index >= existingCount.current ? Math.min(...) : 0`.

### G. Frontend — split chat-interface.tsx (3 extracciones)

**G1. `frontend/components/chat-ui/pdf-document-card.tsx`** (nuevo)
- Mover `PDF_DOC_CONFIGS`, `PdfToolKey`, `PdfDocCardProps`, `PdfDocumentCard` fuera de `chat-interface.tsx`
- Exportar `PdfDocumentCard` y `PdfToolKey`

**G2. `frontend/components/chat-ui/message-parts-renderer.tsx`** (nuevo)
```tsx
type MessagePartsRendererProps = {
  message: MyUIMessage;
  isLastMessage: boolean;
  isStreamingOrSubmitted: boolean;
  setMessages: ...;
  regenerate: ...;
};
export const MessagePartsRenderer = memo(({ message, ... }) => (
  <Message from={message.role}>
    <MessageContent>
      {message.parts.map((part, i) => { /* el switch */ })}
    </MessageContent>
    {/* MessageToolbar */}
  </Message>
));
```
Memo con `(prev, next) => prev.message.id === next.message.id && prev.message.parts.length === next.message.parts.length && prev.isLastMessage === next.isLastMessage`

**G3. Actualizar `chat-interface.tsx`**
- Importar `PdfDocumentCard` de `./pdf-document-card`
- Importar `MessagePartsRenderer` de `./message-parts-renderer`
- El archivo baja de ~615 líneas a ~300

### H. VercelAIAdapter Phase A — solo input parsing

File: `backend/app/services/chat_stream_protocol.py`

Reemplazar `_extract_latest_user_text` + `resolve_attachments_to_agent_input_for_model` manual parsing con:
```python
from pydantic_ai.ui.vercel_ai import VercelAIAdapter

# Dentro de la función que extrae el texto del usuario:
messages = VercelAIAdapter.parse_messages(raw_messages_json)
# messages es una lista de pydantic_ai UIMessage con parts tipados
latest_user_message = next(m for m in reversed(messages) if m.role == "user")
text = "".join(p.text for p in latest_user_message.parts if p.type == "text")
```

**Scope muy limitado**: solo el parsing de input. El output (traducción de eventos a SSE) NO cambia en esta fase.

**Rollback trivial**: si VercelAIAdapter.parse_messages tiene bugs, el fallback manual sigue existiendo.

## Critical files

Backend:
- `backend/app/agents/chat_agent.py` — D, F
- `backend/app/agents/base_pdf_schema.py` — C1 (nuevo)
- `backend/app/agents/{ideation_brief,analytical_read,playbook}_schema.py` — C1
- `backend/app/services/pdf_renderer.py` — E
- `backend/app/services/discovery_report_renderer.py` — B1 (borrar)
- `backend/app/services/chat_stream_protocol.py` — H
- `backend/tests/services/test_discovery_report_renderer.py` — B1

Frontend:
- `frontend/components/chat-ui/chat-interface.tsx` — A1-A5, F, G3
- `frontend/components/chat-ui/chat-empty-greeting.tsx` — A4
- `frontend/components/chat-ui/pdf-document-card.tsx` — G1 (nuevo)
- `frontend/components/chat-ui/message-parts-renderer.tsx` — G2 (nuevo)
- `frontend/types/ui-message.ts` — A5

## Orden de ejecución recomendado

1. B (backend quick wins) — sin riesgo, limpieza
2. C (BasePdfPayload) — fundación para D
3. D (_upload_pdf refactor) — depende de C
4. E (telemetría) — independiente
5. A (frontend quick wins) — independiente
6. G1 (PdfDocumentCard extract) — simplifica G2
7. G2+G3 (MessagePartsRenderer + chat-interface.tsx) — G1 antes
8. F (stagger animation fix) — dentro de G3 en la misma pasada
9. H (VercelAIAdapter parse) — último, mayor riesgo

## Verification

Backend:
- `cd backend && uv run ruff check app/ && make check`
- `uv run pytest tests/services/ -v` — verificar que test_discovery_report_renderer.py no rompe con nuevo import
- Smoke test en cada tool PDF: `uv run python -c "from app.services.pdf_renderer import render_discovery_report; ..."` (skip en macOS sin weasyprint)

Frontend:
- `cd frontend && bun run check:ci` — biome lint + TypeScript + Next.js build
- Smoke manual: abrir empty state → chips no animan el typewriter en SR → click chip envía mensaje directo → en conversación, recargar thread → mensajes históricos no animan → stream PDF → card muestra icono correcto → hover revela download → resize a 375px → card no desborda

## Unresolved questions

- **`_upload_pdf` typing**: `payload: BasePdfPayload` rompe `DiscoveryReportPayload` (no hereda). Opciones: (a) typing `BaseModel` + cast interno, (b) `Protocol` con `customer + stream`, (c) hacer que `DiscoveryReportPayload` también herede de `BasePdfPayload` cambiando `snapshot` a `snapshot_text` y agregando `date`. Recomendación: (a) por ahora — menos cambios, igual de funcional.
