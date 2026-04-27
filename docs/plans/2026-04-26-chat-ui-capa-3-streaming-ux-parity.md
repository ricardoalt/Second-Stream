# Sprint 3 — Capa 3 — Streaming, observability, UX parity

## Context

Después de Sprint 1 (3 PDFs + componentes) y Sprint 2 (refactors + arquitectura), esta Capa 3
ataca features específicas de AI SDK 6 / pydantic-ai 1.x / AI Elements 1.9 que ya pagamos en
deps pero NO usamos, más patterns de UX que el usuario espera porque los usa en Claude.ai
y ChatGPT (edit & resubmit, keyboard shortcuts).

Filosofía: **competitive parity**. La app hoy es funcional. Esta capa la pone "production-grade".

Fuera de scope explícito (sigue diferido):
- VercelAIAdapter migration (sigue requiriendo Docker para testing)
- HitL completo con tool approval (separar a su propio sprint)
- Redis-backed stream sessions (infra change)
- History rehydration con parts[] persistidos (DB schema change)

## Tareas

### Tier 1 — 15 minutos, retorno gigante

**T1. `experimental_throttle: 50` en useChat**
File: `frontend/components/chat-ui/chat-interface.tsx`

```tsx
useChat<MyUIMessage>({
    ...,
    experimental_throttle: 50,
});
```

Batchea state updates a 20 fps durante streaming. Combinado con el `MessagePartsRenderer.memo`
que ya tenemos, reduce re-renders de ~80/seg a ~20/seg. Notable en mensajes >500 tokens.

**T2. `onError` callback + toast scoped por thread**
File: `frontend/components/chat-ui/chat-interface.tsx`

Reemplazar el `useEffect([visibleError])` actual con:
```tsx
useChat<MyUIMessage>({
    onError: (err) => toast.error(err.message, { id: `chat-error-${threadId}` }),
});
```

- Más limpio (sin polling de state via useEffect)
- `id: chat-error-${threadId}` evita que threads se sobrescriban toasts en multi-tab

**T3. `instrument=True` en pydantic-ai**
File: `backend/app/agents/chat_agent.py`

```python
agent: Agent[ChatAgentDeps, str] = Agent(
    BedrockConverseModel(...),
    deps_type=ChatAgentDeps,
    output_type=str,
    instrument=True,  # ← agregar
    retries=2,
    instructions=compile_base_instructions(),
)
```

Activa OTel traces para cada tool call, model invocation, retry. Si hay un OTel exporter
configurado (Datadog/Honeycomb/Phoenix), se ve la cascada completa de cada turno.

---

### Tier 2 — Production hardening (1-2h)

**T4. Rate limiting per-user en chat endpoint**
File: `backend/app/api/v1/chat.py`

`slowapi` ya está en `pyproject.toml`. Agregar:
```python
from app.core.rate_limit import limiter

@router.post("/threads/{thread_id}/messages")
@limiter.limit("20/minute")
async def post_message(...):
    ...
```

Sin esto, un usuario puede consumir todo el budget de Bedrock en minutos.

**T5. `FallbackModel` para resiliencia**
File: `backend/app/agents/chat_agent.py`

```python
from pydantic_ai.models.fallback import FallbackModel

agent: Agent[ChatAgentDeps, str] = Agent(
    FallbackModel(
        BedrockConverseModel(_BEDROCK_MODEL_NAME, provider=...),
        BedrockConverseModel("us.anthropic.claude-haiku-4-5-v1:0", provider=...),
    ),
    ...,
)
```

Si el modelo primario falla por rate limit / 5xx, automáticamente cae al backup.
Sin esto, el usuario ve "stream failed" en cada hipo de Bedrock.

**T6. Frontend TTFT telemetry**
File: `frontend/components/chat-ui/chat-interface.tsx`

```tsx
const streamStartedRef = useRef<number | null>(null);
useChat<MyUIMessage>({
    onResponse: () => { streamStartedRef.current = Date.now(); },
    onFinish: () => {
        if (streamStartedRef.current) {
            // emit event to analytics provider — concrete impl depends on stack
            console.log("chat_ttft_ms", Date.now() - streamStartedRef.current);
        }
    },
});
```

TTFT es la métrica más importante de UX en chat IA. Sin medirla en producción, no se sabe
si Bedrock está degradado hasta que un usuario reporta.

