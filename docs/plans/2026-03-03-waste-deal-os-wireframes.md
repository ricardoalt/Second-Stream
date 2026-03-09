# Waste Deal OS — Concept Wireframes & Arquitectura Detallada

**Propósito:** Visualizar la experiencia del usuario (UX) del nuevo flujo de "Discovery a Disposition" y explicar en detalle **cómo funciona la tecnología por detrás** (gobernanza de datos, cumplimiento normativo, motores de IA). 

Este documento alinea al equipo técnico y de producto mostrando cómo la visión se traduce en pantallas y flujos de datos reales, resolviendo los dolores operativos exactos levantados por los expertos en la industria.

---

## Aclaración de Nomenclatura y Scope

*   **Pasos del Deal:** En este documento usamos "Pasos" (Step 1, Step 2) para referirnos al ciclo de vida de un deal, para no confundirlos con las "Fases" (Phase 1, Phase 2) del roadmap del producto.
*   **Discovery Pack vs. Material Passport:** 
    *   El **Discovery Pack** es el conjunto de datos interno, sucio y en proceso que ve el broker.
    *   El **Material Passport** es el artefacto final, limpio y exportable que se le entrega al comprador.
*   **Interfaz de Campo:** El MVP asume un entorno **Responsive Web / Tablet view**. Una "App Móvil Nativa" con modo "Offline" se mantiene como una pregunta abierta (Open Question) para evaluar según el presupuesto y conectividad real en las plantas.

---

## Paso 1: El "Deal Workspace" & Discovery Pack (Vista Principal)
*Aquí es donde el agente de campo vive su día a día. Sube el caos (fotos, audios) y la IA lo estructura. Se introduce el flag de criticidad y los requerimientos operativos logísticos.*

```text
=================================================================================================
WASTE DEAL OS   |  Dashboard  |  Pipeline  |  [ Deal: Tanque Solvente - Texas ]       [👤 Mike]
=================================================================================================
[◀ Volver]   Status: ASSESSMENT  |  Completeness: [██████░░░░] 62%  |  ⏱ 14 días abierto
-------------------------------------------------------------------------------------------------
[⚠️ PRODUCTION CRITICAL: YES] ➔ Redundancy Rule Active: Requires 2+ Outlets (Primary + Backup)
-------------------------------------------------------------------------------------------------
 📥 DATA CAPTURE (El Caos)                   |  🧠 INTELLIGENCE PANEL (Los 4 Motores)
                                             |
 📎 Drop files here (SDS, Labs, Invoices)    |  🚨 MISSING INFO TRACKER (Blockers)
 🎤 Record Voice Note                        |  [🔴 DATA] Water Content test missing
 [ SDS_Solvent_2024.pdf ] 🟢 Extracted       |      ↳ Prevents pricing. [✉️ Draft Email to EHS]
 [ Voice_Note_Monday.mp3 ] 🟢 Transcribed    |  [🔴 OPS] Missing $3M Umbrella Insurance
                                             |      ↳ Transporter blocked. [📎 Upload]
 📝 DISCOVERY PACK (Evidence Graph)          |  [🟡 LOGISTICS] Pickup Readiness Incomplete
                                             |      ↳ Missing: Placards requirements.
 Material Identity                           |  -------------------------------------------------
 • Family: Spent Solvent 🪄                  |  ⚖️ COMPLIANCE COPILOT (Advisory)
 • Process: Parts cleaning 🔍 [SDS pg.2]     |  [⚠️ F003 Probable] Spent non-halogenated solvent.
 • Legal Status: Discarded (Pending Route)   |  [📍 CA Flag] DTSC requires additional form.
                                             |  [❓ Missing Question] What is the exit route? 
 Technical Specs                             |      (Reuse vs Disposal changes classification).
 • Primary: MEK (90%) 🪄                     |  * Final classification decision in Review Gate.
 • Flash point: 16°F 🔍 [SDS pg.4]           |  -------------------------------------------------
 • Water content: [ Empty ]                  |  🔬 LAB DECISION ENGINE
 • Volume: ~4 Drums/mo 🗣️ [Voice Note]      |  Buyer usually requires water content <2%.
                                             |  💡 Recommend: Karl Fischer test ($150)
 🚚 LOGISTICS & PICKUP READINESS             |  ❌ DO NOT order full analytical panel ($1500)
 [ ] Placards identified (Class 3 Flammable) |  -------------------------------------------------
 [ ] Equipment (Requires Vacuum Truck)       |  💰 PRICING INTELLIGENCE (Internal Ref)
 [✓] Loading capability (Dock available)     |  Similar Deals (MEK, TX, Med Quality):
                                             |  • Deal #147: $0.12/lb (Won)
=================================================================================================
[ Cancel Deal ]           [ ➔ View Outlet & Route Graph ]           [ ➔ Request Senior Review ]
```

### 🧠 Arquitectura: ¿Cómo funciona esto por detrás?

