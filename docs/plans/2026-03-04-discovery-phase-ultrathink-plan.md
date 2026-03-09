# Plan: SecondStream Discovery Phase Redesign (UltraThink)

**Generated:** 2026-03-04  
**Scope:** Solo Fase 1 Discovery (field intake + backoffice triage + readiness para proposal)  
**Base:** `docs/insights-product-process-interview.md`, `docs/SecondStream Product Discovery.md`, `docs/deep-research-report.md`, AS-IS en frontend/backend

## 0) TL;DR

Discovery hoy es cuello de botella por 5 causas: info faltante, clasificación ambigua waste/product, evidencia débil, decisión de lab mal temporizada, costo real opaco.

No necesitamos rehacer arquitectura. Ya existe base sólida: `project_data` JSONB, intake suggestions, file ingestion worker, timeline, proposal jobs. El rediseño correcto vive en `Project` y consiste en:

1. Re-orquestar UX a flujo de decisiones (no formulario plano).
2. Introducir gates explícitos por riesgo/compliance.
3. Convertir evidencia en objeto de primera clase.
4. Usar IA como copiloto con aprobación humana en puntos críticos.

Resultado esperado: menos deals congelados en waiting, menor retrabajo, mejor calidad de handoff a proposal.

---

## 1) Diagnóstico profundo del problema

## 1.1 Lo que realmente vende la empresa

No vende “propuesta de 8 líneas”. Vende resolver incertidumbre para convertir material ambiguo en movimiento viable (compliant + logístico + económico).

## 1.2 Cuellos de botella Discovery (prioridad)

- P0: Missing info loop (EHS depende de terceros, deal se congela).
- P0: Material name inútil (códigos internos no sirven para clasificar).
- P0: Ambigüedad waste vs product (misma sustancia cambia tratamiento por contexto).
- P1: Documentación vieja/incompleta (SDS/profile/lab sin frescura ni cobertura clara).
- P1: Decisión lab vs no-lab sin framework costo/beneficio.
- P1: Costo baseline opaco (fees ocultos distorsionan viabilidad).

## 1.3 Root causes (proceso, data, tooling, org)

- Proceso: intake no adaptativo; no prioriza bloqueadores.
- Data: campos críticos no capturados temprano; evidencia no calificada.
- Tooling: CRM mindset, no discovery-to-disposition workflow.
- Org: conocimiento tribal; alta variabilidad del contacto EHS.

---

## 2) AS-IS del producto (verificado en código)

## 2.1 Flujo actual real

1. Crear project en wizard (`frontend/components/features/dashboard/components/premium-project-wizard.tsx`).
2. Redirigir a `Questionnaire` (`frontend/app/project/[id]/page.tsx`).
3. Editar `technical_sections` via `PATCH /projects/{id}/data` (`frontend/lib/technical-sheet-data.ts`, `backend/app/api/v1/project_data.py`).
4. Cargar Intake Panel (`frontend/components/features/projects/intake-panel/intake-panel.tsx`).
5. Guardar notas + analyze notes (`/intake/notes`, `/intake/notes/analyze`).
6. Subir archivos para extracción IA (`POST /projects/{id}/files`, worker ingestión).
7. Aplicar/rechazar suggestions (`/intake/suggestions/*`) hacia `technical_sections`.
8. Ir a Proposals y generar (`POST /ai/proposals/generate`), con polling job.

## 2.2 Fortalezas actuales (mantener)

- `project_data` JSONB flexible (evita migración rígida).
- Pipeline intake AI ya existe (notes + docs + suggestions).
- Timeline events y proposal job manager ya operativos.
- UI modular por tabs y stores separados.

## 2.3 Fricciones técnicas actuales

- Gate readiness vive solo en frontend (`frontend/lib/technical-sheet-data.ts`), no enforce backend.
- Dos uploaders con lógica AI distinta (inconsistencia UX).
- Discovery fragmentado en tabs/estados distintos (alto contexto switching para field agent).
- Historial timeline parcial en detalle (no full visibility por default).

---

## 3) Principios de rediseño Discovery

