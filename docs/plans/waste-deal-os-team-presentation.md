# Waste Deal OS — Plan de Producto para el Equipo

**Fecha:** 2026-03-04 | **Lectura:** ~25 min | **Idioma:** Español (términos técnicos en inglés)

---

## 1. La Nueva Visión

**En una frase:** Pasamos de "generador de propuestas con IA" a **sistema operativo de deals** para waste brokers.

**Tesis central:** La IA no inventa — estructura, enriquece y aprende del trabajo del experto.

**De dónde salió esta tesis:**
- **Entrevista con Russ** (20+ años en waste brokerage): Rechazó nuestra propuesta original de "IA genera ideas de negocio" porque *"los sales engineers ya saben qué hacer con un material. Lo difícil es convertir un material ambiguo en datos estructurados."*
- **Deep research** (`deep-research-report.md`): La capa "AI feature" se está comoditizando rápido. Inversores y compradores B2B filtran "thin wrappers" y favorecen plataformas verticales con datos propietarios y capacidad de ejecutar acciones. ChatGPT/Claude/Gemini replicarán la extracción genérica en 12-18 meses. El moat no puede vivir en "UI + prompts + extracción".
- **Meeting del equipo** (Jose, Ricardo, Guillermo): *"El producto debe ser prácticamente descartado para empezar desde cero. El primer módulo es Discovery."*

**Qué construimos vs qué NO construimos:**
- **SÍ:** Un workspace inteligente donde la IA estructura el caos del campo (fotos, voz, PDFs) y trackea qué falta para cerrar el deal
- **NO:** Un copilot que sugiere ideas de negocio (eso es commodity — ChatGPT lo hace)
- **NO (todavía):** Un marketplace de compradores (eso compite con nuestros propios clientes, los brokers)

---

## 2. Los Problemas — De Dónde Salió Cada Decisión

### Problema 1: "Esperar información domina el funnel"

**Fuente:** Entrevista con Russ (`insights-product-process-interview.md`, sección 2.2)

> *"Esperar información domina el funnel. El contacto de EHS tiene que preguntarle a alguien más y el deal se congela."*

**Qué significa:** El 80% del tiempo de un deal no es trabajo técnico — es perseguir datos. El field agent manda un email pidiendo el Water Content test, espera 5 días, manda otro, espera 3 más. El deal se congela.

**Solución: Missing Info Tracker**
- El sistema detecta qué campos están vacíos o con baja confianza
- Cruza con requerimientos de outlets potenciales
- Genera lista priorizada de blockers con acciones sugeridas
- **Además:** un LLM genera drafts de emails de follow-up y preguntas inteligentes contextuales

**Por qué esta solución:** Un tracker automático convierte "no sé qué me falta" en "me faltan estos 3 datos y aquí están las acciones". Nuestro deep research confirma que "tracking de info faltante + gates = switching cost" — se vuelve difícil de reemplazar.

**Por qué usar LLM para preguntas y no solo reglas:** Las reglas detectan "campo vacío". Pero un LLM viendo el contexto completo puede preguntar: *"Mencionaste que es de un proceso de limpieza de partes — ¿se usó solvente clorado? Eso cambiaría la clasificación de F003 a F001."* Esto es exactamente lo que Russ pidió: *"preguntas pertinentes que no sabías preguntar"* (sección 8 de la entrevista).

**Ejemplo:**
```
🔴 DATA: Water Content test faltante
   → Bloquea pricing con Fuel Blender Alpha (requiere <5%)
   → [Draft email a EHS generado por IA]

🔴 OPS: Umbrella Insurance $3M faltante
   → Transporter bloqueado sin seguro
   → [Subir documento de póliza]

🟡 AI QUESTION: ¿Se usó solvente clorado en el proceso?
   → Si sí, la clasificación cambia de F003 a F001
   → Esto afecta qué outlets pueden aceptarlo
```

---

### Problema 2: "No existe enciclopedia de materiales"

**Fuente:** Entrevista con Russ (sección 9, P0)

