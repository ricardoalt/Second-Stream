# Discovery UX/UI Design Document

## Vision

Transformar el tab "Questionnaire" actual (2 secciones planas, 16 campos genéricos) en un **Discovery Dashboard** guiado con 6 dimensiones de discovery derivadas de la entrevista con Russ. El broker llena lo que sabe, cuando lo sabe. El sistema muestra progreso por dimensión y guía al usuario sobre qué falta.

---

## Flujo General del Usuario

```
1. Broker crea Waste Stream (project) en una Location
2. Se abre el proyecto → tab Overview muestra resumen
3. Broker va al tab "Discovery" (antes "Questionnaire")
4. Ve 6 cards de progreso por dimensión arriba
5. Ve el accordion con 6 secciones debajo
6. A la derecha: Intake Panel (notes + upload + AI suggestions)
7. Llena campos en cualquier orden
8. Sube documentos → AI extrae datos → suggestions aparecen
9. Escribe notas → AI analiza → más suggestions
10. Progress cards se actualizan en tiempo real
11. Al llegar al threshold → "Generate Proposal" aparece
```

---

## Wireframe: Tab Bar (cambio)

### Antes
```
┌──────────┬───────────────┬─────────┬────────────┐
│ Overview │ Questionnaire │  Files  │ Proposals  │
│    📊    │      📋       │   📁    │    📄      │
└──────────┴───────────────┴─────────┴────────────┘
```

### Después
```
┌──────────┬─────────────┬─────────┬────────────┐
│ Overview │  Discovery  │  Files  │ Proposals  │
│    📊    │     🔍      │   📁    │    📄      │
└──────────┴─────────────┴─────────┴────────────┘
```

---

