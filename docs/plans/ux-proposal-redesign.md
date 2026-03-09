---

# HOY vs. PROPUESTO — Componente por Componente

## 1. DASHBOARD (La primera pantalla que ve el usuario)

### HOY:
```
┌──────────────────────────────────────────────────────────┐
│  Welcome to Waste OS                                     │
│                                                          │
│  ┌─ Priority Waste Stream ───────────────────────────┐   │
│  │ "Cosma MEK" — In Preparation — 45% complete       │   │
│  │ [Complete Technical Sheet]                         │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Onboarding Checklist (si <3 proyectos) ──────────┐  │
│  │ ✅ Create company  ✅ Start waste stream            │  │
│  │ ⬜ Complete data 80%  ⬜ Generate proposal          │  │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Pipeline: Preparation(3) → Analysis(1) → Ready(2) → ✅ │
│                                                          │
│  Stats: 6 Active | 2 Ready | 72% Avg Progress           │
│                                                          │
│  Your Waste Streams:  [Search] [Filter: Company ▼]      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Card     │ │ Card     │ │ Card     │                  │
│  │ Grid     │ │ Grid     │ │ Grid     │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
└──────────────────────────────────────────────────────────┘
```

**Qué hace bien:**
- Pipeline visual (4 stages) da una overview rápida
- Onboarding checklist guía usuarios nuevos
- Priority waste stream destaca lo más urgente

**Qué NO resuelve:**
- No muestra POR QUÉ un deal está bloqueado
- No hay concepto de "follow-ups pendientes" o "waiting for info"
- Grid de cards es flat — todos los deals se ven iguales, no hay urgencia visual
- Statuses son sobre el PROCESO INTERNO (In Preparation, Generating Proposal) no sobre el ESTADO DEL DEAL en el mundo real

### PROPUESTO — Deal Board:
```
┌──────────────────────────────────────────────────────────┐
│  MY DEALS                                    [+ New]     │
│                                                          │
│  🔴 NEEDS ATTENTION (3)     ← deals con blockers        │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ Cosma — MEK    │ │ BMW — Glycol   │ │ Apex — Sludge│ │
│  │ 67% ready      │ │ 45% ready      │ │ 23% ready    │ │
│  │ ⏳ Water content│ │ ⏳ NDA (8 days)│ │ No docs yet  │ │
│  └────────────────┘ └────────────────┘ └──────────────┘ │
│                                                          │
│  🟡 IN PROGRESS (4)         ← deals avanzando           │
│  ┌────────────────┐ ┌────────────────┐ ...              │
│  │ Dow — Acetone  │ │ BASF — Resin   │                  │
│  │ 82% ready      │ │ In Review      │                  │
│  └────────────────┘ └────────────────┘                  │
│                                                          │
│  🟢 BUYER READY (2)         ← listos para compartir     │
│                                                          │
│  ⏰ FOLLOW-UPS OVERDUE                                  │
│  • Cosma — Maria re: water content (17 days overdue)    │
└──────────────────────────────────────────────────────────┘
```

### Qué cambia concretamente:

| Aspecto | HOY | PROPUESTO |
|---------|-----|-----------|
| **Agrupación** | Flat grid, filter por status | Agrupado por estado de acción (needs attention / in progress / buyer ready / closed) |
| **Statuses** | 6 internos (In Preparation, Generating, Ready, In Development, Completed, On Hold) | ~7 orientados al deal real (Discovery, Enriching, Blocked, In Review, Buyer Ready, Won, Lost) |
| **Blockers visibles** | No existen | Cada card muestra el blocker principal |
| **Follow-ups** | No existen | Sección dedicada con overdue tracking |
| **Onboarding** | Checklist para nuevos | Se mantiene, pero desaparece después de 3 deals |
| **Pipeline visual** | Funnel 4-stage | Se reemplaza por el board agrupado (que ES el pipeline) |
| **Stats** | Active / Ready / Avg Progress | Won/Lost this month, revenue, avg cycle time |

**Qué se QUITA:**
- Pipeline funnel (redundante con el board)
- Stats genéricos de "average progress" (no accionable)
- "Priority Waste Stream" hero (el board ya prioriza visualmente)

