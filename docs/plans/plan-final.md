Plan final — Port del patrón secondstreamAI al chat de SecondStream
Pre-req confirmado: @tanstack/react-query@5.99.2 ya en package.json, pero no hay QueryClientProvider en el árbol (0 usos en .tsx/.ts). Commit previo obligatorio.
---
Premisa que cambia
threadId pasa de mutable (creado por REST tras primer send) → inmutable por montaje (generado con crypto.randomUUID() antes del primer render). El backend lo upserta al recibir el stream. El cliente deja de orquestar lifecycle.
Decisiones cerradas
#	Decisión
1	SSR auth: no. Hidratación client-side al montar
2	Thread upsert-on-stream: sí, ahora
3	Attachments: mantener REST upload → existingAttachmentIds
4	POST /chat/threads: mantener para CRUD/admin, sacar del first-turn path
5	Legacy SSE (streamPersistedChatTurn, parseChatSSEBuffer): borrar en el mismo PR
6	QueryClientProvider: agregar como commit previo
7	data-conversation-title: diferir a follow-up
8	Cross-tenant UUID collision: 404 genérico, sin revelar existencia
9	GET /chat/threads/{id} con threadId fresco: frontend no lo llama en modo new
10	threadId upfront: crypto.randomUUID() en cliente
Objetivo numérico
- components/chat-ui/chat-screen.tsx: 955 → ≤ 400 LOC
- Estados/refs de coordinación cliente: 11 → 1 (historyError)
- Paths de stream: 2 → 1 (DefaultChatTransport + AI SDK UI-message-stream)
- Endpoints usados en first-turn: 2 (POST /threads + POST /stream) → 1 (POST /stream)
---
Orden de commits
Cada commit compila y pasa tests. 8 commits. Backend primero.
Commit 1 — backend: ensure_thread_exists + emitir data-new-thread-created
Files:
- backend/app/services/chat_service.py
- backend/app/services/chat_stream_protocol.py
- backend/tests/services/test_chat_service.py
- backend/tests/services/test_chat_stream_protocol.py
- backend/tests/api/v1/test_chat_routes.py
Cambios:
chat_service.py:
- Nueva ensure_thread_exists(db, organization_id, created_by_user_id, thread_id) -> tuple[ChatThread, bool].
  - SELECT por (id=thread_id, organization_id, created_by_user_id, archived_at IS NULL).
  - Si existe: return (thread, False).
  - Si no existe: SELECT por id=thread_id sin filtro de org. Si existe bajo otra org → raise ChatThreadNotFoundError (mapea a 404 genérico). Si no existe en ningún lado: INSERT con id=thread_id, return (thread, True). Manejar IntegrityError (race): return (SELECT por (id,org), False) si pertenece, si no → 404.
- stream_chat_turn: primera operación = thread, was_created = await ensure_thread_exists(...). Si was_created=True, antes del primer yield {"event":"start",...} o justo después, añadir:
    yield {
      "event": "data-new-thread-created",
      "thread_id": str(thread.id),
      "title": thread.title,
      "created_at": thread.created_at.isoformat(),
      "updated_at": thread.updated_at.isoformat(),
  }
  - _load_owned_active_thread llamado después del stream_chat_response sigue igual (ya encuentra el thread recién creado).
chat_stream_protocol.py:
- adapt_stream_to_official_protocol: nuevo branch para event_type == "data-new-thread-created" →
    yield f"data: {json.dumps({'type':'data-new-thread-created','data':{'threadId':..., 'title':..., 'createdAt':..., 'updatedAt':...}})}\n\n"
  - adapt_stream_to_legacy_protocol: pass-through para el mismo event (por si hay clientes legacy que queramos no romper; encode compatible).
