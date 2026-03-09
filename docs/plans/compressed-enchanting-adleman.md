# Plan: Rewrite Team Presentation Document (V3) — In Spanish

## Context

V1/V2 failed to communicate clearly. User wants V3 focused on:
- **New product vision** (not too much about current product)
- **WHY** each decision was made, traced to Russ call or team meeting
- **HOW** each component works in detail, with examples (especially compliance/regulatory)
- **Phased roadmap** — clear phases with what each delivers
- **Not too long** — concise but complete

## Deliverable

Rewrite `docs/plans/waste-deal-os-team-presentation.md` (~500 lines, Spanish, technical terms in English).

## Document Structure

### 1. La Nueva Visión (~30 lines)
- One-liner: "De generador de propuestas a sistema operativo de deals"
- Thesis: El valor no está en generar propuestas (eso es trivial), sino en estructurar el caos de datos que llega del campo
- Why now: Russ validation + team meeting alignment

### 2. Los Problemas y Cómo Llegamos a las Soluciones (~80 lines)

Each problem: Quote de Russ → Qué significa → Qué decidimos → Por qué esta solución y no otra

**Problema 1: "Esperar información domina el funnel"**
- Russ: 80% del tiempo es perseguir datos faltantes
- Solución: Missing Info Tracker — el sistema detecta qué falta y genera acciones
- Por qué: Un tracker automático reduce el chase manual de semanas a horas
- Ejemplo concreto: "Falta test de Water Content → bloquea pricing → [Acción: Enviar email a EHS del generador]"

**Problema 2: "No existe enciclopedia de materiales"**
- Russ: Cada material es único, no hay database universal
- Solución: Evidence Graph — cada dato vinculado a su fuente (SDS pg.4, lab report, voice note)
- Por qué: Si no puedes consultar una enciclopedia, necesitas construir tu propia base auditable deal por deal
- Ejemplo: `flash_point: 16°F` → `fuente: SDS_Solvent.pdf, página 4, confianza: 95%`

**Problema 3: "La propuesta es trivial; lo difícil es el assessment"**
- Russ: Los sales engineers ya saben qué hacer. Lo difícil es convertir info ambigua en datos estructurados
- Solución: Pivot de "Proposal Generator" a "Deal Workspace" con captura inteligente
- Por qué: Invertimos el foco — 80% del esfuerzo va a captura y estructuración, 20% a output
- De meeting del equipo: "El primer módulo es Discovery, todo debe terminar en formato estructurado + qué falta"

**Problema 4: Riesgo legal de datos "discoverable"**
- Russ: Guardar todo el historial es bueno para el negocio pero riesgo legal en auditorías
- Solución: Data Governance con 2 buckets — Working Data (purge 90 días) vs Record Data (3-7 años)
- Por qué: Separar datos operativos de datos legales elimina la exposición en caso de litigio

**Problema 5: Sin historial de pricing → sin leverage**
- Russ: Brokers negocian "a ciegas" sin saber precios de deals similares
- Solución: Outcome Ledger — registro obligatorio al cerrar deal que alimenta Pricing Intelligence
- Por qué: Empieza vacío el día 1 pero cada deal cerrado hace más inteligente al siguiente

### 3. Cómo Funciona Cada Motor — En Detalle (~120 lines)

**3a. Document Intelligence (CÓMO funciona)**
- Agentes existentes (Image, Document, Notes, Voice) extraen datos de fotos, PDFs, notas de voz
- Lo NUEVO: Evidence Graph — no solo extrae el dato, también guarda DE DÓNDE lo sacó
- Proceso paso a paso:
  1. Field agent sube SDS (PDF de seguridad del material)
  2. Document Analysis Agent extrae: composición química, flash point, densidad
  3. Cada dato se guarda como nodo con referencia: `{valor, fuente, página, confianza, fecha}`
  4. Si el agent sube voice note: "Son como 4 tambores al mes de MEK"
  5. Voice agent transcribe y extrae: `volumen: ~4 drums/mo, fuente: voice_note_monday.mp3`
- Ejemplo visual en wireframe

**3b. Missing Info Tracker (CÓMO funciona)**
- Servicio nuevo que corre cada vez que se actualiza un deal
- Proceso paso a paso:
  1. Escanea el Material Profile: ¿qué campos están vacíos o con baja confianza?
  2. Cruza con requisitos de Outlets conocidos (ej: Fuel Blender requiere Water < 5%)
  3. Genera lista de blockers priorizados:
     - 🔴 DATA: "Water Content test faltante → bloquea pricing"
     - 🔴 OPS: "Falta Umbrella Insurance $3M → bloquea transporte"
     - 🟡 LOGISTICS: "Placards no identificados"
  4. Para cada blocker sugiere acción: "Draft email a EHS" o "Subir documento"
- Por qué es clave: Convierte "no sé qué me falta" en "estos son los 3 items que bloquean este deal"

**3c. Compliance Copilot (CÓMO funciona — EN DETALLE)**
- **NO es un LLM que "busca en internet"**. Fase 1 es determinista:
  1. Lookup tables internas: CAS number + proceso de generación + estado → código RCRA sugerido
     - Ejemplo: CAS 78-93-3 (MEK) + "parts cleaning" + Texas = F003 (Spent non-halogenated solvent)
  2. Reglas por estado: "Si state=California → flag DTSC form adicional requerido"
  3. Preguntas faltantes: Si no sabemos la ruta de salida (reuse vs disposal), la IA pregunta porque cambia la clasificación
  4. Output: Advisory con confidence score — "F003 Probable (85%)"