> *"No existe enciclopedia. Dependen de historia, de memoria — llama a alguien que movió esto hace 4.5 años."*

**Solución: Evidence Graph + Outcome Ledger**

**Evidence Graph** — Cada dato extraído por IA queda vinculado a su fuente exacta:
```
flash_point: 16°F
  └─ fuente: SDS_Solvent_2024.pdf, página 4
  └─ extraído por: Document Analysis Agent
  └─ confianza: 95%
  └─ fecha: 2026-10-10
```

**Decisión arquitectónica importante:** El Evidence Graph vive en su **propia tabla** (`EvidenceNode`), NO como extensión de `IntakeSuggestion`. ¿Por qué? IntakeSuggestion es transient — el usuario acepta o rechaza y desaparece. El Evidence Graph es el system of record del deal. Necesita ser append-only e inmutable para mantener el audit trail incluso después de purgar working data.

**Outcome Ledger** — Registro obligatorio al cerrar cada deal:
- Material type, región, calidad, precio final, outlet, lab spend, won/lost
- Cada deal cerrado alimenta Pricing Intelligence para futuros deals

**Por qué obligatorio:** Si es opcional, nadie lo llena (Russ: "el pricing es IP interna, depende de memoria"). Si es obligatorio, en 6 meses tienes datos que ningún competidor puede copiar.

**Estrategia de cold-start:** NO empezamos vacíos. Primero importamos el historial de Russ (CSV, emails, deals antiguos) usando el Bulk Import Agent que ya tenemos. Demostramos valor antes de pedir esfuerzo nuevo.

**De dónde salió la idea del Outcome Ledger:** Deep research (`deep-research-report.md`): *"Moat por datos operativos: dataset propietario de outcomes — esto es lo que más cuesta copiar."* Casos análogos: Tractable (insurance claims con outcomes), Augury (industrial AI con telemetría + outcomes).

---

### Problema 3: "La propuesta es trivial; lo difícil es el assessment"

**Fuente:** Entrevista con Russ (sección 13)

> *"La propuesta es trivial; lo difícil es convertir un material ambiguo en un movimiento compliant y rentable sin perderse en el discovery."*

**Fuente:** Meeting del equipo

> *"El primer módulo se llamará Discovery. Su propósito es que la IA ayude al sales agent a descubrir y recopilar toda la información necesaria. Las notas de voz serán fundamentales. El proceso debe finalizar con un formato estructurado y claridad sobre qué información falta."*

**Solución: Pivot de "Proposal Generator" a "Deal Workspace"**
- 80% del esfuerzo va a captura y estructuración de datos
- 20% a generar el output (Material Passport)
- El ingeniero define la estrategia (él sabe), la IA estructura y profesionaliza

**Material Passport — De dónde salió:**
- **Regulación EU (confirmado marzo 2026):** ESPR (Regulation 2024/1781) es ley. El registry DPP se activa julio 2026. Battery Passport obligatorio desde Feb 18, 2027. Los pasaportes digitales se están volviendo infraestructura obligatoria por categoría de producto.
- **Investigación de mercado (confirmado):** En waste brokerage, nadie usa el término "Material Passport" todavía — es territorio libre. En construcción existe (Madaster). En waste trading emergente usan "Digital Waste Passport" (CircularPass) y "Digital Product Passport" (WasteTrade con GS1/EPCIS). Nosotros reclamamos el término para waste brokerage.
- **Entrevista con Russ:** Los buyers necesitan *"especificaciones técnicas, evidencia, compliance, métricas ambientales — no ideas de negocio."*
- **Oportunidad:** ISRI/ReMA Specifications Circular (estándar de la industria para trading de scrap, actualizado enero 2026) se publica como PDF. Si codificamos estas specs como datos estructurados en el passport, es un diferenciador que nadie tiene.

**NOTA: El Material Passport aún necesita validación con buyers.** No hemos entrevistado compradores reales. Antes de invertir mucho en el output, necesitamos confirmar: ¿el buyer quiere este formato? ¿O prefiere un email con lab report y precio?