## Wireframe: Discovery Tab — Vista Completa (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Discovery Progress                                              72% total │
│                                                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──│
│  │ Identity  │ │ Evidence  │ │  Volume   │ │Regulatory │ │   Cost    │ │Pr│
│  │           │ │           │ │           │ │           │ │           │ │  │
│  │ ████████░░│ │ ████░░░░░░│ │ ██████████│ │ ░░░░░░░░░░│ │ ██░░░░░░░░│ │██│
│  │   80%     │ │   38%     │ │  100%  ✓  │ │    0%     │ │   17%     │ │ 6│
│  │  6/8      │ │  3/8      │ │  8/8      │ │  0/6      │ │  1/6      │ │ 5│
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └──│
│                                                                            │
├────────────────────────────────────────────┬───────────────────────────────┤
│           Accordion (65%)                  │    AI Intake Panel (35%)      │
│                                            │                               │
│  ▼ Material Identity          80% ██████░░ │  ┌───────────────────────┐    │
│  ┌──────────────────────────────────────┐  │  │  Intake Notes         │    │
│  │  Client Code    [__5850____________] │  │  │                       │    │
│  │                                      │  │  │  Notas del site visit │    │
│  │  Material Family *                   │  │  │  material es solvente │    │
│  │  [Solvents                      ▼]  │  │  │  usado, viene del     │    │
│  │                                      │  │  │  proceso de limpieza..│    │
│  │  Main Composition                    │  │  │                       │    │
│  │  [Acetone/MEK blend, ~15% water___] │  │  │  [Analyze Notes 🔍]   │    │
│  │                                      │  │  └───────────────────────┘    │
│  │  Generating Process *                │  │                               │
│  │  ┌──────────────────────────────┐   │  │  ┌───────────────────────┐    │
│  │  │ Parts cleaning / degreasing  │   │  │  │  Quick Upload         │    │
│  │  │ in manufacturing line 3.     │   │  │  │                       │    │
│  │  │ Solvent is recirculated      │   │  │  │  ┌─────────────────┐  │    │
│  │  │ until quality degrades.      │   │  │  │  │  Drop files or  │  │    │
│  │  └──────────────────────────────┘   │  │  │  │  click to upload │  │    │
│  │                                      │  │  │  └─────────────────┘  │    │
│  │  Physical State *  Form/Packaging * │  │  │  Category: [SDS ▼]    │    │
│  │  [Liquid       ▼]  [Drums] [Totes] │  │  └───────────────────────┘    │
│  │                                      │  │                               │
│  │  Contamination                       │  │  ┌───────────────────────┐    │
│  │  [Water content increasing over___] │  │  │  AI Suggestions (3)   │    │
│  │                                      │  │  │                       │    │
│  │  Notes                               │  │  │  ┌─────────────────┐  │    │
│  │  [______________________________]   │  │  │  │ 📄 SDS-acetone   │  │    │
│  └──────────────────────────────────────┘  │  │  │ → material_family│  │    │
│                                            │  │  │   "Solvents"     │  │    │
│  ▼ Evidence & Documentation   38% ████░░░░ │  │  │  95% confidence  │  │    │
│  ┌──────────────────────────────────────┐  │  │  │ [Skip] [Apply ✓] │  │    │
│  │  SDS Available                       │  │  │  └─────────────────┘  │    │
│  │  [Yes (current)                  ▼]  │  │  │                       │    │
│  │                                      │  │  │  ┌─────────────────┐  │    │
│  │  Waste Profile                       │  │  │  │ 📝 From notes   │  │    │
│  │  [Requested                      ▼]  │  │  │  │ → phys_state    │  │    │
│  │                                      │  │  │  │   "Liquid"       │  │    │
│  │  Manifest History   Lab Analysis     │  │  │  │  87% confidence  │  │    │
│  │  [Unknown      ▼]  [Yes (old)   ▼]  │  │  │  │ [Skip] [Apply ✓] │  │    │
│  │                                      │  │  │  └─────────────────┘  │    │
│  │  Lab Analysis Details                │  │  └───────────────────────┘    │
│  │  ┌──────────────────────────────┐   │  │                               │
│  │  │ Flash point test from 2023.  │   │  │                               │
│  │  │ Buyer may require recent.    │   │  │                               │
│  │  └──────────────────────────────┘   │  │                               │
│  │                                      │  │                               │
│  │  Photos     BOL      Evidence Notes │  │                               │
│  │  [No    ▼]  [N/A ▼]  [___________] │  │                               │
│  └──────────────────────────────────────┘  │                               │
│                                            │                               │
│  ▶ Volume & Logistics          100% ✓      │                               │
│  ▶ Regulatory & Compliance       0% ─      │                               │
│  ▶ Cost & Economics             17% ░      │                               │
│  ▶ Client Priorities            60% ████░  │                               │
│                                            │                               │
└────────────────────────────────────────────┴───────────────────────────────┘
```

---

## Wireframe: Progress Cards — Estados

### Card Normal (incompleta)
```
┌──────────────────┐
│  🧪 Identity     │
│                  │
│  ████████░░  80% │
│  6 of 8 fields   │
└──────────────────┘
   border-left: amber
```

### Card Completa
```
┌──────────────────┐
│  📦 Volume    ✓  │
│                  │
│  ██████████ 100% │
│  8 of 8 fields   │
└──────────────────┘
   border-left: green
   subtle green bg
```

### Card Vacía
```
┌──────────────────┐
│  ⚖️ Regulatory   │
│                  │
│  ░░░░░░░░░░   0% │
│  0 of 6 fields   │
└──────────────────┘
   border-left: muted
   text: muted
```

### Card con attention needed (tiene campo required vacío)
```
┌──────────────────┐
│  🧪 Identity  ⚠  │
│                  │
│  ██████░░░░  60% │
│  5 of 8 fields   │
│  2 required empty │
└──────────────────┘
   border-left: red
   "2 required empty" in red
