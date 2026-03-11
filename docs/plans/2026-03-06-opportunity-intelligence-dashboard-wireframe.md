# Opportunity Intelligence Dashboard — Main Dashboard Wireframe

**Date:** 2026-03-06  
**Product:** SecondStream  
**Scope:** Dashboard principal portfolio-level (NO Discovery workspace)  
**Inputs:** `docs/SecondStream Product Discovery.md`, `docs/SecondStream-mvp.md`, `docs/plans/discovery-phase-analysis2.md.resolved`

---

## 1. Qué es este dashboard

Este dashboard es la **home principal** de SecondStream.

No es donde el usuario llena el questionnaire/discovery.  
No es un CRM lleno de métricas vanity.  
No es un viewer de proposals.

Es un **operations cockpit** para brokers industriales.

Debe responder en menos de 5 segundos:

1. Cuántos streams descubiertos existen.
2. Cuáles están atorados por missing info.
3. En qué etapa real va cada deal.
4. Cuáles ya están listos o casi listos para propuesta.

En una frase:

> **Dashboard = qué atender ahora.**  
> **Discovery workspace = cómo resolver ese deal.**

---

## 2. Objetivo de producto que debe reflejar

Basado en los documentos fuente, el dashboard principal debe reflejar que SecondStream no es un CRM, sino un sistema de **Opportunity Intelligence**.

Por eso el dashboard debe priorizar:

- `discovered streams`
- `missing information`
- `deal stage`
- `proposal readiness`

Y debe reflejar los pains más fuertes de Russ:

- `Everything is waiting for something`
- Discovery messy/nonlinear
- Missing info stalls pipeline
- Need to prioritize where to push next
- Need portfolio visibility, not only deal-by-deal visibility

---

## 3. Dirección visual

## Concepto

Un dashboard que se siente como una **mesa operativa industrial premium**, no como un SaaS genérico.

## Mood

- sobrio
- técnico
- premium
- alta densidad de información, bajo ruido
- serio, no juguetón

## Look & feel

- Base oscura mineral: graphite / charcoal / petróleo
- Acentos funcionales:
  - readiness = verde mineral
  - blocked/waiting = ámbar quemado
  - risk/compliance = cobre / rojo oxidado
  - AI/extracted = azul frío controlado
- Bordes finos, suaves, no pesados
- Pocas cards grandes; una pieza central dominante
- Tipografía compacta, legible, con números tabulares

## Qué NO debe parecer

- CRM tradicional
- dashboard de analítica genérico
- tablero financiero con charts decorativos
- grid de 15 KPIs sin acción

---

## 4. Arquitectura del dashboard

## Jerarquía

1. `Streams in Motion` - lista priorizada de oportunidades activas
2. `Critical Gaps` - qué está bloqueando avance
3. `Ready Now` - oportunidades casi convertibles a propuesta
4. `Stage Map` - distribución del portfolio
5. `Recent Signals` - cambios relevantes recientes

## Secciones

### A. Header
- título: `Opportunity Intelligence Dashboard`
- search global
- filtros: owner, facility, material family, stage, readiness
- CTA discreto: `+ New Stream`

### B. Signal strip
4 bloques compactos:
- Discovered Streams
- Blocked by Missing Info
- Proposal Ready
- Avg. Stall Time

### C. Main panel
La pieza principal: lista premium de streams activos y priorizados.

### D. Right rail
Dos paneles:
- Critical Gaps
- Ready Now

### E. Lower band
- Stage Distribution
- Missing Info Patterns
- Recent Signals

---

