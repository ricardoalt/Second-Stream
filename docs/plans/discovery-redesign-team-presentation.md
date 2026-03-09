# Discovery Redesign — Presentación para el Equipo

**SecondStream · Marzo 2026**

---

## El Problema

> *"Everything is waiting for something."* — Russ (20yr broker)

| Problema | Ejemplo |
|---|---|
| **Nadie sabe qué falta** | Deal parado 5 días porque un lab report está con John de EHS — y nadie lo ve |
| **47 campos para todo** | Solventes, metales, plásticos — mismo formulario. La mayoría irrelevante |
| **Regulación es un laberinto** | Misma acetona: NO hazwaste como producto, SÍ como desecho de degreasing |
| **Conocimiento tribal** | "¿Qué tests necesito para solventes?" — no hay enciclopedia, preguntas a Russ |
| **Documentos mienten** | SDS de 5 años, virgin vs spent, datos desactualizados |

---

## El Flujo: De Llamada a Material Passport

```
DÍA 1              DÍA 1-3            DÍA 3-7              DÍA 7-21
─────              ───────            ───────              ────────
Broker recibe      Facility envía     Rules engine         Todo lleno
llamada → pega     SDS → IA extrae    detecta gaps →       → banner verde
notas → IA         8-12 campos →      auto-blockers        → genera
extrae material    broker revisa      a las 72h →          Material
type, volume,      y aplica           broker persigue      Passport
urgency                               con draft emails
```

---

## La UI: ¿Cómo Se Ve?

### 3 Tabs (antes eran 4 — eliminamos Overview, su info vive en el header)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER (siempre visible): Meridian · Spent Acetone · Solvents · 60%    │
│  ⚡ 2 blockers: Lab Analysis (4d), Regulatory classification             │
├───────────────────────────┬──────────────────┬──────────────────────────┤
│ Discovery  ⋯ · 3          │  Files(6)        │  Material Passport       │
├───────────────────────────┴──────────────────┴──────────────────────────┤
│                                                                          │
│  DIMENSION MAP — estado de cada área de un vistazo:                      │
│  [✓ Identity] [⋯ Volume 60%] [⚡ Regulatory] [⚠ Evidence] [— Cost]     │
│    done          working        blocked        stale docs    not started │
│  Click ⚡ → abre Gaps tab. Click ⚠ → abre Docs tab.                     │
│                                                                          │
│  ┌───────────────────────────────┬─────────────────────────────────────┐ │
│  │  ACCORDION (60%)              │  SIDEBAR — 4 TABS (40%)            │ │
│  │                               │  [Capture][Suggest·3][Gaps·2][Docs]│ │
│  │  ▼ Material Identity    4/5  │                                    │ │
│  │    Material Type: [Solvents] │  Capture: voice, camera, notes,    │ │
│  │    Process: [Degreasing    ] │    upload. Donde entra info cruda.  │ │
│  │    Flash Point: [58°C]       │                                    │ │
│  │      └─ SDS p.4 · ⚠ 14mo    │  Suggest: AI suggestions grouped   │ │
│  │    Chlorinated: [Unknown  ▾] │    by dimension. Apply 1x1 or      │ │
│  │    [1 dismissed ▾]           │    batch "Apply all Identity ✓"    │ │
│  │                               │                                    │ │
│  │  ▶ Evidence & Docs      1/4 │  Gaps: blocker cards con aging.    │ │
│  │  ▶ Volume & Logistics   3/5 │    Primary action: "What to send   │ │
│  │  ▶ Regulatory      ✦   0/5 │    them" → draft email.            │ │
│  │  ▶ Cost & Economics     0/6 │                                    │ │
│  │  ▶ Client Priorities    3/5 │  Docs: evidence freshness +        │ │
│  │                               │    lab guidance per material type  │ │
│  │                               │    (test + cost + ✓/✗ recommended) │ │
│  └───────────────────────────────┴─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Empty State: Notes-first