```

### Interacción
- Click en card → scroll suave al accordion section correspondiente + expand si está collapsed
- Hover: slight elevation + cursor pointer
- Cards son responsive: horizontal scroll en mobile, 2x3 grid en tablet, 6 en línea en desktop

---

## Wireframe: Accordion Section — Header

```
┌────────────────────────────────────────────────────────────────┐
│  ▼  Material Identity                           80%  ████████░░│
│     Identifies what the material truly is        6/8           │
│     beyond the client's internal code                         │
└────────────────────────────────────────────────────────────────┘
```

### Collapsed con required fields faltantes
```
┌────────────────────────────────────────────────────────────────┐
│  ▶  Regulatory & Compliance                      0%  ░░░░░░░░░░│
│     Classification, RCRA, transport, state rules  0/6          │
│     ⚠ 1 required: regulatory_status                           │
└────────────────────────────────────────────────────────────────┘
```

### Collapsed completa
```
┌────────────────────────────────────────────────────────────────┐
│  ▶  Volume & Logistics                     ✓   100%  ██████████│
│     Quantity, frequency, storage, loading        8/8           │
└────────────────────────────────────────────────────────────────┘
```

---

## Wireframe: Campos Dentro de una Sección

Los campos se renderizan en grid 2-col (desktop), 1-col (mobile). Campos `multiline`, `tags` con muchas opciones ocupan full-width.

```
┌──────────────────────────────────────────────────────────────┐
│  Material Identity                                           │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Client Code           │  │ Material Family *     │         │
│  │ [5850________________]│  │ [Solvents         ▼] │         │
│  │                       │  │                       │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Main Composition                                  │       │
│  │ [Acetone/MEK blend, approximately 15% water_____]│       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Generating Process *                       (multiline)   │
│  │ ┌────────────────────────────────────────────┐   │       │
│  │ │ Parts cleaning / degreasing in mfg line 3. │   │       │
│  │ │ Solvent recirculated until quality degrades.│   │       │
│  │ └────────────────────────────────────────────┘   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Physical State *      │  │ Contamination         │         │
│  │ [Liquid           ▼] │  │ [Water content______ ]│         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Form / Packaging *                         (tags)        │
│  │ [Drums ✕] [Totes/IBCs ✕]  + add                │        │
│  │  Options: Drums, Totes/IBCs, Super sacks, Baled, │       │
│  │  Loose/Bulk, Palletized, Tanker, Roll-off, ...   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Additional Notes                           (multiline)   │
│  │ ┌────────────────────────────────────────────┐   │       │
│  │ │                                            │   │       │
│  │ └────────────────────────────────────────────┘   │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Wireframe: Mobile

En mobile, el Intake Panel no se muestra al lado. Se accede via FAB (botón flotante) que abre un drawer desde abajo.

```
┌───────────────────────────┐
│  ← Project Name           │
│  Discovery  72%  ████░░░░ │
├───────────────────────────┤
│                           │
│  Progress Cards           │
│  (horizontal scroll)      │
│  ┌────┐┌────┐┌────┐→     │
│  │Id. ││Docs││Vol.│      │
│  │80% ││38% ││100%│      │
│  └────┘└────┘└────┘      │
│                           │
│  ▼ Material Identity 80%  │
│  ┌───────────────────┐    │
│  │ Client Code        │    │
│  │ [5850___________]  │    │
│  │                    │    │
│  │ Material Family *  │    │
│  │ [Solvents      ▼]  │    │
│  │                    │    │
│  │ Generating Proc. * │    │
│  │ ┌────────────────┐ │    │
│  │ │ Parts cleaning │ │    │
│  │ └────────────────┘ │    │
│  │ ...                │    │
│  └───────────────────┘    │
│                           │
│  ▶ Evidence & Docs  38%   │
│  ▶ Volume         100% ✓  │
│  ...                      │
│                           │
│                    ┌────┐ │
│                    │ ✨ │ │  ← FAB (3 pending
│                    │ 3  │ │     suggestions badge)
│                    └────┘ │
└───────────────────────────┘

Tap FAB → Bottom Drawer:
┌───────────────────────────┐
│  ─── (drag handle)        │
│  AI Intake Panel     [✕]  │
│                           │
│  ┌───────────────────┐    │
│  │ Intake Notes       │    │
│  │ [textarea]         │    │
│  │ [Analyze Notes 🔍] │    │
│  └───────────────────┘    │
│                           │
│  ┌───────────────────┐    │
│  │ Quick Upload       │    │
│  │ [Drop / Browse]    │    │
│  └───────────────────┘    │
│                           │
│  AI Suggestions (3)       │
│  ┌───────────────────┐    │
│  │ 📄 SDS → Family   │    │
│  │ "Solvents" 95%    │    │
│  │ [Skip] [Apply ✓]  │    │
│  └───────────────────┘    │
│  ...                      │
└───────────────────────────┘
```