## 5. Wireframe principal — Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                              │
│  Opportunity Intelligence Dashboard                                              Search streams, sites...   │
│  Portfolio-level command view for discovery operations                          [Owner ▾] [Stage ▾] [+ New] │
│                                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                              │
│  SIGNAL STRIP                                                                                                │
│                                                                                                              │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────────────────────┐  │
│  │ 128                │ │ 19                 │ │ 14                 │ │ 6.2d                             │  │
│  │ Discovered         │ │ Blocked by         │ │ Proposal-ready     │ │ Avg. stall time                  │  │
│  │ streams            │ │ missing info       │ │ opportunities      │ │ waiting on information           │  │
│  │ +8 this week       │ │ 11 high-risk       │ │ 9 near-ready       │ │ 3 deals > 10 days stalled       │  │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘ └──────────────────────────────────┘  │
│                                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────┬──────────────────────┤
│                                                                                      │                      │
│  STREAMS IN MOTION                                                                   │  CRITICAL GAPS       │
│  Ranked by urgency, blocker age, readiness, and commercial potential                │                      │
│                                                                                      │  1. Lab analysis     │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │     Waiting on EHS  │
│  │ STREAM                 STAGE           MISSING        BLOCKER        READY    │  │     4d · blocks prop│
│  ├────────────────────────────────────────────────────────────────────────────────┤  │                      │
│  │ Spent Acetone         Waiting on      Water %, SDS   Lab pending    78%      │  │  2. Process origin   │
│  │ Meridian Chemical     client          2 critical     Aging 4d       ████░    │  │     Waiting on Ops  │
│  │ Solvents · Monterrey  Owner: Raul     Evidence weak  Proposal risk  [Open]   │  │     8d · blocks cls │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │                      │
│  │ Paint Sludge          Analyst review  Classification Waste/Product  52%      │  │  3. Current cost     │
│  │ NorChem Foundry       Internal        1 critical     ambiguity      ██░░░    │  │     Waiting on Acct │
│  │ Metals · Ohio         Owner: Ana      Good evidence  Pricing hold   [Open]   │  │     5d · blocks $   │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │                      │
│  │ Used Glycol           In discovery    Cost, recur.   Baseline       46%      │  │  [View all gaps →]  │
│  │ Apex Auto Parts       Active          2 missing      unknown        ██░░░    │  ├──────────────────────┤
│  │ Liquids · Texas       Owner: Luis     Docs partial   Slow progress  [Open]   │  │  READY NOW           │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │                      │
│  │ Solvent Blend         Blocked         SDS, flash pt  No fresh docs  34%      │  │  1. Meridian         │
│  │ Delta Coatings        Waiting         3 missing      12d stalled    █░░░░    │  │     78% ready       │
│  │ Solvents · California Owner: Sofia    High risk      Compliance     [Open]   │  │     Missing lab      │
│  └────────────────────────────────────────────────────────────────────────────────┘  │                      │
│                                                                                      │  2. NorChem          │
│                                                                                      │     52% but 1 blocker│
│                                                                                      │                      │
│                                                                                      │  3. Apex             │
│                                                                                      │     Missing cost only│
│                                                                                      │                      │
│                                                                                      │  [Review ready →]    │
├──────────────────────────────────────────────────────────────────────────────────────┴──────────────────────┤
│                                                                                                              │
│  PORTFOLIO HEALTH                                                                                             │
│                                                                                                              │
│  ┌───────────────────────────────────────────┐  ┌──────────────────────────────────────────────────────────┐ │
│  │ STAGE DISTRIBUTION                        │  │ TOP MISSING INFO PATTERNS                                │ │
│  │                                           │  │                                                          │ │
│  │ New                12                     │  │ SDS / profile missing                         14         │ │
│  │ In discovery       61                     │  │ Volume / recurrence unknown                   11         │ │
│  │ Waiting on client  19                     │  │ Lab / testing missing                         10         │ │
│  │ Analyst review     22                     │  │ Generating process unclear                     9         │ │
│  │ Proposal-ready     14                     │  │ Current cost / invoice missing                 8         │ │
│  └───────────────────────────────────────────┘  └──────────────────────────────────────────────────────────┘ │
│                                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  RECENT SIGNALS                                                                                               │
│  + 8 new streams discovered   ·   5 blockers resolved   ·   3 moved to ready   ·   2 stale evidence flags  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Wireframe principal — Mobile

```text
┌────────────────────────────────────┐
│ Opportunity Intelligence           │
│ Search...                     [≡]  │
├────────────────────────────────────┤
│ 128 streams                        │
│ 19 blocked · 14 ready              │
│ 6.2d avg stall                     │
├────────────────────────────────────┤
│ [All] [Blocked] [Ready] [My deals] │
├────────────────────────────────────┤
│ Spent Acetone Recovery             │
│ Meridian Chemical                  │
│ Waiting on client · 78% ready      │
│ Missing: Water %, SDS              │
│ Blocker: Lab pending · 4d          │
│ Evidence: Aging SDS                │
│ [Open stream]                      │
├────────────────────────────────────┤
│ Paint Sludge                       │
│ NorChem Foundry                    │
│ Analyst review · 52% ready         │
│ Missing: Classification            │
│ Blocker: Waste/Product ambiguity   │
│ [Open stream]                      │
├────────────────────────────────────┤
│ Used Glycol                        │
│ Apex Auto Parts                    │
│ In discovery · 46% ready           │
│ Missing: Cost, recurrence          │
│ [Open stream]                      │
├────────────────────────────────────┤
│ Critical gaps (19)                 │
│ Ready now (14)                     │
│ Missing info patterns              │
│ Recent signals                     │
└────────────────────────────────────┘
```