---

### Tier 3 — UX parity con Claude.ai/ChatGPT (1 día)

**T7. Edit & resubmit del último mensaje del usuario**
Files:
- `frontend/components/chat-ui/message-parts-renderer.tsx` — agregar `EditButton` para `message.role === "user"` cuando es el último user message
- `frontend/components/chat-ui/edit-message-button.tsx` (nuevo) — modal/inline edit que llama `setMessages(messages.slice(0, idx))` + `sendMessage(newText)`

Estándar 2026 en Claude.ai y ChatGPT. Sin esto, el usuario tiene que reescribir desde cero.
AI Elements 1.9 expone `MessageEdit` component (verificar API exacta).

**T8. Keyboard shortcuts**
File: `frontend/components/chat-ui/chat-interface.tsx` (o un hook dedicado `useChatKeyboard`)

Atajos estándar:
- `Cmd/Ctrl + K` → nuevo thread (router.push)
- `Esc` durante streaming → llamar `stop()`
- `↑` (cuando textarea vacío) → editar último user message
- `Cmd + Enter` → submit (alternativa a Enter, útil si Enter inserta newline)
- `?` → modal con lista de shortcuts

Implementación: un hook `useKeyboardShortcuts({ stop, threadId, ... })` con `useEffect` +
`window.addEventListener("keydown", ...)`. Cleanup en unmount.

---

### Tier 4 — Architectural (2-3h)

**T9. `chat_agent` como factory con `lru_cache`**
File: `backend/app/agents/chat_agent.py`

```python
# Antes:
chat_agent = _make_agent()  # se ejecuta en module import

# Después:
from functools import lru_cache

@lru_cache(maxsize=1)
def get_chat_agent() -> Agent[ChatAgentDeps, str]:
    return _make_agent()
```

Y actualizar callers (`generate_chat_response`, `stream_chat_response` etc.) para usar
`get_chat_agent()`. Beneficios:
- Tests pueden monkeypatchear / clear cache
- Settings se cargan lazy
- No hay side effects de import

**T10. Skills frontmatter validado con Pydantic**
File: `backend/app/agents/chat_skill_loader.py`

```python
import yaml
from pydantic import BaseModel

class SkillFrontmatter(BaseModel):
    name: str
    description: str
    triggers: list[str] | None = None  # palabras clave para conditional loading

def _split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return "", text
    return parts[1].strip(), parts[2].strip()

def load_skill(name: str) -> SkillPrompt:
    raw = (_SKILLS_DIR / f"{name}.md").read_text(encoding="utf-8").strip()
    fm_text, body = _split_frontmatter(raw)
    fm = SkillFrontmatter.model_validate(yaml.safe_load(fm_text)) if fm_text else None
    if name == "discovery-reporting":
        body = _sanitize_discovery_reporting(body)
    return SkillPrompt(name=fm.name if fm else name, body=body)
```

Beneficio: skill mal formado falla en tiempo de import del agente, no en runtime.
Habilita futuro: `triggers` permite mover skills de `_ALWAYS_ON` a `conditional` por keyword.

**T11. `PdfToolset` — agrupar los 4 PDF tools**
File nuevo: `backend/app/agents/toolsets/pdf_toolset.py`

Mover los 4 `@agent.tool` registrados en `_register_tools` a una clase `PdfToolset`.
Cuando se agreguen más tools (CRM, search, etc.), cada categoría es su propio toolset.

```python
from pydantic_ai.toolsets import FunctionToolset

pdf_toolset = FunctionToolset[ChatAgentDeps]()

@pdf_toolset.tool(name="generateDiscoveryReport")
async def generate_discovery_report(ctx, payload): ...
# ...

# En _make_agent:
agent = Agent(..., toolsets=[pdf_toolset])
```

---

### Tier 5 — Producto / nice to have (varía)

**T12. `messageMetadata` para mostrar modelo + duración por mensaje**
Backend emite `data-message-metadata` parts; frontend lee de `message.metadata`.
Footer del assistant message: "Generated with Claude Sonnet 4.5 · 1.2s · 847 tokens".

**T13. `Task` component para PDFs en lugar de Shimmer**
Backend emite eventos `data-task-step` durante render del PDF:
- `Drafting sections` → `Compiling insight` → `Rendering PDF`