---

## Wireframe: Header del Proyecto (cambio)

### Antes
```
┌────────────────────────────────────────────────────────────────┐
│  Dashboard / Project Name                                      │
│  Status: In Preparation                                        │
│                                                                │
│  Questionnaire Progress         5 of 16 fields    31%          │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│                                                                │
│  "The more complete your data, the more accurate your AI..."   │
│                                          [Generate Proposal ▶] │
└────────────────────────────────────────────────────────────────┘
```

### Después
```
┌────────────────────────────────────────────────────────────────┐
│  Dashboard / Project Name                                      │
│  Status: In Preparation                                        │
│                                                                │
│  Discovery Progress            28 of 46 fields    61%          │
│  ████████████████████████████░░░░░░░░░░░░░░░░░░░░              │
│                                                                │
│  "Fill in what you know. Upload docs for AI extraction."       │
│                                          [Generate Proposal ▶] │
└────────────────────────────────────────────────────────────────┘
```

---

## Wireframe: Overview Tab (cambio)

### Antes
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Data      │ │Proposals │ │Client    │ │Location  │
│Complete  │ │          │ │          │ │          │
│  31%     │ │    0     │ │ ACME Inc │ │ Houston  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Next Step:
┌────────────────────────────────────────┐
│  Continue filling the questionnaire    │
│  ████████░░░░  31% → target 70%       │
│  [Continue Questionnaire →]            │
└────────────────────────────────────────┘
```

### Después
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Discovery │ │Proposals │ │Client    │ │Location  │
│Progress  │ │          │ │          │ │          │
│  61%     │ │    0     │ │ ACME Inc │ │ Houston  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Discovery Dimensions:
┌────────────────────────────────────────────────────┐
│  Identity    ████████░░  80%                       │
│  Evidence    ████░░░░░░  38%   ← needs attention   │
│  Volume      ██████████  100% ✓                    │
│  Regulatory  ░░░░░░░░░░  0%   ← empty              │
│  Cost        ██░░░░░░░░  17%                       │
│  Priorities  ██████░░░░  60%                       │
│                                                    │
│  [Continue Discovery →]                            │
└────────────────────────────────────────────────────┘
```

---

## Wireframe: Alert Banner (dentro del Discovery tab)

### Below threshold (< 70%)
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ Discovery at 61% — need 70% for proposal generation     │
│                                                             │
│  Top gaps:                                                  │
│  • Regulatory & Compliance — 0% (regulatory_status required)│
│  • Evidence & Documentation — 38%                           │
│  • Cost & Economics — 17%                                   │
│                                                             │
│  [Go to Regulatory]  [Go to Evidence]  [Go to Cost]        │
└─────────────────────────────────────────────────────────────┘
```

### Above threshold (≥ 70%)
```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Discovery ready! 72% complete                            │
│  You can generate a proposal now. More data = better results│
│                                        [Generate Proposal ▶]│
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo de AI Suggestions con Nuevos Campos

Cuando el usuario sube un SDS o escribe notas, el AI extrae datos y los mapea a los nuevos campos:

```
Usuario sube: "SDS-Acetone-MEK-Blend.pdf"
   │
   ▼
AI procesa documento
   │
   ▼
Genera IntakeSuggestions:
   ┌──────────────────────────────────────────────────────────────┐
   │ Suggestion 1:                                                │
   │   section: "material-identity"                               │
   │   field: "material_family"                                   │
   │   value: "Solvents"                                          │
   │   confidence: 95%                                            │
   │   source: "file"                                             │
   │   evidence: {file: "SDS-Acetone.pdf", page: 1, excerpt: ...}│
   │                                                              │
   │ Suggestion 2:                                                │
   │   section: "material-identity"                               │
   │   field: "main_composition"                                  │
   │   value: "Acetone/MEK blend"                                 │
   │   confidence: 92%                                            │
   │                                                              │
   │ Suggestion 3:                                                │
   │   section: "material-identity"                               │
   │   field: "physical_state"                                    │
   │   value: "Liquid"                                            │
   │   confidence: 98%                                            │
   │                                                              │
   │ Suggestion 4:                                                │
   │   section: "regulatory-compliance"                           │
   │   field: "transport_classification"                          │
   │   value: "DOT Flammable Liquid, Class 3, UN1993"            │
   │   confidence: 88%                                            │
   │                                                              │
   │ Suggestion 5:                                                │
   │   section: "evidence-documentation"                          │
   │   field: "sds_available"                                     │
   │   value: "Yes (current)"                                     │
   │   confidence: 99%                                            │
   └──────────────────────────────────────────────────────────────┘
   │
   ▼
Aparecen en el Intake Panel como suggestion cards
Usuario aplica → campos se llenan → progress cards se actualizan
```

---

## Flujo: Creación de Nuevo Proyecto (sin cambio mayor)

El flujo de creación no cambia mucho. Actualmente:
1. Usuario va a una Location
2. Click "New Project" / "New Waste Stream"
3. Da nombre y se crea
4. Se aplica template automáticamente → las 6 secciones aparecen vacías

```
┌─────────────────────────────────┐
│  New Waste Stream               │
│                                 │
│  Name *                         │
│  [Spent Solvent - Line 3_____] │
│                                 │
│  Description (optional)         │
│  [____________________________]│
│                                 │
│         [Cancel] [Create →]    │
└─────────────────────────────────┘
         │
         ▼
Opens project page with Discovery tab
All 6 sections at 0% — ready to fill
```

---

## Secciones Detalladas con sus Campos

### Section 1: Material Identity 🧪
**Propósito**: Identificar qué es realmente el material, más allá del nombre del cliente.
**Pain point que resuelve**: "El nombre del material casi nunca sirve" — Russ

| Campo | Tipo | Required | Full-width | Opciones / Descripción |
|-------|------|----------|------------|----------------------|
| client_code | text | no | no | Código interno del cliente ("5850") |
| material_family | combobox | **yes** | no | Solvents, Acids, Plastics (HDPE/LDPE/PP/PS/PET/Mixed), Metals (Ferrous/Non-ferrous/Mixed), E-scrap, Cardboard/Paper, Glass, Wood, Textiles, Oils/Lubricants, Chemicals (Hazardous), Chemicals (Non-hazardous), Organic/Food, Water/Wastewater, Construction/Demolition, Pallets, Drums/Containers, Other |
| main_composition | text | no | yes | Ingrediente principal o composición conocida |
| generating_process | text multiline | **yes** | yes | Proceso que generó el material. CRÍTICO: cambia clasificación legal |
| physical_state | combobox | **yes** | no | Solid, Liquid, Sludge/Slurry, Gas/Vapor, Mixed |
| form_packaging | tags | **yes** | yes | Drums (55gal), Totes/IBCs, Super sacks, Baled, Loose/Bulk, Palletized, Roll-off, Tanker/Tanktruck, Bagged, Cylinders, Equipment/Units, Other |
| contamination | text multiline | no | yes | Contaminantes conocidos, mezclas |
| identity_notes | text multiline | no | yes | Notas adicionales de identidad |