---

### Problema 4: Riesgo legal de datos "discoverable"

**Fuente:** Entrevista con Russ (sección 6)

> *"Documentar de más puede crear exposición legal. En auditorías, todo lo que guardaste es 'discoverable'."*

**Solución: Data Governance con 2 buckets**

| | Working Data | Record Data |
|---|---|---|
| **Contiene** | Notas de voz crudas, fotos descartadas, borradores, OCR descartado | Passport aprobado, docs finales, Outcome Ledger |
| **Retención** | 90 días post-cierre → purge automático | 3-7 años (configurable) |
| **Acceso** | Solo agents y managers | Exportable para auditores y QA del buyer |

**Gap identificado en la revisión:** Al purgar Working Data, ¿qué pasa con los EvidenceNodes que apuntan a un archivo purgado? **Solución:** Al mover un nodo de Working → Record, hacer snapshot del fragmento relevante. El audio de 10 min se purga; los 15 segundos transcritos que produjeron el dato se conservan como texto.

---

### Problema 5: Sin historial de pricing → sin leverage

**Fuente:** Entrevista con Russ (sección 9, P0)

> *"El pricing es IP interna. Comparativas vs disposal, conocimiento de outlets — depende de historia y memoria."*

**Fuente:** Deep research

> *"Pricing intelligence con histórico + spreads tiene riesgo bajo-medio de comoditización. Es 'alpha' del broker."*

**Solución: Outcome Ledger → Pricing Intelligence**

Este es nuestro **moat más fuerte**. En 12 meses, datos de pricing propietarios que ningún competidor puede copiar. El deep research identificó esto como patrón de las startups verticales que logran PMF: Augury (telemetría + outcomes), BuildOps (workflow OS + switching costs), Tractable (CV + outcomes).

---

## 3. Los 4 Motores de IA — CÓMO Funcionan

### 3a. Document Intelligence — Extrae datos del caos

**Qué reutilizamos:** Los 5 agentes que ya tenemos (Image, Document, Notes, Bulk, Voice). No se tocan.

**Qué es nuevo:** El **Evidence Graph** — cada dato extraído incluye metadata de procedencia.

**Cómo funciona:**
1. Field agent sube SDS → Document Agent extrae composición, flash point, hazards
2. Sube fotos → Image Agent clasifica tipo, calidad, condición
3. Graba voice note → Voice Agent transcribe y extrae datos
4. **Cada dato → EvidenceNode** con: valor, fuente, página, extractor, confianza, fecha
5. Si dos fuentes dan datos contradictorios (SDS dice "MEK 90%", voice note dice "60% MEK"), el sistema lo detecta y pide resolución humana

**Modelo de datos del EvidenceNode:**
```
EvidenceNode (tabla propia, append-only):
  - deal_id, field_path ("flash_point")
  - value ("16°F"), confidence (0.95)
  - source_type: SDS | voice | image | manual | senior_correction
  - source_ref: document_id + page
  - extracted_by, validated_by, created_at
  - superseded_by (FK → versionado)
```

---

### 3b. Missing Info Tracker — Detecta qué falta

**Cómo funciona:**
1. Escanea el Material Profile: campos vacíos + baja confianza
2. Cruza con requisitos de outlets (necesita Outlet Database mínima)
3. Genera blockers priorizados: 🔴 bloquea deal, 🟡 necesario, 🟢 nice-to-have
4. **LLM genera:** drafts de emails, preguntas contextuales inteligentes, acciones sugeridas

**Por qué LLM aquí SÍ:** Generar preguntas y drafts es bajo riesgo (no es una clasificación legal). Y es exactamente lo que Russ pidió: *"preguntas pertinentes que no sabías preguntar"*.

**Patrón de UI:** Extiende el **Intake Panel** que ya tenemos (sidebar con Apply/Reject). Misma mecánica, nuevo contenido.

---

### 3c. Compliance Copilot — Asistente regulatorio

**IMPORTANTE: NO es un LLM que "busca en internet". Es determinístico.**