**1. El Evidence Graph (Contrato de Datos Interno)**
La IA no solo "llena campos". En la base de datos, cada campo (ej. `flash_point`) no es un simple string, es un nodo que apunta a su fuente.
*   `🔍 [SDS pg.4]` significa que el **Document Agent** extrajo el dato. Si el usuario hace clic, se abre el PDF exactamente en la página 4.
*   Esto transforma el Discovery Pack de un "texto generado por IA" a un "contrato de datos auditable".

**2. Criticality Flag & Redundancy Planner**
Si el field agent marca el deal como `[⚠️ PRODUCTION CRITICAL]` (ej. si el material no sale, se detiene la línea de BMW), el sistema altera las reglas de negocio en tiempo real. Automáticamente exige que el "Segundo Grafo" (ver pantalla 2) tenga un plan de contingencia (1 Primary Outlet + 1 Backup Outlet) antes de poder pasar al Review Gate.

**3. Compliance Copilot (Advisory v1)**
El tema regulatorio no se decide solo con el número CAS o el SDS. Depende del proceso que lo generó y de su estado legal (waste vs. product).
*   **Motor basado en Reglas (v1):** Usa lookup tables para casos comunes y sugiere códigos RCRA con un "Confidence Score".
*   **Preguntas Faltantes:** La IA identifica qué falta para tomar una decisión legal. Si no se sabe la ruta de salida, la IA advierte: *"Falta determinar ruta de salida. Venderlo como producto puede eximirlo de ser hazardous waste"*.
*   **Advisory:** La IA **nunca** toma la decisión final. Siempre está etiquetado como "Advisory" y debe ser validado por un humano en el Review Gate.

---

## Paso 2: El "Segundo Grafo" (Outlets, Vendors & Routes)
*Resolver el material es solo la mitad del trabajo. La otra mitad es el "Needle in a haystack": encontrar quién se lo lleva y qué ruta logística tomar (minimizar legs).*

```text
=================================================================================================
 🌐 OUTLET & ROUTE GRAPH (Matching & Logistics)
=================================================================================================
Material: Spent Solvent (MEK) | Quality: Med | Requires Redundancy: YES (Critical)

🏢 OUTLET CANDIDATES (Offtakers)
-------------------------------------------------------------------------------------------------
[ 1. Fuel Blender Alpha (Houston, TX) ] ➔ STATUS: PRIMARY TARGET
  ↳ Reqs: Water <5% (❓ Pending Lab), Flash Point <100°F (✅ Matches 16°F)
  ↳ History: Bought similar MEK 3 times in last year.

[ 2. Solvent Recyclers Inc (Dallas, TX) ] ➔ STATUS: BACKUP (Required)
  ↳ Reqs: MEK >85% (✅ Matches 90%), Chloride <1% (✅ Matches SDS)
  ↳ Note: Usually takes 3 weeks to schedule. Good backup.

🚚 ROUTE & LOGISTICS PLANNING
-------------------------------------------------------------------------------------------------
Route A (To Fuel Blender Alpha):
  • Leg 1: Factory to Transfer Hub (Vendor: TX Hazmat Transport) [✓ Insured]
  • Leg 2: ISO Tank Transfer to Destination 
  • Total Legs: 2 (System Tip: Can we reduce to 1 direct vacuum truck?)
  
=================================================================================================
[◀ Back to Workspace]                                                  [ Save Route Plan ]
```

### 🧠 Arquitectura: ¿Cómo funciona esto por detrás?
*   **Directorio Simple (v0):** Antes de ser un "Smart Marketplace" mágico, esto empieza como una base de datos relacional de `Outlets`, `Capabilities`, y `Requirements`. 
*   **Matching de Restricciones:** La plataforma cruza los datos del Discovery Pack contra los requerimientos del Outlet. Si el Outlet pide Agua < 5% y nosotros no tenemos el test, se levanta como un Blocker en el Workspace.

---

## Paso 3: Review Gate, Outcome Ledger & Data Governance
*El paso crítico. Los seniors revisan para evitar multas, se documenta el éxito del deal, y el sistema ejecuta las políticas de retención para evitar exposición legal.*

```text
=================================================================================================
 📋 SENIOR REVIEW GATE  [👤 Steve (Manager/Compliance)]
=================================================================================================
Mike is requesting approval to generate Material Passport.

[✓] COMPLIANCE CHECK
    Suggested: F003 (Advisory). 
    Steve's action: [ Approve Code ] [ Edit Code ]

[✓] ROUTE & PRICING CHECK
    Mike's plan: Fuel Blender at $0.10/lb (Primary) / Recycler at $0.08/lb (Backup)
    Steve's action: [ Approve ] [ 💬 Add comment ]

➔ [ APPROVE & GENERATE MATERIAL PASSPORT ]

=================================================================================================
 🏆 OUTCOME LEDGER (Mandatory at Deal Close)
=================================================================================================
Deal Status: [ WON ▾ ]
Close Price: [ $ 0.11 ] / [ lb ]  |  Outlet: [ Fuel Blender Alpha ]
Lab Spend:   [ $ 150 ] -> [✓] Decisive for sale

[ 💾 Log Outcome & Trigger Data Governance Purge ]  <-- CREA EL MOAT Y ELIMINA RIESGO LEGAL
=================================================================================================
```