1. **Decision-first UX:** mostrar qué bloquea decisión, no solo campos vacíos.
2. **Evidence-first data:** dato crítico sin evidencia = dato débil.
3. **Unknown explícito:** permitir incertidumbre tipada (`unknown`, `estimated`, `to_confirm`).
4. **Human-in-the-loop:** IA propone; humano aprueba gates de riesgo.
5. **Mobile-first capture, desktop-first resolution:** campo captura rápido; backoffice cierra ambigüedad.
6. **No new core infra:** reutilizar `project_data`, intake endpoints, worker, timeline.

---

## 4) TO-BE UX/UI en Project (cómo se verá)

## 4.1 Estructura de navegación

- Mantener tabs base para no romper arquitectura.
- Cambiar etiqueta UX: `Questionnaire` -> `Discovery`.
- Cambiar etiqueta UX: `Files` -> `Evidence`.
- Mantener `Proposals`, pero habilitar solo con gates de discovery completos.

## 4.2 Layout Discovery (desktop)

### A) Discovery Progress Rail (top)
- 5 etapas visibles: Intake, Clasificación, Evidencia, Lab/Timing, Costos.
- Cada etapa muestra `%`, blockers, owner.

### B) Main Canvas (izquierda)
- Acordeón por etapa (progresivo, no formulario plano).
- Cada sección con “required for gate” vs “enrichment”.

### C) Control Tower (derecha)
- Missing Info Queue priorizada (impacto x urgencia).
- Next Best Action CTA único.
- Lista de conflictos detectados por IA (contradicciones).

## 4.3 Layout mobile field-agent

- Modo captura rápida 5-min (campos críticos + foto/voz/doc).
- Drawer fijo para acciones IA (`Analizar`, `Aplicar`, `Solicitar dato faltante`).
- Discovery v1: autosave agresivo + recuperación de borrador + manejo de reconexión.
- Offline real (sync queue/conflict resolution) se mueve a `Later`.

## 4.4 Componentes UI concretos

- `Critical Fields Card`: must-have del lote.
- `Evidence Coverage Matrix`: claim vs evidencia.
- `Waste/Product Decision Card`: hipótesis, razones, evidencia, aprobación.
- `Lab Decision Card`: recomendación, costo/beneficio, SLA.
- `Real Cost Breakdown`: line items, costo efectivo, confidence.
- `Clarification Loop`: ida/vuelta field-backoffice trazable.

---

## 5) Flujo Discovery propuesto paso a paso

## Etapa 0 — Pre-visit setup (backoffice)

- Cargar contexto cliente/sitio.
- Definir checklist mínimo por material/jurisdicción.
- Asignar owner del discovery.

**Salida:** paquete de captura para field agent.

## Etapa 1 — Field capture (mobile)

- Capturar identidad operativa: familia, proceso generador, forma/empaque, volumen inicial, urgencia.
- Adjuntar evidencia inmediata: fotos, SDS/profile, notas de voz.
- Marcar explícitamente `unknown` donde aplique.

**Salida:** `Field Capture In Progress` con blockers visibles.

## Etapa 2 — Triage + normalización (backoffice)

- Revisar inconsistencias entre nota/doc/foto.
- Resolver ambigüedad waste/product con decision card.
- Disparar loop de aclaraciones si faltan datos críticos.
- Crear `Clarification Ticket` mínimo: `owner`, `due_at`, `blocked_gate`, `question`, `status(open|answered|dismissed)`.

**Salida:** `Backoffice Review` o `Needs Clarification`.

## Etapa 3 — Lab & timing gate

- Motor recomienda `no lab`, `targeted lab`, o `trial load`.
- Humano aprueba estrategia.
- Trackear SLA y fechas comprometidas.

**Salida:** `Lab Pending` o gate superado.

## Etapa 4 — Cost baseline gate

- Captura estructurada invoice + fees.
- Cálculo costo efectivo con confidence.
- Validación owner comercial.

**Salida:** `Cost Validation Pending` o gate superado.

## Etapa 5 — Discovery close

- Verificar checklist final por gate.
- Generar brief/pasaporte para proposal.

**Salida:** `Ready for Proposal`.

---

## 6) Funciones IA (por etapa, acotadas)

## 6.1 IA sí