Frontend renderiza con AI Elements `Task` + `TaskItem`. Da progreso real vs shimmer indeterminado.

**T14. "Continue" para streams cortados**
Si el stream termina por `max_tokens`, mostrar botón "Continue generating" debajo del mensaje
truncado. Llama `regenerate({ messages: [...history, "continue"] })`.

**T15. Lazy-load Streamdown plugins por content detection**
File: `frontend/components/ai-elements/message.tsx` (donde se usa Streamdown)

```tsx
const plugins = useMemo(() => {
    const p = ['code'];
    if (/\$.+\$/.test(content)) p.push('math');
    if (/```mermaid/.test(content)) p.push('mermaid');
    if (/[一-鿿]/.test(content)) p.push('cjk');
    return p;
}, [content]);
```

Reduce ~150KB del initial bundle.

**T16. `InlineCitation` para citas en línea**
Cuando el agente cita una fuente con `[1]`, `[2]` en el texto, AI Elements `InlineCitation`
renderiza el chip clickeable con preview hover. Mejora la trazabilidad de respuestas
con web search.

## Critical files

Frontend:
- `frontend/components/chat-ui/chat-interface.tsx` — T1, T2, T6, T8 (parcial)
- `frontend/components/chat-ui/message-parts-renderer.tsx` — T7 (Edit button)
- `frontend/components/chat-ui/edit-message-button.tsx` (nuevo) — T7
- `frontend/hooks/use-keyboard-shortcuts.ts` (nuevo) — T8
- `frontend/components/ai-elements/message.tsx` — T15

Backend:
- `backend/app/agents/chat_agent.py` — T3, T5, T9, T11
- `backend/app/api/v1/chat.py` — T4
- `backend/app/agents/chat_skill_loader.py` — T10
- `backend/app/agents/toolsets/pdf_toolset.py` (nuevo) — T11

## Orden de ejecución recomendado

1. **Tier 1 todo junto** (T1+T2+T3, ~15min) — quick wins que pagan dividendos en cada turno
2. **T4 Rate limiting** — seguridad, sin riesgo
3. **T9 chat_agent factory** — fundación para tests + T5
4. **T5 FallbackModel** — depende de tener factory para testear
5. **T10 Skills frontmatter** — independiente, mejora DX
6. **T11 PdfToolset refactor** — solo si vamos a agregar más tools pronto
7. **T8 Keyboard shortcuts** — UX win contenido
8. **T7 Edit & resubmit** — mayor inversión, mayor visibility
9. **T6 TTFT telemetry** — necesita un analytics provider definido
10. **Tier 5** — uno por uno según prioridad de producto

## Verification

Backend:
- `cd backend && uv run ruff check app/ tests/ && make check`
- `uv run pytest tests/agents/ -v` — verificar que `get_chat_agent()` funciona
- Smoke: provocar un error de Bedrock (modelo inválido) → verificar que `FallbackModel` cae al backup
- Smoke: hacer 25 requests/min al chat → verificar 429 después de 20

Frontend:
- `cd frontend && bun run check:ci`
- Smoke: stream un mensaje largo (>500 tokens) → DevTools React Profiler debería mostrar
  ~20 renders/seg en MessagePartsRenderer (vs ~80 antes de throttle)
- Smoke: provocar un error → verificar toast aparece con id correcto + no se sobrescribe en otro thread
- Smoke: durante streaming, presionar Esc → debería llamar `stop()`
- Smoke: con textarea vacío, presionar `↑` → debería abrir edit del último user message

## Unresolved questions

- **Analytics provider para T6 (TTFT telemetry)**: ¿PostHog, Mixpanel, Datadog RUM, custom?
  La implementación concreta depende del stack de telemetría elegido.
- **OTel exporter para T3 (`instrument=True`)**: ¿Logfire (de Pydantic), Honeycomb, Datadog APM?
  `instrument=True` activa los traces; el exporter es config separado.
- **Edit & resubmit (T7)**: ¿inline edit dentro del bubble (Claude.ai) o modal (más simple)?
  Recomendación: inline (mejor UX, vale la pena la complejidad).
- **"Continue" feature (T14)**: ¿qué metadata indica que un stream se cortó por `max_tokens`?
  Backend tiene que emitir un signal — pydantic-ai puede tener `finish_reason` en el último event.