**Qué se MANTIENE:**
- Search + filters
- Card grid responsive
- Onboarding checklist (para nuevos)

**Qué se AÑADE:**
- Agrupación por acción necesaria
- Blocker principal visible en cada card
- Follow-ups tracker
- Closed deals summary (won/lost/revenue)

`★ Insight ─────────────────────────────────────`
El cambio más importante del dashboard no es visual — es **semántico**. Hoy los statuses describen dónde está el proyecto en tu pipeline interno. El propuesto describe dónde está el deal en la REALIDAD. "In Preparation" no dice nada útil. "Blocked: waiting on water content from Maria (17 days)" dice exactamente qué hacer next. Esto es lo que Russ pidió: "the agent loses track between 10+ deals."
`─────────────────────────────────────────────────`

---

## 2. PROJECT WORKSPACE (La pantalla donde se trabaja el deal)

### HOY — 4 tabs:

```
┌──────────────────────────────────────────────────────────┐
│  ← Dashboard    Cosma MEK Solvent    [In Preparation]    │
│  Progress: ████████░░░░ 45%                              │
│  "The more complete your data, the more accurate..."     │
│                                                          │
│  ┌──────────┬──────────────┬────────┬───────────┐        │
│  │ Overview │ Questionnaire│ Files  │ Proposals │        │
│  └──────────┴──────────────┴────────┴───────────┘        │
│                                                          │
│  OVERVIEW:                                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ 45%    │ │ 2      │ │ Cosma  │ │ Houston│            │
│  │ Data   │ │Proposal│ │ Client │ │Location│            │
│  └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                          │
│  Next Step: [Complete Technical Sheet] (need 50%)        │
│                                                          │
│  QUESTIONNAIRE (tab 2):                                  │
│  ┌─────────────────────────┬──────────────────────┐      │
│  │ Technical Sections      │ AI INTAKE PANEL      │      │
│  │ (form fields grouped)   │ (right sidebar)      │      │
│  │                         │ ┌──────────────────┐ │      │
│  │ ▸ Waste Management      │ │ 4 AI Suggestions │ │      │
│  │ ▸ Material Properties   │ │ [Apply] [Skip]   │ │      │
│  │ ▸ Process Details       │ │                  │ │      │
│  │ ▸ Logistics             │ │ Quick Upload     │ │      │
│  │                         │ │ [Drop files]     │ │      │
│  │                         │ │                  │ │      │
│  │                         │ │ Notes            │ │      │
│  │                         │ │ [Free text...]   │ │      │
│  │                         │ │ [Analyze]        │ │      │
│  └─────────────────────────┴──────────────────────┘      │
│                                                          │
│  FILES (tab 3):                                          │
│  Grid/list of uploaded files with preview modal          │
│                                                          │
│  PROPOSALS (tab 4):                                      │
│  "Need 50% to generate" or list of generated proposals   │
└──────────────────────────────────────────────────────────┘
```

### PROPUESTO — 5 tabs (evolución, no rewrite):