```
┌──────────────────────────────────────────────┐
│  New deal — how do you want to start?        │
│                                               │
│  [📝 Paste notes from a call] [🎤 Record]    │
│                                               │
│  ─── or if you know the material ──────────  │
│  Material Type  [Select                  ▾]  │
└──────────────────────────────────────────────┘
```

Broker pega notas de llamada → AI extrae tipo, volumen, urgencia → campos se pre-llenan.

---

## 5 Decisiones Clave y Por Qué

### 1. Material Type carga solo las preguntas relevantes

~10 core fields → broker elige "Solvents" → 6 campos de solventes aparecen. Un deal de metales nunca ve "flash point". Implementado como JSON config — agregar tipo nuevo = cambiar config, no código.

Si la IA encuentra algo inesperado en un documento → sugiere un **ghost field** (campo con borde punteado). Broker acepta o dismiss. Si dismiss por error → recuperable desde `[1 dismissed ▾]` en el accordion header.

### 2. Sidebar con 4 tabs, no scroll

| Tab | Modo mental | Contenido |
|---|---|---|
| **Capture** | "Estoy recibiendo info" | Voice, camera, notes, upload |
| **Suggest** | "IA encontró cosas" | Suggestion cards por dimensión + batch apply |
| **Gaps** | "¿Qué falta y quién lo debe?" | Blocker cards + draft emails + AI questions (ver wireframe abajo) |
| **Docs** | "¿Mi evidencia es sólida?" | Freshness semaphore + lab guidance (test, costo, ✓/✗) |

**¿Por qué tabs?** Un broker mid-call no debería scrollear past AI suggestions para llegar al textarea de notas. Cada tab = modo de trabajo diferente.

**Gaps tab — wireframe:**

```
┌──────────────────────────────────────┐
│  GAPS (2 blockers · 1 AI question)   │
│                                      │
│  ⚡ Lab Analysis (Water Content)      │
│  Needed for: Buyer QA, pricing       │
│  Blocks: Passport generation         │
│  Waiting on: John (EHS) · 4 days ⏱   │
│  [What to send them →]  [Done]       │
│                                      │
│  ⚡ Regulatory Classification         │
│  Needed for: RCRA codes, transport   │
│  Blocks: Passport generation         │
│  Unassigned · 6 days ⏱               │
│  [What to send them →]  [Done]       │
│                                      │
│  ── AI Questions ──────────────────  │
│                                      │
│  💡 "El SDS muestra acetona/tolueno  │
│   pero el waste profile dice 'spent  │
│   solvent.' ¿El tolueno supera el    │
│   10%? Esto cambia los RCRA codes."  │
│  Impact: RCRA, disposal, pricing     │
│  [Draft email →]  [Copy]  [Dismiss]  │
└──────────────────────────────────────┘
```

Cada blocker muestra: qué falta, para qué se necesita, qué bloquea, quién lo debe, cuánto lleva. **"What to send them"** es la acción principal — genera un draft de email profesional para perseguir la info. Las AI questions complementan con preguntas que las reglas no cubren.

### 3. La IA que Guía al Broker: Gap Analysis + Preguntas Inteligentes

Este es el corazón del sistema. En vez de esperar que el broker sepa qué preguntar, **el sistema le dice qué falta, por qué importa, y qué hacer al respecto.**

Tiene dos capas que trabajan juntas:

#### Capa 1: Rules Engine (~40 reglas determinísticas)

Codifican el conocimiento tribal de veteranos como Russ. No alucinan, son instantáneas, y auditables. Almacenadas como JSON config editable sin deploy.

**Se disparan automáticamente** conforme el broker llena campos:

```
EJEMPLO: Broker selecciona Material Type = "Solvents"
─────────────────────────────────────────────────────

El sistema evalúa las reglas de solventes y muestra en el Gaps tab:

  💡 "Water content es lo que más importa a compradores de solventes.
     ¿La facility lo ha analizado?"
     Impact: Recycling value, buyer QA

  💡 "Chlorinated vs non-chlorinated tienen clasificaciones RCRA
     completamente distintas. Pregunta en la facility."
     Impact: RCRA listing, disposal cost, transport rules

  💡 "Para solventes, tests recomendados:
     Water Content $50-150 ✓  |  Flash Point $50-100 ✓
     Full TCLP Panel $800-1500 ✗ (no se necesita a menos que
     el comprador lo requiera)."

EJEMPLO: Broker ingresa flash_point = 52°C
──────────────────────────────────────────

  ⚠ "Flash point < 140°F = RCRA D001 (Ignitability).
     Requiere manifiesto hazmat y transporte DOT.
     Esto impacta el precio significativamente."

EJEMPLO: Broker sube SDS que dice "Product Data Sheet"
──────────────────────────────────────────────────────

  ⚠ "Este SDS es de material VIRGEN. Las características del
     material GASTADO pueden ser muy diferentes.
     Lab analysis o waste profile necesario para clasificar."

EJEMPLO: production_critical = "Yes" pero urgency está vacío
────────────────────────────────────────────────────────────

  💡 "Esto es producción-crítica. ¿Cuál es el deadline antes
     de que les interrumpa las operaciones?"
```

#### Capa 2: LLM para Preguntas que las Reglas No Cubren

Cada deal tiene matices únicos. El LLM analiza TODOS los datos del deal (campos llenos, vacíos, documentos, notas) y genera preguntas contextuales profundas:

```
EJEMPLO: SDS dice "acetone/toluene blend" pero waste profile dice "spent solvent"
──────────────────────────────────────────────────────────────────────────────────

  💡 "El SDS muestra acetona/tolueno, pero el waste profile
     dice solo 'spent solvent.' ¿El tolueno supera el 10%?
     Esto cambiaría los códigos RCRA de F003 a F005 y afecta
     qué facilities pueden aceptarlo."

     Impact: RCRA codes, disposal routing, pricing
     [Draft email →]  [Copy]  [Dismiss]
```

**"Draft email"** genera un email profesional listo para enviar al contacto de la facility — nunca se envía solo, siempre es draft editable:

```
Subject: Composition info needed — Spent Solvent (Meridian Chemical)

Hi John,

Following up on the spent acetone from your degreasing operation.
To move forward, we need a composition breakdown — specifically
whether toluene exceeds 10%.

This affects which facilities can accept the material. If you have
a recent lab analysis with the breakdown, that would be ideal.

Can you get this to us by [date]?
```

**Si el LLM falla** (timeout, error) → el broker sigue viendo las sugerencias del rules engine. Las reglas siempre funcionan. La IA es aditiva, nunca bloquea.

### 4. Regulatory: La IA Guía Pero No Decide

La regulación es el problema más complejo: la misma acetona puede ser **waste** (si se descarta), **product** (si se vende como commodity), o **by-product** (si tiene reuso legítimo). Cada clasificación cambia TODO — transporte, documentación, costos, facilities permitidas.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Regulatory Classification                                          │
│                                                                     │
│  Not yet determined                                                 │
│  ┌──────────┬──────────┬──────────────┐                            │
│  │  Waste   │ Product  │  By-product  │                            │
│  └──────────┴──────────┴──────────────┘                            │
│  I don't know yet — that's OK. Upload SDS and describe process.    │
│  AI will suggest a classification.                                  │
│                                                                     │
│  ┌─ AI Insight (aparece cuando hay suficientes datos) ──────────┐  │
│  │  ✦ Based on process "degreasing" and composition              │  │
│  │  (acetone/toluene), this is likely spent solvent waste.        │  │
│  │  Suggest RCRA F001 or F002 depending on chlorinated status.   │  │
│  │  [Why?]                                   [Select Waste →]    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── After selecting "Waste": ──────────────────────────────────── │
│  "Waste means: manifest + permitted facility + DOT hazmat"          │
│  [What does this mean for this deal? ▾]                             │
│  RCRA Codes:    [D001, F003]                                       │
│  DOT Class:     [Flammable Liquid, UN1090]                         │
│  State Rules:   [...]                                               │
│  Reg. Deadline: [VP visit March 15]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Cómo la IA ayuda con regulatory — reglas de compliance (~15-20):**