- Extracción multimodal (OCR/docs/voz/foto) -> suggestions mapeadas a campos.
- Gap prioritization (qué dato falta y por qué bloquea).
- Detección de contradicciones (nota vs SDS vs lab).
- Recomendación lab strategy basada en patrón + buyer requirements.
- Cost normalizer (line items -> costo efectivo).

## 6.2 IA no (por ahora)

- No auto-clasificación final sin aprobación humana.
- No auto-cambio de estado crítico sin sign-off.
- No “agent autónomo” sin guardrails y auditoría.

## 6.3 Controles obligatorios

- Cada sugerencia con contrato mínimo: `{ confidence, rationale, evidence[] }`.
- `evidence[]` incluye al menos: `{ file_id, excerpt|page_hint }` cuando exista evidencia documental.
- Si no existe evidencia, suggestion se marca `low-confidence` y no puede cerrar gate crítico.
- Auditoría: quién aceptó/rechazó, cuándo, qué cambió.
- Reglas determinísticas para gates críticos en backend.

---

## 7) Diseño de datos y estado (sin romper arquitectura)

## 7.1 Reuso del modelo actual

- Mantener `project_data.technical_sections` como contenedor principal.
- Añadir estructura de etapas/gates en `project_data.discovery`.
- Seguir usando `intake_suggestions`, `intake_unmapped_notes`, `timeline_events`.

## 7.2 Estado mínimo Discovery

`discovery_state` vive en `project_data.discovery.state` y **no reemplaza** `projects.status`.

`projects.status` sigue como estado macro del proyecto; `discovery_state` detalla micro-estado de Fase Discovery.

Propuesto:

- `draft`
- `field_capture_in_progress`
- `backoffice_review`
- `needs_clarification`
- `lab_pending`
- `cost_validation_pending`
- `ready_for_proposal`
- `blocked`

Transiciones válidas (v1):

- `draft -> field_capture_in_progress`
- `field_capture_in_progress -> backoffice_review | needs_clarification`
- `needs_clarification -> backoffice_review | blocked`
- `backoffice_review -> lab_pending | cost_validation_pending | ready_for_proposal`
- `lab_pending -> cost_validation_pending | backoffice_review`
- `cost_validation_pending -> ready_for_proposal | backoffice_review`
- Cualquier estado -> `blocked` con reason code.

## 7.3 Gates mínimos backend

- Gate A (Intake): identidad/proceso/volumen/ubicación mínimos.
- Gate B (Clasificación): waste/product/unknown + evidencia asociada.
- Gate C (Evidencia): frescura mínima en docs críticos.
- Gate D (Lab): decisión explícita + racional.
- Gate E (Cost): costo efectivo validado.

`POST /ai/proposals/generate` debe validar gates y retornar faltantes estructurados (`HTTP 422`).

Contrato de error recomendado:

```json
{
  "error": "discovery_gates_not_ready",
  "gates": [
    {
      "gate": "evidence",
      "missing_fields": ["lab_analysis_status"],
      "missing_evidence": ["recent_sds"],
      "actions": ["request_updated_sds", "confirm_lab_decision"]
    }
  ]
}
```

---

## 8) Plan de cambios (sprints cortos, bajo riesgo)

## Sprint 0 — Contrato y alineación técnica (bloqueante)

- Definir contrato de gates backend (`422`, estructura de faltantes, reason codes).
- Definir taxonomía de eventos Discovery para timeline/analytics.
- Alinear `discovery_state` vs `projects.status` (sin romper dashboard actual).
- Unificar regla de `process_with_ai` entre uploaders (intake/files).

**Demo:** API devuelve faltantes consistentes; FE puede renderizar blockers reales.

## Sprint 1 — Reframe UX sin romper contratos

- Renombrar tabs UX (`Discovery`, `Evidence`).
- Implementar `Discovery Progress Rail` + `Critical Fields Card`.
- Unificar reglas visuales de completion por etapa.

**Demo:** Proyecto muestra etapas y blockers claramente.

## Sprint 2 — Evidence + clarification loop

- `Evidence Coverage Matrix` en Discovery/Evidence.
- Loop de aclaraciones con owner/SLA.
- Timeline completo para acciones intake.