### 🧠 Arquitectura de Data Governance: Resolviendo el Riesgo "Discoverable"
Guardar el historial es bueno para el negocio, pero un riesgo legal masivo en caso de auditorías (exposición de datos no necesarios/discoverable). El sistema maneja 2 "Buckets" con reglas estrictas:

1.  **Bucket 1: Working / Discovery Data**
    *   **Qué contiene:** Notas de voz crudas, fotos no usadas, OCR de documentos descartados, mensajes internos ("Creo que esto está mal"), tests de lab antiguos.
    *   **Retención:** Corta y configurable. **Purge automático a los 90 días post-cierre del deal.**
    *   **Permisos:** Solo visible para Agents y Managers operativos.
2.  **Bucket 2: Record / Compliance Data (Publish Boundary)**
    *   **Qué contiene:** El Material Passport aprobado, documentos fuente finales vinculados, el Outcome Ledger (datos de pricing/win-loss ciegos), y exportaciones e-Manifest.
    *   **Retención:** Larga. 3 a 7 años (según policy).
    *   **Legal Hold:** Un botón de "Hold" que los admins pueden activar si hay un litigio, congelando el purge automático temporalmente.
    *   **Permisos:** Exportable para Auditores y QA del Buyer (redactando data comercial según el rol).

---

## Paso 4: The Material Passport & e-Manifest Readiness
*El entregable final. Una versión higienizada, profesional y orientada al cumplimiento. Cero **hechos** "inventados" por IA: todo claim material queda ligado a evidencia y/o marcado como estimado/advisory.*

```text
=================================================================================================
📄 MATERIAL PASSPORT                                [ Download PDF ] [ e-Manifest Data Mapping ]
=================================================================================================
ID: WP-2026-8842 | Validated by: Steve M. | Date: Oct 24, 2026

📦 MATERIAL IDENTITY
-------------------------------------------------------------------------------------------------
Classification:    Spent non-halogenated solvent (MEK)
Origin:            Texas, USA

🔬 TECHNICAL SPECIFICATIONS
-------------------------------------------------------------------------------------------------
Methyl Ethyl Ketone:  ~90%        |   Density:        0.81 g/cm3
Water Content:        1.8%        |   Flash Point:    16°F (-9°C)

🌱 ENVIRONMENTAL IMPACT (ESG REPORTING DATA)
-------------------------------------------------------------------------------------------------
• CO2 Avoided:       14.2 tonnes/year  (Calculated via EPA WaRM v16)
• SDG Alignment:     Goal 12 (Responsible Consumption and Production)

⚖️ COMPLIANCE & SAFETY (Record Data)
-------------------------------------------------------------------------------------------------
• RCRA Code:         F003 
• DOT Transport:     Class 3 Flammable Liquid, UN1193, PG II

📑 EVIDENCE PACK & TRACEABILITY
-------------------------------------------------------------------------------------------------
1. [📄 Lab_Analysis_Oct.pdf]  🟢 Fresh (14 days)| Source for: Water Content
2. [🖼️ Tank_Condition.jpg]    -- Visual proof   | Inspected by: Mike T.

=================================================================================================
```

### 🧠 Arquitectura: ¿Cómo funciona esto por detrás?

**1. e-Manifest Data Mapping (Readiness, no submission en Fase 1)**
El botón `[ e-Manifest Data Mapping ]` NO envía datos a la EPA ni genera el PDF oficial todavía. Lo que hace es **preparar los datos**.
*   Exporta un JSON o CSV donde los datos del pasaporte están mapeados a los campos exactos que requiere el sistema de la EPA (ej. `Material Identity` mapeado a `Item 9: Waste Description`; `RCRA Code` mapeado a `Item 13`).
*   Esto da ROI inmediato al equipo de Back-office/Operaciones porque elimina el data-entry repetitivo, dejándolos a un paso del "copy-paste" mientras se desarrolla la integración API con EPA en fases futuras.

**2. Observability & Eval (El Dashboard de ROI)**
Desde el día 1, aunque no haya un dashboard visual todavía, el sistema **instrumenta telemetría**:
*   Emite eventos como: `deal_blocked_by_missing_info` (midiendo cuántos días duró bloqueado).
*   Guarda métricas de `lab_spend_per_deal`.
*   Mide el `Time-to-First-Viable-Proposal (TFVP)`.
*   Esto asegura que cuando el stakeholder pregunte "¿Vale la pena este software?", podamos demostrar matemáticamente la reducción de cuellos de botella y ahorros en laboratorios.