```
Chlorinated = "Yes" → "Chlorinated solvents son RCRA F001/F002.
  Requiere: manifiesto, TSDF permitida, obligaciones de generador.
  Impacto en precio: disposal significativamente más caro."

Flash point < 140°F → "D001 Ignitability. Requiere manifiesto
  hazmat + DOT Flammable Liquid + packaging especial."

Facility en California/NY/NJ → "Este estado tiene regulaciones
  MÁS ESTRICTAS que RCRA federal. Verificar requisitos estatales."

By-product seleccionado → "Exemptions varían por estado. Verificar:
  (1) proceso normal, (2) tiene mercado, (3) cumple specs.
  Si falta alguno → se regula como waste."

Regulatory vacío + process lleno + SDS disponible → "Hay suficiente
  info para que la IA sugiera clasificación. Review with expert."
```

**Decisiones clave:**
- **"Unknown" NO es botón** — es la ausencia de selección. El texto normaliza la incertidumbre.
- **IA sugiere pero NUNCA auto-selecciona** — es determinación legal humana.
- **Campos condicionales:** "Waste" → muestra RCRA/DOT. "Product" → muestra product specs.
- **Reglas en JSON config** — un compliance person puede actualizarlas sin tocar código.

### 5. Evidence tracking: todo tiene origen

Cada valor tiene rastro: `Flash Point: 58°C └─ SDS_Acetone.pdf · p.4 · 14mo ⚠`

Tabla `EvidenceNode` (append-only, nunca se borra) → base del Material Passport. Cuando un senior corrige un valor de IA → `CorrectionEvent` captura el antes/después como training data (optional note). La IA mejora con cada corrección.

---

## Extras

**Deal Re-Entry Card:** Si un deal no se abre en 48h+, al reabrir muestra: qué pasó mientras tanto, cuántas sugerencias nuevas, blockers con aging, dónde estabas trabajando. Se cierra con cualquier click.

**Auto-blockers a 72h** (no 24h): Con 15 deals activos, 24h genera ruido. 72h = genuinamente atorado.

**Mobile:** Dos FABs (Camera + Intake). Voice recording → full-screen takeover. Dimension Map → horizontal scroll.

---

## Coverage de Pain Points de Russ

| Pain Point | Solución |
|---|---|
| Missing info freezes pipeline | Gaps tab: auto-blockers, aging, draft emails, status en header |
| Tribal knowledge | Rules engine (~40 reglas) + LLM para situaciones nuevas |
| Material names useless | Material Type configura workspace. Nombre es opcional |
| Regulatory multi-dimensional | 3 botones + insights + compliance rules. IA sugiere, broker decide |
| Lab decision non-trivial | Lab guidance en Docs tab: test + costo + ✓/✗ por material |
| Documents stale | Freshness auto-calculada + virgin vs spent detection |
| Hidden costs | AI extrae line items de invoices |
| Production criticality | Campo core obligatorio + regla que prioriza urgencia |

---

## Phase 2+

| Phase 1 (ahora) | → Futuro |
|---|---|
| EvidenceNode | → Material Passport compartible |
| CorrectionEvent | → IA mejora por tipo de material |
| Compliance rules (JSON) | → Compliance Copilot con database regulatoria |
| Blocker tracking | → Deal Board con lifecycle stages |
| 5 material types | → 15-20+ tipos |

---

## Preguntas para el Equipo

1. **¿Top 10-15 tipos de material?** Necesitamos input de Russ.
2. **¿Sesión con Russ** para extraer las ~40 reglas del rules engine?
3. **¿Quién valida las reglas de compliance** antes de shipping?
4. **¿Migración:** auto-migrar proyectos existentes o solo nuevos?