### Section 2: Evidence & Documentation 📄
**Propósito**: Rastrear qué documentación existe y su estado/frescura.
**Pain point que resuelve**: "Docs viejos son inutilizables" + "SDS virgin vs spent es diferente" — Russ

| Campo | Tipo | Required | Full-width | Opciones |
|-------|------|----------|------------|---------|
| sds_status | combobox | no | no | Available (current, <2yr), Available (outdated, >2yr), Not available, Requested, N/A |
| sds_type | combobox | no | no | Virgin material SDS, Spent/waste SDS, Both available |
| waste_profile_status | combobox | no | no | Available (current), Available (outdated), Not available, Requested |
| manifest_history | combobox | no | no | Available, Not available, Unknown, N/A (product shipment) |
| lab_analysis_status | combobox | no | no | Recent (<1yr), Old (1-3yr), Very old (>3yr), Not available, Not needed, Requested |
| lab_details | text multiline | no | yes | Qué tests, fecha, resultados clave |
| photos_status | combobox | no | no | Available, Not available, Requested |
| bol_status | combobox | no | no | Available, Not available, N/A |
| evidence_gaps | text multiline | no | yes | Qué falta, qué se ha pedido, preocupaciones de freshness |

### Section 3: Volume & Logistics 📦
**Propósito**: Cuánto material, con qué frecuencia, cómo se almacena/carga.
**Pain point que resuelve**: "Volume + recurrence + storage afectan la viabilidad" — Russ

| Campo | Tipo | Required | Full-width | Opciones |
|-------|------|----------|------------|---------|
| volume_quantity | text | **yes** | no | Cantidad numérica |
| volume_unit | combobox | **yes** | no | lbs/week, lbs/month, tons/month, tons/year, gallons/week, gallons/month, gallons/year, drums/month, loads/month, cubic yards/month, Other |
| recurrence | combobox | **yes** | no | Continuous (daily), Weekly, Bi-weekly, Monthly, Quarterly, Seasonal, One-time/Project, Irregular/As-needed |
| seasonal_details | text multiline | no | yes | Patrones de variación estacional |
| density_known | text | no | no | Densidad si se conoce (para convertir vol↔peso) |
| current_storage | tags | no | yes | Compactor, Baler, Roll-off containers, Dumpsters, Covered area, Refrigerated, Hazmat storage, Segregated area, Tanker pad, Silo, Open yard, None/Ground |
| loading_capability | tags | no | yes | Forklift, Loading dock, Ground-level only, Crane, Pump/pneumatic, Vacuum truck needed, Special equipment |
| logistics_notes | text multiline | no | yes | Restricciones de acceso, horarios, scheduling |

### Section 4: Regulatory & Compliance ⚖️
**Propósito**: Determinar clasificación legal y requerimientos.
**Pain point que resuelve**: "La regulación cambia todo según waste vs product" + "Regulaciones no operacionalizadas" — Russ

| Campo | Tipo | Required | Full-width | Opciones |
|-------|------|----------|------------|---------|
| regulatory_status | combobox | **yes** | no | Hazardous waste (RCRA), Non-hazardous waste, Universal waste, By-product (not waste), Product/Commodity, Exempt/Excluded, Unknown — needs determination |
| rcra_details | text | no | yes | Waste code(s) si se conocen (D001, F001, etc.) |
| dot_classification | text | no | no | DOT hazard class, UN number |
| state_requirements | text multiline | no | yes | Requerimientos estatales específicos |
| export_status | combobox | no | no | Domestic only, Export possible, Export required, No restrictions known |
| regulatory_notes | text multiline | no | yes | Preguntas abiertas, determinaciones pendientes |

