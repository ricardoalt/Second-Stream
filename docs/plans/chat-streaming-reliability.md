# Plan: chat-streaming-reliability (fix mínimo)

## Objetivo
- Estabilizar streaming SSE de chat en producción sin rediseñar arquitectura ni prompts.

## Fix mínimo aplicado
- Frontend: `resume` desactivado en `useChat` para evitar reconexión falsa entre workers ECS.
- Backend: keepalive SSE estándar como comentario (`: keepalive\n\n`) durante gaps largos del agente.
- Backend: observabilidad mínima con métricas de latencia/gaps/duración/cancelación para diagnosticar cuelgues.

## Próximo paso opcional (no incluido en este fix)
- Durable resume real con estado compartido cross-worker (ej. Redis + stream persistence) antes de reactivar `resume: true`.

## Cuándo usar background job + polling (PDF/trabajo largo)
- Si el trabajo excede ventana razonable de conexión HTTP/SSE o depende de IO pesado (PDFs grandes, OCR, pipelines multipaso).
- Patrón recomendado: iniciar job asíncrono, devolver `job_id`, hacer polling/subscribe de estado/resultados.

## Alcance explícito
- No se reducen prompts ni skills en este cambio.