Tests nuevos:
- test_ensure_thread_exists_creates_when_missing
- test_ensure_thread_exists_idempotent_same_owner
- test_ensure_thread_exists_404_when_exists_in_other_org
- test_ensure_thread_exists_handles_race_integrity_error
- test_stream_chat_turn_emits_data_new_thread_created_on_first_stream
- test_stream_chat_turn_no_data_new_thread_created_on_existing_thread
- test_adapt_official_encodes_data_new_thread_created
- test_stream_route_accepts_fresh_uuid_and_creates_thread (integration)
Commit 2 — frontend: QueryClientProvider en root layout
Files:
- frontend/app/layout.tsx (o el layout raíz equivalente)
- frontend/components/providers/query-client-provider.tsx (nuevo, "use client")
- frontend/components/providers/__tests__/query-client-provider.test.tsx
Cambios:
- Nuevo QueryProvider client component con QueryClient instanciado vía useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } })).
- Envolver children en el layout server component con <QueryProvider>.
- Sin Devtools en producción (opcional en dev con dynamic import).
Commit 3 — frontend: utilidades puras portadas de referencia
Files:
- frontend/lib/chat-runtime/chat-utils.ts (nuevo)
- frontend/lib/chat-runtime/chat-utils.test.ts (nuevo)
Cambios:
- Copiar canSubmitPromptMessage y shouldShowLoadingShimmer desde SecondstreamAI/src/lib/chat-utils.ts textualmente. Tipos MyUIMessage y PromptInputMessage de SecondStream.
- Tests equivalentes a los del reference.
Commit 4 — frontend: sidebar con React Query
Files:
- frontend/components/chat-ui/app-sidebar.tsx
- frontend/components/chat-ui/__tests__/app-sidebar.test.tsx (si existe, si no, nuevo)
Cambios:
- Reemplazar useState<ChatThreadSummaryDTO[]> + useEffect por:
    const { data: threads = [], error } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: listChatThreads,
  });
  - Query key canónica: ["chat-threads"] (documentar en lib/api/chat.ts como constante exportada CHAT_THREADS_QUERY_KEY = ["chat-threads"] as const).