---

## 7. Anatomía de la fila principal (card/list row)

Cada stream en `Streams in Motion` debe mostrar suficiente contexto para decidir, sin abrir el deal.

## Información por fila

- `Stream name`
- `Facility / account`
- `Material family`
- `Stage`
- `Readiness %`
- `Missing info count`
- `Main blocker`
- `Evidence quality`
- `Aging / days stalled`
- `Owner`
- CTA única: `Open`

## Ejemplo visual de fila

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Spent Acetone Recovery                                              Waiting on client    │
│ Meridian Chemical · Solvents · Monterrey                            Readiness 78% ████░ │
│ Missing: Water %, SDS                                                Blocker: Lab pending│
│ Evidence: Aging SDS                                                  Stalled: 4 days     │
│ Owner: Raul                                                                          [Open]│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Reglas

- 1 CTA primaria por fila
- chips cortos, no párrafos
- blocker siempre visible
- readiness siempre visible
- color solo para estado, no decorativo

---

## 8. Copy sugerido por sección

## Header
- `Opportunity Intelligence Dashboard`
- `Portfolio-level command view for discovery operations`

## Signal strip
- `Discovered streams`
- `Blocked by missing info`
- `Proposal-ready opportunities`
- `Avg. stall time`

## Main table
- `Streams in Motion`
- `Ranked by urgency, blocker age, readiness, and commercial potential`

## Right rail
- `Critical Gaps`
- `Ready Now`

## Lower band
- `Stage Distribution`
- `Top Missing Info Patterns`
- `Recent Signals`

## Row microcopy
- `Waiting on client`
- `Analyst review`
- `Evidence weak`
- `Aging SDS`
- `Missing 2 critical inputs`
- `Ready for proposal`

---

## 9. Interacciones clave

## Click row
- abre el stream en su workspace exacto
- idealmente deep-link al tab/sección correcta

## Click blocker chip
- abre discovery directamente en la sección relevante
- ejemplo: `Regulatory`, `Evidence`, `Cost`

## Hover/expand row (desktop)
- muestra quick context extra sin salir
- últimos cambios, # suggestions, qué desbloquea si se resuelve

## Filters
- owner
- facility
- stage
- readiness
- material family
- blocked only

## Quick actions permitidas
- `Open stream`
- `Send reminder`
- `Assign owner`
- `Mark waiting`

No más de eso en dashboard V1.

---

## 10. Qué hace que esta UI se sienta moderna y premium

1. **Una pieza principal dominante**  
   El centro no son KPIs; es la lista operativa de streams.

2. **Alta densidad con calma visual**  
   Mucha información, poca saturación.

3. **Semántica real del negocio**  
   `blocked`, `waiting`, `readiness`, `evidence`, `missing info` en vez de lenguaje CRM genérico.

4. **Visual language industrial**  
   Oscuro, contenido, preciso.

5. **Panels curados, no grid de widgets**  
   Menos cards. Más jerarquía.

6. **Portfolio-first**  
   Muestra trabajo priorizado, no solamente reporting.

---

## 11. Qué NO meter en este dashboard

- questionnaire/discovery form completo
- viewer completo de evidence/docs
- preview largo de proposal
- charts grandes de vanity metrics
- CRM pipeline comercial tradicional
- tabla gigante sin priorización
- demasiados CTA por fila
- lógica profunda de compliance
- outlet graph/logistics network

Eso vive en otras superficies del producto.

---

## 12. Resumen ejecutivo

```text
SecondStream main dashboard = control tower del portafolio.

No sirve para capturar discovery.
Sirve para priorizar oportunidades.

Le dice al operador:
- qué streams existen
- qué falta
- qué está bloqueado
- qué ya está listo para propuesta

Convierte un portafolio caótico en una cola de trabajo clara.
```