### Section 5: Cost & Economics 💰
**Propósito**: Entender el costo real actual y la estructura económica.
**Pain point que resuelve**: "Como un bill de teléfono, hay fees y líneas extra" — Russ

| Campo | Tipo | Required | Full-width | Opciones |
|-------|------|----------|------------|---------|
| current_handler | text | no | yes | Quién maneja actualmente (hauler/procesador) |
| stated_cost | text | no | no | Costo declarado por el cliente |
| cost_unit | combobox | no | no | ¢/lb, $/ton, $/drum, $/load, $/gallon, $/month (flat), Other |
| invoice_breakdown | text multiline | no | yes | Desglose de invoice: líneas, fees, surcharges |
| effective_cost_notes | text multiline | no | yes | Fees ocultos: fuel surcharge, environmental fee, admin, etc. |
| existing_revenue | text multiline | no | yes | Si genera ingreso actualmente, cuánto y a quién |
| contract_details | text multiline | no | yes | Duración de contrato actual, términos, mínimos |

### Section 6: Client Priorities & Constraints 🎯
**Propósito**: Entender qué le importa al cliente y qué limita la solución.
**Pain point que resuelve**: "Criticidad para producción cambia todo" + "Deadline es dato sorpresa" — Russ

| Campo | Tipo | Required | Full-width | Opciones |
|-------|------|----------|------------|---------|
| production_critical | combobox | **yes** | no | Yes — stops production if not moved, No — can accumulate, Unknown |
| urgency | combobox | **yes** | no | Emergency (<1 week), Urgent (1-4 weeks), Standard (1-3 months), Flexible (3-12 months), Long-term (>1 year), No deadline |
| specific_deadline | text | no | no | Fecha específica o evento ("VP visit March 15") |
| client_goals | tags | **yes** | yes | Reduce disposal cost, Generate revenue, Regulatory compliance, ESG/Sustainability reporting, Reduce liability/risk, Simplify operations, Brand/reputation protection, Zero waste target |
| no_export_policy | combobox | no | no | Strict no-export, Prefer domestic, No restriction, Unknown |
| brand_concerns | text multiline | no | yes | Sensibilidad de marca, percepción pública |
| ehs_capability | combobox | no | no | Expert (regulatory knowledge), Competent (general EHS), Limited (safety-focused only), Minimal (admin/finance role), Unknown |
| operational_constraints | tags | no | yes | Limited space, Budget restricted, Permit limitations, Staff constraints, Access restricted, Safety requirements, Union rules, Corporate approval needed |
| priority_notes | text multiline | no | yes | Contexto adicional, prioridades |

---

## Resumen de Campos

| Section | Campos | Required | Pain Points que Resuelve |
|---------|--------|----------|--------------------------|
| Material Identity | 8 | 4 | Nombre inútil, proceso genera clasificación |
| Evidence & Docs | 9 | 0 | Docs viejos, freshness, SDS virgin vs spent |
| Volume & Logistics | 8 | 3 | Viabilidad logística, storage |
| Regulatory | 6 | 1 | Waste vs product, RCRA, DOT |
| Cost & Economics | 7 | 0 | Fees ocultos, costo real vs declarado |
| Client Priorities | 9 | 3 | Criticidad, deadline sorpresa, brand |
| **TOTAL** | **47** | **11** | |

---

## Cómo Funciona el Discovery — Escenario Completo