Commit 5 — frontend: reescribir ChatScreen como mirror de ChatInterface
Archivo principal: frontend/components/chat-ui/chat-screen.tsx (reescritura, net -600 LOC)
Nuevas props:
interface ChatScreenProps {
  threadId: string;
  initialMessages: MyUIMessage[];
  loadHistory: boolean;  // true solo si venimos con ?threadId= en URL
}
Estructura final (≤ 400 LOC, mirror de SecondstreamAI/src/components/chat-interface.tsx):
"use client";
export function ChatScreen({ threadId, initialMessages, loadHistory }: ChatScreenProps) {
  const router = useRouter();            // next/navigation
  const queryClient = useQueryClient();
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { messages, sendMessage, status, error, clearError, setMessages } =
    useChat<MyUIMessage>({
      id: threadId,
      messages: initialMessages,
      transport: createChatBridgeTransport({ threadId }),
      onFinish: () => {
        queryClient.invalidateQueries({ queryKey: CHAT_THREADS_QUERY_KEY });
      },
      onData: (part) => {
        if (part.type === "data-new-thread-created") {
          queryClient.setQueryData<ChatThreadSummaryDTO[]>(
            CHAT_THREADS_QUERY_KEY,
            (old) => {
              const next = {
                id: part.data.threadId,
                title: part.data.title,
                lastMessagePreview: null,
                lastMessageAt: null,
                createdAt: part.data.createdAt,
                updatedAt: part.data.updatedAt,
              };
              return old ? [next, ...old] : [next];
            },
          );
        }
      },
    });
  // Hidratación one-shot para thread existente.
  useEffect(() => {
    if (!loadHistory) return;
    let cancelled = false;
    reloadPersistedThreadHistory(threadId)
      .then((msgs) => { if (!cancelled) setMessages(msgs); })
      .catch((e) => { if (!cancelled) setHistoryError(e instanceof Error ? e.message : "Unable to load thread history."); });
    return () => { cancelled = true; };
  }, [threadId, loadHistory, setMessages]);
  const handleSubmitMessage = useCallback(async (message: PromptInputMessage) => {
    if (!canSubmitPromptMessage(message)) return;
    clearError();
    const attachmentIds = await uploadAttachmentsFromPromptMessage(message);
    const wasEmpty = messages.length === 0;
    await sendMessage(
      { text: message.text, files: message.files },
      { body: attachmentIds.length > 0 ? { existingAttachmentIds: attachmentIds } : {} },
    );
    if (wasEmpty) {
      window.history.replaceState(null, "", buildChatThreadUrl(threadId));
    }
  }, [clearError, sendMessage, threadId, messages.length]);
  const isEmptyState = messages.length === 0;
  const visibleError = submitError ?? error?.message ?? historyError;
  return (
    <div className="flex h-full flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {isEmptyState ? <EmptyState .../> : <ConversationView .../>}
      </AnimatePresence>
    </div>
  );
}
Helpers en el mismo archivo:
- uploadAttachmentsFromPromptMessage(message: PromptInputMessage): Promise<string[]> — ~20 LOC, itera message.files, resuelve File vía fetch(part.url).blob(), llama uploadChatAttachment.
- classifyMessagePart, extractToolName — se mantienen (tienen cobertura y valor).
Borrar del archivo:
- canUseMainChatTransport, resolveChatSessionKey, shouldSkipHistoryReload, shouldShowMainChatLandingState, resolveMainChatSubmitFeedbackLabel, submitMainChatTurn, resolveUploadFileFromPromptPart, uploadMainChatAttachments, buildOptimisticUserMessage, resolveVisibleMessages.
- Todos los estados/refs: activeThreadId, activeThreadIdRef, pendingAttachmentIdsRef, submitError, historyLoading, isPreparingSubmit, isPreparingSubmitRef, optimisticUserMessage, chatSessionKey, firstTurnThreadIdRef.
- Los dos useEffect de coordinación (history reload con 6 deps + clear optimistic + first-turn ref clear).
Commit 6 — frontend: app/chat/page.tsx + borrar ChatRouteState
Files:
- frontend/app/chat/page.tsx
- frontend/lib/chat-runtime/routing.ts
- frontend/lib/chat-runtime/routing.test.ts (archivar / reducir)
Cambios page.tsx:
export default function ChatPage({ searchParams }: { searchParams?: { threadId?: string } }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar activeThreadId={searchParams?.threadId} />
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          <ChatPageClient initialThreadId={searchParams?.threadId ?? null} />
        </div>
      </div>
    </SidebarProvider>
  );
}
Nuevo ChatPageClient client component (mismo archivo o chat-page-client.tsx):
"use client";
export function ChatPageClient({ initialThreadId }: { initialThreadId: string | null }) {
  const [threadId] = useState(() => initialThreadId ?? crypto.randomUUID());
  const loadHistory = initialThreadId !== null;
  return <ChatScreen threadId={threadId} initialMessages={[]} loadHistory={loadHistory} />;
}
routing.ts:
- Borrar ChatRouteState y resolveChatRouteState.
- Mantener solo buildChatThreadUrl(threadId: string): string.
- Update o reduce routing.test.ts para solo cubrir buildChatThreadUrl.
Commit 7 — frontend: limpiar lib/api/chat.ts + transport
Files:
- frontend/lib/api/chat.ts
- frontend/lib/api/chat.test.ts (reescribir)
- frontend/lib/chat-bridge/transport.ts
- frontend/lib/chat-bridge/transport.test.ts
lib/api/chat.ts — borrar:
- ChatStreamEvent, parseChatSSEBuffer, streamPersistedChatTurn, parseOfficialDataEvent, resolveBaseUrl, resolveStreamingHeaders, safeJsonParse, normalizePayload, stringOrUndefined, createChatThread.
lib/api/chat.ts — mantener y extender:
- listChatThreads, fetchChatThreadDetail, reloadPersistedThreadHistory, uploadChatAttachment, DTOs.
- Exportar constante export const CHAT_THREADS_QUERY_KEY = ["chat-threads"] as const;.
chat-bridge/transport.ts:
- createChatBridgeTransportOptions pierde getAttachmentIds (ya no usado).
- prepareSendMessagesRequest({ headers, messages, body }) → leer existingAttachmentIds desde el body que viene del sendMessage(..., { body }) en lugar del ref.
- Firma final:
    createChatBridgeTransport({
    threadId,
    baseUrl?,
    getAccessToken?,
    getOrganizationId?,
  })
  - Borrar getThreadId del contrato — threadId es estable por montaje, el transport se rebuildea con el id del componente.
Tests:
- transport.test.ts: actualizar para nuevo contrato de body.
- chat.test.ts: reescritura acotada — solo reloadPersistedThreadHistory, uploadChatAttachment, listChatThreads, fetchChatThreadDetail.
Commit 8 — tests: archivar muertos + añadir semánticos nuevos
Archivar (git rm):
- frontend/components/chat-ui/chat-screen.test.ts
- frontend/components/chat-ui/chat-screen-parts.test.ts
- frontend/components/chat-ui/chat-default-cutover.structure.test.ts
Nuevos:
- frontend/components/chat-ui/__tests__/chat-screen.first-send.test.tsx
  - Monta con threadId nuevo, loadHistory=false, initialMessages=[].
  - Mock createChatBridgeTransport para simular stream exitoso.
  - Assert: window.history.replaceState llamado con buildChatThreadUrl(threadId) una vez.
  - Assert: useChat no se re-keyó durante el stream (mock useChat + verificar id estable).