**Por qué lookup tables y no LLM:** En regulación, una alucinación puede ser una multa de $70,000 por violación. Las lookup tables son predecibles, auditables, y no alucinan. El deep research confirma: *"compliance suggestions tiene riesgo medio de comoditización si se basa en reglas + versionado + evidencia"*.

**Cómo funciona en Fase 1 (lookup tables):**
1. **RCRA lookup:** CAS number + proceso + estado → código sugerido
   - Ejemplo: CAS 78-93-3 (MEK) + "parts cleaning" + Texas = F003
   - Scope MVP: F001-F005 (solventes listed) + characteristic hazard thresholds (flash point < 140°F, pH)
2. **State flags:** "Si California → DTSC form adicional"
3. **DOT transport:** Material → UN number + hazard class + packing group
   - Ejemplo: MEK → UN1193, Class 3 Flammable, PG II → placards de Flammable
4. **Output: SIEMPRE "Advisory"** — un Senior lo valida en Review Gate

**Limitaciones honestas del MVP:** Las lookup tables cubren ~60% de los top 20 materiales puros. Para mixtures (60% MEK + 25% toluene + 15% unknown), el sistema dirá "Clasificación manual requerida — aquí están las preguntas que hacer". Esto ya es valioso — ahorrar 30 min por deal en los casos claros.

**CorrectionEvent — El training data más valioso:**
Cuando el Senior corrige F003 → F005 en el Review Gate, esa corrección se captura estructuradamente:
```
CorrectionEvent:
  - evidence_node_id, original_value ("F003"), corrected_value ("F005")
  - correction_reason: "Material contains chlorinated solvent component"
  - correction_type: WRONG_CLASSIFICATION
  - deal_context: {material_family: "solvent", state: "TX", process: "degreasing"}
```
En 6 meses, estas correcciones mejoran el Copilot y eventualmente construyen un Risk-of-Rejection score con datos reales.

**Fase 2 (futuro):** RAG sobre documentación regulatoria oficial (EPA, RCRA, DOT). Un subagente que indexa docs regulatorios y responde preguntas como "¿Qué form necesito para Class 3 Flammable en California?" con cita a la fuente exacta.

---

### 3d. Pricing Intelligence — Historial de precios

**Cómo funciona:**
1. Outcome Ledger acumula datos de deals cerrados
2. Cuando llega un deal similar, muestra matches: "MEK, TX, Med Quality → $0.10-$0.14/lb"
3. También muestra lab ROI: "Karl Fischer ($150) fue decisivo en 3 deals similares"

**Día 1: Importación retroactiva.** No pedimos a Russ que llene deals nuevos primero. Importamos su historial (CSV, deals antiguos) con el Bulk Import Agent para demostrar valor antes de pedir esfuerzo.

**Variable importante identificada en la revisión de dominio:** El pricing de waste no es estático — depende del precio del commodity virgen, costos de transporte, volumen, y temporada. El Outcome Ledger debe capturar también el benchmark reference al momento del cierre para contextualizar el histórico.

---

## 4. El Deal Workspace — Wireframe