### Día 1: Lead llega
```
Broker recibe email: "Tenemos solvente usado, ¿pueden ayudar?"

1. Broker crea proyecto "Spent Solvent - ACME Houston"
   en la location "ACME Manufacturing - Houston TX"

2. Se abre Discovery tab → 6 secciones vacías, 0%

3. Broker abre "Material Identity", llena lo que sabe:
   - material_family: "Solvents"
   - generating_process: "Parts cleaning line 3"
   - physical_state: "Liquid"
   - form_packaging: [Drums]
   → Identity: 50% (4/8)

4. Broker escribe en Intake Notes:
   "Called EHS contact. Said it's acetone/MEK blend,
    about 15% water. ~20 drums per month. They want
    to reduce cost, currently paying $0.85/lb to
    Clean Harbors. Critical for production."

5. Clicks "Analyze Notes" → AI generates 6 suggestions:
   - main_composition → "Acetone/MEK blend, ~15% water"
   - contamination → "~15% water content"
   - volume_quantity → "20"
   - volume_unit → "drums/month"
   - stated_cost → "$0.85/lb"
   - production_critical → "Yes — stops production"

6. Broker applies all 6 → 3 sections jump in progress:
   - Identity: 75% (6/8)
   - Volume: 25% (2/8)
   - Priorities: 22% (2/9)
   - Cost: 14% (1/7)
```

### Día 2: Documentos llegan
```
7. EHS envia SDS por email. Broker lo sube via Quick Upload
   con category "SDS"

8. AI procesa SDS → genera suggestions:
   - sds_status → "Available (current)"
   - dot_classification → "Flammable Liquid, Class 3"
   - regulatory_status → "Hazardous waste"
   → Evidence: 11%, Regulatory: 33%

9. Broker aplica suggestions, luego manualmente:
   - recurrence: "Monthly"
   - urgency: "Standard (1-3 months)"
   - client_goals: [Reduce disposal cost, Reduce liability]
   - ehs_capability: "Competent"
```

### Día 5: Más info
```
10. Broker consigue invoice de Clean Harbors, lo sube

11. AI extrae:
    - current_handler → "Clean Harbors"
    - invoice_breakdown → "Base: $0.72/lb, Fuel: $0.08/lb, Env fee: $0.05/lb"
    - stated_cost → "$0.85/lb" (confirma)

12. Broker llena gaps restantes manualmente

13. Discovery llega a 75% → banner verde aparece:
    "Discovery ready! Generate Proposal"

14. Broker genera propuesta
```

---

## Comportamiento del Progress

### Cálculo de Completeness
- **Por sección**: campos con valor / total campos de la sección
- **Overall**: sum(campos con valor de todas las secciones) / total campos
- **Required check**: si algún campo required está vacío, la sección muestra ⚠

### Threshold para Propuesta
- Actual: 70% (configurable via `PROPOSAL_READINESS_THRESHOLD`)
- Recomendación: bajar a 50-60% con las nuevas secciones (47 campos es mucho más que 16)
- Alternativa: requerir que los 11 campos required estén llenos + 50% overall

### Color coding de las cards
- 0%: gris/muted
- 1-49%: rojo/naranja (si tiene required vacíos) o amber
- 50-79%: amber
- 80-99%: verde claro
- 100%: verde + checkmark

---

## Qué NO Cambia

1. **Intake Panel** — mismo código, misma UX. Solo los field IDs a los que mapea cambian.
2. **File Upload** — mismo flujo. Archivos se suben en Files tab o Quick Upload.
3. **AI Processing** — mismo pipeline. Solo el prompt de extracción se actualiza con nuevos campos.
4. **Autosave** — mismo mecanismo (debounce + PATCH a project_data).
5. **Proposals** — lee `technical_sections` genéricamente, funciona con cualquier sección.
6. **Data model** — sigue siendo `project_data` JSONB con `DynamicSection[]`. No new tables.

## Qué SÍ Cambia

1. **Template** — de 2 secciones/16 campos a 6 secciones/47 campos
2. **Tab name** — "Questionnaire" → "Discovery"
3. **Progress cards** — nuevo componente arriba del accordion
4. **Section headers** — muestran completion % con color coding
5. **Overview tab** — muestra dimensiones de discovery en vez de solo un % global
6. **Header** — "Discovery Progress" en vez de "Questionnaire Progress"
7. **Alert banner** — muestra top gaps por dimensión con links directos
8. **AI extraction prompt** — mapea a nuevos field IDs