- **NUNCA decide solo** — siempre es "Advisory", un Senior lo valida en Review Gate
- **Fase 2 (futuro)**: Integrar RAG sobre documentos regulatorios oficiales (EPA, RCRA, DOT)
  - Subagente que indexa documentación regulatoria federal y estatal
  - Puede responder: "¿Qué form necesito para transportar Class 3 Flammable en California?"
  - Pero esto NO es Fase 1 — Fase 1 son lookup tables simples
- **Para transporte**: DOT lookup — UN number + hazard class + packing group
  - Ejemplo: MEK → UN1193, Class 3 Flammable, PG II → requiere placards de flammable
- Por qué lookup tables primero: Son predecibles, auditables, y no alucinan. LLM viene después cuando tengamos datos para evaluar accuracy.

**3d. Pricing Intelligence (CÓMO funciona)**
- Outcome Ledger = tabla de deals cerrados con: material, región, calidad, precio, resultado
- Proceso paso a paso:
  1. Al cerrar un deal, es OBLIGATORIO llenar: precio final, outlet, lab spend, won/lost
  2. Estos datos alimentan la base
  3. Cuando un nuevo deal similar llega, el sistema muestra: "Deals similares: MEK, TX, Med Quality → $0.10-$0.14/lb"
  4. También muestra lab ROI: "Lab test de $150 fue decisivo en 3 deals"
- **Día 1: vacío**. No hay magia al inicio — se construye con cada deal que cierra
- Por qué es obligatorio: Si es opcional nadie lo llena. Si es obligatorio, en 6 meses tienes pricing intelligence real.

### 4. El Deal Workspace — Wireframe (~80 lines)
ASCII wireframe del workspace completo mostrando:
- Header: Status del deal + Completeness bar + Criticality flag
- 5 tabs: Material Profile | Evidence & Gaps | Pricing | Compliance | Passport
- Intelligence Panel (sidebar derecho): Missing Info + Compliance flags + Pricing refs
- Botones de acción: Request Review, Generate Passport

### 5. El Deal Board — Wireframe (~40 lines)
ASCII wireframe del board mostrando:
- Columnas por status: Discovery → Assessment → Review Gate → Passport Ready → Matching → Closed
- Cards con: nombre del material, completeness %, blocker count, días abierto

### 6. Review Gate y Material Passport — Wireframe (~40 lines)
- Review Gate: Senior ve checklist de compliance + route + pricing, approve/reject
- Material Passport: 8 secciones del documento final que va al buyer

### 7. Qué Cambia en el Código (~50 lines)
Tabla concisa: archivo actual → qué le pasa → detalle
Solo los cambios más importantes, no cada archivo.

### 8. Roadmap por Fases (~50 lines)
4 fases claras, cada una con:
- Qué entrega
- Por qué en este orden
- Cómo se valida

**Fase 1 (w1-2): Foundation**
- Passport schema, Outcome Ledger, status migration, tab restructure
- Por qué primero: Sin el nuevo schema no se puede construir nada encima

**Fase 2 (w3-4): Document Intelligence**
- Evidence Graph, source linking, confidence scores
- Por qué segundo: Es la base de datos que alimenta todo lo demás

**Fase 3 (w5-6): Intelligence Layer**
- Missing Info Tracker, Compliance Copilot v1, Review Gate
- Por qué tercero: Ya con datos estructurados, ahora podemos detectar gaps y validar

**Fase 4 (w7-8): Pricing + Observability**
- Pricing Intelligence, telemetry, e-Manifest data mapping
- Por qué último: Necesita Outcome Ledger con datos reales para ser útil

### 9. Glosario (~25 lines)
Términos de la industria usados en el documento.

### 10. Preguntas Abiertas (~20 lines)
Decisiones pendientes que el equipo debe tomar.

## Source Files

| File | Purpose |
|---|---|
| `docs/insights-product-process-interview.md` | Russ quotes exactas |
| `docs/summary-meeting.md` | Decisiones del team meeting |
| `docs/agent-context-brief.md` | Pivot rationale |
| `docs/plans/2026-03-03-waste-deal-os-full-product-design.md` | Full product design |
| `docs/plans/2026-03-03-waste-deal-os-product-vision.md` | Product vision |
| `docs/plans/2026-03-03-waste-deal-os-wireframes.md` | Detailed wireframes |
| `frontend/components/features/projects/project-tabs.tsx` | Current tabs |
| `frontend/components/features/dashboard/components/project-pipeline.tsx` | Current pipeline |
| `frontend/lib/project-status.ts` | Current status flow |
| `backend/app/models/project.py` | Current Project model |
| `backend/app/models/proposal_output.py` | Current Proposal schema |

## Verification

1. ~500 lines, readable in one sitting
2. Every decision traced to Russ quote or team meeting
3. Compliance Copilot explained step-by-step with examples
4. Each phase of roadmap explains WHY in that order
5. ASCII wireframes show the new vision clearly
6. Glossary covers all industry terms