- frontend/components/chat-ui/__tests__/chat-screen.existing-thread.test.tsx
  - Monta con threadId existente, loadHistory=true.
  - Mock reloadPersistedThreadHistory → devuelve 3 mensajes.
  - Assert: setMessages se llama una vez con 3 mensajes.
  - Re-render con mismos props: reloadPersistedThreadHistory NO se vuelve a llamar.
- frontend/components/chat-ui/__tests__/chat-screen.on-data.test.tsx
  - Disparar onData({ type: "data-new-thread-created", data: {...} }).
  - Assert: setQueryData(CHAT_THREADS_QUERY_KEY, ...) prepend del thread.
- frontend/components/chat-ui/__tests__/chat-screen.submit-guard.test.tsx
  - Submit con mensaje vacío sin archivos → no llama sendMessage.
- frontend/components/chat-ui/__tests__/chat-screen.attachments.test.tsx
  - Submit con 2 archivos → uploadChatAttachment 2 veces → sendMessage con body.existingAttachmentIds de 2 ids.
Matriz de cobertura reemplazada (para revisión del PR):
Test viejo archivado
shouldSkipHistoryReload cases
resolveChatSessionKey
submitMainChatTurn happy path
resolveVisibleMessages dedup
buildOptimisticUserMessage
resolveMainChatSubmitFeedbackLabel
shouldShowMainChatLandingState
classifyMessagePart
---
## Follow-ups explícitos (no en este PR)
1. `data-conversation-title`: requiere lógica de generación de título en `chat_agent.py`. PR separado.
2. SSR de historial con cookie httpOnly de Supabase: migración de auth. PR separado.
3. Attachments nativos del SDK (data parts): PR separado si alguna vez.
4. Borrar `POST /chat/threads` si no aparece consumidor legítimo (backoffice/import) en 2–3 sprints.
---
Riesgos residuales aceptados
Riesgo	Probabilidad
QueryClientProvider rompe algo downstream	Baja — no hay usos actuales
data-new-thread-created con payload mal-formado	Baja
FK race si dos requests con mismo UUID	Muy baja (nanoid/UUID colisión)
crypto.randomUUID() no disponible en runtime (Node <19 en algún test)	Media en tests
Refresh durante stream activo pierde el stream	Aceptada
Tests viejos archivados sin equivalente semántico	Controlado
---
## Criterios de "done"
- [ ] `rg -l "activeThreadId|chatSessionKey|firstTurnThreadIdRef|optimisticUserMessage|shouldSkipHistoryReload" frontend/` devuelve **0 archivos**.
- [ ] `rg -l "streamPersistedChatTurn|parseChatSSEBuffer|createChatThread" frontend/` devuelve **0 archivos**.
- [ ] `frontend/components/chat-ui/chat-screen.tsx` ≤ 400 LOC.
- [ ] Primer send con UUID fresco: backend crea thread, emite `data-new-thread-created`, sidebar se actualiza sin invalidate ni refetch.
- [ ] Refresh en `/chat?threadId=<existente>`: mensajes visibles en primer paint tras hidratación, sin "Thinking..." perpetuo, sin blank flash.
- [ ] Navegar entre threads vía sidebar: `useChat` se re-keyea correctamente (distinto `id`), cada thread muestra su propio historial.
- [ ] `cd backend && make check` verde.
- [ ] `cd frontend && bun run check:ci` verde.
- [ ] Matriz de reemplazo de tests del Commit 8 firmada en la descripción del PR.
---
Preguntas abiertas residuales
Ninguna bloqueante. Dos opcionales:
1. Nombre del client component de ruta: ¿ChatPageClient en el mismo archivo que page.tsx, o archivo separado chat-page-client.tsx? (Sugerencia: archivo separado para respetar la regla "server component by default").
2. Telemetría en ensure_thread_exists: ¿emitimos chat_thread_upserted log estructurado cuando was_created=True? Útil para distinguir funnel de "new chat → first message" en analytics. Bajo costo, alto valor. Sugerencia: sí.