```text
============================================================================================
WASTE DEAL OS  |  Deal Board  |  [ Deal: Tanque Solvente - Texas ]              [Mike]
============================================================================================
[< Volver]   Status: ASSESSMENT  |  Completeness: [██████░░░░] 62%  |  14 dias abierto
--------------------------------------------------------------------------------------------
[!! PRODUCTION CRITICAL] -> Requiere 2+ Outlets (Primary + Backup)
--------------------------------------------------------------------------------------------

  MATERIAL PROFILE | EVIDENCE & GAPS | PRICING | COMPLIANCE | PASSPORT
  =====================================================================

  Material Identity                    |  INTELLIGENCE PANEL
  ─────────────────                    |  ─────────────────────────────
  Family: Spent Solvent [AI]           |  MISSING INFO TRACKER
  Process: Parts cleaning [SDS pg.2]   |  [!] Water Content faltante
  Legal Status: Discarded              |      -> Bloquea pricing
                                       |      -> [Draft email generado]
  Technical Specs                      |  [!] Insurance $3M faltante
  ───────────────                      |      -> Transporter bloqueado
  Primary: MEK (90%) [AI]             |
  Flash point: 16F [SDS pg.4]         |  AI QUESTION
  Water content: [ VACIO ]            |  "Se uso solvente clorado en
  Volume: ~4 Drums/mo [Voice]         |   el proceso? Cambiaria la
                                       |   clasificacion de F003 a F001"
  Logistics                            |
  ─────────                            |  COMPLIANCE COPILOT (Advisory)
  [ ] Placards (Class 3 Flammable)    |  [F003 Probable, 85%]
  [ ] Equipment (Vacuum Truck)        |  [CA Flag] DTSC form adicional
  [x] Loading (Dock available)        |
                                       |  PRICING INTELLIGENCE
  Files                                |  Deals similares (MEK, TX):
  ─────                                |  - #147: $0.12/lb (Won)
  [SDS_2024.pdf] Extracted            |  - #203: $0.10/lb (Won)
  [Voice_Monday.mp3] Transcribed      |
============================================================================================
[ Cancelar ]              [ Ver Outlets ]              [ Solicitar Review Senior ]
============================================================================================
```

**Qué cambia vs el Project Workspace actual:**
- **Tabs:** 4 → 5 (Overview se elimina, se agregan Pricing y Compliance)
- **Intelligence Panel:** Evoluciona del Intake Panel actual con 4 motores
- **Completeness Score:** Nuevo — barra visible con % buyer-ready
- **AI Questions:** Nuevo — preguntas contextuales generadas por LLM

---

## 5. El Deal Board — Wireframe

```text
============================================================================================
DEAL BOARD                                                          [Org: ACME Waste]
============================================================================================

  DISCOVERY (3)        ASSESSMENT (5)       REVIEW (2)       CLOSED (12)
  ────────────         ──────────────       ──────────       ──────────
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  Won: 8
  │ Aceite Motor │    │ Tanque MEK   │    │ Glycol BMW   │  Lost: 3
  │ ████░░ 40%   │    │ ██████░░ 62% │    │ █████████ 95%│  Pending: 1
  │ 0 blockers   │    │ 3 blockers   │    │ Awaiting Steve│
  │ 2 dias       │    │ 14 dias      │    └──────────────┘
  └──────────────┘    ├──────────────┤
  ┌──────────────┐    │ Acid Bath    │
  │ Madera Pallet│    │ █████░░░ 55% │
  │ ██░░░░ 20%   │    │ 2 blockers   │
  │ 1 dia        │    │ !! CRITICAL  │
  └──────────────┘    └──────────────┘
============================================================================================
```

**Qué cambia vs el Dashboard actual:**
- **Pipeline actual:** 4 columnas (Preparation → Analysis → Ready → Completed)
- **Deal Board:** Columnas por lifecycle (Discovery → Assessment → Review → Closed)
- **Cards:** Ahora muestran completeness %, blocker count, días abierto, criticality flag

---

## 6. Review Gate y Material Passport

### Review Gate
```text
============================================================================================
SENIOR REVIEW GATE  [Steve (Manager)]
============================================================================================
Mike solicita aprobacion para generar Material Passport.

[x] COMPLIANCE: F003 Sugerido (Advisory, 85%)
    -> [ Aprobar ] [ Corregir codigo ]    ← Correccion crea CorrectionEvent

[x] RUTA & PRICING: Fuel Blender $0.10/lb (Primary) + Recycler $0.08/lb (Backup)
    -> [ Aprobar ] [ Comentar ]

[x] EVIDENCIA: 3 docs vinculados, todos Fresh
    -> [ Aprobar ] [ Pedir mas evidencia ]

-> [ APROBAR & GENERAR MATERIAL PASSPORT ]
============================================================================================
```