**Demo:** caso con datos faltantes se destraba con trazabilidad.

## Sprint 3 — Gates backend + readiness real

- Enforce gates en backend previo a proposal.
- Respuesta estructurada de faltantes para UX accionable.
- Consistencia entre estado project y job proposal.

**Demo:** proposal solo arranca con discovery defendible.

## Sprint 4 — IA de decisión controlada

- Detección de contradicciones (v1 rules + IA assist).
- Lab strategy recommendation con sign-off humano.
- Cost normalizer movido a `Next` para no mezclar 3 apuestas grandes en mismo sprint.

**Demo:** menor retrabajo y mejor calidad de handoff.

---

## 9) Métricas de éxito (Discovery)

- Time to First Viable Proposal (mediana, P90).
- % deals en `waiting/missing info` y tiempo promedio bloqueado.
- # loops de aclaración por deal.
- % discovery cerrados sin retrabajo mayor en proposal.
- Lab spend por deal y % lab innecesario.
- Gap costo declarado vs costo efectivo.
- Adoption mobile capture (tiempo por visita, abandono por pantalla).

Instrumentación mínima:

- Baseline de 2 semanas pre-cambio para todas las métricas.
- Fuente por métrica definida (DB + timeline + eventos FE).
- Objetivos por sprint (ej. reducir `% waiting` en X%, bajar loops/deal en Y%).

---

## 10) Riesgos y mitigación

- Riesgo: sobrecargar field agent -> Mitigar con modo 5-min + progresivo.
- Riesgo: falsa certeza IA -> Mitigar con confidence + evidencia + sign-off humano.
- Riesgo: exceso de data “discoverable” legal -> Mitigar con governance por tipo/retención/acceso.
- Riesgo: romper flujo actual -> Mitigar con feature flags y rollout por etapas.
- Riesgo: “AI commodity trap” -> Mitigar enfocando moat en workflow+evidence+outcomes.
- Riesgo: divergencia readiness FE/BE -> Mitigar con backend como source-of-truth; FE solo renderiza faltantes de API.

---

## 11) Dónde se inserta exactamente en código (alto nivel)

- Navegación/tab UX: `frontend/components/features/projects/project-tabs.tsx`
- Pantalla principal project: `frontend/app/project/[id]/page.tsx`
- Orquestación technical/discovery: `frontend/components/features/projects/technical-data-sheet.tsx`
- Layout con intake panel: `frontend/components/features/technical-data/components/data-capture/resizable-data-layout.tsx`
- Intake panel y subcomponentes: `frontend/components/features/projects/intake-panel/*`
- Persistencia data: `frontend/lib/technical-sheet-data.ts`, `frontend/lib/stores/technical-data-store.ts`
- Endpoints discovery/intake: `backend/app/api/v1/project_data.py`, `backend/app/api/v1/intake.py`, `backend/app/services/intake_service.py`
- Ingestión de archivos IA: `backend/app/api/v1/files.py`, `backend/app/services/intake_ingestion_service.py`
- Gate proposal: `backend/app/api/v1/proposals.py`, `backend/app/services/proposal_service.py`
- Timeline + serialización detalle: `backend/app/services/timeline_service.py`, `backend/app/schemas/project.py`

---

## 12) Decisiones de alcance (Now / Next / Later)

## Now (Discovery v1)

- Rediseño UX Discovery in-project.
- Gates backend mínimos.
- Evidence-first + clarification loop.
- IA copiloto acotada.
- Sin offline real.

## Next

- Material Passport exportable buyer-ready.
- Buyer QA requirements por segmento.
- Rules registry regulatorio versionado.

## Later

- Multi-actor portal completo.
- Benchmarking agregado privado.
- Capas agentic de ejecución controlada.
- Offline real en mobile web (sync queue + conflict resolution).

---

## Preguntas abiertas (unresolved)

1. Qué umbral exacto de frescura documental por tipo de material para pasar Gate C.
2. Qué campos Discovery serán legalmente “required to retain” vs “optional and purgeable”.
3. Qué rol aprueba cada gate (field lead, compliance, commercial owner) en org real.
4. Qué mercados/jurisdicciones entran primero para reglas (US federal only vs state-by-state inicial).