```
┌──────────────────────────────────────────────────────────┐
│  ← Deals    Cosma — MEK Spent Solvent        [Ready: 67%]│
│                                                          │
│  ┌──────────┬──────────┬─────────┬──────────┬──────────┐ │
│  │ Material │ Evidence │ Pricing │ Compli-  │ Passport │ │
│  │ Profile  │ & Gaps   │         │ ance     │          │ │
│  └──────────┴──────────┴─────────┴──────────┴──────────┘ │
│                                                          │
│  ┌─── LEFT: DEAL DATA ──────────┬── RIGHT: AI PANEL ──┐ │
│  │                               │                      │ │
│  │  (contenido cambia por tab)   │  ⚡ 4 suggestions    │ │
│  │                               │  [Apply] [Edit]      │ │
│  │                               │  [Reject]            │ │
│  │                               │                      │ │
│  │                               │  Quick Upload        │ │
│  │                               │  [Drop files]        │ │
│  │                               │                      │ │
│  │                               │  Notes               │ │
│  │                               │  [Free text...]      │ │
│  └───────────────────────────────┴──────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Tab por tab — qué cambia:

#### Tab 1: OVERVIEW → **MATERIAL PROFILE**

| HOY (Overview) | PROPUESTO (Material Profile) |
|---|---|
| 4 stat cards (data %, proposals, client, location) | Structured material identity (name, family, process, form, volume, composition) |
| "Next step" guidance card | Cada campo muestra su ORIGEN: `[AI 🎤]` `[SDS 📄]` `[Manual]` `[⚠ GAP]` |
| Project description | Evidence bar: "3 photos, 1 SDS, 1 voice — 70% coverage" |
| Passive — solo muestra stats | Activo — ES el formulario principal (reemplaza el questionnaire) |

**Qué pasa con el Questionnaire tab?** Se FUSIONA con Material Profile. Hoy el questionnaire es un form genérico con secciones expandibles. La propuesta es que Material Profile sea un form inteligente donde los campos relevantes aparecen según el material family (solvents muestran "water content", metals muestran "alloy composition"). Esto ya es posible con el JSONB flexible actual.

`★ Insight ─────────────────────────────────────`
El questionnaire actual tiene un problema de diseño: es un formulario genérico que muestra TODOS los campos posibles. Un solvente no necesita "alloy composition" y un metal no necesita "flash point". El cambio a Material Profile con campos dinámicos por material family reduce la carga cognitiva del field agent. La infraestructura de JSONB + field catalog ya soporta esto — es un cambio de frontend, no de backend.
`─────────────────────────────────────────────────`

#### Tab 2: FILES → **EVIDENCE & GAPS** (el cambio más grande)

| HOY (Files) | PROPUESTO (Evidence & Gaps) |
|---|---|
| File browser (grid/list, search, filter by category) | **Blocker Board** arriba: qué falta y qué bloquea el deal |
| Preview modal con AI analysis | **Completeness score** con pesos por criticality |
| Upload dropzone | Follow-up generator: "Maria no respondió en 17 días — [Generate email]" |
| Solo muestra archivos | **Evidence timeline**: docs con freshness badges (🟢 <1yr, 🟡 1-3yr, 🔴 >3yr) |
| No hay concepto de "qué falta" | Alternative unblock paths: "No density? Calculate from dimensions" |

**Qué pasa con el file browser?** No desaparece — se integra DENTRO de Evidence & Gaps como la sección "Evidence Pack" en la parte inferior. Los archivos siguen ahí, pero el contexto cambia: no son "archivos del proyecto" sino "evidencia del deal" con metadata de freshness y relevancia.

**Esto es NUEVO al 100%:**
- `MissingInfoService` (backend): calcula completeness score por material family
- `BlockerBoard` (frontend): muestra gaps priorizados con actions
- Follow-up email generation (usa el notes analysis agent adaptado)
- Freshness badges por documento
- Alternative unblock suggestions

#### Tab 3: (no existía) → **PRICING** (nuevo)

| HOY | PROPUESTO (Pricing) |
|---|---|
| No existe | Historical matching: "3 deals similares de MEK en TX" |
| El pricing vive solo dentro del Proposal output | Range, median, individual deals referenciados |
| No hay cost normalizer | Cost Normalizer: invoices → effective $/lb (hidden fees exposed) |
| No hay outcome tracking | **Outcome Ledger**: al cerrar deal, registrar price/buyer/result (obligatorio) |

**Esto depende de:** `DealOutcome` model (nuevo), `PricingIntelligenceService` (nuevo). No funciona hasta que haya ~20-30 deals cerrados con outcomes registrados. Fase 1 muestra "limited data" con input manual de seniors.

#### Tab 4: (no existía) → **COMPLIANCE** (nuevo)

| HOY | PROPUESTO (Compliance) |
|---|---|
| No existe — compliance vive en la cabeza del senior | RCRA classification sugerida con confidence + basis |
| No hay alertas regulatorias | State-specific flags (ej: "CA DTSC requires additional form") |
| No hay waste vs product detection | DOT shipping classification |
| | Waste vs Product pathway detection |
| | Always marked "Advisory — consult compliance team" |

**Esto depende de:** RCRA lookup tables (curadas manualmente), state rules database. Fase 1 es rule-based, no IA.

#### Tab 5: PROPOSALS → **PASSPORT** (evolución)

| HOY (Proposals) | PROPUESTO (Passport) |
|---|---|
| "Need 50% to generate" threshold | Progressive assembly — se va armando conforme llegan datos |
| Click "Generate Proposal" → async job | 8 secciones pre-llenadas automáticamente |
| Output: GO/NO-GO + pathways + economics | Output: Material identity, specs, safety, compliance, ESG, **Engineer Pathway** (solo senior), evidence pack, readiness score |
| Proposal agent genera "ideas de negocio" (rechazado por Russ) | Passport agent ESTRUCTURA datos existentes (no inventa) |
| Multiple proposal versions (Draft/Current/Archived) | One living passport que evoluciona |
| PDF download | Shareable link + PDF |
| No review gate | **Review Gate**: agent marca "Ready for Review" → senior revisa → approves/rejects |

**Qué se QUITA del proposal output actual:**
- `recommendation` (GO/NO-GO) — el senior decide, no la IA
- `pathways` (5-10 business pathways con buyer types) — esto es lo que Russ rechazó ("mis ingenieros ya saben qué hacer")
- `economics_deep_dive` (profitability band, scenarios) — basado en especulación de la IA, no en datos reales
- `roi_summary` — sin outcome data, es ficción

**Qué se MANTIENE y evoluciona:**
- `material` description → se convierte en Material Identity section
- `financials` → evoluciona a Pricing section con datos REALES (historical matching)
- `environment` (CO2, ESG) → se mantiene casi igual, esto funciona bien
- `safety` (hazards, PPE, storage) → se mantiene, viene del image agent

**Qué se AÑADE:**
- Engineer Pathway (sección que SOLO el senior llena): action, buyer, price, logistics
- Evidence Pack con freshness badges
- Deal Readiness Score (completeness-based, no viability-based)
- Review Gate workflow (status: draft → pending_review → approved)

`★ Insight ─────────────────────────────────────`
El cambio fundamental del Proposal al Passport es filosófico: el Proposal actual le dice al usuario "esto es lo que deberías hacer" (y el experto de 20 años lo rechaza). El Passport le dice "esto es lo que sabemos, organizado profesionalmente, con la evidencia". El senior LLENA la estrategia en Engineer Pathway. La IA no reemplaza al experto — le organiza la mesa de trabajo. Es la diferencia entre un GPS que te dice "gira a la derecha" y un mapa que te muestra todo el terreno.
`─────────────────────────────────────────────────`

---

## 3. AI INTAKE PANEL (El sidebar derecho)

Este es probablemente el componente mejor construido del producto actual. La buena noticia: **se mantiene casi intacto**.

### HOY:
```
┌── AI INTAKE PANEL ──────────────────┐
│                                      │
│ ⚡ 4 suggestions pending             │
│ [All] [High ≥85%] [Notes] [Files]   │
│                                      │
│ ┌── Suggestion Card ──────────────┐  │
│ │ From notes         89%          │  │
│ │ Total Waste Generated           │  │
│ │ ┌───────────────────────────┐   │  │
│ │ │ "1,234.56 tons"           │   │  │
│ │ └───────────────────────────┘   │  │
│ │ → Waste Management Section      │  │
│ │                  [Skip] [Apply]  │  │
│ └─────────────────────────────────┘  │
│                                      │
│ Quick Upload [Drop files here]       │
│                                      │
│ Notes [Free text editor]             │
│ [Analyze]                            │
│                                      │
│ Unmapped (2 items)                   │
└──────────────────────────────────────┘
```

### PROPUESTO — cambios mínimos:

| Aspecto | HOY | CAMBIO |
|---|---|---|
| Suggestion cards | Apply / Skip | **Apply / Edit / Reject** (añadir Edit inline) |
| Source badges | "From notes", "From file" | Añadir: "From voice 🎤", "From photo 📷" |
| Origin tracking | source field en DB | Añadir: `validated_by`, `validated_at`, `source_document_id`, `analysis_date` |
| Confidence display | Badge con % y color | Sin cambio — funciona bien |
| Filters | all / high / notes / files | Sin cambio |
| Batch apply | "Apply All High-Conf" | Sin cambio |
| Quick upload | Dropzone | Sin cambio |
| Notes section | Free text + Analyze | Sin cambio |
| Unmapped notes | Open / Map / Dismiss | Sin cambio |
| Fly animation | Curved path con sparkles | Sin cambio (es un detalle bonito) |
| **Nuevo: Context awareness** | Panel igual en todos los tabs | Panel filtra suggestions relevantes al tab activo |
| **Nuevo: Evidence metadata** | Solo confidence + source | Añadir: analysis_date, freshness, document_purpose |

**Lo importante:** el intake panel es el patrón de interacción core del producto. Accept/reject/edit de sugerencias de IA con confidence scores. Este patrón se EXTIENDE a las nuevas funcionalidades (compliance flags, pricing references, lab recommendations), no se reemplaza.

---

## 4. LOS 6 AGENTES DE IA — Qué cambia

| Agente | HOY | PROPUESTO |
|---|---|---|
| **Proposal Agent** | Genera GO/NO-GO + business pathways + economics speculation | **Passport Assembler**: estructura datos existentes en 8 secciones, NO inventa pathways. Prompt rewrite completo. |
| **Image Analysis** | Material type, quality, CO2, ESG, PPE, hazards | **Sin cambio** — output es excelente, se integra directo al passport |
| **Document Analysis** | Extract structured fields + evidence | **Añadir**: freshness extraction (analysis_date), auto doc-type detection (sds/lab/manifest/invoice), cross-doc consistency check |
| **Notes Analysis** | Free text → field suggestions | **Sin cambio** — funciona bien |
| **Bulk Import** | Excel/PDF → locations + waste streams | **Sin cambio** |
| **Voice Interview** | Audio → transcript → extraction | **Sin cambio** — se usa en field capture mode |

**Agentes NUEVOS:**

| Nuevo servicio | Tipo | Qué hace |
|---|---|---|
| **MissingInfoService** | Rule-based + AI | Calcula completeness, identifica blockers, genera follow-up emails |
| **PricingIntelligenceService** | Query-based | Historical matching, cost normalization. NO es un LLM — es queries sobre outcome data |
| **ComplianceCopilotService** | Rule-based (fase 1) | RCRA lookup tables, state flags, DOT classification |
| **LabDecisionEngine** | Rule-based | Cost/benefit de lab tests específicos basado en buyer requirements y freshness |

`★ Insight ─────────────────────────────────────`
Nota que de los 4 nuevos servicios, solo MissingInfoService usa IA (para generar follow-up emails). Los otros 3 son rule-based o query-based. Esto es intencional: el pricing, compliance, y lab decisions son demasiado sensibles para dejarlos a un LLM que puede "inventar". Los lookup tables los curan expertos humanos. La IA se usa para CAPTURAR datos (extraction) y PRESENTARLOS (passport assembly), no para DECIDIR. Las decisiones son del senior o de reglas verificadas.
`─────────────────────────────────────────────────`

---

## RESUMEN VISUAL: Qué se quita, qué se mantiene, qué se añade

```
QUITAR ❌                    MANTENER ✅                 AÑADIR ✨
─────────────                ────────────                ────────────
Pipeline funnel              Intake Panel                Deal Board (dashboard)
Overview tab (4 stats)       Suggestion cards            Material Profile tab
Questionnaire genérico       Fly animation               Evidence & Gaps tab
GO/NO-GO recommendation      Confidence badges           Pricing tab
Business pathways            Quick upload                Compliance tab
Economics speculation        Notes analysis              Passport (evolve proposal)
ROI summary                  Image agent                 Review Gate
"In Preparation" status      Document agent              Outcome Ledger
                             Voice interview             Follow-up generator
                             Bulk import                 Freshness badges
                             RBAC 6 roles                Field capture mode (mobile)
                             Multi-tenant                MissingInfoService
                             JSONB flexible              Engineer Pathway (senior)
                             S3 file storage
                             Background jobs + polling
```