### Material Passport (Output)
```text
============================================================================================
MATERIAL PASSPORT                                    [ PDF ] [ e-Manifest Data Mapping ]
============================================================================================
ID: WP-2026-8842 | Validado por: Steve M. | Oct 24, 2026

MATERIAL IDENTITY           | TECHNICAL SPECS
Classification: Spent MEK   | MEK: ~90%    | Density: 0.81 g/cm3
Origin: Texas, USA           | Water: 1.8%  | Flash Point: 16F

ENVIRONMENTAL IMPACT (ESG)  | COMPLIANCE & SAFETY
CO2 Avoided: 14.2 t/year    | RCRA: F003
SDG: Goal 12                | DOT: Class 3, UN1193, PG II

EVIDENCE PACK
1. [Lab_Oct.pdf] Fresh (14d) | Source: Water Content
2. [Tank.jpg] Visual proof   | Inspected: Mike T.
============================================================================================
```

**e-Manifest Data Mapping (verificado marzo 2026):** EPA tiene API REST pública con schema JSON oficial ([github.com/USEPA/e-manifest](https://github.com/USEPA/e-manifest)). Fase 1: exportamos JSON mapeado al schema EPA para eliminar data-entry manual. Fase futura: submission directa vía API (soporta "Quicker Sign" para firma electrónica desde apps terceras). Dato clave: EPA cobra $25/manifest en papel vs $5 electrónico, y la regla final para eliminar papel completamente se espera en 2027.

---

## 7. Qué Se Mantiene del Código Actual

- **Jerarquía:** Org → Company → Location → Deal (antes Project)
- **6 roles** y 56 permisos en `role_permissions.py`
- **5 agentes de IA:** Image, Document, Notes, Bulk, Voice — sin cambios
- **Patrón Apply/Reject** del Intake Panel
- **CRUD** de Companies, Locations, Waste Streams
- **Infraestructura:** File management + S3, rate limiting, background jobs, WeasyPrint

---

## 8. Roadmap por Fases

### FASE 1: Foundation + Missing Info (Semanas 1-4)

**Objetivo:** El field agent usa el workspace para trabajar deals reales. El sistema detecta qué falta y sugiere acciones.

**Por qué esto primero:** El Missing Info Tracker resuelve el pain P0 de Russ ("esperar información domina el funnel") y es demostrable en 5 minutos: "tu deal está al 62%, estos son tus 3 blockers".

| Qué | Detalle |
|---|---|
| **Missing Info Tracker** | Completeness score + blocker list + LLM genera preguntas inteligentes + draft emails |
| **EvidenceNode table** | Tabla propia append-only con source tracking (no extensión de IntakeSuggestion) |
| **CorrectionEvent model** | Captura correcciones del Senior como training data estructurado |
| **Nuevos statuses** | Discovery → Assessment → Review Gate → Passport Ready → Closed Won/Lost |
| **Tab restructure** | 4 tabs → 5 (Material Profile, Evidence & Gaps, Pricing, Compliance, Passport) |
| **Outlet Database v0** | Modelo mínimo: nombre, materiales aceptados, specs, región. Necesario para que el Tracker cruce gaps con requerimientos reales |
| **Outcome Ledger** | Model + formulario al cerrar deal. Importación retroactiva de historial de Russ primero |

**Validación (semana 3-4):**
- Russ trabaja 1 deal real en el sistema
- El completeness score refleja su evaluación real
- Importar 5+ deals históricos al Outcome Ledger
- Generar 1 Material Passport PDF y enviarlo a 1 buyer real por email (no portal — solo PDF)

### FASE 2: Document Intelligence + Passport (Semanas 5-8)

**Objetivo:** La IA no solo extrae datos — trackea frescura, detecta inconsistencias, y genera el Material Passport completo.

**Por qué segundo:** Con datos bien estructurados y con trazabilidad (Fase 1), ahora la extracción se enriquece y el passport se puede ensamblar.

| Qué | Detalle |
|---|---|
| **Document Freshness Engine** | Semáforo por tipo de doc (lab <6mo Fresh, SDS <3yr Fresh, etc.) |
| **Cross-Document Inconsistency Detector** | Comparador determinístico: SDS dice flash point 16°F, lab dice 18°F → flag |
| **Auto document type detection** | Clasificación antes de extracción |
| **Passport Agent** | Rewrite de `proposal_agent.py` prompt v3→v4: de "idea generator" a "passport assembler" |
| **PassportOutput schema** | Evolución de ProposalOutput con 8 secciones |
| **e-Manifest field mapping** | `passport_to_emanifest_fields()` — export function |
| **Data Governance v0** | Labeling Working/Record + snapshot al purgar + purge rules |

**Validación:**
- Subir 5 docs reales de Russ → freshness scoring coincide con evaluación del equipo
- Inconsistencies detectadas correctamente
- Material Passport feedback de 1 buyer real

### FASE 3: Intelligence Layer (Semanas 9-12)

**Objetivo:** Compliance Copilot, Review Gate formal, y Pricing Intelligence con datos reales.

| Qué | Detalle |
|---|---|
| **Compliance Copilot v1** | Lookup tables F001-F005 + characteristic thresholds + state flags (CA, TX, NY) + DOT |
| **Review Gate workflow** | Submit → review → approve → generate passport. Corrections → CorrectionEvent |
| **Pricing Intelligence v1** | Matching histórico desde Outcome Ledger + benchmark reference de commodity virgen |
| **Cost Normalizer** | Extracción de invoices + costo efectivo por lb (separa material value, transport cost, lab cost, margin) |
| **Lab Decision Engine v1** | Reglas por material + buyer requirements → "pedir Karl Fischer $150, NO pedir panel $1500" |

**Validación:**
- End-to-end: deal nuevo → passport → compartido con buyer. Medir tiempo vs proceso anterior
- Compliance advisory validado contra caso real
- Dashboard de métricas demuestra ROI

### FASE 4: Buyer Portal + Compliance Packs (Semanas 13-24)

| Qué | Cuándo | Por qué |
|---|---|---|
| Buyer Portal (link compartible + tracking) | Sem 13-18 | Buyer recibe passport por link, ve specs, deja requerimientos |
| SB253 Disclosure Pack | Sem 13-18 | Deadline **10 agosto 2026** (confirmado, no enjoined) — empezar ventas AHORA aunque el feature no exista |
| Compliance Copilot v2 (RAG regulatorio) | Sem 19-24 | Necesita CorrectionEvents para evaluar accuracy |
| Risk-of-Rejection Score | Sem 19-24 | Necesita outcomes + corrections acumulados |

### VISIÓN A LARGO PLAZO: De Tool → Plataforma → Red

La visión final del producto es ser la plataforma que conecta generators, brokers y buyers. Pero el **broker siempre está en el medio** — la plataforma lo profesionaliza, no lo reemplaza.

**Analogía:** Flexport no eliminó al freight forwarder — se convirtió en el freight forwarder con mejor software. Nosotros hacemos lo mismo: el broker con Waste Deal OS es más rápido, más profesional, y genera más confianza con sus buyers.

**La progresión:**

```
FASE 1-3 (ahora): TOOL
  El broker usa la plataforma para trabajar deals mas rapido.
  Valor: eficiencia interna.

FASE 4 (~6 meses): BUYER PORTAL
  El buyer recibe Material Passports por link.
  El broker controla que se comparte y con quien.
  Valor: switching costs (buyers se acostumbran al formato).

FASE 5 (~12 meses): NETWORK EFFECTS
  Con suficientes brokers y buyers, matching inteligente:
  "Este material coincide con lo que buscan estos 3 buyers."
  El broker DECIDE a quien contactar y negocia el precio.
  La plataforma sugiere, no ejecuta.

FASE 6 (largo plazo): GENERATOR PORTAL
  La fabrica sube su waste stream directamente.
  Llega como LEAD al broker, no al buyer.
  La plataforma es canal de leads cualificados.
```

**Principio clave:** La plataforma NUNCA desintermedia al broker. No publicamos precios abiertamente (la opacidad es parte del margen del broker). No conectamos generators con buyers directamente. El broker mantiene control sobre pricing, relación, y decisión de compartir.

**Fuente:** Deep research (`deep-research-report.md`): Flexport y Faire lograron network effects SIN desintermediar — Flexport potenciando al freight forwarder, Faire reduciendo riesgo para retailers. En waste brokerage, donde la calidad/riesgo/regulación son altos, la intermediación persiste porque agrega valor real.

---

## 9. Glosario

| Término | Qué es |
|---|---|
| **Generator** | Fábrica/planta que produce el waste |
| **Offtaker/Outlet** | Quien compra o recibe el material (recycler, fuel blender, TSDF) |
| **SDS** | Safety Data Sheet — ficha de seguridad del material |
| **RCRA** | Resource Conservation and Recovery Act — ley federal de waste |
| **F001-F005** | Códigos RCRA para solventes usados (listed waste) |
| **COA** | Certificate of Analysis — resultado de lab certificado |
| **BOL** | Bill of Lading — documento de transporte para productos |
| **e-Manifest** | Sistema electrónico EPA para trackear hazardous waste |
| **TSDF** | Treatment, Storage, and Disposal Facility |
| **DOT** | Department of Transportation — regula transporte hazmat |
| **CAS Number** | ID único de sustancias químicas (ej: 78-93-3 = MEK) |
| **Material Passport** | Nuestro output: dossier profesional buyer-ready |
| **Discovery Pack** | Vista interna del deal — datos en proceso para el broker |
| **Outcome Ledger** | Registro obligatorio al cerrar deal — alimenta pricing |
| **Evidence Graph** | Campo → fuente (documento + página + extractor + confianza) |
| **EHS** | Environment, Health & Safety — contacto típico en la fábrica |
| **SB253** | California Senate Bill 253 — deadline **10 de agosto 2026** (confirmado, regulaciones aprobadas Feb 26, 2026) |
| **PFAS** | Per- and polyfluoroalkyl substances — contaminantes emergentes |
| **EPR** | Extended Producer Responsibility — regulación en 7 estados |
| **MEK** | Methyl Ethyl Ketone — solvente industrial (ejemplo en este doc) |
| **DTSC** | Department of Toxic Substances Control (California) |
| **Class 3 Flammable** | Clasificación DOT para líquidos inflamables |
| **PG II** | Packing Group II — peligrosidad media en transporte DOT |
| **Karl Fischer** | Test de lab para water content (~$150) |
| **Placards** | Señalización obligatoria en vehículos con materiales peligrosos |
| **EvidenceNode** | Nuestro modelo: dato + fuente + confianza + extractor |
| **CorrectionEvent** | Nuestro modelo: corrección del Senior capturada como training data |

---

## 10. Preguntas Abiertas

**Producto:**
1. ¿El buyer quiere Material Passport en este formato o prefiere algo más simple? (Necesitamos entrevistar 3-5 buyers)
2. ¿Field agent necesita captura offline? (Plantas industriales tienen mala señal)
3. ¿El ICP debería ser brokers hazardous waste con exposición California (SB253)? Tienen más urgencia y willingness-to-pay

**Técnico:**
4. ¿Cuántas reglas RCRA + state flags para el MVP del Compliance Copilot? (Propuesta: F001-F005 + characteristic thresholds + 3 estados)
5. ¿Freshness thresholds por tipo de material o fijos? (Un lab report de 6 meses es Fresh para MEK estable pero Stale para wastewater variable)

**Validación:**
6. ¿Tenemos a Russ confirmado para usar el sistema en semana 3-4 con un deal real?
7. ¿Tenemos acceso a 1 buyer real para validar el formato del Material Passport?
8. ¿Podemos importar el historial de deals de Russ (CSV, emails) para seed del Outcome Ledger?

**Negocio:**
9. ¿El framing externo debería ser "Compliance OS" o "Deal OS"? Cambia quién responde el email de ventas
10. ¿Validar con 2-3 brokers más antes de comprometernos con el roadmap completo? (Riesgo de single-customer dependency)
